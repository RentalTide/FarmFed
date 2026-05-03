/**
 * Per-URL scroll position memory backed by sessionStorage. Used to restore
 * the SearchPage scroll position after a buyer clicks into a listing and
 * returns via the browser back button or the "Back to results" link.
 */

const KEY = 'farmfed:scrollMemory';

const safeWindow = () => (typeof window !== 'undefined' ? window : null);

export const saveScrollPosition = url => {
  const w = safeWindow();
  if (!w || !url) return;
  try {
    w.sessionStorage.setItem(KEY, JSON.stringify({ url, y: w.scrollY, ts: Date.now() }));
  } catch (e) {
    /* sessionStorage unavailable */
  }
};

export const getSavedScrollPosition = () => {
  const w = safeWindow();
  if (!w) return null;
  try {
    const raw = w.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Discard memories older than 30 minutes
    if (!parsed?.ts || Date.now() - parsed.ts > 30 * 60 * 1000) return null;
    return parsed;
  } catch (e) {
    return null;
  }
};

export const clearSavedScrollPosition = () => {
  const w = safeWindow();
  if (!w) return;
  try {
    w.sessionStorage.removeItem(KEY);
  } catch (e) {
    /* ignore */
  }
};

/**
 * Try to scroll to the target Y, retrying briefly while the page is still
 * growing (e.g. async listing rendering). Gives up after ~1.5s.
 */
export const tryRestoreScroll = (targetY, maxAttempts = 15, intervalMs = 100) => {
  const w = safeWindow();
  if (!w || !Number.isFinite(targetY)) return;
  let attempt = 0;
  const tick = () => {
    const docHeight = document.documentElement.scrollHeight;
    if (docHeight >= targetY + w.innerHeight || attempt >= maxAttempts) {
      w.scrollTo(0, targetY);
      return;
    }
    attempt += 1;
    setTimeout(tick, intervalMs);
  };
  tick();
};
