/* eslint-disable no-console */
/**
 * Re-shuffle the random sort order of all listings.
 *
 * Assigns every published / pendingApproval listing a fresh random value in
 * metadata.sortRandom. The search page's default browse order sorts by
 * meta_sortRandom, so running this once per day produces a daily shuffle.
 *
 * Usage:
 *   yarn shuffle-listings           # uses .env credentials
 *   node scripts/shuffle-listings.js
 *
 * Schedule it once per day with your host's scheduler, e.g.:
 *   - Heroku Scheduler:  `node scripts/shuffle-listings.js` daily
 *   - cron:              `0 4 * * *  cd /app && node scripts/shuffle-listings.js`
 *   - GitHub Actions:    a scheduled workflow running the same command
 *
 * One-time prerequisite (register the sortable search schema):
 *   flex-cli search set --key sortRandom --type long --scope metadata -m <marketplace>
 *
 * Required env vars:
 *   SHARETRIBE_INTEGRATION_API_CLIENT_ID
 *   SHARETRIBE_INTEGRATION_API_CLIENT_SECRET
 */

require('dotenv').config();
const integrationSdkPkg = require('sharetribe-flex-integration-sdk');
const { shuffleAllListings } = require('../server/api-util/shuffleListings');

const clientId = process.env.SHARETRIBE_INTEGRATION_API_CLIENT_ID;
const clientSecret = process.env.SHARETRIBE_INTEGRATION_API_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    'Missing SHARETRIBE_INTEGRATION_API_CLIENT_ID / SHARETRIBE_INTEGRATION_API_CLIENT_SECRET.'
  );
  process.exit(1);
}

const integrationSdk = integrationSdkPkg.createInstance({ clientId, clientSecret });

(async () => {
  const startedAt = Date.now();
  const result = await shuffleAllListings({ integrationSdk, log: msg => console.log(msg) });
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`Done in ${seconds}s.`, JSON.stringify(result.failures.slice(0, 10)));
  if (result.failures.length) {
    process.exit(1);
  }
})().catch(e => {
  console.error('FATAL', e);
  process.exit(1);
});
