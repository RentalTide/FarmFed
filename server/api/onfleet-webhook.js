const { getIntegrationSdk } = require('../api-util/sdk');
const { isConfigured } = require('../api-util/onfleet');

// OnFleet webhook trigger IDs
// 0 = taskStart, 1 = taskETA, 2 = taskArrival, 3 = taskCompleted, 4 = taskFailed
const TRIGGER_TASK_COMPLETED = 3;

/**
 * POST /api/onfleet-webhook
 *
 * Receives webhook callbacks from OnFleet when task status changes.
 * On task completion (triggerId=3), transitions the linked Sharetribe
 * transaction to "delivered" via operator-mark-delivered (requires Integration API).
 *
 * OnFleet webhook payload:
 * {
 *   triggerId: number,
 *   taskId: string,
 *   data: { task: { metadata: [{ name, type, value }], ... } }
 * }
 *
 * Also handles OnFleet's webhook validation check:
 * OnFleet sends a check value — we respond 200 with it to confirm.
 */
module.exports = async (req, res) => {
  try {
    // If OnFleet is not configured, silently accept the webhook
    if (!isConfigured()) {
      return res.status(200).json({ ok: true });
    }

    // OnFleet validation: if no body or just a check field, respond 200
    if (!req.body || req.body.check) {
      return res.status(200).json(req.body?.check || 'ok');
    }

    const { triggerId, data } = req.body;

    // Only process task completion events
    if (triggerId !== TRIGGER_TASK_COMPLETED) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    // Extract transactionId from task metadata
    const taskMetadata = data?.task?.metadata || [];
    const txMeta = taskMetadata.find(m => m.name === 'transactionId');
    const transactionId = txMeta?.value;

    if (!transactionId) {
      console.warn('onfleet-webhook: No transactionId in task metadata');
      return res.status(200).json({ ok: true, warning: 'no transactionId' });
    }

    // Transition the transaction to delivered via Integration SDK.
    // This requires Integration API access enabled in Sharetribe Console
    // (Build -> Applications -> enable Integration API for your client).
    try {
      const integrationSdk = getIntegrationSdk();
      await integrationSdk.transactions.transition({
        id: transactionId,
        transition: 'transition/operator-mark-delivered',
        params: {},
      });
      console.log(`onfleet-webhook: Transaction ${transactionId} marked as delivered`);
    } catch (integrationErr) {
      // Integration API may not be available (403).
      // Log so the operator can mark it delivered manually.
      console.error(
        `onfleet-webhook: Could not auto-transition ${transactionId} to delivered.`,
        `Mark it manually in Sharetribe Console. Error: ${integrationErr.message}`
      );
      return res.status(200).json({
        ok: false,
        transactionId,
        warning: 'Integration API unavailable — mark delivered manually in Console',
      });
    }

    return res.status(200).json({ ok: true, transactionId });
  } catch (e) {
    console.error('onfleet-webhook error:', e);
    // Always respond 200 to prevent OnFleet from retrying endlessly
    return res.status(200).json({ ok: false, error: e.message });
  }
};
