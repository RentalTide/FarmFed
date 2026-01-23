const { transactionLineItems } = require('../api-util/lineItems');
const { getSdk, getIntegrationSdk, handleError, serialize, fetchCommission } = require('../api-util/sdk');
const { constructValidLineItems } = require('../api-util/lineItemHelpers');
const { geocodeAddress } = require('../api-util/geocode');

module.exports = (req, res) => {
  const { isOwnListing, listingId, orderData } = req.body;

  const sdk = getSdk(req, res);

  const listingPromise = () =>
    isOwnListing ? sdk.ownListings.show({ id: listingId }) : sdk.listings.show({ id: listingId });

  Promise.all([listingPromise(), fetchCommission(sdk)])
    .then(async ([showListingResponse, fetchAssetsResponse]) => {
      const listing = showListingResponse.data.data;
      const commissionAsset = fetchAssetsResponse.data.data[0];

      const { providerCommission, customerCommission } =
        commissionAsset?.type === 'jsonAsset' ? commissionAsset.attributes.data : {};

      // If listing has no geolocation and shipping is requested, try author's protectedData.address
      const isShipping = orderData?.deliveryMethod === 'shipping';
      const hasGeolocation = listing.attributes.geolocation?.lat && listing.attributes.geolocation?.lng;

      if (isShipping && !hasGeolocation) {
        try {
          const integrationSdk = getIntegrationSdk();
          const listingResponse = await integrationSdk.listings.show({
            id: listingId,
            include: ['author'],
          });
          const included = listingResponse.data.included || [];
          const author = included.find(r => r.type === 'user');
          const authorAddress = author?.attributes?.profile?.protectedData?.address;

          if (authorAddress && authorAddress.lat && authorAddress.lng) {
            listing.attributes.geolocation = { lat: authorAddress.lat, lng: authorAddress.lng };
          } else if (authorAddress && authorAddress.street) {
            const coords = await geocodeAddress({
              line1: authorAddress.street,
              city: authorAddress.city,
              state: authorAddress.state,
              postalCode: authorAddress.zip,
              country: authorAddress.country,
            });
            listing.attributes.geolocation = coords;
          }
        } catch (e) {
          // Integration API may not be available (403) — fall through gracefully
        }
      }

      const lineItems = await transactionLineItems(
        listing,
        orderData,
        providerCommission,
        customerCommission
      );

      // Because we are using returned lineItems directly in this template we need to use the helper function
      // to add some attributes like lineTotal and reversal that Marketplace API also adds to the response.
      const validLineItems = constructValidLineItems(lineItems);

      res
        .status(200)
        .set('Content-Type', 'application/transit+json')
        .send(serialize({ data: validLineItems }))
        .end();
    })
    .catch(e => {
      handleError(res, e);
    });
};
