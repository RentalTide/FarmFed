const { getSdk, handleError } = require('../api-util/sdk');
const { registerToken, unregisterToken } = require('../api-util/deviceTokens');

/**
 * POST /api/device-tokens — register a push token for the current user
 * Body: { token, platform }
 */
const registerHandler = async (req, res) => {
  const sdk = getSdk(req, res);

  try {
    const { token, platform } = req.body || {};
    if (!token) {
      return res.status(400).json({ error: 'token is required' });
    }

    const response = await sdk.currentUser.show({ include: [] });
    const userId = response.data.data.id.uuid;

    registerToken({ userId, token, platform });

    res.status(200).json({ success: true });
  } catch (e) {
    handleError(res, e);
  }
};

/**
 * DELETE /api/device-tokens — unregister a push token for the current user
 * Body: { token }
 */
const unregisterHandler = async (req, res) => {
  const sdk = getSdk(req, res);

  try {
    const { token } = req.body || {};
    if (!token) {
      return res.status(400).json({ error: 'token is required' });
    }

    const response = await sdk.currentUser.show({ include: [] });
    const userId = response.data.data.id.uuid;

    unregisterToken({ userId, token });

    res.status(200).json({ success: true });
  } catch (e) {
    handleError(res, e);
  }
};

module.exports = { registerHandler, unregisterHandler };
