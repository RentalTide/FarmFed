/**
 * Capacitor utilities for detecting native app context.
 * SSR-safe: guards against server-side execution where `window` is undefined.
 */

/**
 * Returns true when running inside a Capacitor native app (iOS/Android).
 * Returns false in regular browsers and during SSR.
 */
export const isNativeApp = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    const { Capacitor } = require('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch (e) {
    return false;
  }
};
