import React, { useEffect, useState } from 'react';
import classNames from 'classnames';

import { fetchAnnouncements } from '../../util/api';

import css from './AnnouncementBanner.module.css';

const DISMISS_KEY = 'farmfed_dismissed_announcements';

const readDismissed = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

/**
 * AnnouncementBanner
 *
 * Shows active admin announcements (from the Push Notification Center) as a
 * dismissible banner on the app home. Self-fetching so it can be dropped onto
 * any page. Dismissals are remembered per-device in localStorage.
 */
const AnnouncementBanner = props => {
  const { className, rootClassName } = props;
  const [items, setItems] = useState([]);
  const [dismissed, setDismissed] = useState(readDismissed);

  useEffect(() => {
    let cancelled = false;
    fetchAnnouncements()
      .then(data => {
        if (!cancelled) setItems(data.announcements || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = id => {
    const next = [...new Set([...dismissed, id])];
    setDismissed(next);
    try {
      window.localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
    } catch (e) {
      // ignore storage failures
    }
  };

  const visible = items.filter(a => a && a.id && !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  const classes = classNames(rootClassName || css.root, className);

  return (
    <div className={classes}>
      {visible.map(a => {
        const inner = (
          <>
            <span className={css.title}>{a.title}</span>
            <span className={css.body}>{a.body}</span>
          </>
        );
        return (
          <div key={a.id} className={css.banner}>
            {a.link ? (
              <a className={css.content} href={a.link}>
                {inner}
              </a>
            ) : (
              <div className={css.content}>{inner}</div>
            )}
            <button
              className={css.dismiss}
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(a.id)}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default AnnouncementBanner;
