import React, { useState } from 'react';
import classNames from 'classnames';

import { useIntl } from '../../util/reactIntl';
import appSettings from '../../config/settings';
import { IconSpinner } from '../../components';

import css from './FollowButton.module.css';

/**
 * A toggle button for following/unfollowing a vendor.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {string} props.vendorId the vendor's user ID
 * @param {boolean} props.isFollowed whether the current user is following this vendor
 * @param {Function} props.onFollow callback when the user clicks follow
 * @param {Function} props.onUnfollow callback when the user clicks unfollow
 * @param {boolean} props.inProgress whether a follow/unfollow request is in progress
 * @returns {JSX.Element|null} follow button component
 */
const FollowButton = props => {
  const {
    className,
    rootClassName,
    vendorId,
    isFollowed,
    onFollow,
    onUnfollow,
    inProgress,
  } = props;

  const intl = useIntl();
  const [isHovered, setIsHovered] = useState(false);

  // Feature-flag gate
  if (!appSettings.featureFlags.vendorFollow) {
    return null;
  }

  const handleClick = () => {
    if (inProgress) {
      return;
    }
    if (isFollowed) {
      onUnfollow(vendorId);
    } else {
      onFollow(vendorId);
    }
  };

  const showUnfollowState = isFollowed && isHovered && !inProgress;

  const classes = classNames(rootClassName || css.root, className, {
    [css.followed]: isFollowed && !isHovered,
    [css.unfollowHover]: showUnfollowState,
  });

  let label;
  if (inProgress) {
    label = <IconSpinner rootClassName={css.spinner} />;
  } else if (showUnfollowState) {
    label = intl.formatMessage({ id: 'FollowButton.unfollow' });
  } else if (isFollowed) {
    label = intl.formatMessage({ id: 'FollowButton.following' });
  } else {
    label = intl.formatMessage({ id: 'FollowButton.follow' });
  }

  return (
    <button
      className={classes}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={inProgress}
      type="button"
    >
      {label}
    </button>
  );
};

export default FollowButton;
