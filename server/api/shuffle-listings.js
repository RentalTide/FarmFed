const { getIntegrationSdk, handleError } = require('../api-util/sdk');
const { shuffleAllListings } = require('../api-util/shuffleListings');
const { recordListingShuffleRun } = require('../api-util/listingShuffleSettings');

/**
 * HTTP trigger for the daily listing shuffle.
 *
 * Intended to be called once per day by an external scheduler (e.g. a Render
 * cron job, Vercel cron, or cron-job.org) for hosts that prefer an HTTP hook
 * over a scheduled one-off process. For hosts with a process scheduler
 * (Heroku Scheduler, plain cron), prefer `node scripts/shuffle-listings.js`.
 *
 * Protected by a shared secret to prevent it being triggered publicly. Set
 * SHUFFLE_LISTINGS_SECRET in the environment and send it as either:
 *   - header  `x-shuffle-secret: <secret>`, or
 *   - query   `?secret=<secret>`
 */
const handler = async (req, res) => {
  try {
    const secret = process.env.SHUFFLE_LISTINGS_SECRET;
    if (!secret) {
      return res.status(503).json({ error: 'Shuffle endpoint is not configured.' });
    }

    const provided = req.get('x-shuffle-secret') || (req.query && req.query.secret);
    if (provided !== secret) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const integrationSdk = getIntegrationSdk();
    // eslint-disable-next-line no-console
    const result = await shuffleAllListings({ integrationSdk, log: msg => console.log(msg) });
    await recordListingShuffleRun({
      total: result.total,
      updated: result.updated,
      failures: result.failures.length,
    });

    return res.status(200).json({ ok: true, ...result });
  } catch (e) {
    return handleError(res, e);
  }
};

module.exports = handler;
