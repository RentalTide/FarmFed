import React, { useRef, useCallback, useEffect, useState } from 'react';
import classNames from 'classnames';

import { IconClose } from '../../../../components';

import css from './MobileMenuDrawer.module.css';

const SWIPE_THRESHOLD = 0.3;
const VELOCITY_THRESHOLD = 0.5;
const PANEL_WIDTH = 320;

const MobileMenuDrawer = props => {
  const { isOpen, onClose, children, overlayRef } = props;

  const panelRef = useRef(null);
  const touchStartRef = useRef(null);
  const touchTimeRef = useRef(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = useCallback(e => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    touchTimeRef.current = Date.now();
    setIsDragging(false);
  }, []);

  const handleTouchMove = useCallback(e => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    if (!isDragging && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      setIsDragging(true);
    }

    if (isDragging || (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy))) {
      const offset = Math.min(0, dx);
      setDragOffset(offset);
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(e => {
    if (!touchStartRef.current || !isDragging) {
      touchStartRef.current = null;
      return;
    }

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const elapsed = Date.now() - (touchTimeRef.current || Date.now());
    const velocity = Math.abs(dx) / elapsed;

    const panelWidth = panelRef.current?.offsetWidth || PANEL_WIDTH;
    const progress = Math.abs(dx) / panelWidth;

    if (progress > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
      onClose();
    }

    setDragOffset(0);
    setIsDragging(false);
    touchStartRef.current = null;
  }, [isDragging, onClose]);

  useEffect(() => {
    setDragOffset(0);
    setIsDragging(false);
  }, [isOpen]);

  const overlayClasses = classNames(css.overlay, { [css.overlayOpen]: isOpen });

  const panelStyle = isDragging
    ? { transform: `translateX(${dragOffset}px)`, transition: 'none' }
    : {};

  const backdropStyle = isDragging
    ? { opacity: 1 - (Math.abs(dragOffset) / (panelRef.current?.offsetWidth || PANEL_WIDTH)), transition: 'none' }
    : {};

  return (
    <div className={overlayClasses} ref={overlayRef}>
      <div className={css.backdrop} onClick={onClose} role="presentation" style={backdropStyle} data-backdrop />
      <div
        ref={panelRef}
        className={css.panel}
        style={panelStyle}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        data-panel
      >
        <div className={css.header}>
          <button className={css.closeButton} onClick={onClose} type="button">
            <IconClose rootClassName={css.closeIcon} />
          </button>
        </div>
        <div className={css.content}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default MobileMenuDrawer;
