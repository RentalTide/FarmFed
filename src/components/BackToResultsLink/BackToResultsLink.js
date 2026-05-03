import React from 'react';
import { useHistory } from 'react-router-dom';
import classNames from 'classnames';
import { FormattedMessage } from '../../util/reactIntl';
import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { createResourceLocatorString } from '../../util/routes';
import { getSavedScrollPosition } from '../../util/scrollMemory';

import css from './BackToResultsLink.module.css';

const BackToResultsLink = props => {
  const { className, rootClassName } = props;
  const history = useHistory();
  const routeConfiguration = useRouteConfiguration();

  const handleClick = e => {
    e.preventDefault();
    const saved = getSavedScrollPosition();
    if (saved?.url) {
      // Push the saved search URL — SearchPage's restore effect will then
      // pull the scroll position out of sessionStorage.
      history.push(saved.url);
    } else if (history.length > 1) {
      history.goBack();
    } else {
      history.push(createResourceLocatorString('SearchPage', routeConfiguration, {}, {}));
    }
  };

  return (
    <button
      type="button"
      className={classNames(rootClassName || css.root, className)}
      onClick={handleClick}
    >
      <span className={css.arrow} aria-hidden>‹</span>
      <FormattedMessage id="BackToResultsLink.label" defaultMessage="Back to results" />
    </button>
  );
};

export default BackToResultsLink;
