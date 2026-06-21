import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';
import CustomLandingPage from './CustomLandingPage';

const { screen } = testingLibrary;

describe('CustomLandingPage', () => {
  it('renders the hero, trust badges, featured section, and farmer CTA', () => {
    render(<CustomLandingPage featuredListings={[]} inProgress={false} />);

    // renderWithProviders renders FormattedMessage as the translation key id.
    expect(screen.getByText('LandingPage.heroTitle')).toBeInTheDocument();
    expect(screen.getByText('LandingPage.heroCta')).toBeInTheDocument();
    expect(screen.getByText('LandingPage.badge.locallyGrown')).toBeInTheDocument();
    expect(screen.getByText('LandingPage.badge.fastDelivery')).toBeInTheDocument();
    expect(screen.getByText('LandingPage.badge.farmerVerified')).toBeInTheDocument();
    expect(screen.getByText('LandingPage.featuredTitle')).toBeInTheDocument();
    expect(screen.getByText('LandingPage.viewAll')).toBeInTheDocument();
    expect(screen.getByText('LandingPage.farmerCta')).toBeInTheDocument();
  });

  it('shows the empty state when there are no featured listings', () => {
    render(<CustomLandingPage featuredListings={[]} inProgress={false} />);
    expect(screen.getByText('LandingPage.featuredEmpty')).toBeInTheDocument();
  });
});
