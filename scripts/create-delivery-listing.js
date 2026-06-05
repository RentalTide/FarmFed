/* eslint-disable no-console */
//
// Create (or locate) the operator-owned "Delivery" listing that standalone
// delivery transactions are created against (default-delivery process).
//
// Prereqs:
//   - The default-delivery process + release-1 alias must already be pushed
//     (see docs/standalone-delivery.md step 1).
//   - Integration API creds in .env (SHARETRIBE_INTEGRATION_API_CLIENT_ID/SECRET).
//   - The hub/operator user that should OWN this listing must exist and have
//     Stripe Connect onboarded (so payment intents + payouts work).
//
// Usage:
//   # 1. Find candidate operator/admin users (to pick the hub author id):
//   node scripts/create-delivery-listing.js --list-operators
//
//   # 2. Create the listing owned by that user:
//   HUB_AUTHOR_ID=<user-uuid> node scripts/create-delivery-listing.js
//   #   or: node scripts/create-delivery-listing.js <user-uuid>
//
// On success it prints the new listing id — paste it into .env as
//   REACT_APP_DELIVERY_LISTING_ID=<listing-uuid>
require('dotenv').config();

const integrationSdkModule = require('sharetribe-flex-integration-sdk');
const { getIntegrationSdk } = require('../server/api-util/sdk');

const { Money } = integrationSdkModule.types;

const PROCESS_ALIAS = 'default-delivery/release-1';
const CURRENCY = process.env.REACT_APP_DELIVERY_LISTING_CURRENCY || 'USD';
const TITLE = process.env.DELIVERY_LISTING_TITLE || 'FarmFed Delivery';

const listOperators = async sdk => {
  // Best-effort: list users and surface ones that look like operators/admins.
  const resp = await sdk.users.query({ perPage: 100 });
  const users = resp.data.data || [];
  const candidates = users.filter(u => {
    const pd = u.attributes.profile?.privateData || {};
    const md = u.attributes.profile?.metadata || {};
    return pd.isAdmin === true || md.isAdmin === true || pd.isOperator === true;
  });
  const rows = (candidates.length ? candidates : users).slice(0, 50);
  console.log(`Found ${users.length} users; showing ${rows.length} candidate(s):`);
  rows.forEach(u =>
    console.log(
      ` - ${u.id.uuid}  ${u.attributes.profile?.displayName || ''}  <${u.attributes.email || ''}>`
    )
  );
  console.log('\nRe-run with HUB_AUTHOR_ID=<one of the ids above> to create the listing.');
};

(async () => {
  const sdk = getIntegrationSdk();

  if (process.argv.includes('--list-operators')) {
    await listOperators(sdk);
    return;
  }

  // Re-open an existing delivery listing (it must be published/open for
  // checkout to create delivery transactions against it). Run this at deploy
  // time if the listing was closed to hide it from search pre-deploy:
  //   node scripts/create-delivery-listing.js --open
  if (process.argv.includes('--open')) {
    const id =
      process.env.REACT_APP_DELIVERY_LISTING_ID ||
      process.argv[process.argv.indexOf('--open') + 1];
    if (!id) {
      console.error('Provide the listing id via REACT_APP_DELIVERY_LISTING_ID or --open <id>');
      process.exit(1);
    }
    const r = await sdk.listings.open({ id: new integrationSdkModule.types.UUID(id) }, { expand: true });
    console.log('Delivery listing re-opened. state:', r.data.data.attributes.state);
    return;
  }

  const authorId = process.env.HUB_AUTHOR_ID || process.argv[2];
  if (!authorId) {
    console.error(
      'Missing hub author id. Run with --list-operators to find one, then:\n' +
        '  HUB_AUTHOR_ID=<user-uuid> node scripts/create-delivery-listing.js'
    );
    process.exit(1);
  }

  const resp = await sdk.listings.create(
    {
      title: TITLE,
      authorId: new integrationSdkModule.types.UUID(authorId),
      state: 'published',
      // Listing price is a placeholder; the real delivery fee is set per order
      // via orderData.deliveryFeeCents and overrides the line item.
      price: new Money(0, CURRENCY),
      publicData: {
        transactionProcessAlias: PROCESS_ALIAS,
        unitType: 'delivery',
        listingType: 'delivery',
      },
    },
    { expand: true }
  );

  const listing = resp.data.data;
  console.log('Created delivery listing:');
  console.log('  id   :', listing.id.uuid);
  console.log('  title:', listing.attributes.title);
  console.log('\nNow set in .env:');
  console.log(`  REACT_APP_DELIVERY_LISTING_ID=${listing.id.uuid}`);
})().catch(e => {
  console.error('FATAL create-delivery-listing:', e.message);
  if (e.data) console.error(JSON.stringify(e.data, null, 2));
  process.exit(1);
});
