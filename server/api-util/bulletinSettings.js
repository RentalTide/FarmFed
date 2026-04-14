const settingsStore = require('./settingsStore');

const NAMESPACE = 'bulletin-settings';

const getBulletins = () => {
  const data = settingsStore.get(NAMESPACE) || {};
  return Array.isArray(data.bulletins) ? data.bulletins : [];
};

const setBulletins = async bulletins => {
  const data = {
    bulletins: bulletins || [],
    updatedAt: new Date().toISOString(),
  };
  await settingsStore.set(NAMESPACE, data);
};

module.exports = { getBulletins, setBulletins };
