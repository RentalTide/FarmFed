import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchDeliverySettings as fetchAPI, updateDeliverySettings as updateAPI } from '../../util/api';
import { storableError } from '../../util/errors';

// ================ Async thunks ================ //

export const fetchDeliverySettingsThunk = createAsyncThunk(
  'AdminDeliverySettingsPage/fetchDeliverySettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchAPI();
      return response;
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const updateDeliverySettingsThunk = createAsyncThunk(
  'AdminDeliverySettingsPage/updateDeliverySettings',
  async ({ deliveryRatePerMileCents }, { rejectWithValue }) => {
    try {
      const response = await updateAPI({ deliveryRatePerMileCents });
      return response;
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

// ================ Slice ================ //

const initialState = {
  deliveryRatePerMileCents: 0,
  fetchInProgress: false,
  updateInProgress: false,
  updateSuccess: false,
  error: null,
};

const adminDeliverySettingsPageSlice = createSlice({
  name: 'AdminDeliverySettingsPage',
  initialState,
  reducers: {
    clearUpdateSuccess(state) {
      state.updateSuccess = false;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchDeliverySettingsThunk.pending, state => {
        state.fetchInProgress = true;
        state.error = null;
      })
      .addCase(fetchDeliverySettingsThunk.fulfilled, (state, action) => {
        state.fetchInProgress = false;
        state.deliveryRatePerMileCents = action.payload.deliveryRatePerMileCents || 0;
      })
      .addCase(fetchDeliverySettingsThunk.rejected, (state, action) => {
        state.fetchInProgress = false;
        state.error = action.payload;
      })
      .addCase(updateDeliverySettingsThunk.pending, state => {
        state.updateInProgress = true;
        state.updateSuccess = false;
        state.error = null;
      })
      .addCase(updateDeliverySettingsThunk.fulfilled, (state, action) => {
        state.updateInProgress = false;
        state.updateSuccess = true;
        state.deliveryRatePerMileCents = action.payload.deliveryRatePerMileCents;
      })
      .addCase(updateDeliverySettingsThunk.rejected, (state, action) => {
        state.updateInProgress = false;
        state.error = action.payload;
      });
  },
});

export const { clearUpdateSuccess } = adminDeliverySettingsPageSlice.actions;

// ================ Backward-compatible wrappers ================ //

export const fetchDeliverySettings = () => dispatch => {
  return dispatch(fetchDeliverySettingsThunk()).unwrap();
};

export const updateDeliverySettings = params => dispatch => {
  return dispatch(updateDeliverySettingsThunk(params)).unwrap();
};

// ================ loadData ================ //

export const loadData = () => dispatch => {
  return dispatch(fetchDeliverySettings());
};

export default adminDeliverySettingsPageSlice.reducer;
