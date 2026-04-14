const { getDeliverySettings, setDeliverySettings } = require('../api-util/deliveryRate');
const { getSdk, handleError } = require('../api-util/sdk');

const getHandler = (req, res) => {
  res.status(200).json(getDeliverySettings());
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

      const current = getDeliverySettings();
      const body = req.body || {};

      const ratePerMileRaw = body.deliveryRatePerMileCents;
      const flatFeeRaw = body.deliveryFlatFeeCents;

      const ratePerMile =
        ratePerMileRaw === undefined ? current.deliveryRatePerMileCents : parseInt(ratePerMileRaw, 10);
      const flatFee =
        flatFeeRaw === undefined ? current.deliveryFlatFeeCents : parseInt(flatFeeRaw, 10);

      if (!Number.isInteger(ratePerMile) || ratePerMile < 0) {
        return res.status(400).json({ error: 'deliveryRatePerMileCents must be a non-negative integer' });
      }
      if (!Number.isInteger(flatFee) || flatFee < 0) {
        return res.status(400).json({ error: 'deliveryFlatFeeCents must be a non-negative integer' });
      }

      return setDeliverySettings({
        deliveryRatePerMileCents: ratePerMile,
        deliveryFlatFeeCents: flatFee,
      }).then(() => {
        res.status(200).json({
          deliveryRatePerMileCents: ratePerMile,
          deliveryFlatFeeCents: flatFee,
        });
      });
    })
    .catch(e => handleError(res, e));
};

module.exports = { getHandler, putHandler };
