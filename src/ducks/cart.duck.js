import { createSlice } from '@reduxjs/toolkit';

const CART_STORAGE_KEY = 'farmfed_cart';

// Helper to read cart from localStorage
const readCartFromStorage = () => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

// Helper to write cart to localStorage
const writeCartToStorage = items => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    // Storage full or unavailable
  }
};

// ================ Slice ================ //

const initialState = {
  items: [],
  isCartOpen: false,
  initialized: false,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    initializeCart: state => {
      state.items = readCartFromStorage();
      state.initialized = true;
    },
    addItem: (state, action) => {
      const { listingId, listing, quantity, deliveryMethod } = action.payload;
      const existingIndex = state.items.findIndex(item => item.listingId === listingId);
      if (existingIndex >= 0) {
        state.items[existingIndex].quantity = (state.items[existingIndex].quantity || 1) + (quantity || 1);
      } else {
        state.items.push({
          listingId,
          listing,
          quantity: quantity || 1,
          deliveryMethod: deliveryMethod || null,
          addedAt: new Date().toISOString(),
        });
      }
      writeCartToStorage(state.items);
    },
    removeItem: (state, action) => {
      const { listingId } = action.payload;
      state.items = state.items.filter(item => item.listingId !== listingId);
      writeCartToStorage(state.items);
    },
    updateQuantity: (state, action) => {
      const { listingId, quantity } = action.payload;
      const item = state.items.find(i => i.listingId === listingId);
      if (item && quantity > 0) {
        item.quantity = quantity;
        writeCartToStorage(state.items);
      }
    },
    clearCart: state => {
      state.items = [];
      writeCartToStorage(state.items);
    },
    removeItems: (state, action) => {
      const listingIds = action.payload;
      state.items = state.items.filter(item => !listingIds.includes(item.listingId));
      writeCartToStorage(state.items);
    },
    openCartPanel: state => {
      state.isCartOpen = true;
    },
    closeCartPanel: state => {
      state.isCartOpen = false;
    },
    toggleCartPanel: state => {
      state.isCartOpen = !state.isCartOpen;
    },
  },
});

// ================ Exports ================ //

export const {
  initializeCart,
  addItem,
  removeItem,
  updateQuantity,
  clearCart,
  removeItems,
  openCartPanel,
  closeCartPanel,
  toggleCartPanel,
} = cartSlice.actions;

export default cartSlice.reducer;

// ================ Selectors ================ //

export const getCartItems = state => state.cart.items;
export const getCartItemCount = state =>
  state.cart.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
export const getIsCartOpen = state => state.cart.isCartOpen;
