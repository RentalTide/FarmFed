# FarmFed Mobile (Expo)

React Native (Expo) shell that wraps the FarmFed web app at `https://www.farmfed.us` in a `WebView`. The web app is unchanged; this shell provides:

- Push notifications (Expo Notifications → server uses `expo-server-sdk`)
- Native haptics
- Native image picker (camera + library) for the listing photos editor
- External link handling

## Prerequisites

```bash
npm install -g eas-cli
```

You also need:

- An **Apple Developer** account with the `com.farmfed.app` Identifier and Push Notifications capability enabled.
- A **Google Play Console** account (for Android submission).
- An **Expo** account (free).

## Local development

```bash
cd mobile
npm install
npx expo start
```

Open Expo Go on a real device, scan the QR code. Push notifications WON'T work in Expo Go — they require a development build (see below).

## Building & submitting

```bash
# 1. Log into Expo
eas login

# 2. First time only — create the EAS project (writes the project id back into app.json)
eas project:init

# 3. Build (uses EAS Build cloud service; ~15 min per platform)
eas build --platform ios --profile production
eas build --platform android --profile production

# 4. Submit to stores (after editing eas.json with your Apple ID / team ID)
eas submit --platform ios --latest
eas submit --platform android --latest
```

EAS prompts for Apple credentials on first iOS build and stores them in your Expo account.

## Replacing the existing Capacitor app

Bundle ID is `com.farmfed.app`, same as the live Capacitor build, so this submits as a new version of the existing App Store / Play Store listing — existing users get it as a normal update.

When the Expo build is approved and live, delete the old Capacitor wrapper:

```bash
rm -rf ios/ android/ capacitor.config.ts
# remove @capacitor/* from package.json dependencies
```

## Notification flow

1. App launches → `App.tsx` calls `Notifications.getExpoPushTokenAsync()`
2. Token is injected into the WebView as `window.__EXPO_PUSH_TOKEN__`
3. Web app's `src/util/pushNotifications.js` reads it and POSTs to `/api/device-tokens`
4. Server stores token (in `server/data/device-tokens.json` or via `settingsStore`)
5. When a relevant transaction transition happens, server calls `sendPushNotifications` (`server/api-util/pushSender.js`)
6. Expo Push Service relays to APNs / FCM → device shows banner

## Native bridge protocol

Web → Native messages (via `window.ReactNativeWebView.postMessage`):

| `type` | `payload` | Returns |
|---|---|---|
| `requestPushToken` | — | `{ token, platform }` |
| `haptic` | `{ style: 'light' \| 'medium' \| 'heavy' \| 'success' \| 'warning' \| 'error' }` | (fire-and-forget) |
| `camera` | `{ source: 'camera' \| 'library' }` | `{ uri, base64, mimeType }` or `null` if cancelled |
| `share` | `{ title, text, url }` | `{ ok: true }` |
