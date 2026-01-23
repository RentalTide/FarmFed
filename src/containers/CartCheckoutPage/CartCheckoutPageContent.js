import React, { useState, useEffect, useRef, useCallback } from 'react';

import { FormattedMessage } from '../../util/reactIntl';
import { formatMoney } from '../../util/currency';
import { types as sdkTypes } from '../../util/sdkLoader';
import { transactionLineItems, estimateCartDelivery } from '../../util/api';

import { NamedLink, PrimaryButton } from '../../components';

import css from './CartCheckoutPage.module.css';

const { Money, UUID } = sdkTypes;

const stripeElementsOptions = {
  fonts: [{ cssSrc: 'https://fonts.googleapis.com/css?family=Inter' }],
};

const cardStyles = {
  base: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", Helvetica, Arial, sans-serif',
    fontSize: '16px',
    fontSmoothing: 'antialiased',
    lineHeight: '24px',
    letterSpacing: '-0.1px',
    color: '#4A4A4A',
    '::placeholder': { color: '#B2B2B2' },
  },
};

const CartItemRow = ({ item, intl }) => {
  const { listing, quantity } = item;
  const title = listing?.attributes?.title || '';
  const price = listing?.attributes?.price;
  const formattedPrice = price ? formatMoney(intl, new Money(price.amount, price.currency)) : '';
  const lineTotal = price
    ? formatMoney(intl, new Money(price.amount * quantity, price.currency))
    : '';

  return (
    <div className={css.cartItemRow}>
      <div className={css.cartItemInfo}>
        <span className={css.cartItemTitle}>{title}</span>
        <span className={css.cartItemDetails}>
          {formattedPrice} x {quantity}
        </span>
      </div>
      <span className={css.cartItemTotal}>{lineTotal}</span>
    </div>
  );
};

