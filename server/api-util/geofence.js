const fs = require('fs');
const path = require('path');

const SETTINGS_PATH = path.resolve(__dirname, '../data/geofence-settings.json');

const getGeofence = () => {
  try {
    const data = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    return data.polygon || null;
  } catch (e) {
    return null;
  }
};

const setGeofence = polygon => {
  const data = {
    polygon: polygon || null,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2), 'utf8');
};

module.exports = { getGeofence, setGeofence };
