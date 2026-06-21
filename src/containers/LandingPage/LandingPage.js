import React from 'react';
import loadable from '@loadable/component';
import { array, bool, object } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { camelize } from '../../util/string';
import { propTypes } from '../../util/types';
import { LayoutComposer } from '../../components/index.js';
import TopbarContainer from '../TopbarContainer/TopbarContainer.js';
import FooterContainer from '../FooterContainer/FooterContainer.js';
import StaticPage from '../PageBuilder/StaticPage.js';
import { getListingsById } from '../../ducks/marketplaceData.duck.js';

import FallbackPage from './FallbackPage';
import { ASSET_NAME, useCustomLandingPage } from './LandingPage.duck';
import CustomLandingPage from './CustomLandingPage.js';
// Reuse the PageBuilder layout classes so the custom homepage frame (topbar /
// main / footer grid) matches every other page on the site.
import css from '../PageBuilder/PageBuilder.module.css';

const PageBuilder = loadable(() =>
  import(/* webpackChunkName: "PageBuilder" */ '../PageBuilder/PageBuilder')
);

const LAYOUT_AREAS = `
  topbar
  main
  footer
`;

// Custom FarmFed homepage (REACT_APP_CUSTOM_LANDING_PAGE=true).
const CustomHomepage = ({ featuredListings, featuredInProgress }) => (
  <StaticPage
    title="FarmFed — Fresh from the Farm. At Your Door."
    description="Shop fresh produce, meat, and goods directly from local farms, delivered to your door."
    schema={{
      '@context': 'http://schema.org',
      '@type': 'WebPage',
      name: 'FarmFed',
      description: 'Fresh from the Farm. At Your Door.',
    }}
  >
    <LayoutComposer areas={LAYOUT_AREAS} className={css.layout}>
      {layoutProps => {
        const { Topbar, Main, Footer } = layoutProps;
        return (
          <>
            <Topbar as="header" className={css.topbar}>
              <TopbarContainer currentPage="LandingPage" />
            </Topbar>
            <Main as="main" id="main-content" className={css.main}>
              <CustomLandingPage
                featuredListings={featuredListings}
                inProgress={featuredInProgress}
              />
            </Main>
            <Footer>
              <FooterContainer />
            </Footer>
          </>
        );
      }}
    </LayoutComposer>
  </StaticPage>
);

// Hosted PageBuilder/CMS homepage (default).
const HostedHomepage = ({ pageAssetsData, inProgress, error }) => (
  <PageBuilder
    pageAssetsData={pageAssetsData?.[camelize(ASSET_NAME)]?.data}
    inProgress={inProgress}
    error={error}
    fallbackPage={<FallbackPage error={error} />}
  />
);

export const LandingPageComponent = props => {
  return useCustomLandingPage ? <CustomHomepage {...props} /> : <HostedHomepage {...props} />;
};

LandingPageComponent.propTypes = {
  // Custom homepage props
  featuredListings: array,
  featuredInProgress: bool,
  // Hosted PageBuilder props
  pageAssetsData: object,
  inProgress: bool,
  error: propTypes.error,
};

const mapStateToProps = state => {
  const { featuredListingIds = [], featuredInProgress = false } = state.LandingPage || {};
  const featuredListings = getListingsById(state, featuredListingIds);
  const { pageAssetsData, inProgress, error } = state.hostedAssets || {};
  return { featuredListings, featuredInProgress, pageAssetsData, inProgress, error };
};

// Note: it is important that the withRouter HOC is **outside** the
// connect HOC, otherwise React Router won't rerender any Route
// components since connect implements a shouldComponentUpdate
// lifecycle hook.
//
// See: https://github.com/ReactTraining/react-router/issues/4671
const LandingPage = compose(connect(mapStateToProps))(LandingPageComponent);

export default LandingPage;
