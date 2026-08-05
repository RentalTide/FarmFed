import { createImageVariantConfig } from '../../util/sdkLoader';
import { storableError } from '../../util/errors';
import { addMarketplaceEntities } from '../../ducks/marketplaceData.duck';
import { fetchPageAssets } from '../../ducks/hostedAssets.duck';

// The hosted (PageBuilder/CMS) landing page asset name.
export const ASSET_NAME = 'landing-page';

// Feature flag: when true, the homepage uses the custom FarmFed design (hero,
// trust badges, randomized featured products). When false (the default), it
// renders the hosted PageBuilder/CMS landing page that ships with the template.
// Toggle via REACT_APP_CUSTOM_LANDING_PAGE in the environment.
export const useCustomLandingPage = process.env.REACT_APP_CUSTOM_LANDING_PAGE === 'true';

// Per-request override: append ?newlanding=true to the homepage URL to preview
// the custom design even when the env flag is off (e.g. to demo it on prod).
const searchEnablesCustomLanding = search => /[?&]newlanding=true(?:&|$)/.test(search || '');

// The homepage uses the custom design if the env flag is on OR the URL opts in.
export const shouldUseCustomLandingPage = search =>
  useCustomLandingPage || searchEnablesCustomLanding(search);

// The operator/hub-owned standalone "Delivery" listing must never appear among
// featured products — it's an internal listing used to charge delivery, not a
// shoppable product. We exclude it by id and by its delivery process alias.
const DELIVERY_LISTING_ID = process.env.REACT_APP_DELIVERY_LISTING_ID;
const isDeliveryListing = l => {
  const { publicData } = l.attributes || {};
  const alias = publicData?.transactionProcessAlias || '';
  return (
    (DELIVERY_LISTING_ID && l.id?.uuid === DELIVERY_LISTING_ID) ||
    alias.startsWith('default-delivery')
  );
};

// How many listings to display in the "Featured Products" row.
const FEATURED_DISPLAY_COUNT = 3;

// Size of the candidate pool we query per category, and for the uncategorized
// fallback query. We pull a larger set than we display so the row shuffles to
// something fresh on each load even after deleted/draft ones drop out.
const FEATURED_LISTING_COUNT = 24;

// How many categories we query. One spare so the row still fills up when a
// category happens to have no publishable listings right now.
const FEATURED_CATEGORY_COUNT = FEATURED_DISPLAY_COUNT + 1;

// Per-category pool. Smaller than the flat pool since we only take one listing
// from each — enough for freshness without fetching four big pages per load.
const FEATURED_PER_CATEGORY_COUNT = 12;

