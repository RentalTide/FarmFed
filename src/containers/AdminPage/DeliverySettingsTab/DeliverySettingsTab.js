import React, { useState, useEffect } from 'react';
import { useIntl } from '../../../util/reactIntl';

import css from './DeliverySettingsTab.module.css';

const DeliverySettingsTab = props => {
  const {
    deliveryRatePerMileCents,
    updateInProgress,
    updateSuccess,
    error,
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

  const handleSubmit = e => {
    e.preventDefault();
    const dollars = parseFloat(rateInput);
    if (isNaN(dollars) || dollars < 0) return;
    const cents = Math.round(dollars * 100);
    onUpdateSettings({ deliveryRatePerMileCents: cents });
  };

  const currentRateDollars = (deliveryRatePerMileCents / 100).toFixed(2);

  return (
    <div>
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
  );
};

export default DeliverySettingsTab;
