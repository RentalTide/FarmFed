import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  fetchDeliverySettings as fetchDeliveryAPI,
  updateDeliverySettings as updateDeliveryAPI,
  fetchGeofenceSettings as fetchGeofenceAPI,
  updateGeofenceSettings as updateGeofenceAPI,
} from '../../util/api';
import { storableError } from '../../util/errors';

// ================ Async thunks ================ //

export const fetchDeliverySettingsThunk = createAsyncThunk(
  'AdminPage/fetchDeliverySettings',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchDeliveryAPI();
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const updateDeliverySettingsThunk = createAsyncThunk(
  'AdminPage/updateDeliverySettings',
  async ({ deliveryRatePerMileCents }, { rejectWithValue }) => {
    try {
      return await updateDeliveryAPI({ deliveryRatePerMileCents });
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const fetchGeofenceSettingsThunk = createAsyncThunk(
  'AdminPage/fetchGeofenceSettings',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchGeofenceAPI();
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const updateGeofenceSettingsThunk = createAsyncThunk(
  'AdminPage/updateGeofenceSettings',
  async ({ polygon }, { rejectWithValue }) => {
    try {
      return await updateGeofenceAPI({ polygon });
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

// ================ Slice ================ //

const initialState = {
  // Delivery
  deliveryRatePerMileCents: 0,
  deliveryFetchInProgress: false,
  deliveryUpdateInProgress: false,
  deliveryUpdateSuccess: false,
  deliveryError: null,
  // Geofence
  geofencePolygon: null,
  geofenceFetchInProgress: false,
  geofenceUpdateInProgress: false,
  geofenceUpdateSuccess: false,
  geofenceError: null,
};

const adminPageSlice = createSlice({
  name: 'AdminPage',
  initialState,
  reducers: {
    clearDeliveryUpdateSuccess(state) {
      state.deliveryUpdateSuccess = false;
    },
    clearGeofenceUpdateSuccess(state) {
      state.geofenceUpdateSuccess = false;
    },
  },
  extraReducers: builder => {
    builder
      // Delivery
      .addCase(fetchDeliverySettingsThunk.pending, state => {
        state.deliveryFetchInProgress = true;
        state.deliveryError = null;
      })
      .addCase(fetchDeliverySettingsThunk.fulfilled, (state, action) => {
        state.deliveryFetchInProgress = false;
        state.deliveryRatePerMileCents = action.payload.deliveryRatePerMileCents || 0;
      })
      .addCase(fetchDeliverySettingsThunk.rejected, (state, action) => {
        state.deliveryFetchInProgress = false;
        state.deliveryError = action.payload;
      })
      .addCase(updateDeliverySettingsThunk.pending, state => {
        state.deliveryUpdateInProgress = true;
        state.deliveryUpdateSuccess = false;
        state.deliveryError = null;
      })
      .addCase(updateDeliverySettingsThunk.fulfilled, (state, action) => {
        state.deliveryUpdateInProgress = false;
        state.deliveryUpdateSuccess = true;
        state.deliveryRatePerMileCents = action.payload.deliveryRatePerMileCents;
      })
      .addCase(updateDeliverySettingsThunk.rejected, (state, action) => {
        state.deliveryUpdateInProgress = false;
        state.deliveryError = action.payload;
      })
      // Geofence
      .addCase(fetchGeofenceSettingsThunk.pending, state => {
        state.geofenceFetchInProgress = true;
        state.geofenceError = null;
      })
      .addCase(fetchGeofenceSettingsThunk.fulfilled, (state, action) => {
        state.geofenceFetchInProgress = false;
        state.geofencePolygon = action.payload.polygon || null;
      })
      .addCase(fetchGeofenceSettingsThunk.rejected, (state, action) => {
        state.geofenceFetchInProgress = false;
        state.geofenceError = action.payload;
      })
      .addCase(updateGeofenceSettingsThunk.pending, state => {
        state.geofenceUpdateInProgress = true;
        state.geofenceUpdateSuccess = false;
        state.geofenceError = null;
      })
      .addCase(updateGeofenceSettingsThunk.fulfilled, (state, action) => {
        state.geofenceUpdateInProgress = false;
        state.geofenceUpdateSuccess = true;
        state.geofencePolygon = action.payload.polygon || null;
      })
      .addCase(updateGeofenceSettingsThunk.rejected, (state, action) => {
        state.geofenceUpdateInProgress = false;
        state.geofenceError = action.payload;
      });
  },
});

export const { clearDeliveryUpdateSuccess, clearGeofenceUpdateSuccess } = adminPageSlice.actions;

// ================ Backward-compatible wrappers ================ //

export const fetchDeliverySettings = () => dispatch => {
  return dispatch(fetchDeliverySettingsThunk()).unwrap();
};

export const updateDeliverySettings = params => dispatch => {
  return dispatch(updateDeliverySettingsThunk(params)).unwrap();
};

export const fetchGeofenceSettings = () => dispatch => {
  return dispatch(fetchGeofenceSettingsThunk()).unwrap();
};

export const updateGeofenceSettings = params => dispatch => {
  return dispatch(updateGeofenceSettingsThunk(params)).unwrap();
};

// ================ loadData ================ //

export const loadData = () => dispatch => {
  return Promise.all([
    dispatch(fetchDeliverySettings()),
    dispatch(fetchGeofenceSettings()),
  ]);
};

export default adminPageSlice.reducer;
