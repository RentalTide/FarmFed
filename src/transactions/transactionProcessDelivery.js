/**
 * Transaction process graph for standalone delivery orders:
 *   - default-delivery
 *
 * One delivery transaction is created per cart order group, carrying the whole
 * route delivery fee. It is decoupled from the item (default-purchase)
 * transactions so a single declined item never refunds delivery. Delivery is
 * refunded only when every item in the order group is denied. See
 * ext/transaction-processes/default-delivery/process.edn and
 * server/api/reconcile-delivery.js.
 */

export const transitions = {
  REQUEST_PAYMENT: 'transition/request-payment',
  CONFIRM_PAYMENT: 'transition/confirm-payment',
  EXPIRE_PAYMENT: 'transition/expire-payment',

  // Whole order denied -> refund delivery in full.
  OPERATOR_REFUND: 'transition/operator-refund',

  // At least one item accepted -> capture the delivery payment.
  OPERATOR_CAPTURE: 'transition/operator-capture',
  AUTO_CAPTURE: 'transition/auto-capture',

  // Pay the captured fee out to the hub.
  OPERATOR_PAYOUT: 'transition/operator-payout',
  AUTO_PAYOUT: 'transition/auto-payout',
};

export const states = {
  INITIAL: 'initial',
  PENDING_PAYMENT: 'pending-payment',
  PAYMENT_EXPIRED: 'payment-expired',
  PAID: 'paid',
  REFUNDED: 'refunded',
  CAPTURED: 'captured',
  COMPLETED: 'completed',
};

export const graph = {
  id: 'default-delivery/release-1',
  initial: states.INITIAL,
  states: {
    [states.INITIAL]: {
      on: {
        [transitions.REQUEST_PAYMENT]: states.PENDING_PAYMENT,
      },
    },
    [states.PENDING_PAYMENT]: {
      on: {
        [transitions.EXPIRE_PAYMENT]: states.PAYMENT_EXPIRED,
        [transitions.CONFIRM_PAYMENT]: states.PAID,
      },
    },
    [states.PAYMENT_EXPIRED]: {},
    [states.PAID]: {
      on: {
        [transitions.OPERATOR_REFUND]: states.REFUNDED,
        [transitions.OPERATOR_CAPTURE]: states.CAPTURED,
        [transitions.AUTO_CAPTURE]: states.CAPTURED,
      },
    },
    [states.REFUNDED]: {},
    [states.CAPTURED]: {
      on: {
        [transitions.OPERATOR_PAYOUT]: states.COMPLETED,
        [transitions.AUTO_PAYOUT]: states.COMPLETED,
      },
    },
    [states.COMPLETED]: { type: 'final' },
  },
};

export const isRelevantPastTransition = transition => {
  return [
    transitions.CONFIRM_PAYMENT,
    transitions.OPERATOR_REFUND,
    transitions.OPERATOR_CAPTURE,
    transitions.AUTO_CAPTURE,
    transitions.OPERATOR_PAYOUT,
    transitions.AUTO_PAYOUT,
  ].includes(transition);
};

// Delivery has no reviews.
export const isCustomerReview = () => false;
export const isProviderReview = () => false;

export const isPrivileged = transition => {
  return [transitions.REQUEST_PAYMENT].includes(transition);
};

export const isCompleted = transition => {
  return [transitions.OPERATOR_PAYOUT, transitions.AUTO_PAYOUT].includes(transition);
};

// Transitions in which action/stripe-refund-payment is called.
export const isRefunded = transition => {
  return [transitions.EXPIRE_PAYMENT, transitions.OPERATOR_REFUND].includes(transition);
};

export const statesNeedingProviderAttention = [];
export const statesNeedingCustomerAttention = [];
