import React from 'react';
import classNames from 'classnames';

import { useIntl, FormattedMessage } from '../../util/reactIntl';
import { formatMoney } from '../../util/currency';
import { types as sdkTypes } from '../../util/sdkLoader';
import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { createResourceLocatorString } from '../../util/routes';

import { IconClose, NamedLink } from '../../components';
import CartItem from './CartItem';

import css from './CartPanel.module.css';

const { Money } = sdkTypes;

const CartPanel = props => {
  const {
    isOpen,
    items,
    onClose,
    onRemoveItem,
    onUpdateQuantity,
    onManageDisableScrolling,
    history,
  } = props;

  const intl = useIntl();
  const routeConfiguration = useRouteConfiguration();

  // Calculate subtotal
  const subtotal = items.reduce((sum, item) => {
    const price = item.listing?.attributes?.price;
    if (price) {
      return sum + price.amount * (item.quantity || 1);
    }
    return sum;
  }, 0);

  const currency = items[0]?.listing?.attributes?.price?.currency || 'USD';
  const formattedSubtotal = subtotal > 0 ? formatMoney(intl, new Money(subtotal, currency)) : null;

  const handleCheckout = () => {
    onClose();
    const path = createResourceLocatorString('CartCheckoutPage', routeConfiguration, {}, {});
    history.push(path);
  };

  const overlayClasses = classNames(css.overlay, { [css.overlayOpen]: isOpen });
  const panelClasses = classNames(css.panel, { [css.panelOpen]: isOpen });

  return (
    <div className={overlayClasses}>
      <div className={css.backdrop} onClick={onClose} role="presentation" />
      <div className={panelClasses}>
        <div className={css.header}>
          <h2 className={css.title}>
            <FormattedMessage id="CartPanel.title" />
          </h2>
          <button className={css.closeButton} onClick={onClose} type="button">
            <IconClose rootClassName={css.closeIcon} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className={css.emptyState}>
            <p className={css.emptyText}>
              <FormattedMessage id="CartPanel.emptyCart" />
            </p>
          </div>
        ) : (
          <>
            <div className={css.itemList}>
              {items.map(item => (
                <CartItem
                  key={item.listingId}
                  item={item}
                  intl={intl}
                  onRemove={onRemoveItem}
                  onUpdateQuantity={onUpdateQuantity}
                />
              ))}
            </div>
            <div className={css.footer}>
              {formattedSubtotal ? (
                <div className={css.subtotalRow}>
                  <span className={css.subtotalLabel}>
                    <FormattedMessage id="CartPanel.subtotal" />
                  </span>
                  <span className={css.subtotalAmount}>{formattedSubtotal}</span>
                </div>
              ) : null}
              <button className={css.checkoutButton} onClick={handleCheckout} type="button">
                <FormattedMessage id="CartPanel.checkoutButton" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CartPanel;
