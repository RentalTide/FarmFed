import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storableError } from '../../util/errors';
import { parse, getValidInboxSort } from '../../util/urlHelpers';
import { getSupportedProcessesInfo } from '../../transactions/transaction';
import { addMarketplaceEntities } from '../../ducks/marketplaceData.duck';
import appSettings from '../../config/settings';

const INBOX_PAGE_SIZE = 10;

// ================ Helper functions ================ //

const entityRefs = entities =>
  entities.map(entity => ({
    id: entity.id,
    type: entity.type,
  }));

// Maps redesigned tab names to last-transition filters
// New Orders: active/pending states
// Completed: final states
// Messages: all (inquiry + message access)
const REDESIGNED_LAST_TRANSITIONS_NEW = [
  'transition/confirm-payment',
  'transition/accept',
  'transition/request-payment',
  'transition/request-payment-after-inquiry',
  'transition/make-offer',
];

const REDESIGNED_LAST_TRANSITIONS_COMPLETED = [
  'transition/complete',
  'transition/review-1-by-customer',
  'transition/review-1-by-provider',
  'transition/review-2-by-customer',
  'transition/review-2-by-provider',
  'transition/expire-review-period',
  'transition/cancel',
  'transition/decline',
];

// ================ Slice ================ //

const inboxPageSlice = createSlice({
  name: 'InboxPage',
  initialState: {
    fetchInProgress: false,
    fetchOrdersOrSalesError: null,
    pagination: null,
    transactionRefs: [],
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(loadDataThunk.pending, state => {
        state.fetchInProgress = true;
        state.fetchOrdersOrSalesError = null;
      })
      .addCase(loadDataThunk.fulfilled, (state, action) => {
        const transactions = action.payload.data.data;
        state.fetchInProgress = false;
        state.transactionRefs = entityRefs(transactions);
        state.pagination = action.payload.data.meta;
      })
      .addCase(loadDataThunk.rejected, (state, action) => {
        console.error(action.payload || action.error); // eslint-disable-line
        state.fetchInProgress = false;
        state.fetchOrdersOrSalesError = action.payload;
      });
  },
});

export default inboxPageSlice.reducer;

// ================ Load data ================ //

const loadDataPayloadCreator = ({ params, search }, { dispatch, rejectWithValue, extra: sdk }) => {
  const { tab } = params;

  const useRedesign = appSettings.featureFlags.inboxRedesign;

  // Redesigned tabs: new-orders, completed, messages (plus legacy orders/sales)
  const redesignedOnlyValues = {
    'new-orders': 'order',
    'completed': 'order',
    'messages': 'order',
  };

  const legacyOnlyValues = {
    orders: 'order',
    sales: 'sale',
  };

  const onlyFilterValues = useRedesign
    ? { ...legacyOnlyValues, ...redesignedOnlyValues }
    : legacyOnlyValues;

  const onlyFilter = onlyFilterValues[tab];
  if (!onlyFilter) {
    return Promise.reject(new Error(`Invalid tab for InboxPage: ${tab}`));
  }

  const { page = 1, sort } = parse(search);
  const processNames = getSupportedProcessesInfo().map(p => p.name);

  const apiQueryParams = {
    only: onlyFilter,
    processNames,
    include: [
      'listing',
      'provider',
      'provider.profileImage',
      'customer',
      'customer.profileImage',
      'booking',
    ],
    'fields.transaction': [
      'processName',
      'lastTransition',
      'lastTransitionedAt',
      'transitions',
      'payinTotal',
      'payoutTotal',
      'lineItems',
    ],
    'fields.listing': ['title', 'availabilityPlan', 'publicData.listingType'],
    'fields.user': ['profile.displayName', 'profile.abbreviatedName', 'deleted', 'banned'],
    'fields.image': ['variants.square-small', 'variants.square-small2x'],
    page,
    perPage: INBOX_PAGE_SIZE,
    ...getValidInboxSort(sort),
  };

  // Add last-transition filters for redesigned tabs
  if (useRedesign && tab === 'new-orders') {
    apiQueryParams.lastTransitions = REDESIGNED_LAST_TRANSITIONS_NEW;
  } else if (useRedesign && tab === 'completed') {
    apiQueryParams.lastTransitions = REDESIGNED_LAST_TRANSITIONS_COMPLETED;
  }
  // 'messages' tab: no lastTransitions filter, shows all

  return sdk.transactions
    .query(apiQueryParams)
    .then(response => {
      dispatch(addMarketplaceEntities(response));
      return response;
    })
    .catch(e => {
      return rejectWithValue(storableError(e));
    });
};

export const loadDataThunk = createAsyncThunk('InboxPage/loadData', loadDataPayloadCreator);

// Backward compatible wrapper for the thunk
export const loadData = (params, search) => (dispatch, getState, sdk) => {
  return dispatch(loadDataThunk({ params, search }));
};
