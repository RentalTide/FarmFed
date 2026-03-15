import React from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import appSettings from '../../config/settings';

import css from './VendorPickupSchedule.module.css';

/**
 * Groups an array of schedule entries by day.
 *
 * @param {Array} schedule array of { day, startTime, endTime }
 * @returns {Object} object keyed by day name, values are arrays of { startTime, endTime }
 */
const groupByDay = schedule => {
  return schedule.reduce((acc, entry) => {
    const { day, startTime, endTime } = entry;
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push({ startTime, endTime });
    return acc;
  }, {});
};

/**
 * Displays a vendor's pickup availability schedule.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {Array} props.pickupSchedule array of { day, startTime, endTime }
 * @returns {JSX.Element|null} pickup schedule display component
 */
const VendorPickupSchedule = props => {
  const { className, rootClassName, pickupSchedule } = props;

  const intl = useIntl();

  // Feature-flag gate
  if (!appSettings.featureFlags.vendorPickupSchedules) {
    return null;
  }

  if (!pickupSchedule || pickupSchedule.length === 0) {
    return null;
  }

  const groupedSchedule = groupByDay(pickupSchedule);
  const days = Object.keys(groupedSchedule);

  const classes = classNames(rootClassName || css.root, className);

  return (
    <div className={classes}>
      <h3 className={css.heading}>
        <FormattedMessage id="VendorPickupSchedule.title" />
      </h3>
      <ul className={css.scheduleList}>
        {days.map(day => {
          const windows = groupedSchedule[day];
          return (
            <li key={day} className={css.scheduleItem}>
              <span className={css.day}>
                {intl.formatMessage({ id: `VendorPickupSchedule.day.${day}` })}
              </span>
              <span className={css.timeWindows}>
                {windows.map((w, i) => (
                  <span key={i} className={css.time}>
                    {w.startTime} &ndash; {w.endTime}
                  </span>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default VendorPickupSchedule;
