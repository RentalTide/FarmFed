const fs = require('fs');
const path = require('path');

const SETTINGS_PATH = path.resolve(__dirname, '../data/geofence-settings.json');

const readSettings = () => {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
  } catch (e) {
    return {};
  }
};

// Backward-compatible: returns the default polygon (used by existing code)
const getGeofence = () => {
  const data = readSettings();
  // Support new dual format: use consumerPolygon if present, else fall back to polygon
  return data.consumerPolygon || data.polygon || null;
};

const setGeofence = polygon => {
  const data = readSettings();
  // When setting via old API, update both polygon and consumerPolygon
  data.polygon = polygon || null;
  data.consumerPolygon = polygon || null;
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2), 'utf8');
};

// New dual geofence getters/setters
const getVendorPolygon = () => {
  const data = readSettings();
  return data.vendorPolygon || null;
};

const getConsumerPolygon = () => {
  const data = readSettings();
  return data.consumerPolygon || data.polygon || null;
};

const setDualGeofence = ({ vendorPolygon, consumerPolygon }) => {
  const data = readSettings();
  data.vendorPolygon = vendorPolygon || null;
  data.consumerPolygon = consumerPolygon || null;
  // Keep polygon in sync with consumerPolygon for backward compat
  data.polygon = consumerPolygon || null;
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2), 'utf8');
};

module.exports = {
  getGeofence,
  setGeofence,
  getVendorPolygon,
  getConsumerPolygon,
  setDualGeofence,
};
