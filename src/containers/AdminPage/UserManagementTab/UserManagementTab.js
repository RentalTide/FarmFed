import React from 'react';
import { useIntl, FormattedMessage } from '../../../util/reactIntl';

import css from './UserManagementTab.module.css';

const formatDate = dateStr => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatAddress = address => {
  if (!address) return '';
  const parts = [address.street, address.city, address.state, address.zip].filter(Boolean);
  return parts.join(', ');
};

const UserRow = ({ user, actionInProgress, onApprove, onReject, intl }) => {
  const isActioning = actionInProgress === user.id;

  return (
    <div className={css.userRow}>
      <div className={css.userInfo}>
        <span className={css.userName}>{user.firstName} {user.lastName}</span>
        <span className={css.userEmail}>{user.email}</span>
        {user.address ? (
          <span className={css.userAddress}>{formatAddress(user.address)}</span>
        ) : null}
        <span className={css.userDate}>
          {intl.formatMessage({ id: 'AdminPage.usersJoined' })}: {formatDate(user.createdAt)}
        </span>
      </div>
      <div className={css.userActions}>
        <button
          className={css.approveButton}
          onClick={() => onApprove(user.id)}
          disabled={isActioning}
          type="button"
        >
          {intl.formatMessage({ id: 'AdminPage.usersApproveButton' })}
        </button>
        <button
          className={css.rejectButton}
          onClick={() => onReject(user.id)}
          disabled={isActioning}
          type="button"
        >
          {intl.formatMessage({ id: 'AdminPage.usersRejectButton' })}
        </button>
      </div>
    </div>
  );
};

const UserManagementTab = props => {
  const {
    pendingUsers,
    fetchInProgress,
    fetchError,
    actionInProgress,
    actionError,
    onApproveUser,
    onRejectUser,
  } = props;

  const intl = useIntl();

  const pendingApproval = pendingUsers.filter(u => !u.outsideDeliveryZone);
  const waitlist = pendingUsers.filter(u => u.outsideDeliveryZone);

  if (fetchInProgress) {
    return (
      <div className={css.root}>
        <p className={css.loading}>
          <FormattedMessage id="AdminPage.usersLoading" />
        </p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className={css.root}>
        <p className={css.error}>
          <FormattedMessage id="AdminPage.usersFetchError" />
        </p>
      </div>
    );
  }

  return (
    <div className={css.root}>
      {actionError ? (
        <p className={css.error}>
          <FormattedMessage id="AdminPage.usersActionError" />
        </p>
      ) : null}

      <section className={css.section}>
        <h3 className={css.sectionTitle}>
          <FormattedMessage id="AdminPage.usersPendingHeading" />
          <span className={css.count}>({pendingApproval.length})</span>
        </h3>
        {pendingApproval.length === 0 ? (
          <p className={css.emptyState}>
            <FormattedMessage id="AdminPage.usersPendingEmpty" />
          </p>
        ) : (
          <div className={css.userList}>
            {pendingApproval.map(user => (
              <UserRow
                key={user.id}
                user={user}
                actionInProgress={actionInProgress}
                onApprove={onApproveUser}
                onReject={onRejectUser}
                intl={intl}
              />
            ))}
          </div>
        )}
      </section>

      <section className={css.section}>
        <h3 className={css.sectionTitle}>
          <FormattedMessage id="AdminPage.usersWaitlistHeading" />
          <span className={css.count}>({waitlist.length})</span>
        </h3>
        {waitlist.length === 0 ? (
          <p className={css.emptyState}>
            <FormattedMessage id="AdminPage.usersWaitlistEmpty" />
          </p>
        ) : (
          <div className={css.userList}>
            {waitlist.map(user => (
              <UserRow
                key={user.id}
                user={user}
                actionInProgress={actionInProgress}
                onApprove={onApproveUser}
                onReject={onRejectUser}
                intl={intl}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default UserManagementTab;
