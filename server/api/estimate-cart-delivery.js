const { getSdk, getIntegrationSdk } = require('../api-util/sdk');
const { geocodeAddress } = require('../api-util/geocode');
const { haversineDistanceMiles } = require('../api-util/distance');
const { getDeliveryRate } = require('../api-util/deliveryRate');

/**
 * Calculate the optimal route distance through a set of supplier locations
 * ending at the buyer's location. Uses brute-force permutation for small sets
 * and nearest-neighbor heuristic for larger ones.
 *
 * @param {Array<{lat: number, lng: number}>} supplierLocations - Unique supplier coordinates
 * @param {{lat: number, lng: number}} buyerLocation - Buyer coordinates (final stop)
 * @returns {number} Total route distance in miles
 */
const calculateRouteDistance = (supplierLocations, buyerLocation) => {
  if (supplierLocations.length === 0) return 0;
  if (supplierLocations.length === 1) {
    return haversineDistanceMiles(
      supplierLocations[0].lat, supplierLocations[0].lng,
      buyerLocation.lat, buyerLocation.lng
    );
  }

  // For small sets (≤ 7), find optimal order via brute-force permutations
  if (supplierLocations.length <= 7) {
    const permutations = getPermutations(supplierLocations);
    let minDistance = Infinity;

    for (const perm of permutations) {
      let dist = 0;
      for (let i = 0; i < perm.length - 1; i++) {
        dist += haversineDistanceMiles(
          perm[i].lat, perm[i].lng,
          perm[i + 1].lat, perm[i + 1].lng
        );
      }
      // Last supplier to buyer
      dist += haversineDistanceMiles(
        perm[perm.length - 1].lat, perm[perm.length - 1].lng,
        buyerLocation.lat, buyerLocation.lng
      );
      if (dist < minDistance) {
        minDistance = dist;
      }
    }
    return minDistance;
  }

  // For larger sets, use nearest-neighbor heuristic starting from farthest supplier
  return nearestNeighborRoute(supplierLocations, buyerLocation);
};

/**
 * Generate all permutations of an array.
 */
const getPermutations = arr => {
  if (arr.length <= 1) return [arr];
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of getPermutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
};

/**
 * Nearest-neighbor heuristic: start from the supplier farthest from buyer,
 * always visit the nearest unvisited supplier next, end at buyer.
 */
const nearestNeighborRoute = (suppliers, buyer) => {
  const visited = new Set();

  // Start at the supplier farthest from buyer
  let maxDist = -1;
  let startIdx = 0;
  for (let i = 0; i < suppliers.length; i++) {
    const d = haversineDistanceMiles(
      suppliers[i].lat, suppliers[i].lng,
      buyer.lat, buyer.lng
    );
    if (d > maxDist) {
      maxDist = d;
      startIdx = i;
    }
  }

  let totalDist = 0;
  let current = suppliers[startIdx];
  visited.add(startIdx);

  while (visited.size < suppliers.length) {
    let nearest = null;
    let nearestDist = Infinity;
    let nearestIdx = -1;

    for (let i = 0; i < suppliers.length; i++) {
      if (visited.has(i)) continue;
      const d = haversineDistanceMiles(
        current.lat, current.lng,
        suppliers[i].lat, suppliers[i].lng
      );
      if (d < nearestDist) {
        nearestDist = d;
        nearest = suppliers[i];
        nearestIdx = i;
      }
    }

    totalDist += nearestDist;
    current = nearest;
    visited.add(nearestIdx);
  }

  // Final leg: last supplier to buyer
  totalDist += haversineDistanceMiles(
    current.lat, current.lng,
    buyer.lat, buyer.lng
  );

  return totalDist;
};

/**
 * Deduplicate locations that are within a threshold distance (0.1 miles).
 */
const deduplicateLocations = locations => {
  const unique = [];
  for (const loc of locations) {
    const isDuplicate = unique.some(
      u => haversineDistanceMiles(u.lat, u.lng, loc.lat, loc.lng) < 0.1
    );
    if (!isDuplicate) {
      unique.push(loc);
    }
  }
  return unique;
};

