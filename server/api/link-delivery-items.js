const { getIntegrationSdk, handleError } = require('../api-util/sdk');

/**
 * POST /api/link-delivery-items
 * Body: { deliveryTransactionId, itemTransactionIds: string[] }
 *
 * Records which item (default-purchase) transactions belong to a delivery
 * transaction's order group, by storing them in the delivery transaction's
 * metadata. Reconciliation later reads this list to decide whether the whole
 * order was denied. Merges with any existing ids so "add to existing order"
 * can append new items to the same delivery.
 */
module.exports = async (req, res) => {
  try {
    const { deliveryTransactionId, itemTransactionIds } = req.body || {};
    if (!deliveryTransactionId || !Array.isArray(itemTransactionIds)) {
      return res
        .status(400)
        .json({ error: 'deliveryTransactionId and itemTransactionIds[] are required' });
    }

    const integrationSdk = getIntegrationSdk();

    // Merge with any ids already linked (idempotent + supports add-to-order).
    const existingResp = await integrationSdk.transactions.show({ id: deliveryTransactionId });
    const existing = existingResp.data.data?.attributes?.metadata?.itemTransactionIds || [];
    const merged = Array.from(new Set([...existing, ...itemTransactionIds].filter(Boolean)));

    await integrationSdk.transactions.updateMetadata({
      id: deliveryTransactionId,
      metadata: { itemTransactionIds: merged },
    });

    return res.status(200).json({ ok: true, itemTransactionIds: merged });
  } catch (e) {
    handleError(res, e);
  }
};
