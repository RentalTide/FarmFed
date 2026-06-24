import React, { useEffect } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { array, bool, func } from 'prop-types';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { propTypes } from '../../util/types';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { getMarketplaceEntities } from '../../ducks/marketplaceData.duck';
import { loadFollowedVendors } from './FollowedVendorsPage.duck';
import {
  Page,
  LayoutSingleColumn,
  NamedLink,
  AvatarLarge,
  H3,
  IconSpinner,
} from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import css from './FollowedVendorsPage.module.css';

const VendorRow = ({ vendor }) => {
  const id = vendor?.id?.uuid;
  if (!id) {
    return null;
  }
  const displayName = vendor?.attributes?.profile?.displayName || '';
  return (
    <li className={css.vendorItem}>
      <NamedLink className={css.vendorLink} name="ProfilePage" params={{ id }}>
        <AvatarLarge user={vendor} className={css.vendorAvatar} disableProfileLink />
        <span className={css.vendorName}>{displayName}</span>
        <span aria-hidden="true" className={css.vendorArrow}>
          ›
        </span>
      </NamedLink>
    </li>
  );
};

/**
 * Lists the vendors the current user follows, each linking to the vendor's
 * profile. Reached from the user menu ("Vendors you follow").
 */
export const FollowedVendorsPageComponent = props => {
  const {
    vendors = [],
    fetchInProgress = false,
    fetchError = null,
    scrollingDisabled = false,
    onLoadFollowedVendors,
  } = props;
  const intl = useIntl();

  // Load client-side on mount: the /api/follow-vendor endpoint needs the browser
  // (session cookie / window.fetch), so it can't run during SSR loadData.
  useEffect(() => {
    if (onLoadFollowedVendors) {
      onLoadFollowedVendors();
    }
  }, [onLoadFollowedVendors]);

  const hasVendors = vendors.length > 0;

  return (
    <Page
      title={intl.formatMessage({ id: 'FollowedVendorsPage.title' })}
      scrollingDisabled={scrollingDisabled}
    >
      <LayoutSingleColumn
        topbar={<TopbarContainer currentPage="FollowedVendorsPage" />}
        footer={<FooterContainer />}
      >
        <div className={css.root}>
          <H3 as="h1" className={css.title}>
            <FormattedMessage id="FollowedVendorsPage.title" />
          </H3>

          {fetchInProgress ? (
            <div className={css.loading}>
              <IconSpinner />
            </div>
          ) : fetchError ? (
            <p className={css.error}>
              <FormattedMessage id="FollowedVendorsPage.error" />
            </p>
          ) : hasVendors ? (
            <ul className={css.vendorList}>
              {vendors.map(vendor => (
                <VendorRow key={vendor.id.uuid} vendor={vendor} />
              ))}
            </ul>
          ) : (
            <div className={css.empty}>
              <p className={css.emptyText}>
                <FormattedMessage id="FollowedVendorsPage.empty" />
              </p>
              <NamedLink name="SearchPage" className={css.browseLink}>
                <FormattedMessage id="FollowedVendorsPage.browse" />
              </NamedLink>
            </div>
          )}
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

FollowedVendorsPageComponent.propTypes = {
  vendors: array,
  fetchInProgress: bool,
  fetchError: propTypes.error,
  scrollingDisabled: bool,
  onLoadFollowedVendors: func,
};

const mapStateToProps = state => {
  const { vendorRefs = [], fetchInProgress = false, fetchError = null } =
    state.FollowedVendorsPage || {};
  return {
    vendors: getMarketplaceEntities(state, vendorRefs),
    fetchInProgress,
    fetchError,
    scrollingDisabled: isScrollingDisabled(state),
  };
};

const mapDispatchToProps = dispatch => ({
  onLoadFollowedVendors: () => dispatch(loadFollowedVendors()),
});

const FollowedVendorsPage = compose(connect(mapStateToProps, mapDispatchToProps))(
  FollowedVendorsPageComponent
);

export default FollowedVendorsPage;
