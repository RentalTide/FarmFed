const settingsStore = require('./settingsStore');

const NAMESPACE = 'listing-shuffle-settings';

const DEFAULT_SETTINGS = {
  // When true, the search page's default browse order is the per-day random
  // order (see src/containers/SearchPage/SearchPage.duck.js). Keep this off
  // until the `sortRandom` search schema exists and the job has run once.
  enabled: false,
  // Summary of the most recent shuffle run: { at, total, updated, failures }
  lastRun: null,
};

const getListingShuffleSettings = () => {
  const data = settingsStore.get(NAMESPACE) || {};
  return {
    enabled: typeof data.enabled === 'boolean' ? data.enabled : DEFAULT_SETTINGS.enabled,
    lastRun: data.lastRun || DEFAULT_SETTINGS.lastRun,
  };
};

const setListingShuffleEnabled = async enabled => {
  const current = getListingShuffleSettings();
  const data = { ...current, enabled, updatedAt: new Date().toISOString() };
  await settingsStore.set(NAMESPACE, data);
  return data;
};

const recordListingShuffleRun = async run => {
  const current = getListingShuffleSettings();
  const data = { ...current, lastRun: { ...run, at: new Date().toISOString() } };
  await settingsStore.set(NAMESPACE, data);
  return data;
};

module.exports = {
  getListingShuffleSettings,
  setListingShuffleEnabled,
  recordListingShuffleRun,
};
