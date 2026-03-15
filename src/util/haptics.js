/**
 * Haptic feedback utilities for native app.
 * All functions are no-ops when not running in a native app.
 * Uses fire-and-forget bridge messages to the native shell.
 */
import { isNativeApp } from './capacitor';
import { fireToNative } from './nativeBridge';

export const lightImpact = () => {
  if (!isNativeApp()) return;
  fireToNative('haptic', { style: 'light' });
};

export const mediumImpact = () => {
  if (!isNativeApp()) return;
  fireToNative('haptic', { style: 'medium' });
};

export const successNotification = () => {
  if (!isNativeApp()) return;
  fireToNative('haptic', { style: 'success' });
};
