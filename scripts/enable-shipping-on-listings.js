/* eslint-disable no-console */
/**
 * Bulk-enable shipping on existing listings.
 *
 * For each published / pendingApproval listing:
 *   1. Look up the author's profile address (protectedData.address).
 *   2. Geocode it to lat/lng via Mapbox.
 *   3. Stamp publicData.shippingEnabled = true,
 *      publicData.shippingPriceInSubunitsOneItem = 0,
 *      and listing.geolocation = { lat, lng } if not already set.
 *   4. Leaves pickupEnabled / pickupSchedule untouched.
 *
 * Default mode: DRY-RUN (prints what would change, makes no writes).
 * Pass --apply to perform the writes.
 */

require('dotenv').config();
const integrationSdkPkg = require('sharetribe-flex-integration-sdk');
const { geocodeAddress } = require('../server/api-util/geocode');

const APPLY = process.argv.includes('--apply');
const DEFAULT_SHIPPING_PRICE_CENTS = 0;
const STATES = 'published,pendingApproval';

const integrationSdk = integrationSdkPkg.createInstance({
  clientId: process.env.SHARETRIBE_INTEGRATION_API_CLIENT_ID,
  clientSecret: process.env.SHARETRIBE_INTEGRATION_API_CLIENT_SECRET,
});

const sleep = ms => new Promise(r => setTimeout(r, ms));

const fetchAllListings = async () => {
  const out = [];
  let page = 1;
  while (true) {
    const resp = await integrationSdk.listings.query({
      page,
      perPage: 100,
      states: STATES,
      include: ['author'],
    });
    const items = resp.data.data;
    const included = resp.data.included || [];
    items.forEach(l => {
      const authorId = l.relationships?.author?.data?.id?.uuid;
      const author = included.find(r => r.type === 'user' && r.id.uuid === authorId);
      out.push({ listing: l, author });
    });
    const meta = resp.data.meta;
    if (page >= meta.totalPages) break;
    page += 1;
  }
  return out;
};

const extractAuthorAddress = author => {
  const profile = author?.attributes?.profile || {};
  const pd = profile.protectedData || {};
  // Common shape: { address: { street, city, state, zip, country } }
  const a = pd.address;
  if (!a) return null;
  const line1 = a.street || a.line1 || a.streetAddress;
  const city = a.city;
  const state = a.state || a.region;
  const postalCode = a.zip || a.postalCode || a.postal_code;
  const country = a.country || 'US';
  if (!line1 || !city) return null;
  return { line1, city, state, postalCode, country, lat: a.lat, lng: a.lng };
};

(async () => {
  console.log(`Mode: ${APPLY ? 'APPLY (LIVE WRITES)' : 'DRY-RUN'}`);
  console.log(`Default shipping price: $${(DEFAULT_SHIPPING_PRICE_CENTS / 100).toFixed(2)}`);
  console.log();

  const all = await fetchAllListings();
  console.log(`Fetched ${all.length} listings (states=${STATES})\n`);

  const buckets = {
    willUpdate: [],
    alreadyEnabled: [],
    skippedNoAuthorAddress: [],
    skippedGeocodeFailed: [],
    failed: [],
  };

  for (const { listing, author } of all) {
    const id = listing.id.uuid;
    const title = listing.attributes.title;
    const authorEmail = author?.attributes?.email || '(no email)';
    const pd = listing.attributes.publicData || {};
    const existingGeo = listing.attributes.geolocation;

    if (pd.shippingEnabled === true) {
      buckets.alreadyEnabled.push({ id, title, authorEmail });
      continue;
    }

    const addr = extractAuthorAddress(author);
    if (!addr && !existingGeo) {
      buckets.skippedNoAuthorAddress.push({ id, title, authorEmail });
      continue;
    }

    let geo = existingGeo;
    if (!geo) {
      // Use lat/lng from address if present, else geocode
      if (Number.isFinite(addr.lat) && Number.isFinite(addr.lng)) {
        geo = { lat: addr.lat, lng: addr.lng };
      } else {
        try {
          geo = await geocodeAddress(addr);
          await sleep(100); // be nice to Mapbox
        } catch (e) {
          buckets.skippedGeocodeFailed.push({ id, title, authorEmail, addr, error: e.message });
          continue;
        }
      }
    }

    const updatePayload = {
      id,
      geolocation: geo,
      publicData: {
        shippingEnabled: true,
        shippingPriceInSubunitsOneItem: DEFAULT_SHIPPING_PRICE_CENTS,
      },
    };

    if (APPLY) {
      try {
        await integrationSdk.listings.update(updatePayload);
        buckets.willUpdate.push({ id, title, authorEmail, geo, applied: true });
      } catch (e) {
        buckets.failed.push({ id, title, authorEmail, error: e.message });
      }
    } else {
      buckets.willUpdate.push({ id, title, authorEmail, geo, applied: false });
    }
  }

  // Summary
  console.log('================ SUMMARY ================');
  console.log(`Will update:                ${buckets.willUpdate.length}`);
  console.log(`Already shipping-enabled:   ${buckets.alreadyEnabled.length}`);
  console.log(`Skipped (no author addr):   ${buckets.skippedNoAuthorAddress.length}`);
  console.log(`Skipped (geocode failed):   ${buckets.skippedGeocodeFailed.length}`);
  console.log(`Failed (write error):       ${buckets.failed.length}`);
  console.log();

  if (buckets.skippedNoAuthorAddress.length) {
    console.log('--- Vendors missing profile address (need to follow up) ---');
    buckets.skippedNoAuthorAddress.forEach(s =>
      console.log(`   ${s.authorEmail}  "${s.title}"  ${s.id}`)
    );
    console.log();
  }
  if (buckets.skippedGeocodeFailed.length) {
    console.log('--- Geocode failures ---');
    buckets.skippedGeocodeFailed.forEach(s =>
      console.log(`   ${s.authorEmail}  "${s.title}"  err=${s.error}`)
    );
    console.log();
  }
  if (buckets.failed.length) {
    console.log('--- Write failures ---');
    buckets.failed.forEach(s => console.log(`   ${s.id}  err=${s.error}`));
    console.log();
  }
  if (buckets.willUpdate.length && !APPLY) {
    console.log('--- Sample of listings that WOULD be updated (first 5) ---');
    buckets.willUpdate.slice(0, 5).forEach(s =>
      console.log(`   ${s.authorEmail}  "${s.title}"  geo=(${s.geo.lat.toFixed(4)}, ${s.geo.lng.toFixed(4)})`)
    );
    console.log('\nRun again with --apply to perform writes.');
  }
})().catch(e => {
  console.error('FATAL', e);
  process.exit(1);
});