const shuffle = items => {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const isPublishable = l =>
  !l.attributes.deleted && l.attributes.state === 'published' && !isDeliveryListing(l);

// Pick the products to feature: shuffle the candidates, then greedily take ones
// with distinct top-level categories so the row never shows two of the same
// category at once. If category diversity leaves us short (small catalog), we
// backfill with whatever remains so the row still fills up.
const pickFeaturedListings = listings => {
  const shuffled = shuffle(listings);

  const picked = [];
  const usedCategories = new Set();
  for (const l of shuffled) {
    const category = l.attributes?.publicData?.categoryLevel1 || null;
    if (category && usedCategories.has(category)) {
      continue;
    }
    picked.push(l);
    if (category) {
      usedCategories.add(category);
    }
    if (picked.length === FEATURED_DISPLAY_COUNT) {
      return picked;
    }
  }

  for (const l of shuffled) {
    if (picked.includes(l)) {
      continue;
    }
    picked.push(l);
    if (picked.length === FEATURED_DISPLAY_COUNT) {
      break;
    }
  }
  return picked;
};

// ================ Action types ================ //

export const FETCH_FEATURED_REQUEST = 'app/LandingPage/FETCH_FEATURED_REQUEST';
export const FETCH_FEATURED_SUCCESS = 'app/LandingPage/FETCH_FEATURED_SUCCESS';
export const FETCH_FEATURED_ERROR = 'app/LandingPage/FETCH_FEATURED_ERROR';

// ================ Reducer ================ //

const initialState = {
  featuredListingIds: [],
  featuredInProgress: false,
  featuredError: null,
};

export default function reducer(state = initialState, action = {}) {
  const { type, payload } = action;
  switch (type) {
    case FETCH_FEATURED_REQUEST:
      return { ...state, featuredInProgress: true, featuredError: null };
    case FETCH_FEATURED_SUCCESS:
      return { ...state, featuredInProgress: false, featuredListingIds: payload };
    case FETCH_FEATURED_ERROR:
      return { ...state, featuredInProgress: false, featuredError: payload };
    default:
      return state;
  }
}

// ================ Action creators ================ //

const fetchFeaturedRequest = () => ({ type: FETCH_FEATURED_REQUEST });
const fetchFeaturedSuccess = listingIds => ({ type: FETCH_FEATURED_SUCCESS, payload: listingIds });
const fetchFeaturedError = e => ({ type: FETCH_FEATURED_ERROR, error: true, payload: e });

// ================ Thunks ================ //

// The shared query shape for every featured-products request.
const featuredQueryParams = config => {
  const {
    aspectWidth = 1,
    aspectHeight = 1,
    variantPrefix = 'listing-card',
  } = config.layout.listingImage;
  const aspectRatio = aspectHeight / aspectWidth;

  return {
    perPage: FEATURED_LISTING_COUNT,
    include: ['author', 'images', 'currentStock'],
    'fields.listing': [
      'title',
      'price',
      'deleted',
      'state',
      'publicData.listingType',
      'publicData.transactionProcessAlias',
      'publicData.unitType',
      'publicData.cardStyle',
      'publicData.categoryLevel1',
    ],
    'fields.user': ['profile.displayName', 'profile.abbreviatedName'],
    'fields.image': [
      'variants.scaled-small',
      'variants.scaled-medium',
      `variants.${variantPrefix}`,
      `variants.${variantPrefix}-2x`,
    ],
    ...createImageVariantConfig(`${variantPrefix}`, 400, aspectRatio),
    ...createImageVariantConfig(`${variantPrefix}-2x`, 800, aspectRatio),
    'limit.images': 1,
  };
};

// Fallback for marketplaces without a category tree: one query, pick a diverse
// set client-side from whatever came back.
const fetchFromSinglePool = (config, dispatch, sdk) =>
  sdk.listings.query(featuredQueryParams(config)).then(response => {
    dispatch(addMarketplaceEntities(response));
    const published = response.data.data.filter(isPublishable);
    dispatch(fetchFeaturedSuccess(pickFeaturedListings(published).map(l => l.id)));
    return response;
  });

// One query per category. A single query can't give us category diversity: the
// Marketplace API returns listings newest-first, so a catalog where recent
// uploads cluster in one or two categories yields a candidate pool that only
// covers those categories — no client-side picking can un-cluster it, and the
// row ends up showing several products from the same category.
const fetchOnePerCategory = (config, categoryIds, dispatch, sdk) => {
  const shuffledIds = shuffle(categoryIds).slice(0, FEATURED_CATEGORY_COUNT);
  const params = featuredQueryParams(config);

  return Promise.all(
    shuffledIds.map(id =>
      sdk.listings
        .query({ ...params, perPage: FEATURED_PER_CATEGORY_COUNT, pub_categoryLevel1: id })
        .then(response => {
          dispatch(addMarketplaceEntities(response));
          return response.data.data.filter(isPublishable);
        })
        // One failing/empty category must not blank the row — the spare
        // category (and the cross-category backfill below) cover for it.
        .catch(() => [])
    )
  ).then(perCategory => {
    // One random listing from each category first, so the row is category
    // diverse. Only if that leaves us short (small catalog, empty categories)
    // do we backfill with leftovers, which may repeat a category.
    const picked = [];
    const leftovers = [];
    perCategory.forEach(listings => {
      const shuffled = shuffle(listings);
      if (shuffled.length > 0 && picked.length < FEATURED_DISPLAY_COUNT) {
        picked.push(shuffled[0]);
        leftovers.push(...shuffled.slice(1));
      } else {
        leftovers.push(...shuffled);
      }
    });

    const backfill = shuffle(leftovers).slice(0, FEATURED_DISPLAY_COUNT - picked.length);
    dispatch(fetchFeaturedSuccess([...picked, ...backfill].map(l => l.id)));
  });
};

export const fetchFeaturedListings = config => (dispatch, getState, sdk) => {
  dispatch(fetchFeaturedRequest());

  const categoryIds = (config.categoryConfiguration?.categories || []).map(c => c.id);

  const request =
    categoryIds.length > 1
      ? fetchOnePerCategory(config, categoryIds, dispatch, sdk)
      : fetchFromSinglePool(config, dispatch, sdk);

  return request.catch(e => {
    // Don't fail the whole page if featured products can't load — the rest of
    // the homepage still renders, and the section shows its empty state.
    dispatch(fetchFeaturedError(storableError(e)));
  });
};

export const loadData = (params, search, config) => dispatch => {
  if (shouldUseCustomLandingPage(search)) {
    return dispatch(fetchFeaturedListings(config));
  }
  // Hosted PageBuilder landing page (default).
  const pageAsset = { landingPage: `content/pages/${ASSET_NAME}.json` };
  return dispatch(fetchPageAssets(pageAsset, true));
};
