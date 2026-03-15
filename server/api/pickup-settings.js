const { getPickupSettings, setPickupSettings, getNextPickupDate, isCutoffPassed } = require('../api-util/pickupSchedule');
const { getSdk, handleError } = require('../api-util/sdk');

const VALID_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const getHandler = (req, res) => {
  const settings = getPickupSettings();
  const nextPickupDate = getNextPickupDate();
  const cutoffPassed = isCutoffPassed();
  res.status(200).json({ ...settings, nextPickupDate, cutoffPassed });
};

const putHandler = (req, res) => {
  const sdk = getSdk(req, res);

  sdk.currentUser
    .show({ include: [] })
    .then(response => {
      const currentUser = response.data.data;
      const isAdmin = currentUser?.attributes?.profile?.privateData?.isAdmin === true;

      if (!isAdmin) {
        return res.status(403).json({ error: 'Forbidden: admin access required' });
      }

      const { pickupDays, cutoffDay, cutoffTime } = req.body || {};

      if (!Array.isArray(pickupDays) || pickupDays.length === 0) {
        return res.status(400).json({ error: 'pickupDays must be a non-empty array' });
      }

      if (!pickupDays.every(d => VALID_DAYS.includes(d))) {
        return res.status(400).json({ error: 'Invalid pickup day' });
      }

      if (!VALID_DAYS.includes(cutoffDay)) {
        return res.status(400).json({ error: 'Invalid cutoff day' });
      }

      if (!/^\d{2}:\d{2}$/.test(cutoffTime)) {
        return res.status(400).json({ error: 'Invalid cutoff time format (expected HH:MM)' });
      }

      setPickupSettings({ pickupDays, cutoffDay, cutoffTime });
      const nextPickupDate = getNextPickupDate();
      res.status(200).json({ pickupDays, cutoffDay, cutoffTime, nextPickupDate });
    })
    .catch(e => handleError(res, e));
};

module.exports = { getHandler, putHandler };
