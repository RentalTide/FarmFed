const fs = require('fs');
const path = require('path');

const SETTINGS_PATH = path.resolve(__dirname, '../data/bulletin-settings.json');

const getBulletins = () => {
  try {
    const data = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    return Array.isArray(data.bulletins) ? data.bulletins : [];
  } catch (e) {
    return [];
  }
};

const setBulletins = bulletins => {
  const data = {
    bulletins: bulletins || [],
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2), 'utf8');
};

module.exports = { getBulletins, setBulletins };
