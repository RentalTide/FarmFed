/* eslint-disable no-console */
//
// Push stuck "delivered" purchase orders through to received/completed.
//
// Scans every default-purchase transaction whose last transition is
// mark-delivered / operator-mark-delivered (i.e. it is sitting in the
// `delivered` state) and fires transition/operator-mark-received on each.
// That pays out the vendor (same Stripe payout action as auto-mark-received)
// and lets the order auto-complete, so vendors see the order as complete.
//
// Why this is needed: auto-mark-received is a *scheduled* transition pinned to
// the process version a transaction started on. Orders created before the
// 1-day timer was deployed still wait out the old (14-day) timer, so they look
// stuck. This clears the backlog immediately; new orders auto-complete on
// their own.
//
// Usage:
//   node scripts/mark-received-stuck.js            # apply
//   node scripts/mark-received-stuck.js --dry-run  # list only, change nothing
//
// Requires Integration API credentials in the environment (the same ones
// server/api-util/sdk.js uses):
//   SHARETRIBE_INTEGRATION_API_CLIENT_ID, SHARETRIBE_INTEGRATION_API_CLIENT_SECRET
//
// NOTE: transition/operator-mark-received must exist in the deployed
// default-purchase process. Deploy it first with flex-cli:
//   flex-cli process push --process default-purchase \
//     --path ext/transaction-processes/default-purchase
//   flex-cli process update-alias --process default-purchase \
//     --alias release-1 --version <new-version>
require('dotenv').config();

const { getIntegrationSdk } = require('../server/api-util/sdk');

const DRY_RUN = process.argv.includes('--dry-run');

// Last transitions that leave a purchase transaction in the `delivered` state.
const DELIVERED_LAST_TRANSITIONS = ['transition/mark-delivered', 'transition/operator-mark-delivered'];

const PROCESS_NAME = 'default-purchase';

const queryAllDelivered = async integrationSdk => {
  const txs = [];
  let page = 1;
  // The Integration API caps perPage at 100.
  /* eslint-disable no-await-in-loop */
  while (true) {
    const res = await integrationSdk.transactions.query({
      processNames: PROCESS_NAME,
      lastTransitions: DELIVERED_LAST_TRANSITIONS.join(','),
      page,
      perPage: 100,
    });
    const data = res.data.data || [];
    txs.push(...data);
    const meta = res.data.meta || {};
    if (!meta.totalPages || page >= meta.totalPages) break;
    page += 1;
  }
  /* eslint-enable no-await-in-loop */
  return txs;
};

(async () => {
  const integrationSdk = getIntegrationSdk();
  const stuck = await queryAllDelivered(integrationSdk);

  console.log(
    `Found ${stuck.length} purchase order(s) stuck in "delivered"${DRY_RUN ? ' (dry run)' : ''}.`
  );

  let ok = 0;
  const errors = [];
  for (const tx of stuck) {
    const id = tx.id.uuid;
    if (DRY_RUN) {
      console.log(` - would mark received: ${id} (last: ${tx.attributes.lastTransition})`);
      continue; // eslint-disable-line no-continue
    }
    try {
      // eslint-disable-next-line no-await-in-loop
      await integrationSdk.transactions.transition({
        id,
        transition: 'transition/operator-mark-received',
        params: {},
      });
      ok += 1;
      console.log(` - marked received: ${id}`);
    } catch (e) {
      const msg = e?.data?.errors ? JSON.stringify(e.data.errors) : e.message;
      errors.push({ id, error: msg });
      console.error(` - FAILED ${id}: ${msg}`);
    }
  }

  if (!DRY_RUN) {
    console.log(`Done. ${ok} marked received, ${errors.length} failed.`);
    if (errors.length) {
      console.log(
        'Failures are usually a vendor whose Stripe payouts are not enabled — fix Stripe onboarding for those, then re-run.'
      );
    }
  }
})().catch(e => {
  console.error('FATAL mark-received-stuck:', e.message);
  process.exit(1);
});
