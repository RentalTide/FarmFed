const settingsStore = require('./settingsStore');

const NAMESPACE = 'tax-settings';

const DEFAULT_SETTINGS = {
  taxRate: 0.07,
  taxLabel: 'Sales Tax',
  enabled: true,
};

const getTaxSettings = () => {
  const data = settingsStore.get(NAMESPACE) || {};
  return {
    taxRate: typeof data.taxRate === 'number' ? data.taxRate : DEFAULT_SETTINGS.taxRate,
    taxLabel: data.taxLabel || DEFAULT_SETTINGS.taxLabel,
    enabled: typeof data.enabled === 'boolean' ? data.enabled : DEFAULT_SETTINGS.enabled,
  };
};

const setTaxSettings = async settings => {
  const data = {
    taxRate: settings.taxRate,
    taxLabel: settings.taxLabel,
    enabled: settings.enabled,
    updatedAt: new Date().toISOString(),
  };
  await settingsStore.set(NAMESPACE, data);
};

module.exports = { getTaxSettings, setTaxSettings };
