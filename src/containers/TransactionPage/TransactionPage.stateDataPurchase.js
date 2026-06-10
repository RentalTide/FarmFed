import {
  TX_TRANSITION_ACTOR_CUSTOMER as CUSTOMER,
  TX_TRANSITION_ACTOR_PROVIDER as PROVIDER,
  CONDITIONAL_RESOLVER_WILDCARD,
  ConditionalResolver,
} from '../../transactions/transaction';

/**
 * Get state data against product process for TransactionPage's UI.
 * I.e. info about showing action buttons, current state etc.
 *
 * @param {*} txInfo detials about transaction
 * @param {*} processInfo  details about process
 */
export const getStateDataForPurchaseProcess = (txInfo, processInfo) => {
  const { transaction, transactionRole, nextTransitions } = txInfo;
  const isProviderBanned = transaction?.provider?.attributes?.banned;
  const isCustomerBanned = transaction?.customer?.attributes?.banned;
  const isShippable = transaction?.attributes?.protectedData?.deliveryMethod === 'shipping';
  const isPickup = transaction?.attributes?.protectedData?.deliveryMethod === 'pickup';
  const _ = CONDITIONAL_RESOLVER_WILDCARD;

  const {
    processName,
    processState,
    states,
    transitions,
    isCustomer,
    actionButtonProps,
    leaveReviewProps,
  } = processInfo;

  return new ConditionalResolver([processState, transactionRole])
    .cond([states.INQUIRY, CUSTOMER], () => {
      const transitionNames = Array.isArray(nextTransitions)
        ? nextTransitions.map(t => t.attributes.name)
        : [];
      const requestAfterInquiry = transitions.REQUEST_PAYMENT_AFTER_INQUIRY;
      const hasCorrectNextTransition = transitionNames.includes(requestAfterInquiry);
      const showOrderPanel = !isProviderBanned && hasCorrectNextTransition;
      return { processName, processState, showOrderPanel };
    })
    .cond([states.INQUIRY, PROVIDER], () => {
      return { processName, processState, showDetailCardHeadings: true };
    })
    .cond([states.PENDING_ACCEPTANCE, CUSTOMER], () => {
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showExtraInfo: true,
        showAcceptanceDeadline: true,
      };
    })
    .cond([states.PENDING_ACCEPTANCE, PROVIDER], () => {
      const primary = isCustomerBanned ? null : actionButtonProps(transitions.ACCEPT_ORDER, PROVIDER);
      const secondary = isCustomerBanned ? null : actionButtonProps(transitions.DECLINE_ORDER, PROVIDER);
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showActionButtons: true,
        showAcceptanceDeadline: true,
        primaryButtonProps: primary,
        secondaryButtonProps: secondary,
      };
    })
    .cond([states.DECLINED, _], () => {
      return { processName, processState, showDetailCardHeadings: true };
    })
    .cond([states.PURCHASED, CUSTOMER], () => {
      // Customers no longer mark orders received. They just see the order
      // status and wait for delivery, after which a 24h dispute window opens.
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showExtraInfo: true,
      };
    })
    .cond([states.PURCHASED, PROVIDER], () => {
      // FarmFed (the operator) performs delivery for shipped orders after the
      // vendor drops items off at the hub, so vendors don't mark those
      // delivered — operator-mark-delivered handles it (manually or via the
      // OnFleet webhook). For PICKUP orders the vendor hands the order to the
      // customer directly, so they get a "mark delivered" button.
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showActionButtons: isPickup,
        primaryButtonProps: isPickup
          ? actionButtonProps(transitions.MARK_DELIVERED, PROVIDER)
          : null,
      };
    })
    .cond([states.DELIVERED, CUSTOMER], () => {
      // The order is delivered. Customers no longer mark it received — it
      // auto-completes 24h after delivery. Within that window they may dispute.
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showDispute: true,
      };
    })
    // Only the customer reviews the vendor now (vendors don't review customers),
    // and the review publishes immediately. The provider sees no review button.
    .cond([states.COMPLETED, CUSTOMER], () => {
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showReviewAsFirstLink: true,
        showActionButtons: true,
        primaryButtonProps: leaveReviewProps,
      };
    })
    .cond([states.REVIEWED_BY_PROVIDER, CUSTOMER], () => {
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showReviewAsSecondLink: true,
        showActionButtons: true,
        primaryButtonProps: leaveReviewProps,
      };
    })
    .cond([states.REVIEWED_BY_CUSTOMER, PROVIDER], () => {
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showReviewAsSecondLink: true,
        showActionButtons: true,
        primaryButtonProps: leaveReviewProps,
      };
    })
    .cond([states.REVIEWED, _], () => {
      return { processName, processState, showDetailCardHeadings: true, showReviews: true };
    })
    .default(() => {
      // Default values for other states
      return { processName, processState, showDetailCardHeadings: true };
    })
    .resolve();
};
