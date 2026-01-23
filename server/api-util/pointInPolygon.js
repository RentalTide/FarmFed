/**
 * Ray-casting algorithm to determine if a point is inside a polygon.
 * Handles GeoJSON coordinate order: [lng, lat]
 *
 * @param {number} lat - Latitude of the point
 * @param {number} lng - Longitude of the point
 * @param {Array} coordinates - GeoJSON Polygon coordinates array (first ring is outer boundary)
 * @returns {boolean}
 */
const isPointInPolygon = (lat, lng, coordinates) => {
  // GeoJSON Polygon coordinates[0] is the outer ring
  const ring = coordinates[0];
  if (!ring || ring.length < 4) {
    return false;
  }

  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    // GeoJSON coordinates are [lng, lat]
    const xi = ring[i][1]; // lat
    const yi = ring[i][0]; // lng
    const xj = ring[j][1]; // lat
    const yj = ring[j][0]; // lng

    const intersect =
      yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
};

module.exports = { isPointInPolygon };
