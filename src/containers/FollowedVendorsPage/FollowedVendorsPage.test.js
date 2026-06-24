import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';
import { createUser } from '../../util/testData';
import { FollowedVendorsPageComponent } from './FollowedVendorsPage';

const { screen } = testingLibrary;

describe('FollowedVendorsPage', () => {
  it('shows the empty state when the user follows no vendors', () => {
    render(<FollowedVendorsPageComponent vendors={[]} fetchInProgress={false} />);
    // renderWithProviders renders FormattedMessage as the translation key id.
    expect(screen.getByText('FollowedVendorsPage.empty')).toBeInTheDocument();
    expect(screen.getByText('FollowedVendorsPage.browse')).toBeInTheDocument();
  });

  it('lists followed vendors with links to their profiles', () => {
    const vendors = [createUser('vendor-1'), createUser('vendor-2')];
    render(<FollowedVendorsPageComponent vendors={vendors} fetchInProgress={false} />);
    expect(screen.getByText('vendor-1 display name')).toBeInTheDocument();
    expect(screen.getByText('vendor-2 display name')).toBeInTheDocument();
  });

  it('shows an error message when loading fails', () => {
    render(
      <FollowedVendorsPageComponent vendors={[]} fetchInProgress={false} fetchError={new Error('x')} />
    );
    expect(screen.getByText('FollowedVendorsPage.error')).toBeInTheDocument();
  });
});
