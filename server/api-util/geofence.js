const settingsStore = require('./settingsStore');

const NAMESPACE = 'geofence-settings';

const readSettings = () => settingsStore.get(NAMESPACE) || {};

const writeSettings = async data => {
  await settingsStore.set(NAMESPACE, { ...data, updatedAt: new Date().toISOString() });
};

const getGeofence = () => {
  const data = readSettings();
  return data.consumerPolygon || data.polygon || null;
};

const setGeofence = async polygon => {
  const data = readSettings();
  await writeSettings({
    ...data,
    polygon: polygon || null,
    consumerPolygon: polygon || null,
  });
};

const getVendorPolygon = () => readSettings().vendorPolygon || null;

const getConsumerPolygon = () => {
  const data = readSettings();
  return data.consumerPolygon || data.polygon || null;
};

const setDualGeofence = async ({ vendorPolygon, consumerPolygon }) => {
  const data = readSettings();
  await writeSettings({
    ...data,
    vendorPolygon: vendorPolygon || null,
    consumerPolygon: consumerPolygon || null,
    polygon: consumerPolygon || null,
  });
};

module.exports = {
  getGeofence,
  setGeofence,
  getVendorPolygon,
  getConsumerPolygon,
  setDualGeofence,
};
