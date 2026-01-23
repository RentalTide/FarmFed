import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { initiatePrivileged } from '../../util/api';
import { storableError } from '../../util/errors';
import * as log from '../../util/log';
import { clearCart, removeItems } from '../../ducks/cart.duck';
import { setCurrentUserHasOrders } from '../../ducks/user.duck';

// ================ Async thunks ================ //

/**
 * Process cart checkout: creates one transaction per cart item sequentially.
 * Reuses the payment method from the first Stripe confirmation for subsequent items.
 */
const processCartCheckoutPayloadCreator = async (
  { cartItems, stripe, card, billingDetails, shippingDetails, processAlias },
  { dispatch, extra: sdk, rejectWithValue }
) => {
  const results = [];
  let paymentMethodId = null;

  for (let i = 0; i < cartItems.length; i++) {
    const item = cartItems[i];
    dispatch(setCurrentItemIndex(i));

    try {
      // Step 1: Initiate the transaction via privileged API
      const { deliveryMethod, quantity } = item;
      const quantityMaybe = quantity ? { stockReservationQuantity: quantity } : {};
      const shippingAddr = shippingDetails?.protectedData?.shippingAddress;
      const shippingAddressMaybe =
        deliveryMethod === 'shipping' && shippingAddr
          ? {
              shippingAddress: {
                line1: shippingAddr.addressLine1,
                city: shippingAddr.city,
                state: shippingAddr.state,
                postalCode: shippingAddr.postalCode,
                country: shippingAddr.country,
              },
            }
          : {};
      const orderData = {
        ...(deliveryMethod ? { deliveryMethod } : {}),
        ...shippingAddressMaybe,
      };

      const listingProcessAlias =
        item.listing?.attributes?.publicData?.transactionProcessAlias || processAlias;

      const bodyParams = {
        processAlias: listingProcessAlias,
        transition: 'transition/request-payment',
        params: {
          listingId: { _sdkType: 'UUID', uuid: item.listingId },
          ...quantityMaybe,
          ...(shippingDetails || {}),
          cardToken: 'CartCheckoutPage_card_token',
        },
      };
      const queryParams = {
        include: ['booking', 'provider'],
        expand: true,
      };

      const orderResponse = await initiatePrivileged({
        isSpeculative: false,
        orderData,
        bodyParams,
        queryParams,
      });

      const order = orderResponse.data.data;
      const orderId = order.id;

      // Step 2: Confirm card payment with Stripe
      const stripePaymentIntents = order.attributes.protectedData?.stripePaymentIntents;
      if (!stripePaymentIntents) {
        throw new Error('Missing stripePaymentIntents in transaction protectedData');
      }

      const { stripePaymentIntentClientSecret } = stripePaymentIntents.default;

      let stripeResult;
      if (i === 0) {
        // First item: use card element
        stripeResult = await stripe.confirmCardPayment(stripePaymentIntentClientSecret, {
          payment_method: {
            card,
            billing_details: billingDetails,
          },
        });
      } else {
        // Subsequent items: reuse payment method from first confirmation
        stripeResult = await stripe.confirmCardPayment(stripePaymentIntentClientSecret, {
          payment_method: paymentMethodId,
        });
      }

      if (stripeResult.error) {
        throw new Error(stripeResult.error.message || 'Payment failed');
      }

      // Save payment method ID from first successful confirmation
      if (i === 0 && stripeResult.paymentIntent?.payment_method) {
        paymentMethodId = stripeResult.paymentIntent.payment_method;
      }

      // Step 3: Confirm payment transition on Marketplace API
      await sdk.transactions.transition(
        {
          id: orderId,
          transition: 'transition/confirm-payment',
          params: {},
        },
        { expand: true }
      );

      dispatch(setCurrentUserHasOrders());

      results.push({
        listingId: item.listingId,
        orderId: orderId.uuid,
        title: item.listing?.attributes?.title,
        success: true,
      });
    } catch (e) {
      log.error(e, 'cart-checkout-item-failed', { listingId: item.listingId });
      results.push({
        listingId: item.listingId,
        title: item.listing?.attributes?.title,
        success: false,
        error: e.message || 'Transaction failed',
      });

      // If first item fails (card decline), stop processing
      if (i === 0) {
        return rejectWithValue({
          results,
          error: 'Payment declined. Please check your card details.',
        });
      }
    }
  }

  // Clear successful items from cart
  const successfulIds = results.filter(r => r.success).map(r => r.listingId);
  if (successfulIds.length > 0) {
    dispatch(removeItems(successfulIds));
  }

  const allSucceeded = results.every(r => r.success);
  if (allSucceeded) {
    dispatch(clearCart());
  }

  return { results, allSucceeded };
};

