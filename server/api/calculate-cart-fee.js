const {
  getSdk,
  handleError,
  serialize,
  fetchCommission,
} = require('../api-util/sdk');
const { PROCESSING_FEE_CENTS } = require('../api-util/lineItems');

/**
 * Calculate the FarmFed customer commission for an entire cart ONCE.
 *
 * Body: { subtotalCents: number, currency?: string }
 * Returns: { feeCents, percentage, minimumCents }
 *
 * Commission config lives in the Sharetribe Console asset
 * `transactions/commission.json` and can be overridden there (e.g. 5% with a
 * 399 cent minimum). This endpoint applies `max(percentage * subtotal, minimum)`
 * against the entire cart subtotal so the minimum is charged once per order,
 * not once per item.
 */
module.exports = (req, res) => {
  const { subtotalCents } = req.body || {};

  if (typeof subtotalCents !== 'number' || subtotalCents < 0) {
    return res.status(400).json({ error: 'Invalid subtotalCents' });
  }

  const sdk = getSdk(req, res);

  fetchCommission(sdk)
    .then(fetchAssetsResponse => {
      const commissionAsset = fetchAssetsResponse.data.data[0];
      const { customerCommission } =
        commissionAsset?.type === 'jsonAsset' ? commissionAsset.attributes.data : {};

      const percentage = Number(customerCommission?.percentage) || 0;
      const minimumCents = Number(customerCommission?.minimum_amount) || 0;

      const percentageCents = Math.round((subtotalCents * percentage) / 100);
      const feeCents = Math.max(percentageCents, minimumCents);

      res
        .status(200)
        .set('Content-Type', 'application/transit+json')
        .send(serialize({ data: { feeCents, percentage, minimumCents, processingFeeCents: PROCESSING_FEE_CENTS } }))
        .end();
    })
    .catch(e => handleError(res, e));
};
