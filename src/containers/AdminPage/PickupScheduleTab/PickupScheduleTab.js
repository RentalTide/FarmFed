import React, { useState, useEffect } from 'react';
import { useIntl } from '../../../util/reactIntl';

import css from './PickupScheduleTab.module.css';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const getNextPickupDate = (pickupDays, cutoffDay, cutoffTime) => {
  if (!pickupDays || pickupDays.length === 0) return null;

  const now = new Date();
  const currentDayIndex = now.getDay();

  // Convert day keys to indices
  const pickupDayIndices = pickupDays.map(d => DAY_KEYS.indexOf(d)).filter(i => i >= 0);
  if (pickupDayIndices.length === 0) return null;

  // Sort indices
  pickupDayIndices.sort((a, b) => a - b);

  // Find the next pickup day from today
  for (let offset = 0; offset < 7; offset++) {
    const candidateIndex = (currentDayIndex + offset) % 7;
    if (pickupDayIndices.includes(candidateIndex)) {
      const nextDate = new Date(now);
      nextDate.setDate(now.getDate() + offset);
      return nextDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }

  return null;
};

const PickupScheduleTab = props => {
  const {
    pickupSettings,
    updateInProgress,
    updateSuccess,
    error,
    onUpdateSettings,
    onClearSuccess,
  } = props;

  const intl = useIntl();

  const [pickupDays, setPickupDays] = useState([]);
  const [cutoffDay, setCutoffDay] = useState('thu');
  const [cutoffTime, setCutoffTime] = useState('18:00');

  useEffect(() => {
    if (pickupSettings) {
      setPickupDays(pickupSettings.pickupDays || []);
      setCutoffDay(pickupSettings.cutoffDay || 'thu');
      setCutoffTime(pickupSettings.cutoffTime || '18:00');
    }
  }, [pickupSettings]);

  useEffect(() => {
    if (updateSuccess) {
      const timer = setTimeout(() => onClearSuccess(), 3000);
      return () => clearTimeout(timer);
    }
  }, [updateSuccess, onClearSuccess]);

  const handleDayToggle = dayKey => {
    setPickupDays(prev =>
      prev.includes(dayKey) ? prev.filter(d => d !== dayKey) : [...prev, dayKey]
    );
  };

  const handleSubmit = e => {
    e.preventDefault();
    onUpdateSettings({ pickupDays, cutoffDay, cutoffTime });
  };

  const nextPickup = getNextPickupDate(pickupDays, cutoffDay, cutoffTime);

  return (
    <div>
      <p className={css.description}>
        {intl.formatMessage({ id: 'AdminPage.pickupScheduleDescription' })}
      </p>

      {nextPickup && (
        <div className={css.nextPickup}>
          <span className={css.nextPickupLabel}>
            {intl.formatMessage({ id: 'AdminPage.nextPickupLabel' })}
          </span>
          <span className={css.nextPickupDate}>{nextPickup}</span>
        </div>
      )}

      <form className={css.form} onSubmit={handleSubmit}>
        <fieldset className={css.fieldset}>
          <legend className={css.label}>
            {intl.formatMessage({ id: 'AdminPage.pickupDaysLabel' })}
          </legend>
          <div className={css.checkboxGroup}>
            {DAY_KEYS.map((dayKey, index) => (
              <label key={dayKey} className={css.checkboxLabel}>
                <input
                  type="checkbox"
                  className={css.checkbox}
                  checked={pickupDays.includes(dayKey)}
                  onChange={() => handleDayToggle(dayKey)}
                  disabled={updateInProgress}
                />
                {DAY_NAMES[index]}
              </label>
            ))}
          </div>
        </fieldset>

        <label className={css.label}>
          {intl.formatMessage({ id: 'AdminPage.cutoffDayLabel' })}
          <select
            className={css.selectInput}
            value={cutoffDay}
            onChange={e => setCutoffDay(e.target.value)}
            disabled={updateInProgress}
          >
            {DAY_KEYS.map((dayKey, index) => (
              <option key={dayKey} value={dayKey}>
                {DAY_NAMES[index]}
              </option>
            ))}
          </select>
        </label>

        <label className={css.label}>
          {intl.formatMessage({ id: 'AdminPage.cutoffTimeLabel' })}
          <input
            type="time"
            className={css.timeInput}
            value={cutoffTime}
            onChange={e => setCutoffTime(e.target.value)}
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

export default PickupScheduleTab;
