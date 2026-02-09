import React from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { useIntl } from '../../util/reactIntl';
import { useHistory, useLocation } from 'react-router-dom';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import {
  Page,
  LayoutSingleColumn,
} from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import {
  updateDeliverySettings,
  clearDeliveryUpdateSuccess,
  updateGeofenceSettings,
  clearGeofenceUpdateSuccess,
  approveUser,
  rejectUser,
} from './AdminPage.duck';

import DeliverySettingsTab from './DeliverySettingsTab/DeliverySettingsTab';
import GeofenceTab from './GeofenceTab/GeofenceTab';
import UserManagementTab from './UserManagementTab/UserManagementTab';

import css from './AdminPage.module.css';

const DELIVERY_TAB = 'delivery';
const GEOFENCE_TAB = 'geofence';
const USERS_TAB = 'users';

const AdminPageComponent = props => {
  const {
    currentUser,
    deliveryRatePerMileCents,
    deliveryFetchInProgress,
    deliveryUpdateInProgress,
    deliveryUpdateSuccess,
    deliveryError,
    geofencePolygon,
    geofenceUpdateInProgress,
    geofenceUpdateSuccess,
    geofenceError,
    pendingUsers,
    pendingUsersFetchInProgress,
    pendingUsersFetchError,
    userActionInProgress,
    userActionError,
    scrollingDisabled,
    onUpdateDeliverySettings,
    onClearDeliverySuccess,
    onUpdateGeofenceSettings,
    onClearGeofenceSuccess,
    onApproveUser,
    onRejectUser,
  } = props;

  const intl = useIntl();
  const location = useLocation();
  const history = useHistory();

  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') || DELIVERY_TAB;

  const isAdmin = currentUser?.attributes?.profile?.privateData?.isAdmin === true;

  if (!isAdmin && !deliveryFetchInProgress) {
    return (
      <Page title={intl.formatMessage({ id: 'AdminPage.title' })} scrollingDisabled={scrollingDisabled}>
        <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
          <div className={css.notAdmin}>
            <p>You do not have permission to access this page.</p>
          </div>
        </LayoutSingleColumn>
      </Page>
    );
  }

  const switchTab = tab => {
    history.push({ pathname: '/admin', search: `?tab=${tab}` });
  };

  return (
    <Page title={intl.formatMessage({ id: 'AdminPage.title' })} scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.root}>
          <div className={css.content}>
            <h1 className={css.title}>
              {intl.formatMessage({ id: 'AdminPage.title' })}
            </h1>

            <nav className={css.tabs}>
              <button
                className={activeTab === DELIVERY_TAB ? css.tabSelected : css.tab}
                onClick={() => switchTab(DELIVERY_TAB)}
              >
                {intl.formatMessage({ id: 'AdminPage.deliveryTab' })}
              </button>
              <button
                className={activeTab === GEOFENCE_TAB ? css.tabSelected : css.tab}
                onClick={() => switchTab(GEOFENCE_TAB)}
              >
                {intl.formatMessage({ id: 'AdminPage.geofenceTab' })}
              </button>
              <button
                className={activeTab === USERS_TAB ? css.tabSelected : css.tab}
                onClick={() => switchTab(USERS_TAB)}
              >
                {intl.formatMessage({ id: 'AdminPage.usersTab' })}
              </button>
            </nav>

            {activeTab === DELIVERY_TAB && (
              <DeliverySettingsTab
                deliveryRatePerMileCents={deliveryRatePerMileCents}
                updateInProgress={deliveryUpdateInProgress}
                updateSuccess={deliveryUpdateSuccess}
                error={deliveryError}
                onUpdateSettings={onUpdateDeliverySettings}
                onClearSuccess={onClearDeliverySuccess}
              />
            )}

            {activeTab === GEOFENCE_TAB && (
              <GeofenceTab
                polygon={geofencePolygon}
                updateInProgress={geofenceUpdateInProgress}
                updateSuccess={geofenceUpdateSuccess}
                error={geofenceError}
                onSaveGeofence={onUpdateGeofenceSettings}
                onClearSuccess={onClearGeofenceSuccess}
              />
            )}

            {activeTab === USERS_TAB && (
              <UserManagementTab
                pendingUsers={pendingUsers}
                fetchInProgress={pendingUsersFetchInProgress}
                fetchError={pendingUsersFetchError}
                actionInProgress={userActionInProgress}
                actionError={userActionError}
                onApproveUser={onApproveUser}
                onRejectUser={onRejectUser}
              />
            )}
          </div>
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

const mapStateToProps = state => {
  const { currentUser } = state.user;
  const {
    deliveryRatePerMileCents,
    deliveryFetchInProgress,
    deliveryUpdateInProgress,
    deliveryUpdateSuccess,
    deliveryError,
    geofencePolygon,
    geofenceUpdateInProgress,
    geofenceUpdateSuccess,
    geofenceError,
    pendingUsers,
    pendingUsersFetchInProgress,
    pendingUsersFetchError,
    userActionInProgress,
    userActionError,
  } = state.AdminPage;

  return {
    currentUser,
    deliveryRatePerMileCents,
    deliveryFetchInProgress,
    deliveryUpdateInProgress,
    deliveryUpdateSuccess,
    deliveryError,
    geofencePolygon,
    geofenceUpdateInProgress,
    geofenceUpdateSuccess,
    geofenceError,
    pendingUsers,
    pendingUsersFetchInProgress,
    pendingUsersFetchError,
    userActionInProgress,
    userActionError,
    scrollingDisabled: isScrollingDisabled(state),
  };
};

const mapDispatchToProps = dispatch => ({
  onUpdateDeliverySettings: params => dispatch(updateDeliverySettings(params)),
  onClearDeliverySuccess: () => dispatch(clearDeliveryUpdateSuccess()),
  onUpdateGeofenceSettings: params => dispatch(updateGeofenceSettings(params)),
  onClearGeofenceSuccess: () => dispatch(clearGeofenceUpdateSuccess()),
  onApproveUser: userId => dispatch(approveUser({ userId })),
  onRejectUser: userId => dispatch(rejectUser({ userId })),
});

const AdminPage = compose(
  connect(mapStateToProps, mapDispatchToProps)
)(AdminPageComponent);

export default AdminPage;
