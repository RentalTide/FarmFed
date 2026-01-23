const fs = require('fs');
const path = require('path');

const SETTINGS_PATH = path.resolve(__dirname, '../data/delivery-settings.json');

const getDeliveryRate = () => {
  try {
    const data = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    if (Number.isInteger(data.deliveryRatePerMileCents) && data.deliveryRatePerMileCents > 0) {
      return data.deliveryRatePerMileCents;
    }
  } catch (e) {
    // File missing or invalid - fall through to env var
  }

  const envRate = parseInt(process.env.DELIVERY_RATE_PER_MILE_CENTS, 10);
  return Number.isInteger(envRate) && envRate > 0 ? envRate : 0;
};

const setDeliveryRate = rateInCents => {
  const data = {
    deliveryRatePerMileCents: rateInCents,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2), 'utf8');
};

module.exports = { getDeliveryRate, setDeliveryRate };
