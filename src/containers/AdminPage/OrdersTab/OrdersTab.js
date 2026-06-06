import React from 'react';
import { useIntl, FormattedMessage } from '../../../util/reactIntl';

import css from './OrdersTab.module.css';

const formatDate = dateStr => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const OrderRow = ({ order, markInProgress, onMarkDelivered, intl }) => {
  const isMarking = markInProgress === order.id;
  const methodLabel =
    order.deliveryMethod === 'shipping'
      ? intl.formatMessage({ id: 'AdminPage.ordersMethodDelivery' })
      : order.deliveryMethod === 'pickup'
      ? intl.formatMessage({ id: 'AdminPage.ordersMethodPickup' })
      : null;

  return (
    <div className={css.orderRow}>
      <div className={css.orderInfo}>
        <span className={css.orderTitle}>{order.listingTitle}</span>
        <span className={css.orderMeta}>
          <FormattedMessage
            id="AdminPage.ordersMeta"
            values={{ customer: order.customerName, vendor: order.providerName }}
          />
        </span>
        <span className={css.orderSub}>
          {methodLabel ? <span className={css.methodBadge}>{methodLabel}</span> : null}
          <span className={css.orderDate}>{formatDate(order.lastTransitionedAt)}</span>
        </span>
      </div>
      <div className={css.orderActions}>
        <button
          className={css.markButton}
          onClick={() => onMarkDelivered(order.id)}
          disabled={isMarking}
          type="button"
        >
          {isMarking ? (
            <FormattedMessage id="AdminPage.ordersMarkingButton" />
          ) : (
            <FormattedMessage id="AdminPage.ordersMarkDeliveredButton" />
          )}
        </button>
      </div>
    </div>
  );
};

const OrdersTab = props => {
  const {
    orders = [],
    fetchInProgress,
    fetchError,
    markInProgress,
    markError,
    onMarkDelivered,
  } = props;

  const intl = useIntl();

  if (fetchInProgress) {
    return (
      <div className={css.root}>
        <p className={css.loading}>
          <FormattedMessage id="AdminPage.ordersLoading" />
        </p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className={css.root}>
        <p className={css.error}>
          <FormattedMessage id="AdminPage.ordersFetchError" />
        </p>
      </div>
    );
  }

  return (
    <div className={css.root}>
      <p className={css.intro}>
        <FormattedMessage id="AdminPage.ordersIntro" />
      </p>

      {markError ? (
        <p className={css.error}>
          <FormattedMessage id="AdminPage.ordersMarkError" />
        </p>
      ) : null}

      <section className={css.section}>
        <h3 className={css.sectionTitle}>
          <FormattedMessage id="AdminPage.ordersHeading" />
          <span className={css.count}>({orders.length})</span>
        </h3>
        {orders.length === 0 ? (
          <p className={css.emptyState}>
            <FormattedMessage id="AdminPage.ordersEmpty" />
          </p>
        ) : (
          <div className={css.orderList}>
            {orders.map(order => (
              <OrderRow
                key={order.id}
                order={order}
                markInProgress={markInProgress}
                onMarkDelivered={onMarkDelivered}
                intl={intl}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default OrdersTab;
