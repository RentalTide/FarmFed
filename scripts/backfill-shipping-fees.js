/* eslint-disable no-console */
/**
 * Backfill missed delivery fees for cart-checkout transactions placed before
 * the May 11 delivery-method fix landed.
 *
 * For each affected cart (group of transactions placed by the same buyer
 * within ~1 minute), creates ONE off-session Stripe PaymentIntent for the
 * delivery fee that should have been charged. The original PaymentIntent's
 * customer + payment_method are reused, so the customer's saved card is
 * charged with no additional input from them.
 *
 * Default mode: DRY-RUN (prints the plan, makes no charges).
 * Pass --apply to actually run the charges.
 *
 * Idempotency: each charge uses the cart's first transaction ID as the
 * idempotency key, so re-running this script with --apply will NOT double-
 * charge already-backfilled carts.
 */

require('dotenv').config();
const sdkPkg = require('sharetribe-flex-integration-sdk');
const Stripe = require('stripe');
const https = require('https');
const { haversineDistanceMiles } = require('../server/api-util/distance');
const { geocodeAddress } = require('../server/api-util/geocode');

const APPLY = process.argv.includes('--apply');
const STATEMENT_DESCRIPTOR_SUFFIX = 'Delivery';

const integrationSdk = sdkPkg.createInstance({
  clientId: process.env.SHARETRIBE_INTEGRATION_API_CLIENT_ID,
  clientSecret: process.env.SHARETRIBE_INTEGRATION_API_CLIENT_SECRET,
});

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY missing from env'); process.exit(1);
}
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const fetchJSON = url => new Promise((resolve, reject) => {
  https.get(url, r => { let d=''; r.on('data', c=>d+=c); r.on('end', ()=>{ try{resolve(JSON.parse(d));}catch(e){reject(e);} }); }).on('error', reject);
});

