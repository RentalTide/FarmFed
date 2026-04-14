const { getIntegrationSdk } = require('./sdk');

// Fetch the listing's author via the Integration SDK and attach it to the
// listing object as `listing.author`. The tax-exemption check in lineItems.js
// reads listing.author.attributes.profile.privateData.taxExempt. If the
// Integration SDK isn't configured (403), this quietly no-ops.
const attachAuthorToListing = async (listing, listingId) => {
  if (!listing || listing.author) return listing;
  try {
    const integrationSdk = getIntegrationSdk();
    const id = listingId || listing.id?.uuid || listing.id;
    const resp = await integrationSdk.listings.show({ id, include: ['author'] });
    const included = resp.data.included || [];
    const author = included.find(r => r.type === 'user');
    if (author) {
      listing.author = author;
    }
  } catch (e) {
    // Integration SDK not configured or listing fetch failed — skip silently.
  }
  return listing;
};

module.exports = { attachAuthorToListing };
