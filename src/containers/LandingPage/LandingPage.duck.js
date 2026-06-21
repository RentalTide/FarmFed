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

// How many listings to display in the "Featured Products" row.
const FEATURED_DISPLAY_COUNT = 3;

// Size of the candidate pool we query. We pull a larger set than we display so
// the row can (a) shuffle to something fresh on each load and (b) find enough
// distinct categories to avoid repeats, even after deleted/draft ones drop out.
const FEATURED_LISTING_COUNT = 24;

// Pick the products to feature: shuffle the candidates, then greedily take ones
// with distinct top-level categories so the row never shows two of the same
// category at once. If category diversity leaves us short (small catalog), we
// backfill with whatever remains so the row still fills up.
const pickFeaturedListings = listings => {
  const shuffled = [...listings];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

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

export const fetchFeaturedListings = config => (dispatch, getState, sdk) => {
  dispatch(fetchFeaturedRequest());

  const {
    aspectWidth = 1,
    aspectHeight = 1,
    variantPrefix = 'listing-card',
  } = config.layout.listingImage;
  const aspectRatio = aspectHeight / aspectWidth;

  const params = {
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

  return sdk.listings
    .query(params)
    .then(response => {
      dispatch(addMarketplaceEntities(response));
      const published = response.data.data.filter(
        l => !l.attributes.deleted && l.attributes.state === 'published'
      );
      const listingIds = pickFeaturedListings(published).map(l => l.id);
      dispatch(fetchFeaturedSuccess(listingIds));
      return response;
    })
    .catch(e => {
      // Don't fail the whole page if featured products can't load — the rest of
      // the homepage still renders, and the section shows its empty state.
      dispatch(fetchFeaturedError(storableError(e)));
    });
};

export const loadData = (params, search, config) => dispatch => {
  if (useCustomLandingPage) {
    return dispatch(fetchFeaturedListings(config));
  }
  // Hosted PageBuilder landing page (default).
  const pageAsset = { landingPage: `content/pages/${ASSET_NAME}.json` };
  return dispatch(fetchPageAssets(pageAsset, true));
};
