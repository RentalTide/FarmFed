/**
 * Push notification bridge for Expo native app.
 *
 * The Expo app registers for push notifications and injects the token
 * into the WebView via window.__EXPO_PUSH_TOKEN__. This module detects
 * the token and registers it with the server when the user is authenticated.
 */

import { isNativeApp } from './capacitor';
import { sendToNative } from './nativeBridge';
import { registerDeviceToken } from './api';

let registered = false;

/**
 * Request the push token from the native app and register it with the server.
 * Call this after the user is authenticated.
 */
export const registerPushToken = async () => {
  if (registered || !isNativeApp()) return;

  try {
    // Ask native app for the push token
    const result = await sendToNative('requestPushToken');
    const token = result?.token;
    if (token) {
      await registerDeviceToken({ token, platform: result?.platform || 'ios' });
      registered = true;
    }
  } catch (e) {
    // Native app might not support push yet, or permission was denied
    console.warn('Push token registration failed:', e.message);
  }
};

/**
 * Check if a push token was injected by the native app and register it.
 * This is a fallback for when the token is set before the web app loads.
 */
export const checkInjectedPushToken = async () => {
  if (registered || typeof window === 'undefined') return;

  const token = window.__EXPO_PUSH_TOKEN__;
  if (token) {
    try {
      await registerDeviceToken({ token, platform: 'ios' });
      registered = true;
    } catch (e) {
      console.warn('Push token registration failed:', e.message);
    }
  }
};