(async () => {
  console.log(`Mode: ${APPLY ? 'APPLY (LIVE STRIPE CHARGES)' : 'DRY-RUN'}\n`);

  const settings = await fetchJSON('https://www.farmfed.us/api/delivery-settings');
  const hub = settings.hubOrigin;
  const ratePerMile = settings.deliveryRatePerMileCents;
  const flatFee = settings.deliveryFlatFeeCents;
  console.log(`Live rate: $${(ratePerMile/100).toFixed(2)}/mi + $${(flatFee/100).toFixed(2)} flat\n`);

  // Fetch affected transactions
  const since = new Date('2026-05-01T00:00:00Z');
  const all = [];
  let page = 1;
  while (true) {
    const r = await integrationSdk.transactions.query({ perPage: 100, sort: '-createdAt', page, include: ['customer'] });
    r.data.data.forEach(t => {
      if (t.attributes.createdAt < since) return;
      const customerId = t.relationships?.customer?.data?.id?.uuid;
      const customer = (r.data.included || []).find(x => x.type === 'user' && x.id.uuid === customerId);
      all.push({ t, customerEmail: customer?.attributes?.email });
    });
    if (page >= r.data.meta.totalPages || r.data.data[r.data.data.length-1]?.attributes.createdAt < since) break;
    page++;
  }
  const affected = all.filter(({t}) => {
    const a = t.attributes;
    if (['state/pending-payment','state/inquiry','state/payment-expired','state/declined'].includes(a.state)) return false;
    const hasShippingLine = (a.lineItems || []).some(li => li.code === 'line-item/shipping-fee');
    const hasShippingAddress = !!a.protectedData?.shippingAddress;
    return !hasShippingLine && hasShippingAddress;
  });

  // Group by buyer + same-minute timestamp into "carts"
  const carts = new Map();
  for (const { t, customerEmail } of affected) {
    const key = customerEmail + '|' + t.attributes.createdAt.toISOString().slice(0,16);
    if (!carts.has(key)) carts.set(key, { customerEmail, txns: [], createdAt: t.attributes.createdAt });
    carts.get(key).txns.push(t);
  }

  console.log(`Affected carts to backfill: ${carts.size}\n`);
  const results = { charged: [], skipped: [], failed: [] };
  let totalCharged = 0;

  for (const [, cart] of carts) {
    cart.txns.sort((a,b) => a.attributes.createdAt - b.attributes.createdAt);
    const firstTx = cart.txns[0];
    const addr = firstTx.attributes.protectedData.shippingAddress;
    const stripePIs = firstTx.attributes.protectedData?.stripePaymentIntents;
    const originalPiId = stripePIs?.default?.stripePaymentIntentId;

    let feeCents = 0;
    try {
      const buyer = await geocodeAddress(addr);
      const d = haversineDistanceMiles(hub.lat, hub.lng, buyer.lat, buyer.lng);
      feeCents = Math.round(d * ratePerMile) + flatFee;
    } catch (e) {
      results.failed.push({ cart, reason: 'geocode failed: ' + e.message });
      console.log(`SKIP ${cart.customerEmail.padEnd(35)} — geocode failed`);
      continue;
    }
    if (feeCents <= 0) {
      results.skipped.push({ cart, reason: 'fee=$0' });
      continue;
    }

    // Sharetribe doesn't store the Stripe PaymentIntent ID on the transaction.
    // Instead, find a successful PI created within +/- 2 minutes of the cart's
    // first transaction. All PIs in a cart share the same (customer, pm).
    const windowStart = Math.floor(firstTx.attributes.createdAt.getTime() / 1000) - 120;
    const windowEnd = Math.floor(firstTx.attributes.createdAt.getTime() / 1000) + 120;
    let originalPi = null;
    try {
      const pis = await stripe.paymentIntents.list({
        created: { gte: windowStart, lte: windowEnd },
        limit: 50,
      });
      originalPi = pis.data.find(p =>
        p.status === 'succeeded' && p.payment_method && p.customer
      );
    } catch (e) {
      results.failed.push({ cart, reason: `Stripe PI search failed: ${e.message}` });
      console.log(`SKIP ${cart.customerEmail.padEnd(35)} — Stripe search failed: ${e.message}`);
      continue;
    }
    if (!originalPi) {
      results.failed.push({ cart, reason: 'no matching PI found in time window' });
      console.log(`SKIP ${cart.customerEmail.padEnd(35)} — no PI found in time window`);
      continue;
    }

    const paymentMethodId = originalPi.payment_method;
    const customerStripeId = originalPi.customer;
    if (!paymentMethodId || !customerStripeId) {
      results.failed.push({ cart, reason: `missing pm or customer on original PI (pm=${paymentMethodId}, customer=${customerStripeId})` });
      console.log(`SKIP ${cart.customerEmail.padEnd(35)} — original PI missing pm/customer`);
      continue;
    }

    const idempotencyKey = `farmfed-shipping-backfill-${firstTx.id.uuid}`;
    const description = `FarmFed delivery fee — backfill for cart placed ${cart.createdAt.toISOString().slice(0,10)}`;

    if (!APPLY) {
      console.log(
        `WOULD CHARGE  ${cart.customerEmail.padEnd(35)}  ` +
        `$${(feeCents/100).toFixed(2)}  ` +
        `pm=${String(paymentMethodId).slice(0,15)}…  customer=${String(customerStripeId).slice(0,15)}…`
      );
      results.charged.push({ cart, feeCents });
      totalCharged += feeCents;
      continue;
    }

    try {
      const pi = await stripe.paymentIntents.create({
        amount: feeCents,
        currency: 'usd',
        customer: customerStripeId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        description,
        statement_descriptor_suffix: STATEMENT_DESCRIPTOR_SUFFIX,
        metadata: {
          farmfed_backfill: 'shipping-fee',
          original_transaction_id: firstTx.id.uuid,
          cart_created_at: cart.createdAt.toISOString(),
          customer_email: cart.customerEmail,
          item_count: String(cart.txns.length),
        },
      }, { idempotencyKey });

      console.log(
        `CHARGED       ${cart.customerEmail.padEnd(35)}  ` +
        `$${(feeCents/100).toFixed(2)}  pi=${pi.id}  status=${pi.status}`
      );
      results.charged.push({ cart, feeCents, paymentIntentId: pi.id, status: pi.status });
      totalCharged += feeCents;
    } catch (e) {
      results.failed.push({ cart, feeCents, reason: e.message, code: e.code, declineCode: e.decline_code });
      console.log(`FAILED        ${cart.customerEmail.padEnd(35)}  $${(feeCents/100).toFixed(2)}  ${e.code || ''} ${e.message}`);
    }
  }

  console.log('\n================ SUMMARY ================');
  console.log(`Carts ${APPLY ? 'charged' : 'queued'}:  ${results.charged.length}`);
  console.log(`Carts skipped:           ${results.skipped.length}`);
  console.log(`Carts failed:            ${results.failed.length}`);
  console.log(`Total ${APPLY ? 'charged' : 'would charge'}:  $${(totalCharged/100).toFixed(2)}`);
  if (!APPLY) console.log('\nRun again with --apply to perform the live charges.');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
