const settingsStore = require('./settingsStore');
const { geocodeAddress } = require('./geocode');

const NAMESPACE = 'delivery-settings';

// Default FarmFed hub-and-spoke origin: all deliveries originate from this
// address. Coordinates are pre-computed from Mapbox geocoding so the system
// works even if Mapbox is briefly unavailable.
const DEFAULT_HUB_ORIGIN = {
  line1: '320B Trousdale Ferry Pike',
  city: 'Lebanon',
  state: 'TN',
  postalCode: '37087',
  country: 'US',
  lat: 36.20888,
  lng: -86.27027,
};

const sanitizeHubOrigin = origin => {
  if (!origin || typeof origin !== 'object') return null;
  const { line1, city, state, postalCode, country, lat, lng } = origin;
  if (!line1 || !city || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    line1: String(line1),
    city: String(city),
    state: state ? String(state) : '',
    postalCode: postalCode ? String(postalCode) : '',
    country: country ? String(country) : 'US',
    lat,
    lng,
  };
};

const getDeliverySettings = () => {
  const stored = settingsStore.get(NAMESPACE) || {};
  const ratePerMile = Number.isInteger(stored.deliveryRatePerMileCents) && stored.deliveryRatePerMileCents > 0
    ? stored.deliveryRatePerMileCents
    : (parseInt(process.env.DELIVERY_RATE_PER_MILE_CENTS, 10) || 0);
  const flatFee = Number.isInteger(stored.deliveryFlatFeeCents) && stored.deliveryFlatFeeCents > 0
    ? stored.deliveryFlatFeeCents
    : 0;
  const hubOrigin = sanitizeHubOrigin(stored.hubOrigin) || DEFAULT_HUB_ORIGIN;
  return {
    deliveryRatePerMileCents: ratePerMile,
    deliveryFlatFeeCents: flatFee,
    hubOrigin,
  };
};

const getDeliveryRate = () => getDeliverySettings().deliveryRatePerMileCents;

const getHubOrigin = () => getDeliverySettings().hubOrigin;

const setDeliverySettings = async ({ deliveryRatePerMileCents, deliveryFlatFeeCents, hubOrigin }) => {
  const current = settingsStore.get(NAMESPACE) || {};
  const data = {
    deliveryRatePerMileCents: Number.isInteger(deliveryRatePerMileCents)
      ? deliveryRatePerMileCents
      : (current.deliveryRatePerMileCents || 0),
    deliveryFlatFeeCents: Number.isInteger(deliveryFlatFeeCents)
      ? deliveryFlatFeeCents
      : (current.deliveryFlatFeeCents || 0),
    hubOrigin: sanitizeHubOrigin(hubOrigin) || sanitizeHubOrigin(current.hubOrigin) || null,
    updatedAt: new Date().toISOString(),
  };
  await settingsStore.set(NAMESPACE, data);
};

const setDeliveryRate = rateInCents => {
  const current = getDeliverySettings();
  return setDeliverySettings({
    deliveryRatePerMileCents: rateInCents,
    deliveryFlatFeeCents: current.deliveryFlatFeeCents,
    hubOrigin: current.hubOrigin,
  });
};

// Resolve hub-origin coordinates from an address. If lat/lng provided, trust
// them; otherwise geocode line1 + city + state + postalCode via Mapbox.
const resolveHubOrigin = async ({ line1, city, state, postalCode, country, lat, lng }) => {
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { line1, city, state, postalCode, country: country || 'US', lat, lng };
  }
  const coords = await geocodeAddress({ line1, city, state, postalCode, country });
  return { line1, city, state, postalCode, country: country || 'US', lat: coords.lat, lng: coords.lng };
};

module.exports = {
  getDeliveryRate,
  getDeliverySettings,
  getHubOrigin,
  setDeliveryRate,
  setDeliverySettings,
  resolveHubOrigin,
  DEFAULT_HUB_ORIGIN,
};
