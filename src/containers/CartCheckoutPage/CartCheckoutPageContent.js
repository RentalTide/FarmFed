import React, { useState, useEffect, useRef, useCallback } from 'react';

import { FormattedMessage } from '../../util/reactIntl';
import { formatMoney } from '../../util/currency';
import { types as sdkTypes } from '../../util/sdkLoader';

import { NamedLink, PrimaryButton } from '../../components';

import css from './CartCheckoutPage.module.css';

const { Money } = sdkTypes;

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
  const { cartItems, checkoutState, onProcessCheckout, currentUser, config, intl } = props;

  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  });
  const [cardReady, setCardReady] = useState(false);
  const [cardError, setCardError] = useState(null);

  const stripeRef = useRef(null);
  const cardRef = useRef(null);
  const cardContainerRef = useRef(null);

  const { checkoutInProgress, currentItemIndex, completedResults, checkoutError } = checkoutState;

  const hasShippingItems = cartItems.some(item => item.deliveryMethod === 'shipping');

  // Initialize Stripe on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !window.Stripe) return;

    const publishableKey = config?.stripe?.publishableKey;
    if (!publishableKey) return;

    stripeRef.current = window.Stripe(publishableKey);
    const elements = stripeRef.current.elements(stripeElementsOptions);
    cardRef.current = elements.create('card', { style: cardStyles });

    if (cardContainerRef.current) {
      cardRef.current.mount(cardContainerRef.current);
      cardRef.current.addEventListener('change', event => {
        setCardError(event.error ? event.error.message : null);
        setCardReady(event.complete);
      });
    }

    return () => {
      if (cardRef.current) {
        cardRef.current.unmount();
        cardRef.current = null;
      }
    };
  }, [config?.stripe?.publishableKey]);

  const handleShippingChange = e => {
    const { name, value } = e.target;
    setShippingAddress(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = useCallback(
    e => {
      e.preventDefault();
      if (!stripeRef.current || !cardRef.current) return;

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

      onProcessCheckout({
        cartItems,
        stripe: stripeRef.current,
        card: cardRef.current,
        billingDetails,
        shippingDetails: shippingDetailsMaybe,
      });
    },
    [cartItems, shippingAddress, hasShippingItems, onProcessCheckout]
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

  // Calculate total
  const total = cartItems.reduce((sum, item) => {
    const price = item.listing?.attributes?.price;
    return price ? sum + price.amount * (item.quantity || 1) : sum;
  }, 0);
  const currency = cartItems[0]?.listing?.attributes?.price?.currency || 'USD';
  const formattedTotal = total > 0 ? formatMoney(intl, new Money(total, currency)) : '';

  return (
    <div className={css.root}>
      <h1 className={css.pageTitle}>
        <FormattedMessage id="CartCheckoutPage.title" />
      </h1>

      <form onSubmit={handleSubmit} className={css.checkoutForm}>
        <div className={css.orderSummary}>
          <h3 className={css.sectionTitle}>
            <FormattedMessage id="CartCheckoutPage.orderSummary" />
          </h3>
          {cartItems.map(item => (
            <CartItemRow key={item.listingId} item={item} intl={intl} />
          ))}
          <div className={css.totalRow}>
            <span className={css.totalLabel}>
              <FormattedMessage id="CartCheckoutPage.total" />
            </span>
            <span className={css.totalAmount}>{formattedTotal}</span>
          </div>
        </div>

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
          <div className={css.cardElement} ref={cardContainerRef} />
          {cardError ? <p className={css.cardError}>{cardError}</p> : null}
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
          disabled={!cardReady || checkoutInProgress}
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
      </form>
    </div>
  );
};

export default CartCheckoutPageContent;