export const processCartCheckout = createAsyncThunk(
  'CartCheckoutPage/processCartCheckout',
  processCartCheckoutPayloadCreator
);

/**
 * Speculate line items for a single cart item (for price breakdown display)
 */
const speculateCartItemPayloadCreator = async (
  { item, processAlias },
  { rejectWithValue }
) => {
  try {
    const { deliveryMethod, quantity, listingId } = item;
    const listingProcessAlias =
      item.listing?.attributes?.publicData?.transactionProcessAlias || processAlias;
    const quantityMaybe = quantity ? { stockReservationQuantity: quantity } : {};
    const orderData = deliveryMethod ? { deliveryMethod } : {};

    const bodyParams = {
      processAlias: listingProcessAlias,
      transition: 'transition/request-payment',
      params: {
        listingId: { _sdkType: 'UUID', uuid: listingId },
        ...quantityMaybe,
        cardToken: 'CartCheckoutPage_speculative_card_token',
      },
    };
    const queryParams = {
      include: ['booking', 'provider', 'listing'],
      expand: true,
    };

    const response = await initiatePrivileged({
      isSpeculative: true,
      orderData,
      bodyParams,
      queryParams,
    });

    return { listingId, transaction: response.data.data };
  } catch (e) {
    return rejectWithValue({ listingId: item.listingId, error: storableError(e) });
  }
};

export const speculateCartItem = createAsyncThunk(
  'CartCheckoutPage/speculateCartItem',
  speculateCartItemPayloadCreator
);

// ================ Slice ================ //

const initialState = {
  speculatedTransactions: {},
  speculateInProgress: false,
  speculateError: null,
  checkoutInProgress: false,
  currentItemIndex: 0,
  completedResults: null,
  checkoutError: null,
};

const cartCheckoutSlice = createSlice({
  name: 'CartCheckoutPage',
  initialState,
  reducers: {
    setCurrentItemIndex: (state, action) => {
      state.currentItemIndex = action.payload;
    },
    resetCheckout: () => initialState,
  },
  extraReducers: builder => {
    builder
      .addCase(processCartCheckout.pending, state => {
        state.checkoutInProgress = true;
        state.currentItemIndex = 0;
        state.completedResults = null;
        state.checkoutError = null;
      })
      .addCase(processCartCheckout.fulfilled, (state, action) => {
        state.checkoutInProgress = false;
        state.completedResults = action.payload;
      })
      .addCase(processCartCheckout.rejected, (state, action) => {
        state.checkoutInProgress = false;
        state.checkoutError = action.payload?.error || 'Checkout failed';
        state.completedResults = action.payload;
      })
      .addCase(speculateCartItem.pending, state => {
        state.speculateInProgress = true;
      })
      .addCase(speculateCartItem.fulfilled, (state, action) => {
        state.speculateInProgress = false;
        const { listingId, transaction } = action.payload;
        state.speculatedTransactions[listingId] = transaction;
      })
      .addCase(speculateCartItem.rejected, (state, action) => {
        state.speculateInProgress = false;
        state.speculateError = action.payload?.error || null;
      });
  },
});

export const { setCurrentItemIndex, resetCheckout } = cartCheckoutSlice.actions;
export default cartCheckoutSlice.reducer;

// ================ Selectors ================ //

export const getCheckoutState = state => state.CartCheckoutPage;
