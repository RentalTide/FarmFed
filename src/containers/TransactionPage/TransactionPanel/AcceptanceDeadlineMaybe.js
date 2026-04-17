import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '../../../util/reactIntl';

import css from './TransactionPanel.module.css';

const ACCEPTANCE_WINDOW_MS = 24 * 60 * 60 * 1000;

const formatRemaining = ms => {
  if (ms <= 0) return { hours: 0, minutes: 0 };
  const totalMinutes = Math.ceil(ms / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { hours, minutes };
};

/**
 * Countdown shown while a purchase order waits on vendor acceptance.
 * Anchors on transaction.lastTransitionedAt (when we entered pending-acceptance)
 * and auto-declines after 24h server-side — this just surfaces the remaining time.
 */
const AcceptanceDeadlineMaybe = props => {
  const { show, transaction, isProvider } = props;
  const enteredAt = transaction?.attributes?.lastTransitionedAt;
  const deadline = enteredAt ? new Date(enteredAt).getTime() + ACCEPTANCE_WINDOW_MS : null;

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!show || !deadline) return undefined;
    const id = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, [show, deadline]);

  if (!show || !deadline) return null;

  const remaining = deadline - now;
  const { hours, minutes } = formatRemaining(remaining);
  const expired = remaining <= 0;

  const headingId = isProvider
    ? 'TransactionPanel.acceptanceDeadlineProviderHeading'
    : 'TransactionPanel.acceptanceDeadlineCustomerHeading';
  const bodyId = expired
    ? 'TransactionPanel.acceptanceDeadlineExpired'
    : isProvider
      ? 'TransactionPanel.acceptanceDeadlineProviderBody'
      : 'TransactionPanel.acceptanceDeadlineCustomerBody';

  return (
    <div className={css.acceptanceDeadline}>
      <h3 className={css.acceptanceDeadlineHeading}>
        <FormattedMessage id={headingId} />
      </h3>
      <p className={css.acceptanceDeadlineBody}>
        <FormattedMessage id={bodyId} values={{ hours, minutes }} />
      </p>
    </div>
  );
};

export default AcceptanceDeadlineMaybe;
