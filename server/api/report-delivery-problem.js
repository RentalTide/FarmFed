const { getSdk, handleError } = require('../api-util/sdk');

const handler = async (req, res) => {
  const sdk = getSdk(req, res);

  try {
    const { transactionId, category, description } = req.body || {};

    if (!transactionId) {
      return res.status(400).json({ error: 'transactionId is required' });
    }

    if (!category || !['delivery_issue', 'contents_issue', 'both'].includes(category)) {
      return res.status(400).json({ error: 'category must be delivery_issue, contents_issue, or both' });
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return res.status(400).json({ error: 'description is required' });
    }

    // Update transaction protected data with the problem report
    const response = await sdk.transactions.updateMetadata({
      id: transactionId,
      metadata: {
        deliveryProblem: {
          category,
          description: description.trim(),
          reportedAt: new Date().toISOString(),
        },
      },
    });

    res.status(200).json({ success: true });
  } catch (e) {
    handleError(res, e);
  }
};

module.exports = handler;