/**
 * POST /api/estimate-cart-delivery
 *
 * Estimates total delivery fee for a cart with multiple items using
 * a consecutive route: supplier1 → supplier2 → ... → buyer.
 *
 * Body: { listingIds: string[], shippingAddress: { line1, city, state, postalCode, country } }
 * Response: { totalDistanceMiles, totalFeeCents, rateCentsPerMile }
 */
module.exports = async (req, res) => {
  try {
    const { listingIds, shippingAddress } = req.body;

    if (!listingIds || !listingIds.length || !shippingAddress) {
      return res.status(400).json({ error: 'listingIds and shippingAddress are required' });
    }

    const rateCentsPerMile = getDeliveryRate();
    if (!rateCentsPerMile || rateCentsPerMile <= 0) {
      return res.json({ totalDistanceMiles: 0, totalFeeCents: 0, rateCentsPerMile: 0 });
    }

    // Fetch listings with authors — try Integration SDK (for protectedData access),
    // fall back to regular SDK if Integration API is not available
    let listingResults = [];
    try {
      const integrationSdk = getIntegrationSdk();
      const listingPromises = listingIds.map(id =>
        integrationSdk.listings.show({ id, include: ['author'] }).then(response => {
          const listing = response.data.data;
          const included = response.data.included || [];
          const author = included.find(
            r => r.type === 'user' && r.id.uuid === listing.relationships?.author?.data?.id?.uuid
          );
          return { listing, author };
        })
      );
      listingResults = await Promise.all(listingPromises);
    } catch (integrationError) {
      // Integration API not available (403) — fall back to regular SDK
      const sdk = getSdk(req, res);
      const listingPromises = listingIds.map(id =>
        sdk.listings.show({ id }).then(response => ({
          listing: response.data.data,
          author: null,
        }))
      );
      listingResults = await Promise.all(listingPromises);
    }

    // Extract supplier locations: listing geolocation → author protectedData.address → listing address
    const locationPromises = listingResults.map(async ({ listing, author }) => {
      // 1. Try listing geolocation
      const geo = listing.attributes.geolocation;
      if (geo && geo.lat && geo.lng) {
        return { lat: geo.lat, lng: geo.lng };
      }
      // 2. Try author's protectedData.address (available via Integration SDK)
      const authorAddress = author?.attributes?.profile?.protectedData?.address;
      if (authorAddress && authorAddress.lat && authorAddress.lng) {
        return { lat: authorAddress.lat, lng: authorAddress.lng };
      }
      if (authorAddress && authorAddress.street) {
        try {
          return await geocodeAddress({
            line1: authorAddress.street,
            city: authorAddress.city,
            state: authorAddress.state,
            postalCode: authorAddress.zip,
            country: authorAddress.country,
          });
        } catch (e) {
          // Fall through to next fallback
        }
      }
      // 3. Try listing publicData.location.address
      const locationAddress = listing.attributes.publicData?.location?.address;
      if (locationAddress) {
        try {
          return await geocodeAddress({ line1: locationAddress });
        } catch (e) {
          return null;
        }
      }
      return null;
    });
    const supplierLocations = (await Promise.all(locationPromises)).filter(Boolean);

    if (supplierLocations.length === 0) {
      return res.json({ totalDistanceMiles: 0, totalFeeCents: 0, rateCentsPerMile });
    }

    // Deduplicate locations (same supplier / very close suppliers)
    const uniqueLocations = deduplicateLocations(supplierLocations);

    // Geocode buyer address
    const buyerLocation = await geocodeAddress(shippingAddress);

    // Calculate optimal route distance
    const totalDistanceMiles = calculateRouteDistance(uniqueLocations, buyerLocation);
    const totalFeeCents = Math.round(totalDistanceMiles * rateCentsPerMile);

    return res.json({
      totalDistanceMiles: Math.round(totalDistanceMiles * 10) / 10,
      totalFeeCents,
      rateCentsPerMile,
    });
  } catch (e) {
    console.error('estimate-cart-delivery error:', e);
    return res.status(500).json({ error: 'Failed to estimate delivery' });
  }
};
