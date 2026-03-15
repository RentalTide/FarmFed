const fs = require('fs');
const path = require('path');

const DATA_PATH = path.resolve(__dirname, '../data/device-tokens.json');

const getTokens = () => {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    return Array.isArray(data.tokens) ? data.tokens : [];
  } catch (e) {
    return [];
  }
};

const setTokens = tokens => {
  fs.writeFileSync(DATA_PATH, JSON.stringify({ tokens: tokens || [] }, null, 2), 'utf8');
};

/**
 * Register a push token for a user.
 * Each entry: { userId, token, platform, createdAt }
 * Prevents duplicates (same userId + token).
 */
const registerToken = ({ userId, token, platform }) => {
  const tokens = getTokens();
  const exists = tokens.some(t => t.userId === userId && t.token === token);
  if (!exists) {
    tokens.push({
      userId,
      token,
      platform: platform || 'ios',
      createdAt: new Date().toISOString(),
    });
    setTokens(tokens);
  }
};

/**
 * Remove a push token (e.g. on logout).
 */
const unregisterToken = ({ userId, token }) => {
  const tokens = getTokens();
  const filtered = tokens.filter(t => !(t.userId === userId && t.token === token));
  setTokens(filtered);
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
