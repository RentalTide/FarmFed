const { getDeliveryRate, setDeliveryRate } = require('../api-util/deliveryRate');
const { getSdk, handleError } = require('../api-util/sdk');

const getHandler = (req, res) => {
  const rate = getDeliveryRate();
  res.status(200).json({ deliveryRatePerMileCents: rate });
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

      const { deliveryRatePerMileCents } = req.body || {};
      const rate = parseInt(deliveryRatePerMileCents, 10);

      if (!Number.isInteger(rate) || rate < 0) {
        return res.status(400).json({ error: 'Invalid rate: must be a non-negative integer (cents per mile)' });
      }

      setDeliveryRate(rate);
      res.status(200).json({ deliveryRatePerMileCents: rate });
    })
    .catch(e => {
      handleError(res, e);
    });
};

module.exports = { getHandler, putHandler };
