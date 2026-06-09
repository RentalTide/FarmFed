/**
 * Daily listing shuffle (core logic).
 *
 * Assigns every listing a fresh random integer in `metadata.sortRandom`. The
 * search page sorts the default browse order by `meta_sortRandom`, so running
 * this once per day re-shuffles the order listings appear in.
 *
 * Why metadata (not publicData): metadata can only be written by the operator
 * via the Integration API, so providers can never influence their own position
 * in the shuffle. This is the canonical Sharetribe pattern for controlling
 * listing order in search results.
 *
 * Prerequisite (one-time): the `sortRandom` field needs a search schema so it
 * can be sorted on:
 *   flex-cli search set --key sortRandom --type long --scope metadata -m <marketplace>
 * Run it for both the dev and live marketplaces.
 *
 * This module is transport-agnostic: it takes an Integration SDK instance and
 * is driven by either the CLI script (scripts/shuffle-listings.js) or the HTTP
 * endpoint (server/api/shuffle-listings.js).
 */

// Listings that are visible in / relevant to search. Drafts and closed
// listings don't appear in search, so there's no need to shuffle them.
const DEFAULT_STATES = 'published,pendingApproval';

// Random values are drawn from [0, RANDOM_MAX). A wide range keeps collisions
// (ties, which fall back to createdAt ordering) negligible.
const RANDOM_MAX = 1000000000;

const METADATA_KEY = 'sortRandom';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const randomInt = () => Math.floor(Math.random() * RANDOM_MAX);

const fetchAllListingIds = async (integrationSdk, states) => {
  const ids = [];
  let page = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const resp = await integrationSdk.listings.query({ page, perPage: 100, states });
    resp.data.data.forEach(l => ids.push(l.id.uuid));
    const meta = resp.data.meta;
    if (!meta || page >= meta.totalPages) break;
    page += 1;
  }
  return ids;
};

/**
 * Re-shuffle the random sort value on every listing.
 *
 * @param {Object} opts
 * @param {Object} opts.integrationSdk - a sharetribe-flex-integration-sdk instance
 * @param {string} [opts.states] - comma-separated listing states to include
 * @param {number} [opts.throttleMs] - delay between updates (stay under API rate limits)
 * @param {Function} [opts.log] - progress logger, receives a string
 * @returns {Promise<{total:number, updated:number, failures:Array}>}
 */
const shuffleAllListings = async ({
  integrationSdk,
  states = DEFAULT_STATES,
  throttleMs = 80,
  log = () => {},
}) => {
  const ids = await fetchAllListingIds(integrationSdk, states);
  log(`Found ${ids.length} listing(s) (states=${states}) to re-shuffle.`);

  let updated = 0;
  const failures = [];

  for (const id of ids) {
    try {
      await integrationSdk.listings.update({ id, metadata: { [METADATA_KEY]: randomInt() } });
      updated += 1;
      if (throttleMs) {
        await sleep(throttleMs);
      }
    } catch (e) {
      failures.push({ id, error: e.message });
    }
  }

  log(`Re-shuffled ${updated}/${ids.length} listing(s). Failures: ${failures.length}.`);
  return { total: ids.length, updated, failures };
};

module.exports = { shuffleAllListings, METADATA_KEY, DEFAULT_STATES };
