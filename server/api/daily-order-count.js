const { getSdk, getIntegrationSdk, handleError } = require('../api-util/sdk');

const handler = async (req, res) => {
  try {
    const { listingId } = req.query || {};

    if (!listingId) {
      return res.status(400).json({ error: 'listingId is required' });
    }

    const integrationSdk = getIntegrationSdk();

    // Get today's date range
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Query transactions for this listing created today
    const response = await integrationSdk.transactions.query({
      listingId,
      createdAtStart: startOfDay.toISOString(),
      createdAtEnd: endOfDay.toISOString(),
      page: 1,
      perPage: 100,
    });

    const count = response.data.data.length;
    res.status(200).json({ count, listingId });
  } catch (e) {
    handleError(res, e);
  }
};

module.exports = handler;
