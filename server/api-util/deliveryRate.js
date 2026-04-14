const settingsStore = require('./settingsStore');

const NAMESPACE = 'delivery-settings';

const getDeliverySettings = () => {
  const stored = settingsStore.get(NAMESPACE) || {};
  const ratePerMile = Number.isInteger(stored.deliveryRatePerMileCents) && stored.deliveryRatePerMileCents > 0
    ? stored.deliveryRatePerMileCents
    : (parseInt(process.env.DELIVERY_RATE_PER_MILE_CENTS, 10) || 0);
  const flatFee = Number.isInteger(stored.deliveryFlatFeeCents) && stored.deliveryFlatFeeCents > 0
    ? stored.deliveryFlatFeeCents
    : 0;
  return {
    deliveryRatePerMileCents: ratePerMile,
    deliveryFlatFeeCents: flatFee,
  };
};

const getDeliveryRate = () => getDeliverySettings().deliveryRatePerMileCents;

const setDeliverySettings = async ({ deliveryRatePerMileCents, deliveryFlatFeeCents }) => {
  const data = {
    deliveryRatePerMileCents: Number.isInteger(deliveryRatePerMileCents) ? deliveryRatePerMileCents : 0,
    deliveryFlatFeeCents: Number.isInteger(deliveryFlatFeeCents) ? deliveryFlatFeeCents : 0,
    updatedAt: new Date().toISOString(),
  };
  await settingsStore.set(NAMESPACE, data);
};

const setDeliveryRate = rateInCents => {
  const current = getDeliverySettings();
  return setDeliverySettings({
    deliveryRatePerMileCents: rateInCents,
    deliveryFlatFeeCents: current.deliveryFlatFeeCents,
  });
};

module.exports = { getDeliveryRate, getDeliverySettings, setDeliveryRate, setDeliverySettings };
