const fs = require('fs');
const path = require('path');

const SETTINGS_PATH = path.resolve(__dirname, '../data/tax-settings.json');

const DEFAULT_SETTINGS = {
  taxRate: 0.07,
  taxLabel: 'Sales Tax',
  enabled: true,
};

const getTaxSettings = () => {
  try {
    const data = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    return {
      taxRate: typeof data.taxRate === 'number' ? data.taxRate : DEFAULT_SETTINGS.taxRate,
      taxLabel: data.taxLabel || DEFAULT_SETTINGS.taxLabel,
      enabled: typeof data.enabled === 'boolean' ? data.enabled : DEFAULT_SETTINGS.enabled,
    };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
};

const setTaxSettings = settings => {
  const data = {
    taxRate: settings.taxRate,
    taxLabel: settings.taxLabel,
    enabled: settings.enabled,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2), 'utf8');
};

module.exports = { getTaxSettings, setTaxSettings };
