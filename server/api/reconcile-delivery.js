const { getIntegrationSdk, handleError } = require('../api-util/sdk');
const {
  reconcileDeliveryOrder,
  reconcileAllOpenDeliveries,
} = require('../api-util/deliveryReconcile');

/**
 * POST /api/reconcile-delivery
 * Body: { deliveryTransactionId? }
 *
 * Reconciles a delivery transaction against the item transactions in its order
 * group: refunds it if every item was denied, captures it if at least one item
 * was accepted, or waits if items are still pending. If no deliveryTransactionId
 * is given, reconciles ALL open delivery transactions (used by the cron job).
 *
 * Idempotent and safe to call repeatedly.
 */
module.exports = async (req, res) => {
  try {
    const { deliveryTransactionId } = req.body || {};
    const integrationSdk = getIntegrationSdk();

    if (deliveryTransactionId) {
      const result = await reconcileDeliveryOrder(integrationSdk, deliveryTransactionId);
      return res.status(200).json(result);
    }

    const results = await reconcileAllOpenDeliveries(integrationSdk);
    return res.status(200).json({ reconciled: results.length, results });
  } catch (e) {
    handleError(res, e);
  }
};
