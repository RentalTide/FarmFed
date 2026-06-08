const settingsStore = require('./settingsStore');

// Admin push announcements (the "Push Notification Center"). Stored in the
// Redis-backed settingsStore. Each announcement:
//   { id, title, body, link, createdAt, active, sentCount }
const NAMESPACE = 'announcements';
const MAX_KEPT = 50;

const getAll = () => {
  const data = settingsStore.get(NAMESPACE) || {};
  return Array.isArray(data.announcements) ? data.announcements : [];
};

const getActive = () => getAll().filter(a => a.active !== false);

/**
 * Prepend a new announcement and persist (trimmed to the most recent MAX_KEPT).
 */
const add = async announcement => {
  const announcements = [announcement, ...getAll()].slice(0, MAX_KEPT);
  await settingsStore.set(NAMESPACE, { announcements, updatedAt: new Date().toISOString() });
  return announcement;
};

/**
 * Toggle an announcement's `active` flag (e.g. dismiss it from the in-app banner).
 */
const setActive = async (id, active) => {
  const announcements = getAll().map(a => (a.id === id ? { ...a, active } : a));
  await settingsStore.set(NAMESPACE, { announcements, updatedAt: new Date().toISOString() });
};

module.exports = { getAll, getActive, add, setActive };
