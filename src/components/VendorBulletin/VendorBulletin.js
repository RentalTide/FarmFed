import React, { useState, useEffect } from 'react';
import classNames from 'classnames';

import { useIntl } from '../../util/reactIntl';
import appSettings from '../../config/settings';

import css from './VendorBulletin.module.css';

/**
 * A rotating carousel/banner of vendor bulletins.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {Array} props.bulletins array of { title, description, imageUrl, startDate, endDate }
 * @returns {JSX.Element|null} vendor bulletin carousel component
 */
const VendorBulletin = props => {
  const { className, rootClassName, bulletins } = props;

  const intl = useIntl();
  const [activeIndex, setActiveIndex] = useState(0);

  // Feature-flag gate
  if (!appSettings.featureFlags.vendorBulletin) {
    return null;
  }

  // Filter to only active bulletins (within date range)
  const now = new Date();
  const activeBulletins = (bulletins || []).filter(b => {
    const start = b.startDate ? new Date(b.startDate) : null;
    const end = b.endDate ? new Date(b.endDate) : null;
    const afterStart = !start || start <= now;
    const beforeEnd = !end || end >= now;
    return afterStart && beforeEnd;
  });

  const bulletinCount = activeBulletins.length;

  // Auto-rotate every 5 seconds
  useEffect(() => {
    if (bulletinCount <= 1) {
      return;
    }
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % bulletinCount);
    }, 5000);
    return () => clearInterval(interval);
  }, [bulletinCount]);

  // Reset index if it goes out of bounds
  useEffect(() => {
    if (activeIndex >= bulletinCount && bulletinCount > 0) {
      setActiveIndex(0);
    }
  }, [activeIndex, bulletinCount]);

  if (bulletinCount === 0) {
    return null;
  }

  const handleDotClick = index => {
    setActiveIndex(index);
  };

  const classes = classNames(rootClassName || css.root, className);
  const currentBulletin = activeBulletins[activeIndex];

  return (
    <div className={classes}>
      <div className={css.bulletinTrack}>
        <div className={css.bulletin}>
          {currentBulletin.imageUrl ? (
            <img
              className={css.image}
              src={currentBulletin.imageUrl}
              alt={currentBulletin.title || ''}
            />
          ) : null}
          <div className={css.content}>
            {currentBulletin.title ? (
              <h3 className={css.title}>{currentBulletin.title}</h3>
            ) : null}
            {currentBulletin.description ? (
              <p className={css.description}>{currentBulletin.description}</p>
            ) : null}
          </div>
        </div>
      </div>

      {bulletinCount > 1 ? (
        <div className={css.dots}>
          {activeBulletins.map((_, index) => (
            <button
              key={index}
              className={classNames(css.dot, {
                [css.dotActive]: index === activeIndex,
              })}
              onClick={() => handleDotClick(index)}
              type="button"
              aria-label={intl.formatMessage(
                { id: 'VendorBulletin.dotLabel' },
                { index: index + 1, total: bulletinCount }
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default VendorBulletin;
