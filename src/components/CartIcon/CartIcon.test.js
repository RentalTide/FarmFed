import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import CartIcon from './CartIcon';

describe('CartIcon', () => {
  it('renders without badge when count is 0', () => {
    const { container } = render(<CartIcon count={0} onClick={() => {}} />);
    const badge = container.querySelector('span');
    expect(badge).toBeNull();
  });

  it('renders badge with count', () => {
    render(<CartIcon count={3} onClick={() => {}} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders badge with count of 1', () => {
    render(<CartIcon count={1} onClick={() => {}} />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('caps badge display at 99+', () => {
    render(<CartIcon count={100} onClick={() => {}} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('shows 99+ for exactly 100 items', () => {
    render(<CartIcon count={100} onClick={() => {}} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('shows 99 for exactly 99 items', () => {
    render(<CartIcon count={99} onClick={() => {}} />);
    expect(screen.getByText('99')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<CartIcon count={5} onClick={handleClick} />);

    const button = screen.getByRole('button');
    button.click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders with aria-label for accessibility', () => {
    render(<CartIcon count={0} onClick={() => {}} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Shopping cart');
  });

  it('accepts custom className', () => {
    const { container } = render(<CartIcon count={0} onClick={() => {}} className="custom-class" />);
    const button = container.querySelector('button');
    expect(button.className).toContain('custom-class');
  });

  it('renders SVG cart icon', () => {
    const { container } = render(<CartIcon count={0} onClick={() => {}} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
