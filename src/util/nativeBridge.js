/**
 * Bridge for communicating between WebView content and native shell (Expo/React Native).
 *
 * Web → Native: window.ReactNativeWebView.postMessage(JSON.stringify({ type, payload, callbackId }))
 * Native → Web: webViewRef.injectJavaScript("window.__NATIVE_BRIDGE__.resolve(id, result)")
 */

let nextCallbackId = 0;
const pending = {};

// Set up the global bridge object so native can resolve/reject callbacks
if (typeof window !== 'undefined') {
  window.__NATIVE_BRIDGE__ = {
    resolve: (id, result) => {
      if (pending[id]) {
        pending[id].resolve(result);
        delete pending[id];
      }
    },
    reject: (id, error) => {
      if (pending[id]) {
        pending[id].reject(new Error(error));
        delete pending[id];
      }
    },
  };
}

/**
 * Send a message to native and wait for a response.
 * Used for async operations like camera, share.
 */
export const sendToNative = (type, payload = {}) => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.ReactNativeWebView) {
      reject(new Error('Not in native app'));
      return;
    }
    const id = ++nextCallbackId;
    pending[id] = { resolve, reject };
    window.ReactNativeWebView.postMessage(JSON.stringify({ type, payload, callbackId: id }));

    // Timeout after 60 seconds
    setTimeout(() => {
      if (pending[id]) {
        pending[id].reject(new Error('Native bridge timeout'));
        delete pending[id];
      }
    }, 60000);
  });
};

/**
 * Fire-and-forget message to native.
 * Used for things like haptic feedback where we don't need a response.
 */
export const fireToNative = (type, payload = {}) => {
  if (typeof window === 'undefined' || !window.ReactNativeWebView) return;
  window.ReactNativeWebView.postMessage(JSON.stringify({ type, payload }));
};
