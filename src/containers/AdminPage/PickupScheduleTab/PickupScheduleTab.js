import React, { useState, useEffect } from 'react';
import { useIntl } from '../../../util/reactIntl';

import css from './PickupScheduleTab.module.css';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const DEFAULT_TIMEZONE = 'America/Toronto';

const TIMEZONE_OPTIONS = [
  { value: 'America/St_Johns', label: 'Newfoundland (St. John’s)' },
  { value: 'America/Halifax', label: 'Atlantic (Halifax)' },
  { value: 'America/Toronto', label: 'Eastern (Toronto)' },
  { value: 'America/Winnipeg', label: 'Central (Winnipeg)' },
  { value: 'America/Regina', label: 'Saskatchewan (Regina)' },
  { value: 'America/Edmonton', label: 'Mountain (Edmonton)' },
  { value: 'America/Vancouver', label: 'Pacific (Vancouver)' },
];

// Current wall-clock day/time/date in the marketplace timezone.
const getZonedNow = timeZone => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = type => parts.find(p => p.type === type)?.value;
  const weekdayNums = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    dayNum: weekdayNums[get('weekday')],
    hour: parseInt(get('hour'), 10),
    minute: parseInt(get('minute'), 10),
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
  };
};

// Mirrors server/api-util/pickupSchedule.js: the next delivery date is the
// first scheduled delivery day strictly AFTER the next upcoming cutoff,
// evaluated in the marketplace timezone.
const getNextPickupDate = (pickupDays, cutoffDay, cutoffTime, timezone) => {
  if (!pickupDays || pickupDays.length === 0) return null;

  const pickupDayIndices = pickupDays.map(d => DAY_KEYS.indexOf(d)).filter(i => i >= 0);
  if (pickupDayIndices.length === 0) return null;

  const cutoffDayNum = DAY_KEYS.indexOf(cutoffDay);
  const [cutoffHour, cutoffMinute] = (cutoffTime || '00:00').split(':').map(Number);

  let now;
  try {
    now = getZonedNow(timezone || DEFAULT_TIMEZONE);
  } catch (e) {
    return null;
  }

  let offsetToCutoff = (cutoffDayNum - now.dayNum + 7) % 7;
  const pastCutoffToday =
    now.hour > cutoffHour || (now.hour === cutoffHour && now.minute >= cutoffMinute);
  if (offsetToCutoff === 0 && pastCutoffToday) {
    offsetToCutoff = 7;
  }

  for (let offset = offsetToCutoff + 1; offset <= offsetToCutoff + 14; offset++) {
    const candidate = new Date(now.year, now.month - 1, now.day + offset);
    if (pickupDayIndices.includes(candidate.getDay())) {
      return candidate.toLocaleDateString('en-US', {
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
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);

  useEffect(() => {
    if (pickupSettings) {
      setPickupDays(pickupSettings.pickupDays || []);
      setCutoffDay(pickupSettings.cutoffDay || 'thu');
      setCutoffTime(pickupSettings.cutoffTime || '18:00');
      setTimezone(pickupSettings.timezone || DEFAULT_TIMEZONE);
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
    onUpdateSettings({ pickupDays, cutoffDay, cutoffTime, timezone });
  };

  const nextPickup = getNextPickupDate(pickupDays, cutoffDay, cutoffTime, timezone);

  // Include the saved timezone even if it's not one of the presets
  // (e.g. set through the PICKUP_TIMEZONE env variable).
  const timezoneOptions = TIMEZONE_OPTIONS.some(tz => tz.value === timezone)
    ? TIMEZONE_OPTIONS
    : [...TIMEZONE_OPTIONS, { value: timezone, label: timezone }];

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

        <label className={css.label}>
          {intl.formatMessage({ id: 'AdminPage.timezoneLabel' })}
          <select
            className={css.selectInput}
            value={timezone}
            onChange={e => setTimezone(e.target.value)}
            disabled={updateInProgress}
          >
            {timezoneOptions.map(tz => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
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
