import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { initiatePrivileged, estimateCartDelivery, createOnfleetTask } from '../../util/api';
import { storableError } from '../../util/errors';
import * as log from '../../util/log';
import { clearCart, removeItems } from '../../ducks/cart.duck';
import { setCurrentUserHasOrders } from '../../ducks/user.duck';

// ================ Async thunks ================ //

/**
 * Process cart checkout: creates one transaction per cart item sequentially.
 * For new cards, sets up a reusable PaymentMethod via SetupIntent before processing.
 */
const processCartCheckoutPayloadCreator = async (
  { cartItems, stripe, card, billingDetails, shippingDetails, processAlias, savedPaymentMethodId, stripeCustomer },
  { dispatch, extra: sdk, rejectWithValue }
) => {
  const results = [];
  let paymentMethodId = savedPaymentMethodId || null;

  // If using a new card, create a SetupIntent to save it as a reusable PaymentMethod.
  // This is the proper Stripe Connect flow: the PM is created on the platform account
  // and can be reused across multiple PaymentIntents on connected accounts.
  if (!paymentMethodId && card) {
    try {
      // Step A: Create a SetupIntent via Sharetribe SDK
      const setupIntentResponse = await sdk.stripeSetupIntents.create();
      const setupIntent = setupIntentResponse.data.data;
      const setupIntentClientSecret =
        setupIntent.attributes.clientSecret || setupIntent.attributes.client_secret;

      // Step B: Confirm the SetupIntent with the card element
      const setupResult = await stripe.confirmCardSetup(setupIntentClientSecret, {
        payment_method: {
          card,
          billing_details: billingDetails,
        },
      });

      if (setupResult.error) {
        return rejectWithValue({
          results: [],
          error: setupResult.error.message || 'Card setup failed',
        });
      }

      // Step C: Save the PM to the user's Stripe Customer (call SDK directly)
      const newPaymentMethodId = setupResult.setupIntent.payment_method;
      if (stripeCustomer?.id) {
        // User already has a Stripe Customer — add or replace payment method
        await sdk.stripeCustomer.addPaymentMethod(
          { stripePaymentMethodId: newPaymentMethodId },
          { expand: true }
        );
      } else {
        // Create a new Stripe Customer with this payment method
        await sdk.stripeCustomer.create(
          { stripePaymentMethodId: newPaymentMethodId },
          { expand: true, include: ['defaultPaymentMethod'] }
        );
      }
      paymentMethodId = newPaymentMethodId;
    } catch (e) {
      log.error(e, 'cart-checkout-card-setup-failed');
      return rejectWithValue({
        results: [],
        error: 'Failed to set up payment method. Please try again.',
      });
    }
  }

  // Pre-compute route-based delivery fee for shipping items
  let routeShippingFeeCents = null;
  const shippingAddr = shippingDetails?.protectedData?.shippingAddress;
  const hasShippingItems = cartItems.some(item => item.deliveryMethod === 'shipping');

  if (hasShippingItems && shippingAddr) {
    try {
      const shippingListingIds = cartItems
        .filter(item => item.deliveryMethod === 'shipping')
        .map(item => item.listingId);
      const routeEstimate = await estimateCartDelivery({
        listingIds: shippingListingIds,
        shippingAddress: {
          line1: shippingAddr.addressLine1,
          city: shippingAddr.city,
          state: shippingAddr.state,
          postalCode: shippingAddr.postalCode,
          country: shippingAddr.country,
        },
      });
      routeShippingFeeCents = routeEstimate.totalFeeCents || 0;
    } catch (e) {
      log.error(e, 'cart-checkout-route-estimate-failed');
      // Continue without custom fee — server will calculate per-item
    }
  }

  let shippingFeeAssigned = false;

  for (let i = 0; i < cartItems.length; i++) {
    const item = cartItems[i];
    dispatch(setCurrentItemIndex(i));

    try {
      // Step 1: Initiate the transaction via privileged API
      const { deliveryMethod, quantity } = item;
      const quantityMaybe = quantity ? { stockReservationQuantity: quantity } : {};
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

      // Assign route-based shipping: full fee on first shipping item, $0 on rest
      const customShippingMaybe =
        deliveryMethod === 'shipping' && routeShippingFeeCents != null
          ? { customShippingFeeCents: shippingFeeAssigned ? 0 : routeShippingFeeCents }
          : {};

      if (deliveryMethod === 'shipping' && routeShippingFeeCents != null && !shippingFeeAssigned) {
        shippingFeeAssigned = true;
      }

      const orderData = {
        ...(deliveryMethod ? { deliveryMethod } : {}),
        ...shippingAddressMaybe,
        ...customShippingMaybe,
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

      // paymentMethodId is always set: either from saved card or SetupIntent flow above
      const stripeResult = await stripe.confirmCardPayment(stripePaymentIntentClientSecret, {
        payment_method: paymentMethodId,
      });

      if (stripeResult.error) {
        throw new Error(stripeResult.error.message || 'Payment failed');
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

      // Create OnFleet delivery task for shipping items (non-blocking)
      let trackingURL = null;
      if (item.deliveryMethod === 'shipping') {
        try {
          const onfleetResult = await createOnfleetTask({ transactionId: orderId.uuid });
          if (onfleetResult.trackingURL) {
            trackingURL = onfleetResult.trackingURL;
          }
        } catch (onfleetError) {
          log.error(onfleetError, 'cart-checkout-onfleet-task-failed', {
            listingId: item.listingId,
            orderId: orderId.uuid,
          });
          // Do not fail checkout if OnFleet is unavailable
        }
      }

      results.push({
        listingId: item.listingId,
        orderId: orderId.uuid,
        title: item.listing?.attributes?.title,
        success: true,
        ...(trackingURL ? { trackingURL } : {}),
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
