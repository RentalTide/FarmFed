import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import {
  Page,
  LayoutSingleColumn,
} from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';
import { updateDeliverySettings, clearUpdateSuccess } from './AdminDeliverySettingsPage.duck';

import css from './AdminDeliverySettingsPage.module.css';

const AdminDeliverySettingsPageComponent = props => {
  const {
    currentUser,
    deliveryRatePerMileCents,
    fetchInProgress,
    updateInProgress,
    updateSuccess,
    error,
    scrollingDisabled,
    onUpdateSettings,
    onClearSuccess,
  } = props;

  const intl = useIntl();
  const [rateInput, setRateInput] = useState('');

  useEffect(() => {
    if (deliveryRatePerMileCents > 0) {
      setRateInput((deliveryRatePerMileCents / 100).toFixed(2));
    }
  }, [deliveryRatePerMileCents]);

  useEffect(() => {
    if (updateSuccess) {
      const timer = setTimeout(() => onClearSuccess(), 3000);
      return () => clearTimeout(timer);
    }
  }, [updateSuccess, onClearSuccess]);

  const isAdmin = currentUser?.attributes?.profile?.privateData?.isAdmin === true;

  if (!isAdmin && !fetchInProgress) {
    return (
      <Page title={intl.formatMessage({ id: 'AdminDeliverySettingsPage.title' })} scrollingDisabled={scrollingDisabled}>
        <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
          <div className={css.notAdmin}>
            <p>You do not have permission to access this page.</p>
          </div>
        </LayoutSingleColumn>
      </Page>
    );
  }

  const handleSubmit = e => {
    e.preventDefault();
    const dollars = parseFloat(rateInput);
    if (isNaN(dollars) || dollars < 0) return;
    const cents = Math.round(dollars * 100);
    onUpdateSettings({ deliveryRatePerMileCents: cents });
  };

  const currentRateDollars = (deliveryRatePerMileCents / 100).toFixed(2);

  return (
    <Page title={intl.formatMessage({ id: 'AdminDeliverySettingsPage.title' })} scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.root}>
          <div className={css.content}>
            <h1 className={css.title}>
              {intl.formatMessage({ id: 'AdminDeliverySettingsPage.heading' })}
            </h1>

            <div className={css.currentRate}>
              <div className={css.currentRateLabel}>
                {intl.formatMessage({ id: 'AdminDeliverySettingsPage.currentRate' })}
              </div>
              <div className={css.currentRateValue}>
                ${currentRateDollars}/mi
              </div>
            </div>

            <form className={css.form} onSubmit={handleSubmit}>
              <label className={css.label}>
                {intl.formatMessage({ id: 'AdminDeliverySettingsPage.rateLabel' })}
              </label>
              <div className={css.inputWrapper}>
                <span className={css.currencyPrefix}>$</span>
                <input
                  className={css.input}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={intl.formatMessage({ id: 'AdminDeliverySettingsPage.ratePlaceholder' })}
                  value={rateInput}
                  onChange={e => setRateInput(e.target.value)}
                  disabled={updateInProgress}
                />
                <span className={css.perMile}>/mi</span>
              </div>
              <button type="submit" className={css.submitButton} disabled={updateInProgress}>
                {intl.formatMessage({ id: 'AdminDeliverySettingsPage.saveButton' })}
              </button>
            </form>

            {updateSuccess && (
              <p className={css.successMessage}>
                {intl.formatMessage({ id: 'AdminDeliverySettingsPage.saveSuccess' })}
              </p>
            )}
            {error && (
              <p className={css.errorMessage}>
                {intl.formatMessage({ id: 'AdminDeliverySettingsPage.saveError' })}
              </p>
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
    fetchInProgress,
    updateInProgress,
    updateSuccess,
    error,
  } = state.AdminDeliverySettingsPage;

  return {
    currentUser,
    deliveryRatePerMileCents,
    fetchInProgress,
    updateInProgress,
    updateSuccess,
    error,
    scrollingDisabled: isScrollingDisabled(state),
  };
};

const mapDispatchToProps = dispatch => ({
  onUpdateSettings: params => dispatch(updateDeliverySettings(params)),
  onClearSuccess: () => dispatch(clearUpdateSuccess()),
});

const AdminDeliverySettingsPage = compose(
  connect(mapStateToProps, mapDispatchToProps)
)(AdminDeliverySettingsPageComponent);

export default AdminDeliverySettingsPage;