const CartCheckoutPageContent = props => {
  const { cartItems, checkoutState, onProcessCheckout, currentUser, stripeCustomer, config, intl } = props;

  const profile = currentUser?.attributes?.profile;
  const savedAddress = currentUser?.attributes?.profile?.protectedData?.address;

  const [shippingAddress, setShippingAddress] = useState({
    name: profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : '',
    addressLine1: savedAddress?.street || '',
    addressLine2: '',
    city: savedAddress?.city || '',
    state: savedAddress?.state || '',
    postalCode: savedAddress?.zip || '',
    country: savedAddress?.country || '',
  });
  const addressInitializedRef = useRef(false);

  // Pre-fill address from user profile when it becomes available
  useEffect(() => {
    if (addressInitializedRef.current) return;
    if (profile && savedAddress) {
      addressInitializedRef.current = true;
      setShippingAddress(prev => ({
        ...prev,
        name: prev.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
        addressLine1: prev.addressLine1 || savedAddress.street || '',
        city: prev.city || savedAddress.city || '',
        state: prev.state || savedAddress.state || '',
        postalCode: prev.postalCode || savedAddress.zip || '',
        country: prev.country || savedAddress.country || '',
      }));
    }
  }, [profile, savedAddress]);

  // Saved payment method
  const defaultPaymentMethod = stripeCustomer?.defaultPaymentMethod || null;
  const savedCard = defaultPaymentMethod?.attributes?.card || null;
  const [paymentChoice, setPaymentChoice] = useState(savedCard ? 'saved' : 'new');

  // Update payment choice when saved card becomes available
  useEffect(() => {
    if (savedCard && paymentChoice === 'new' && !cardReady) {
      setPaymentChoice('saved');
    }
  }, [savedCard]);

  const [cardReady, setCardReady] = useState(false);
  const [cardError, setCardError] = useState(null);
  const [estimatedDelivery, setEstimatedDelivery] = useState(null);
  const [estimatedFee, setEstimatedFee] = useState(null);
  const [estimatingBreakdown, setEstimatingBreakdown] = useState(false);
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState(null);
  const [deliveryRateCents, setDeliveryRateCents] = useState(null);
  const [deliveryDistanceMiles, setDeliveryDistanceMiles] = useState(null);

  const stripeRef = useRef(null);
  const cardRef = useRef(null);
  const cardContainerRef = useRef(null);
  const deliveryTimerRef = useRef(null);

  const { checkoutInProgress, currentItemIndex, completedResults, checkoutError } = checkoutState;

  // Check if any cart items support shipping (from listing publicData)
  const shippingAvailable = cartItems.some(
    item => item.listing?.attributes?.publicData?.shippingEnabled
  );
  const pickupAvailable = cartItems.some(
    item => item.listing?.attributes?.publicData?.pickupEnabled
  );

  // Initialize delivery method from cart items or default
  useEffect(() => {
    if (selectedDeliveryMethod) return;
    const cartMethod = cartItems.find(item => item.deliveryMethod)?.deliveryMethod;
    if (cartMethod) {
      setSelectedDeliveryMethod(cartMethod);
    } else if (shippingAvailable && !pickupAvailable) {
      setSelectedDeliveryMethod('shipping');
    } else if (pickupAvailable && !shippingAvailable) {
      setSelectedDeliveryMethod('pickup');
    }
  }, [cartItems, shippingAvailable, pickupAvailable, selectedDeliveryMethod]);

  const hasShippingItems = selectedDeliveryMethod === 'shipping' && shippingAvailable;

  // Initialize Stripe instance on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !window.Stripe) return;
    const publishableKey = config?.stripe?.publishableKey;
    if (!publishableKey) return;
    stripeRef.current = window.Stripe(publishableKey);
  }, [config?.stripe?.publishableKey]);

  // Mount/unmount card element based on payment choice
  useEffect(() => {
    if (!stripeRef.current || paymentChoice !== 'new') {
      if (cardRef.current) {
        cardRef.current.unmount();
        cardRef.current = null;
        setCardReady(false);
      }
      return;
    }

    if (!cardContainerRef.current) return;

    const elements = stripeRef.current.elements(stripeElementsOptions);
    cardRef.current = elements.create('card', { style: cardStyles });
    cardRef.current.mount(cardContainerRef.current);
    cardRef.current.addEventListener('change', event => {
      setCardError(event.error ? event.error.message : null);
      setCardReady(event.complete);
    });

    return () => {
      if (cardRef.current) {
        cardRef.current.unmount();
        cardRef.current = null;
        setCardReady(false);
      }
    };
  }, [paymentChoice, config?.stripe?.publishableKey]);

  // Fetch marketplace fee from line items
  useEffect(() => {
    if (!selectedDeliveryMethod || !cartItems.length) return;

    Promise.all(
      cartItems.map(item =>
        transactionLineItems({
          listingId: new UUID(item.listingId),
          orderData: {
            deliveryMethod: selectedDeliveryMethod,
            stockReservationQuantity: item.quantity,
          },
        })
      )
    )
      .then(responses => {
        let totalFee = 0;
        responses.forEach(res => {
          const lineItems = res?.data || [];
          const feeLine = lineItems.find(
            li => li.code === 'line-item/customer-commission'
          );
          if (feeLine) {
            totalFee += Math.abs(feeLine.lineTotal?.amount || feeLine.unitPrice?.amount || 0);
          }
        });
        setEstimatedFee(totalFee > 0 ? totalFee : null);
      })
      .catch(() => {
        setEstimatedFee(null);
      });
  }, [selectedDeliveryMethod, cartItems]);

  // Fetch route-based delivery estimate (supplier → supplier → buyer)
  useEffect(() => {
    if (selectedDeliveryMethod !== 'shipping' || !cartItems.length) {
      setEstimatedDelivery(null);
      setDeliveryDistanceMiles(null);
      return;
    }

    const { addressLine1, city, postalCode, country } = shippingAddress;
    const hasAddress = !!(addressLine1 && city && postalCode && country);
    if (!hasAddress) {
      setEstimatedDelivery(null);
      setDeliveryDistanceMiles(null);
      return;
    }

    if (deliveryTimerRef.current) {
      clearTimeout(deliveryTimerRef.current);
    }

    setEstimatingBreakdown(true);

    deliveryTimerRef.current = setTimeout(() => {
      const listingIds = cartItems.map(item => item.listingId);
      const address = {
        line1: addressLine1,
        city,
        state: shippingAddress.state,
        postalCode,
        country,
      };

      estimateCartDelivery({ listingIds, shippingAddress: address })
        .then(result => {
          const { totalFeeCents, totalDistanceMiles, rateCentsPerMile } = result;
          setEstimatedDelivery(totalFeeCents > 0 ? totalFeeCents : null);
          setDeliveryDistanceMiles(totalDistanceMiles > 0 ? totalDistanceMiles : null);
          if (rateCentsPerMile > 0) setDeliveryRateCents(rateCentsPerMile);
          setEstimatingBreakdown(false);
        })
        .catch(() => {
          setEstimatedDelivery(null);
          setDeliveryDistanceMiles(null);
          setEstimatingBreakdown(false);
        });
    }, 500);

    return () => {
      if (deliveryTimerRef.current) {
        clearTimeout(deliveryTimerRef.current);
      }
    };
  }, [
    shippingAddress.addressLine1,
    shippingAddress.city,
    shippingAddress.postalCode,
    shippingAddress.country,
    shippingAddress.state,
    selectedDeliveryMethod,
    cartItems,
  ]);

  const handleShippingChange = e => {
    const { name, value } = e.target;
    setShippingAddress(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = useCallback(
    e => {
      e.preventDefault();
      if (!stripeRef.current) return;
      if (paymentChoice === 'new' && !cardRef.current) return;

      const billingDetails = {
        name: shippingAddress.name || undefined,
      };

      const shippingDetailsMaybe = hasShippingItems
        ? {
            protectedData: {
              shippingAddress: { ...shippingAddress },
            },
          }
        : undefined;

      // Apply selected delivery method to items that support shipping
      const itemsWithDelivery = cartItems.map(item => {
        const publicData = item.listing?.attributes?.publicData;
        if (publicData?.shippingEnabled && publicData?.pickupEnabled) {
          return { ...item, deliveryMethod: selectedDeliveryMethod };
        }
        return item;
      });

      const savedPaymentMethodId = paymentChoice === 'saved' && defaultPaymentMethod?.attributes?.stripePaymentMethodId
        ? defaultPaymentMethod.attributes.stripePaymentMethodId
        : null;

      onProcessCheckout({
        cartItems: itemsWithDelivery,
        stripe: stripeRef.current,
        card: paymentChoice === 'new' ? cardRef.current : null,
        billingDetails,
        shippingDetails: shippingDetailsMaybe,
        savedPaymentMethodId,
        stripeCustomer,
      });
    },
    [cartItems, shippingAddress, hasShippingItems, selectedDeliveryMethod, onProcessCheckout, paymentChoice, defaultPaymentMethod, stripeCustomer]
  );

  // Success/Results view
  if (completedResults) {
    const { results, allSucceeded } = completedResults;
    const successResults = results?.filter(r => r.success) || [];
    const failedResults = results?.filter(r => !r.success) || [];

    return (
      <div className={css.root}>
        <div className={css.resultsContainer}>
          <h2 className={css.resultsTitle}>
            {allSucceeded ? (
              <FormattedMessage id="CartCheckoutPage.successTitle" />
            ) : (
              <FormattedMessage id="CartCheckoutPage.partialSuccessTitle" />
            )}
          </h2>

          {successResults.length > 0 ? (
            <div className={css.resultsList}>
              <h3 className={css.resultsSubtitle}>
                <FormattedMessage id="CartCheckoutPage.completedOrders" />
              </h3>
              {successResults.map(result => (
                <div key={result.orderId} className={css.resultItem}>
                  <span className={css.resultTitle}>{result.title}</span>
                  <NamedLink
                    name="OrderDetailsPage"
                    params={{ id: result.orderId }}
                    className={css.orderLink}
                  >
                    <FormattedMessage id="CartCheckoutPage.viewOrder" />
                  </NamedLink>
                </div>
              ))}
            </div>
          ) : null}

          {failedResults.length > 0 ? (
            <div className={css.resultsList}>
              <h3 className={css.resultsSubtitleError}>
                <FormattedMessage id="CartCheckoutPage.failedOrders" />
              </h3>
              {failedResults.map(result => (
                <div key={result.listingId} className={css.resultItemError}>
                  <span className={css.resultTitle}>{result.title}</span>
                  <span className={css.resultError}>{result.error}</span>
                </div>
              ))}
            </div>
          ) : null}

          <NamedLink name="InboxPage" params={{ tab: 'orders' }} className={css.inboxLink}>
            <FormattedMessage id="CartCheckoutPage.goToInbox" />
          </NamedLink>
        </div>
      </div>
    );
  }

  // Empty cart state
  if (!cartItems || cartItems.length === 0) {
    return (
      <div className={css.root}>
        <div className={css.emptyState}>
          <h2 className={css.emptyTitle}>
            <FormattedMessage id="CartCheckoutPage.emptyCart" />
          </h2>
          <NamedLink name="SearchPage" className={css.browseLink}>
            <FormattedMessage id="CartCheckoutPage.browseListings" />
          </NamedLink>
        </div>
      </div>
    );
  }

  // Calculate subtotal (items only)
  const subtotal = cartItems.reduce((sum, item) => {
    const price = item.listing?.attributes?.price;
    return price ? sum + price.amount * (item.quantity || 1) : sum;
  }, 0);
  const currency = cartItems[0]?.listing?.attributes?.price?.currency || 'USD';
  const formattedSubtotal = subtotal > 0 ? formatMoney(intl, new Money(subtotal, currency)) : '';

  const showBreakdown = estimatingBreakdown || estimatedFee != null || estimatedDelivery != null;
  const showDeliveryRow = hasShippingItems && (estimatingBreakdown || estimatedDelivery != null);
  const deliveryAmount = estimatedDelivery || 0;
  const feeAmount = estimatedFee || 0;
  const grandTotal = subtotal + deliveryAmount + feeAmount;
  const formattedTotal = grandTotal > 0 ? formatMoney(intl, new Money(grandTotal, currency)) : '';
  const formattedDelivery = estimatedDelivery != null
    ? formatMoney(intl, new Money(estimatedDelivery, currency))
    : '';
  const deliveryMath = estimatedDelivery != null && deliveryRateCents > 0 && deliveryDistanceMiles != null
    ? (() => {
        const rateFormatted = (deliveryRateCents / 100).toFixed(2);
        return `(${deliveryDistanceMiles.toFixed(1)} mi × $${rateFormatted}/mi)`;
      })()
    : null;
  const formattedFee = estimatedFee != null
    ? formatMoney(intl, new Money(estimatedFee, currency))
    : '';

  return (
    <div className={css.root}>
      <h1 className={css.pageTitle}>
        <FormattedMessage id="CartCheckoutPage.title" />
      </h1>

      <form onSubmit={handleSubmit} className={css.checkoutLayout}>
        <div className={css.formColumn}>
        {shippingAvailable && pickupAvailable ? (
          <div className={css.deliveryMethodSection}>
            <h3 className={css.sectionTitle}>
              <FormattedMessage id="CartCheckoutPage.deliveryMethodTitle" />
            </h3>
            <div className={css.deliveryOptions}>
              <label className={css.deliveryOption}>
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="pickup"
                  checked={selectedDeliveryMethod === 'pickup'}
                  onChange={() => {
                    setSelectedDeliveryMethod('pickup');
                    setEstimatedDelivery(null);
                    setEstimatedFee(null);
                  }}
                  className={css.radioInput}
                />
                <span className={css.radioLabel}>
                  <FormattedMessage id="CartCheckoutPage.pickupOption" />
                </span>
              </label>
              <label className={css.deliveryOption}>
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="shipping"
                  checked={selectedDeliveryMethod === 'shipping'}
                  onChange={() => setSelectedDeliveryMethod('shipping')}
                  className={css.radioInput}
                />
                <span className={css.radioLabel}>
                  <FormattedMessage id="CartCheckoutPage.shippingOption" />
                </span>
              </label>
            </div>
          </div>
        ) : null}

        {hasShippingItems ? (
          <div className={css.shippingSection}>
            <h3 className={css.sectionTitle}>
              <FormattedMessage id="CartCheckoutPage.shippingAddress" />
            </h3>
            <div className={css.formFields}>
              <div className={css.fieldGroup}>
                <label className={css.fieldLabel} htmlFor="shipping-name">
                  <FormattedMessage id="CartCheckoutPage.nameLabel" />
                </label>
                <input
                  id="shipping-name"
                  className={css.input}
                  name="name"
                  autoComplete="name"
                  value={shippingAddress.name}
                  onChange={handleShippingChange}
                  required
                />
              </div>
              <div className={css.fieldGroup}>
                <label className={css.fieldLabel} htmlFor="shipping-address1">
                  <FormattedMessage id="CartCheckoutPage.addressLine1Label" />
                </label>
                <input
                  id="shipping-address1"
                  className={css.input}
                  name="addressLine1"
                  autoComplete="address-line1"
                  value={shippingAddress.addressLine1}
                  onChange={handleShippingChange}
                  required
                />
              </div>
              <div className={css.fieldGroup}>
                <label className={css.fieldLabel} htmlFor="shipping-address2">
                  <FormattedMessage id="CartCheckoutPage.addressLine2Label" />
                </label>
                <input
                  id="shipping-address2"
                  className={css.input}
                  name="addressLine2"
                  autoComplete="address-line2"
                  value={shippingAddress.addressLine2}
                  onChange={handleShippingChange}
                />
              </div>
              <div className={css.formRow}>
                <div className={css.fieldGroup}>
                  <label className={css.fieldLabel} htmlFor="shipping-city">
                    <FormattedMessage id="CartCheckoutPage.cityLabel" />
                  </label>
                  <input
                    id="shipping-city"
                    className={css.input}
                    name="city"
                    autoComplete="address-level2"
                    value={shippingAddress.city}
                    onChange={handleShippingChange}
                    required
                  />
                </div>
                <div className={css.fieldGroup}>
                  <label className={css.fieldLabel} htmlFor="shipping-state">
                    <FormattedMessage id="CartCheckoutPage.stateLabel" />
                  </label>
                  <input
                    id="shipping-state"
                    className={css.input}
                    name="state"
                    autoComplete="address-level1"
                    value={shippingAddress.state}
                    onChange={handleShippingChange}
                  />
                </div>
              </div>
              <div className={css.formRow}>
                <div className={css.fieldGroup}>
                  <label className={css.fieldLabel} htmlFor="shipping-postal">
                    <FormattedMessage id="CartCheckoutPage.postalCodeLabel" />
                  </label>
                  <input
                    id="shipping-postal"
                    className={css.input}
                    name="postalCode"
                    autoComplete="postal-code"
                    value={shippingAddress.postalCode}
                    onChange={handleShippingChange}
                    required
                  />
                </div>
                <div className={css.fieldGroup}>
                  <label className={css.fieldLabel} htmlFor="shipping-country">
                    <FormattedMessage id="CartCheckoutPage.countryLabel" />
                  </label>
                  <input
                    id="shipping-country"
                    className={css.input}
                    name="country"
                    autoComplete="country"
                    value={shippingAddress.country}
                    onChange={handleShippingChange}
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className={css.paymentSection}>
          <h3 className={css.sectionTitle}>
            <FormattedMessage id="CartCheckoutPage.paymentDetails" />
          </h3>
          {savedCard ? (
            <div className={css.paymentOptions}>
              <label className={css.paymentOption}>
                <input
                  type="radio"
                  name="paymentChoice"
                  value="saved"
                  checked={paymentChoice === 'saved'}
                  onChange={() => setPaymentChoice('saved')}
                  className={css.radioInput}
                />
                <span className={css.savedCardInfo}>
                  <span className={css.cardBrand}>{savedCard.brand}</span>
                  <span className={css.cardLast4}>
                    <FormattedMessage
                      id="CartCheckoutPage.savedCardEnding"
                      values={{ last4: savedCard.last4Digits }}
                    />
                  </span>
                </span>
              </label>
              <label className={css.paymentOption}>
                <input
                  type="radio"
                  name="paymentChoice"
                  value="new"
                  checked={paymentChoice === 'new'}
                  onChange={() => setPaymentChoice('new')}
                  className={css.radioInput}
                />
                <span className={css.radioLabel}>
                  <FormattedMessage id="CartCheckoutPage.newCard" />
                </span>
              </label>
            </div>
          ) : null}
          {paymentChoice === 'new' ? (
            <>
              <div className={css.cardElement} ref={cardContainerRef} />
              {cardError ? <p className={css.cardError}>{cardError}</p> : null}
            </>
          ) : null}
        </div>

        {checkoutError ? (
          <div className={css.errorMessage}>
            <FormattedMessage id="CartCheckoutPage.errorPayment" />
            <p className={css.errorDetail}>{checkoutError}</p>
          </div>
        ) : null}

        <PrimaryButton
          type="submit"
          className={css.submitButton}
          disabled={(paymentChoice === 'new' && !cardReady) || checkoutInProgress || (shippingAvailable && pickupAvailable && !selectedDeliveryMethod)}
        >
          {checkoutInProgress ? (
            <FormattedMessage
              id="CartCheckoutPage.processingItem"
              values={{ current: currentItemIndex + 1, total: cartItems.length }}
            />
          ) : (
            <FormattedMessage id="CartCheckoutPage.submitButton" />
          )}
        </PrimaryButton>
        </div>

        <div className={css.summaryColumn}>
          <div className={css.orderSummary}>
            <h3 className={css.sectionTitle}>
              <FormattedMessage id="CartCheckoutPage.orderSummary" />
            </h3>
            {cartItems.map(item => (
              <CartItemRow key={item.listingId} item={item} intl={intl} />
            ))}
            {showBreakdown ? (
              <>
                <div className={css.subtotalRow}>
                  <span className={css.subtotalLabel}>
                    <FormattedMessage id="CartCheckoutPage.subtotal" />
                  </span>
                  <span className={css.subtotalAmount}>{formattedSubtotal}</span>
                </div>
                {showDeliveryRow ? (
                  <div className={css.deliveryRow}>
                    <span className={css.subtotalLabel}>
                      <FormattedMessage id="CartCheckoutPage.delivery" />
                      {deliveryMath ? (
                        <span className={css.deliveryMath}> {deliveryMath}</span>
                      ) : null}
                    </span>
                    <span className={css.subtotalAmount}>
                      {estimatingBreakdown ? (
                        <span className={css.estimatingText}>
                          <FormattedMessage id="CartCheckoutPage.estimatingDelivery" />
                        </span>
                      ) : (
                        formattedDelivery
                      )}
                    </span>
                  </div>
                ) : null}
                {estimatedFee != null ? (
                  <div className={css.deliveryRow}>
                    <span className={css.subtotalLabel}>
                      <FormattedMessage id="CartCheckoutPage.marketplaceFee" />
                    </span>
                    <span className={css.subtotalAmount}>{formattedFee}</span>
                  </div>
                ) : null}
              </>
            ) : null}
            <div className={css.totalRow}>
              <span className={css.totalLabel}>
                <FormattedMessage id="CartCheckoutPage.total" />
              </span>
              <span className={css.totalAmount}>
                {estimatingBreakdown ? (
                  <span className={css.estimatingText}>
                    <FormattedMessage id="CartCheckoutPage.estimatingDelivery" />
                  </span>
                ) : (
                  formattedTotal
                )}
              </span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CartCheckoutPageContent;
