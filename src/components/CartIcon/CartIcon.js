import React from 'react';
import classNames from 'classnames';

import css from './CartIcon.module.css';

const CartIcon = props => {
  const { count = 0, onClick, className } = props;
  const classes = classNames(css.root, className);

  return (
    <button className={classes} onClick={onClick} type="button" aria-label="Shopping cart">
      <svg
        className={css.icon}
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      {count > 0 ? <span className={css.badge}>{count > 99 ? '99+' : count}</span> : null}
    </button>
  );
};

export default CartIcon;
