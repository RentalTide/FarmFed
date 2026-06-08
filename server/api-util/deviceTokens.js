const settingsStore = require('./settingsStore');

// Device push tokens are stored in the Redis-backed settingsStore (with JSON
// file fallback for local dev) so the push audience survives Heroku deploys —
// the previous file-only storage was wiped on every dyno restart.
const NAMESPACE = 'device-tokens';

const getTokens = () => {
  const data = settingsStore.get(NAMESPACE) || {};
  return Array.isArray(data.tokens) ? data.tokens : [];
};

const setTokens = tokens => settingsStore.set(NAMESPACE, { tokens: tokens || [] });

/**
 * Register a push token for a user.
 * Each entry: { userId, token, platform, createdAt }
 * Prevents duplicates (same userId + token).
 */
const registerToken = async ({ userId, token, platform }) => {
  const tokens = getTokens();
  const exists = tokens.some(t => t.userId === userId && t.token === token);
  if (!exists) {
    tokens.push({
      userId,
      token,
      platform: platform || 'ios',
      createdAt: new Date().toISOString(),
    });
    await setTokens(tokens);
  }
};

/**
 * Remove a push token (e.g. on logout).
 */
const unregisterToken = async ({ userId, token }) => {
  const tokens = getTokens();
  const filtered = tokens.filter(t => !(t.userId === userId && t.token === token));
  await setTokens(filtered);
};

/**
 * Get all push tokens for a given user.
 */
const getTokensForUser = userId => {
  return getTokens().filter(t => t.userId === userId);
};

/**
 * Get push tokens for multiple user IDs.
 */
const getTokensForUsers = userIds => {
  const idSet = new Set(userIds);
  return getTokens().filter(t => idSet.has(t.userId));
};

module.exports = { getTokens, setTokens, registerToken, unregisterToken, getTokensForUser, getTokensForUsers };
