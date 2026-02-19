/**
 * Haptic feedback utilities for Capacitor native apps.
 * All functions are no-ops when not running in a native app.
 * Uses dynamic import() to keep the plugin out of the main bundle.
 */
import { isNativeApp } from './capacitor';

export const lightImpact = async () => {
  if (!isNativeApp()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (e) {
    // silently ignore
  }
};

export const mediumImpact = async () => {
  if (!isNativeApp()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch (e) {
    // silently ignore
  }
};

export const successNotification = async () => {
  if (!isNativeApp()) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Success });
  } catch (e) {
    // silently ignore
  }
};
