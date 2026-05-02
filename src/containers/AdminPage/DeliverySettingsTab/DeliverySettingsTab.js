import React, { useState, useEffect } from 'react';
import { useIntl } from '../../../util/reactIntl';

import css from './DeliverySettingsTab.module.css';

const centsToDollarString = cents =>
  cents > 0 ? (cents / 100).toFixed(2) : '';

const DeliverySettingsTab = props => {
  const {
    deliveryRatePerMileCents,
    deliveryFlatFeeCents,
    hubOrigin,
    updateInProgress,
    updateSuccess,
    error,
    onUpdateSettings,
    onClearSuccess,
  } = props;

  const intl = useIntl();
  const [rateInput, setRateInput] = useState('');
  const [flatInput, setFlatInput] = useState('');
  const [originLine1, setOriginLine1] = useState('');
  const [originCity, setOriginCity] = useState('');
  const [originState, setOriginState] = useState('');
  const [originPostalCode, setOriginPostalCode] = useState('');
  const [originCountry, setOriginCountry] = useState('US');

  useEffect(() => {
    setRateInput(centsToDollarString(deliveryRatePerMileCents));
  }, [deliveryRatePerMileCents]);

  useEffect(() => {
    setFlatInput(centsToDollarString(deliveryFlatFeeCents));
  }, [deliveryFlatFeeCents]);

  useEffect(() => {
    if (hubOrigin) {
      setOriginLine1(hubOrigin.line1 || '');
      setOriginCity(hubOrigin.city || '');
      setOriginState(hubOrigin.state || '');
      setOriginPostalCode(hubOrigin.postalCode || '');
      setOriginCountry(hubOrigin.country || 'US');
    }
  }, [hubOrigin]);

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

    const trimmedLine1 = originLine1.trim();
    const trimmedCity = originCity.trim();
    const originChanged =
      trimmedLine1 !== (hubOrigin?.line1 || '') ||
      trimmedCity !== (hubOrigin?.city || '') ||
      originState.trim() !== (hubOrigin?.state || '') ||
      originPostalCode.trim() !== (hubOrigin?.postalCode || '') ||
      originCountry.trim() !== (hubOrigin?.country || 'US');

    const payload = {
      deliveryRatePerMileCents: Math.round(rateDollars * 100),
      deliveryFlatFeeCents: Math.round(flatDollars * 100),
    };
    if (originChanged && trimmedLine1 && trimmedCity) {
      payload.hubOrigin = {
        line1: trimmedLine1,
        city: trimmedCity,
        state: originState.trim(),
        postalCode: originPostalCode.trim(),
        country: originCountry.trim() || 'US',
      };
    }
    onUpdateSettings(payload);
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
        {hubOrigin ? (
          <div className={css.currentOrigin}>
            {intl.formatMessage({ id: 'AdminDeliverySettingsPage.currentOrigin' })}{' '}
            <strong>
              {hubOrigin.line1}, {hubOrigin.city}
              {hubOrigin.state ? `, ${hubOrigin.state}` : ''}
              {hubOrigin.postalCode ? ` ${hubOrigin.postalCode}` : ''}
            </strong>
          </div>
        ) : null}
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

        <label className={css.label} style={{ marginTop: 24 }}>
          {intl.formatMessage({ id: 'AdminDeliverySettingsPage.originHeading' })}
        </label>
        <p className={css.originHelper}>
          {intl.formatMessage({ id: 'AdminDeliverySettingsPage.originHelper' })}
        </p>
        <input
          className={css.textInput}
          type="text"
          placeholder={intl.formatMessage({ id: 'AdminDeliverySettingsPage.originLine1' })}
          value={originLine1}
          onChange={e => setOriginLine1(e.target.value)}
          disabled={updateInProgress}
        />
        <div className={css.originRow}>
          <input
            className={css.textInput}
            type="text"
            placeholder={intl.formatMessage({ id: 'AdminDeliverySettingsPage.originCity' })}
            value={originCity}
            onChange={e => setOriginCity(e.target.value)}
            disabled={updateInProgress}
          />
          <input
            className={css.textInput}
            type="text"
            placeholder={intl.formatMessage({ id: 'AdminDeliverySettingsPage.originState' })}
            value={originState}
            onChange={e => setOriginState(e.target.value)}
            disabled={updateInProgress}
          />
          <input
            className={css.textInput}
            type="text"
            placeholder={intl.formatMessage({ id: 'AdminDeliverySettingsPage.originPostalCode' })}
            value={originPostalCode}
            onChange={e => setOriginPostalCode(e.target.value)}
            disabled={updateInProgress}
          />
          <input
            className={css.textInput}
            type="text"
            placeholder={intl.formatMessage({ id: 'AdminDeliverySettingsPage.originCountry' })}
            value={originCountry}
            onChange={e => setOriginCountry(e.target.value)}
            disabled={updateInProgress}
          />
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
