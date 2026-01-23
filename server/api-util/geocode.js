const https = require('https');

/**
 * Geocode a shipping address using the Mapbox Geocoding API.
 *
 * @param {Object} address
 * @param {string} address.line1
 * @param {string} [address.city]
 * @param {string} [address.state]
 * @param {string} [address.postalCode]
 * @param {string} [address.country]
 * @returns {Promise<{lat: number, lng: number}>}
 */
const geocodeAddress = ({ line1, city, state, postalCode, country }) => {
  const token = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
  if (!token) {
    return Promise.reject(new Error('Mapbox access token not configured'));
  }

  const parts = [line1, city, state, postalCode, country].filter(Boolean);
  const query = encodeURIComponent(parts.join(', '));
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${token}&limit=1`;

  return new Promise((resolve, reject) => {
    https
      .get(url, res => {
        let data = '';
        res.on('data', chunk => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.features && json.features.length > 0) {
              const [lng, lat] = json.features[0].center;
              resolve({ lat, lng });
            } else {
              reject(new Error('No geocoding results found'));
            }
          } catch (e) {
            reject(new Error('Failed to parse geocoding response'));
          }
        });
      })
      .on('error', reject);
  });
};

module.exports = { geocodeAddress };
