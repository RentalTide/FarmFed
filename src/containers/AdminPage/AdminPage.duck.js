import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  fetchDeliverySettings as fetchDeliveryAPI,
  updateDeliverySettings as updateDeliveryAPI,
  fetchGeofenceSettings as fetchGeofenceAPI,
  updateGeofenceSettings as updateGeofenceAPI,
  fetchPendingUsers as fetchPendingUsersAPI,
  approveUser as approveUserAPI,
  rejectUser as rejectUserAPI,
  fetchPickupSettings as fetchPickupAPI,
  updatePickupSettings as updatePickupAPI,
  fetchTaxSettings as fetchTaxAPI,
  updateTaxSettings as updateTaxAPI,
  fetchListingShuffleSettings as fetchShuffleAPI,
  updateListingShuffleSettings as updateShuffleAPI,
  runListingShuffle as runShuffleAPI,
  fetchAllBulletins as fetchBulletinsAPI,
  updateBulletins as updateBulletinsAPI,
  fetchVendors as fetchVendorsAPI,
  setVendorTaxExempt as setVendorTaxExemptAPI,
  fetchOrdersAwaitingDelivery as fetchOrdersAwaitingDeliveryAPI,
  adminMarkDelivered as adminMarkDeliveredAPI,
  sendPushBroadcast as sendPushBroadcastAPI,
  fetchAllAnnouncements as fetchAllAnnouncementsAPI,
  setAnnouncementActive as setAnnouncementActiveAPI,
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
  async (params, { rejectWithValue }) => {
    try {
      return await updateDeliveryAPI(params);
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
  async (params, { rejectWithValue }) => {
    try {
      return await updateGeofenceAPI(params);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const fetchPendingUsersThunk = createAsyncThunk(
  'AdminPage/fetchPendingUsers',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchPendingUsersAPI();
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const approveUserThunk = createAsyncThunk(
  'AdminPage/approveUser',
  async ({ userId }, { rejectWithValue }) => {
    try {
      return await approveUserAPI({ userId });
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const rejectUserThunk = createAsyncThunk(
  'AdminPage/rejectUser',
  async ({ userId }, { rejectWithValue }) => {
    try {
      return await rejectUserAPI({ userId });
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

// Orders awaiting delivery (operator marks delivered)
export const fetchOrdersAwaitingDeliveryThunk = createAsyncThunk(
  'AdminPage/fetchOrdersAwaitingDelivery',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchOrdersAwaitingDeliveryAPI();
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const markDeliveredThunk = createAsyncThunk(
  'AdminPage/markDelivered',
  async ({ transactionId }, { rejectWithValue }) => {
    try {
      return await adminMarkDeliveredAPI({ transactionId });
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

// Push Notification Center thunks
export const fetchAnnouncementsThunk = createAsyncThunk(
  'AdminPage/fetchAnnouncements',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchAllAnnouncementsAPI();
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const sendPushBroadcastThunk = createAsyncThunk(
  'AdminPage/sendPushBroadcast',
  async ({ title, body, link }, { rejectWithValue }) => {
    try {
      return await sendPushBroadcastAPI({ title, body, link });
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const setAnnouncementActiveThunk = createAsyncThunk(
  'AdminPage/setAnnouncementActive',
  async ({ id, active }, { rejectWithValue }) => {
    try {
      await setAnnouncementActiveAPI({ id, active });
      return { id, active };
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

// Pickup schedule thunks
export const fetchPickupSettingsThunk = createAsyncThunk(
  'AdminPage/fetchPickupSettings',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchPickupAPI();
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const updatePickupSettingsThunk = createAsyncThunk(
  'AdminPage/updatePickupSettings',
  async (params, { rejectWithValue }) => {
    try {
      return await updatePickupAPI(params);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

// Tax settings thunks
export const fetchTaxSettingsThunk = createAsyncThunk(
  'AdminPage/fetchTaxSettings',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchTaxAPI();
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const updateTaxSettingsThunk = createAsyncThunk(
  'AdminPage/updateTaxSettings',
  async (params, { rejectWithValue }) => {
    try {
      return await updateTaxAPI(params);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

// Listing shuffle thunks
export const fetchListingShuffleSettingsThunk = createAsyncThunk(
  'AdminPage/fetchListingShuffleSettings',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchShuffleAPI();
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const updateListingShuffleSettingsThunk = createAsyncThunk(
  'AdminPage/updateListingShuffleSettings',
  async (params, { rejectWithValue }) => {
    try {
      return await updateShuffleAPI(params);
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const runListingShuffleThunk = createAsyncThunk(
  'AdminPage/runListingShuffle',
  async (_, { rejectWithValue }) => {
    try {
      return await runShuffleAPI();
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

// Bulletin thunks
export const fetchBulletinsThunk = createAsyncThunk(
  'AdminPage/fetchBulletins',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchBulletinsAPI();
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const updateBulletinsThunk = createAsyncThunk(
  'AdminPage/updateBulletins',
  async ({ bulletins }, { rejectWithValue }) => {
    try {
      return await updateBulletinsAPI({ bulletins });
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const fetchVendorsThunk = createAsyncThunk(
  'AdminPage/fetchVendors',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchVendorsAPI();
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const setVendorTaxExemptThunk = createAsyncThunk(
  'AdminPage/setVendorTaxExempt',
  async ({ userId, taxExempt }, { rejectWithValue }) => {
    try {
      return await setVendorTaxExemptAPI({ userId, taxExempt });
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

// ================ Slice ================ //

const initialState = {
  // Delivery
  deliveryRatePerMileCents: 0,
  deliveryFlatFeeCents: 0,
  hubOrigin: null,
  deliveryFetchInProgress: false,
  deliveryUpdateInProgress: false,
  deliveryUpdateSuccess: false,
  deliveryError: null,
  // Geofence (dual service radius)
  geofencePolygon: null,
  geofenceVendorPolygon: null,
  geofenceConsumerPolygon: null,
  geofenceFetchInProgress: false,
  geofenceUpdateInProgress: false,
  geofenceUpdateSuccess: false,
  geofenceError: null,
  // User Management
  pendingUsers: [],
  pendingUsersFetchInProgress: false,
  pendingUsersFetchError: null,
  userActionInProgress: null,
  userActionError: null,
  // Orders awaiting delivery (operator marks delivered)
  ordersAwaitingDelivery: [],
  ordersFetchInProgress: false,
  ordersFetchError: null,
  markDeliveredInProgress: null,
  markDeliveredError: null,
  // Push Notification Center
  announcements: [],
  announcementsFetchInProgress: false,
  announcementsError: null,
  sendPushInProgress: false,
  sendPushSuccess: false,
  sendPushError: null,
  // Pickup Schedule
  pickupSettings: null,
  pickupFetchInProgress: false,
  pickupUpdateInProgress: false,
  pickupUpdateSuccess: false,
  pickupError: null,
  // Tax Settings
  taxSettings: null,
  taxFetchInProgress: false,
  taxUpdateInProgress: false,
  taxUpdateSuccess: false,
  taxError: null,
  // Listing Shuffle
  shuffleSettings: null,
  shuffleFetchInProgress: false,
  shuffleUpdateInProgress: false,
  shuffleUpdateSuccess: false,
  shuffleRunInProgress: false,
  shuffleRunResult: null,
  shuffleError: null,
  // Bulletins
  bulletins: [],
  bulletinsFetchInProgress: false,
  bulletinsUpdateInProgress: false,
  bulletinsUpdateSuccess: false,
  bulletinsError: null,
  // Vendors (for tax-exempt management)
  vendors: [],
  vendorsFetchInProgress: false,
  vendorsError: null,
  vendorTaxExemptInProgress: null,
  vendorTaxExemptError: null,
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
    clearPickupUpdateSuccess(state) {
      state.pickupUpdateSuccess = false;
    },
    clearTaxUpdateSuccess(state) {
      state.taxUpdateSuccess = false;
    },
    clearShuffleUpdateSuccess(state) {
      state.shuffleUpdateSuccess = false;
    },
    clearBulletinsUpdateSuccess(state) {
      state.bulletinsUpdateSuccess = false;
    },
    clearSendPushSuccess(state) {
      state.sendPushSuccess = false;
      state.sendPushError = null;
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
        state.deliveryFlatFeeCents = action.payload.deliveryFlatFeeCents || 0;
        state.hubOrigin = action.payload.hubOrigin || null;
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
        state.deliveryRatePerMileCents = action.payload.deliveryRatePerMileCents || 0;
        state.deliveryFlatFeeCents = action.payload.deliveryFlatFeeCents || 0;
        state.hubOrigin = action.payload.hubOrigin || state.hubOrigin;
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
        state.geofenceVendorPolygon = action.payload.vendorPolygon || null;
        state.geofenceConsumerPolygon = action.payload.consumerPolygon || null;
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
        state.geofenceVendorPolygon = action.payload.vendorPolygon || null;
        state.geofenceConsumerPolygon = action.payload.consumerPolygon || null;
      })
      .addCase(updateGeofenceSettingsThunk.rejected, (state, action) => {
        state.geofenceUpdateInProgress = false;
        state.geofenceError = action.payload;
      })
      // Pending Users
      .addCase(fetchPendingUsersThunk.pending, state => {
        state.pendingUsersFetchInProgress = true;
        state.pendingUsersFetchError = null;
      })
      .addCase(fetchPendingUsersThunk.fulfilled, (state, action) => {
        state.pendingUsersFetchInProgress = false;
        state.pendingUsers = action.payload.users || [];
      })
      .addCase(fetchPendingUsersThunk.rejected, (state, action) => {
        state.pendingUsersFetchInProgress = false;
        state.pendingUsersFetchError = action.payload;
      })
      // Approve User
      .addCase(approveUserThunk.pending, (state, action) => {
        state.userActionInProgress = action.meta.arg.userId;
        state.userActionError = null;
      })
      .addCase(approveUserThunk.fulfilled, (state, action) => {
        state.userActionInProgress = null;
        const userId = action.payload.userId;
        state.pendingUsers = state.pendingUsers.filter(u => u.id !== userId);
      })
      .addCase(approveUserThunk.rejected, (state, action) => {
        state.userActionInProgress = null;
        state.userActionError = action.payload;
      })
      // Reject User
      .addCase(rejectUserThunk.pending, (state, action) => {
        state.userActionInProgress = action.meta.arg.userId;
        state.userActionError = null;
      })
      .addCase(rejectUserThunk.fulfilled, (state, action) => {
        state.userActionInProgress = null;
        const userId = action.payload.userId;
        state.pendingUsers = state.pendingUsers.filter(u => u.id !== userId);
      })
      .addCase(rejectUserThunk.rejected, (state, action) => {
        state.userActionInProgress = null;
        state.userActionError = action.payload;
      })
      // Pickup Settings
      .addCase(fetchPickupSettingsThunk.pending, state => {
        state.pickupFetchInProgress = true;
        state.pickupError = null;
      })
      .addCase(fetchPickupSettingsThunk.fulfilled, (state, action) => {
        state.pickupFetchInProgress = false;
        state.pickupSettings = action.payload;
      })
      .addCase(fetchPickupSettingsThunk.rejected, (state, action) => {
        state.pickupFetchInProgress = false;
        state.pickupError = action.payload;
      })
      .addCase(updatePickupSettingsThunk.pending, state => {
        state.pickupUpdateInProgress = true;
        state.pickupUpdateSuccess = false;
        state.pickupError = null;
      })
      .addCase(updatePickupSettingsThunk.fulfilled, (state, action) => {
        state.pickupUpdateInProgress = false;
        state.pickupUpdateSuccess = true;
        state.pickupSettings = action.payload;
      })
      .addCase(updatePickupSettingsThunk.rejected, (state, action) => {
        state.pickupUpdateInProgress = false;
        state.pickupError = action.payload;
      })
      // Tax Settings
      .addCase(fetchTaxSettingsThunk.pending, state => {
        state.taxFetchInProgress = true;
        state.taxError = null;
      })
      .addCase(fetchTaxSettingsThunk.fulfilled, (state, action) => {
        state.taxFetchInProgress = false;
        state.taxSettings = action.payload;
      })
      .addCase(fetchTaxSettingsThunk.rejected, (state, action) => {
        state.taxFetchInProgress = false;
        state.taxError = action.payload;
      })
      .addCase(updateTaxSettingsThunk.pending, state => {
        state.taxUpdateInProgress = true;
        state.taxUpdateSuccess = false;
        state.taxError = null;
      })
      .addCase(updateTaxSettingsThunk.fulfilled, (state, action) => {
        state.taxUpdateInProgress = false;
        state.taxUpdateSuccess = true;
        state.taxSettings = action.payload;
      })
      .addCase(updateTaxSettingsThunk.rejected, (state, action) => {
        state.taxUpdateInProgress = false;
        state.taxError = action.payload;
      })
      // Listing Shuffle
      .addCase(fetchListingShuffleSettingsThunk.pending, state => {
        state.shuffleFetchInProgress = true;
        state.shuffleError = null;
      })
      .addCase(fetchListingShuffleSettingsThunk.fulfilled, (state, action) => {
        state.shuffleFetchInProgress = false;
        state.shuffleSettings = action.payload;
      })
      .addCase(fetchListingShuffleSettingsThunk.rejected, (state, action) => {
        state.shuffleFetchInProgress = false;
        state.shuffleError = action.payload;
      })
      .addCase(updateListingShuffleSettingsThunk.pending, state => {
        state.shuffleUpdateInProgress = true;
        state.shuffleUpdateSuccess = false;
        state.shuffleError = null;
      })
      .addCase(updateListingShuffleSettingsThunk.fulfilled, (state, action) => {
        state.shuffleUpdateInProgress = false;
        state.shuffleUpdateSuccess = true;
        state.shuffleSettings = action.payload;
      })
      .addCase(updateListingShuffleSettingsThunk.rejected, (state, action) => {
        state.shuffleUpdateInProgress = false;
        state.shuffleError = action.payload;
      })
      .addCase(runListingShuffleThunk.pending, state => {
        state.shuffleRunInProgress = true;
        state.shuffleRunResult = null;
        state.shuffleError = null;
      })
      .addCase(runListingShuffleThunk.fulfilled, (state, action) => {
        state.shuffleRunInProgress = false;
        state.shuffleRunResult = action.payload;
        if (action.payload?.settings) {
          state.shuffleSettings = action.payload.settings;
        }
      })
      .addCase(runListingShuffleThunk.rejected, (state, action) => {
        state.shuffleRunInProgress = false;
        state.shuffleError = action.payload;
      })
      // Bulletins
      .addCase(fetchBulletinsThunk.pending, state => {
        state.bulletinsFetchInProgress = true;
        state.bulletinsError = null;
      })
      .addCase(fetchBulletinsThunk.fulfilled, (state, action) => {
        state.bulletinsFetchInProgress = false;
        state.bulletins = action.payload.bulletins || [];
      })
      .addCase(fetchBulletinsThunk.rejected, (state, action) => {
        state.bulletinsFetchInProgress = false;
        state.bulletinsError = action.payload;
      })
      .addCase(updateBulletinsThunk.pending, state => {
        state.bulletinsUpdateInProgress = true;
        state.bulletinsUpdateSuccess = false;
        state.bulletinsError = null;
      })
      .addCase(updateBulletinsThunk.fulfilled, (state, action) => {
        state.bulletinsUpdateInProgress = false;
        state.bulletinsUpdateSuccess = true;
        state.bulletins = action.payload.bulletins || [];
      })
      .addCase(updateBulletinsThunk.rejected, (state, action) => {
        state.bulletinsUpdateInProgress = false;
        state.bulletinsError = action.payload;
      })
      // Orders awaiting delivery
      .addCase(fetchOrdersAwaitingDeliveryThunk.pending, state => {
        state.ordersFetchInProgress = true;
        state.ordersFetchError = null;
      })
      .addCase(fetchOrdersAwaitingDeliveryThunk.fulfilled, (state, action) => {
        state.ordersFetchInProgress = false;
        state.ordersAwaitingDelivery = action.payload.orders || [];
      })
      .addCase(fetchOrdersAwaitingDeliveryThunk.rejected, (state, action) => {
        state.ordersFetchInProgress = false;
        state.ordersFetchError = action.payload;
      })
      .addCase(markDeliveredThunk.pending, (state, action) => {
        state.markDeliveredInProgress = action.meta.arg.transactionId;
        state.markDeliveredError = null;
      })
      .addCase(markDeliveredThunk.fulfilled, (state, action) => {
        state.markDeliveredInProgress = null;
        const { transactionId } = action.payload;
        state.ordersAwaitingDelivery = state.ordersAwaitingDelivery.filter(
          o => o.id !== transactionId
        );
      })
      .addCase(markDeliveredThunk.rejected, (state, action) => {
        state.markDeliveredInProgress = null;
        state.markDeliveredError = action.payload;
      })
      // Push Notification Center
      .addCase(fetchAnnouncementsThunk.pending, state => {
        state.announcementsFetchInProgress = true;
        state.announcementsError = null;
      })
      .addCase(fetchAnnouncementsThunk.fulfilled, (state, action) => {
        state.announcementsFetchInProgress = false;
        state.announcements = action.payload.announcements || [];
      })
      .addCase(fetchAnnouncementsThunk.rejected, (state, action) => {
        state.announcementsFetchInProgress = false;
        state.announcementsError = action.payload;
      })
      .addCase(sendPushBroadcastThunk.pending, state => {
        state.sendPushInProgress = true;
        state.sendPushSuccess = false;
        state.sendPushError = null;
      })
      .addCase(sendPushBroadcastThunk.fulfilled, (state, action) => {
        state.sendPushInProgress = false;
        state.sendPushSuccess = true;
        if (action.payload?.announcement) {
          state.announcements = [action.payload.announcement, ...state.announcements];
        }
      })
      .addCase(sendPushBroadcastThunk.rejected, (state, action) => {
        state.sendPushInProgress = false;
        state.sendPushError = action.payload;
      })
      .addCase(setAnnouncementActiveThunk.fulfilled, (state, action) => {
        const { id, active } = action.payload;
        state.announcements = state.announcements.map(a =>
          a.id === id ? { ...a, active } : a
        );
      })
      // Vendors
      .addCase(fetchVendorsThunk.pending, state => {
        state.vendorsFetchInProgress = true;
        state.vendorsError = null;
      })
      .addCase(fetchVendorsThunk.fulfilled, (state, action) => {
        state.vendorsFetchInProgress = false;
        state.vendors = action.payload.vendors || [];
      })
      .addCase(fetchVendorsThunk.rejected, (state, action) => {
        state.vendorsFetchInProgress = false;
        state.vendorsError = action.payload;
      })
      .addCase(setVendorTaxExemptThunk.pending, (state, action) => {
        state.vendorTaxExemptInProgress = action.meta.arg.userId;
        state.vendorTaxExemptError = null;
      })
      .addCase(setVendorTaxExemptThunk.fulfilled, (state, action) => {
        state.vendorTaxExemptInProgress = null;
        const { userId, taxExempt } = action.payload;
        state.vendors = state.vendors.map(v =>
          v.id === userId ? { ...v, taxExempt } : v
        );
      })
      .addCase(setVendorTaxExemptThunk.rejected, (state, action) => {
        state.vendorTaxExemptInProgress = null;
        state.vendorTaxExemptError = action.payload;
      });
  },
});

export const {
  clearDeliveryUpdateSuccess,
  clearGeofenceUpdateSuccess,
  clearPickupUpdateSuccess,
  clearTaxUpdateSuccess,
  clearShuffleUpdateSuccess,
  clearBulletinsUpdateSuccess,
  clearSendPushSuccess,
} = adminPageSlice.actions;

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

export const fetchPendingUsers = () => dispatch => {
  return dispatch(fetchPendingUsersThunk()).unwrap();
};

export const approveUser = params => dispatch => {
  return dispatch(approveUserThunk(params)).unwrap();
};

export const rejectUser = params => dispatch => {
  return dispatch(rejectUserThunk(params)).unwrap();
};

export const fetchOrdersAwaitingDelivery = () => dispatch => {
  return dispatch(fetchOrdersAwaitingDeliveryThunk()).unwrap();
};

export const fetchAnnouncements = () => dispatch => {
  return dispatch(fetchAnnouncementsThunk()).unwrap();
};

export const sendPushBroadcast = params => dispatch => {
  return dispatch(sendPushBroadcastThunk(params)).unwrap();
};

export const setAnnouncementActive = params => dispatch => {
  return dispatch(setAnnouncementActiveThunk(params)).unwrap();
};

export const markOrderDelivered = params => dispatch => {
  return dispatch(markDeliveredThunk(params)).unwrap();
};

export const fetchPickupSettings = () => dispatch => {
  return dispatch(fetchPickupSettingsThunk()).unwrap();
};

export const updatePickupSettings = params => dispatch => {
  return dispatch(updatePickupSettingsThunk(params)).unwrap();
};

export const fetchTaxSettings = () => dispatch => {
  return dispatch(fetchTaxSettingsThunk()).unwrap();
};

export const updateTaxSettings = params => dispatch => {
  return dispatch(updateTaxSettingsThunk(params)).unwrap();
};

export const fetchListingShuffleSettings = () => dispatch => {
  return dispatch(fetchListingShuffleSettingsThunk()).unwrap();
};

export const updateListingShuffleSettings = params => dispatch => {
  return dispatch(updateListingShuffleSettingsThunk(params)).unwrap();
};

export const runListingShuffle = () => dispatch => {
  return dispatch(runListingShuffleThunk()).unwrap();
};

export const fetchBulletins = () => dispatch => {
  return dispatch(fetchBulletinsThunk()).unwrap();
};

export const updateBulletins = params => dispatch => {
  return dispatch(updateBulletinsThunk(params)).unwrap();
};

export const fetchVendors = () => dispatch => {
  return dispatch(fetchVendorsThunk()).unwrap();
};

export const setVendorTaxExempt = params => dispatch => {
  return dispatch(setVendorTaxExemptThunk(params)).unwrap();
};

// ================ loadData ================ //

export const loadData = () => dispatch => {
  return Promise.all([
    dispatch(fetchDeliverySettings()),
    dispatch(fetchGeofenceSettings()),
    dispatch(fetchPendingUsers()),
    dispatch(fetchOrdersAwaitingDelivery()),
    dispatch(fetchAnnouncements()),
    dispatch(fetchPickupSettings()),
    dispatch(fetchTaxSettings()),
    dispatch(fetchListingShuffleSettings()),
    dispatch(fetchBulletins()),
    dispatch(fetchVendors()),
  ]);
};

export default adminPageSlice.reducer;
