import React, { useState, useEffect } from 'react';
import { useIntl } from '../../../util/reactIntl';

import css from './DeliverySettingsTab.module.css';

const centsToDollarString = cents =>
  cents > 0 ? (cents / 100).toFixed(2) : '';

const DeliverySettingsTab = props => {
  const {
    deliveryRatePerMileCents,
    deliveryFlatFeeCents,
    updateInProgress,
    updateSuccess,
    error,
    onUpdateSettings,
    onClearSuccess,
  } = props;

  const intl = useIntl();
  const [rateInput, setRateInput] = useState('');
  const [flatInput, setFlatInput] = useState('');

  useEffect(() => {
    setRateInput(centsToDollarString(deliveryRatePerMileCents));
  }, [deliveryRatePerMileCents]);

  useEffect(() => {
    setFlatInput(centsToDollarString(deliveryFlatFeeCents));
  }, [deliveryFlatFeeCents]);

  useEffect(() => {
    if (updateSuccess) {
      const timer = setTimeout(() => onClearSuccess(), 3000);
      return () => clearTimeout(timer);
    }
  }, [updateSuccess, onClearSuccess]);

  const handleSubmit = e => {
    e.preventDefault();
    const rateDollars = parseFloat(rateInput || '0');
    const flatDollars = parseFloat(flatInput || '0');
    if (isNaN(rateDollars) || rateDollars < 0 || isNaN(flatDollars) || flatDollars < 0) return;
    onUpdateSettings({
      deliveryRatePerMileCents: Math.round(rateDollars * 100),
      deliveryFlatFeeCents: Math.round(flatDollars * 100),
    });
  };

  const currentRateDollars = (deliveryRatePerMileCents / 100).toFixed(2);
  const currentFlatDollars = ((deliveryFlatFeeCents || 0) / 100).toFixed(2);

  return (
    <div>
      <div className={css.currentRate}>
        <div className={css.currentRateLabel}>
          {intl.formatMessage({ id: 'AdminDeliverySettingsPage.currentRate' })}
        </div>
        <div className={css.currentRateValue}>
          ${currentFlatDollars} + ${currentRateDollars}/mi
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

        <label className={css.label} style={{ marginTop: 16 }}>
          {intl.formatMessage({ id: 'AdminDeliverySettingsPage.flatFeeLabel' })}
        </label>
        <div className={css.inputWrapper}>
          <span className={css.currencyPrefix}>$</span>
          <input
            className={css.input}
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={flatInput}
            onChange={e => setFlatInput(e.target.value)}
            disabled={updateInProgress}
          />
          <span className={css.perMile}>flat</span>
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
  );
};

export default DeliverySettingsTab;
