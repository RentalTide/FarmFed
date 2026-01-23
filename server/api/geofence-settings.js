const { getGeofence, setGeofence } = require('../api-util/geofence');
const { getSdk, handleError } = require('../api-util/sdk');

const getHandler = (req, res) => {
  const polygon = getGeofence();
  res.status(200).json({ polygon });
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

      const { polygon } = req.body || {};

      // Allow null to clear the geofence
      if (polygon === null) {
        setGeofence(null);
        return res.status(200).json({ polygon: null });
      }

      // Validate GeoJSON Polygon shape
      if (
        !polygon ||
        polygon.type !== 'Polygon' ||
        !Array.isArray(polygon.coordinates) ||
        !Array.isArray(polygon.coordinates[0]) ||
        polygon.coordinates[0].length < 4
      ) {
        return res.status(400).json({ error: 'Invalid polygon: must be a GeoJSON Polygon with at least 4 coordinates' });
      }

      setGeofence(polygon);
      res.status(200).json({ polygon });
    })
    .catch(e => {
      handleError(res, e);
    });
};

module.exports = { getHandler, putHandler };
