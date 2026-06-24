import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { types as sdkTypes } from '../../util/sdkLoader';
import { storableError } from '../../util/errors';
import { addMarketplaceEntities } from '../../ducks/marketplaceData.duck';
import { fetchFollowedVendors } from '../../util/api';

const { UUID } = sdkTypes;

// ================ Thunks ================ //

// Load the vendors (listing authors) the current user follows. The follow ids
// live on the current user's profile privateData.followedVendors (array of
// user-id strings); the GET /api/follow-vendor endpoint returns them. We then
// fetch each vendor's public profile so the page can render avatars + names.
const loadFollowedVendorsPayloadCreator = async (_arg, { dispatch, extra: sdk, rejectWithValue }) => {
  try {
    const res = await fetchFollowedVendors();
    const ids = Array.isArray(res?.followedVendors) ? res.followedVendors : [];
    if (ids.length === 0) {
      return { vendorRefs: [] };
    }

    const responses = await Promise.all(
      ids.map(id =>
        sdk.users
          .show({
            id,
            include: ['profileImage'],
            'fields.image': ['variants.square-small', 'variants.square-small2x'],
          })
          .then(response => {
            dispatch(addMarketplaceEntities(response));
            return { id: new UUID(id), type: 'user' };
          })
          // A followed vendor may have been deleted/banned since — skip it
          // rather than failing the whole page.
          .catch(() => null)
      )
    );

    return { vendorRefs: responses.filter(Boolean) };
  } catch (e) {
    return rejectWithValue(storableError(e));
  }
};

export const loadFollowedVendors = createAsyncThunk(
  'FollowedVendorsPage/loadFollowedVendors',
  loadFollowedVendorsPayloadCreator
);

// ================ Slice ================ //

const initialState = {
  vendorRefs: [],
  fetchInProgress: false,
  fetchError: null,
};

const followedVendorsSlice = createSlice({
  name: 'FollowedVendorsPage',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(loadFollowedVendors.pending, state => {
        state.fetchInProgress = true;
        state.fetchError = null;
      })
      .addCase(loadFollowedVendors.fulfilled, (state, action) => {
        state.fetchInProgress = false;
        state.vendorRefs = action.payload.vendorRefs;
      })
      .addCase(loadFollowedVendors.rejected, (state, action) => {
        state.fetchInProgress = false;
        state.fetchError = action.payload || action.error;
      });
  },
});

export default followedVendorsSlice.reducer;

// Note: there is intentionally no `loadData` export. The followed-vendor list is
// fetched from the template's own /api/follow-vendor endpoint, which relies on
// the browser (window.fetch / session cookie), so the page loads it client-side
// from the component on mount rather than during SSR. This mirrors how other
// custom endpoints (e.g. active-order-group) are fetched in this app.
