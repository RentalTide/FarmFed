/**
 * Native app detection utility.
 * SSR-safe: guards against server-side execution where `window` is undefined.
 */

/**
 * Returns true when running inside a native app WebView (Expo/React Native).
 * Returns false in regular browsers and during SSR.
 */
export const isNativeApp = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  return !!window.ReactNativeWebView;
};
