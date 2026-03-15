import React, { useState, useEffect } from 'react';
import { useIntl } from '../../../util/reactIntl';

import css from './TaxSettingsTab.module.css';

const TaxSettingsTab = props => {
  const {
    taxSettings,
    updateInProgress,
    updateSuccess,
    error,
    onUpdateSettings,
    onClearSuccess,
  } = props;

  const intl = useIntl();

  const [taxRate, setTaxRate] = useState('');
  const [taxLabel, setTaxLabel] = useState('');
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (taxSettings) {
      // taxRate is stored as a decimal (e.g. 0.08), shown as percentage (e.g. 8)
      const ratePercent = taxSettings.taxRate != null ? (taxSettings.taxRate * 100).toFixed(2) : '';
      setTaxRate(ratePercent);
      setTaxLabel(taxSettings.taxLabel || '');
      setEnabled(taxSettings.enabled || false);
    }
  }, [taxSettings]);

  useEffect(() => {
    if (updateSuccess) {
      const timer = setTimeout(() => onClearSuccess(), 3000);
      return () => clearTimeout(timer);
    }
  }, [updateSuccess, onClearSuccess]);

  const handleSubmit = e => {
    e.preventDefault();
    const ratePercent = parseFloat(taxRate);
    if (isNaN(ratePercent) || ratePercent < 0 || ratePercent > 100) return;

    const rateDecimal = ratePercent / 100;
    onUpdateSettings({ taxRate: rateDecimal, taxLabel, enabled });
  };

  const currentRateDisplay =
    taxSettings?.taxRate != null ? (taxSettings.taxRate * 100).toFixed(2) + '%' : '--';

  return (
    <div>
      <div className={css.currentSetting}>
        <div className={css.currentSettingLabel}>
          {intl.formatMessage({ id: 'AdminPage.currentTaxRate' })}
        </div>
        <div className={css.currentSettingValue}>{currentRateDisplay}</div>
        <div className={css.currentSettingStatus}>
          {taxSettings?.enabled
            ? intl.formatMessage({ id: 'AdminPage.taxEnabled' })
            : intl.formatMessage({ id: 'AdminPage.taxDisabled' })}
        </div>
      </div>

      <form className={css.form} onSubmit={handleSubmit}>
        <label className={css.label}>
          {intl.formatMessage({ id: 'AdminPage.taxEnabledLabel' })}
          <div className={css.toggleWrapper}>
            <button
              type="button"
              className={enabled ? css.toggleActive : css.toggle}
              onClick={() => setEnabled(!enabled)}
              disabled={updateInProgress}
              aria-pressed={enabled}
            >
              <span className={css.toggleKnob} />
            </button>
            <span className={css.toggleText}>
              {enabled
                ? intl.formatMessage({ id: 'AdminPage.taxToggleOn' })
                : intl.formatMessage({ id: 'AdminPage.taxToggleOff' })}
            </span>
          </div>
        </label>

        <label className={css.label}>
          {intl.formatMessage({ id: 'AdminPage.taxRateLabel' })}
          <div className={css.inputWrapper}>
            <input
              className={css.input}
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder={intl.formatMessage({ id: 'AdminPage.taxRatePlaceholder' })}
              value={taxRate}
              onChange={e => setTaxRate(e.target.value)}
              disabled={updateInProgress}
            />
            <span className={css.inputSuffix}>%</span>
          </div>
        </label>

        <label className={css.label}>
          {intl.formatMessage({ id: 'AdminPage.taxLabelLabel' })}
          <input
            className={css.textInput}
            type="text"
            placeholder={intl.formatMessage({ id: 'AdminPage.taxLabelPlaceholder' })}
            value={taxLabel}
            onChange={e => setTaxLabel(e.target.value)}
            disabled={updateInProgress}
          />
        </label>

        <button type="submit" className={css.submitButton} disabled={updateInProgress}>
          {intl.formatMessage({ id: 'AdminPage.saveButton' })}
        </button>
      </form>

      {updateSuccess && (
        <p className={css.successMessage}>
          {intl.formatMessage({ id: 'AdminPage.saveSuccess' })}
        </p>
      )}
      {error && (
        <p className={css.errorMessage}>
          {intl.formatMessage({ id: 'AdminPage.saveError' })}
        </p>
      )}
    </div>
  );
};

export default TaxSettingsTab;
