import { useRef, useState, useCallback, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { readAsStringAsync } from 'expo-file-system';
import {
  StyleSheet,
  Text,
  Image,
  TouchableOpacity,
  BackHandler,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewNavigation, WebViewMessageEvent } from 'react-native-webview';

const SITE_URL = 'https://farmfed-e9c8faa5736a.herokuapp.com';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Android hardware back button
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });

    return () => handler.remove();
  }, [canGoBack]);

  const onNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
  }, []);

  const onLoadEnd = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);
    SplashScreen.hideAsync();
  }, []);

  const onError = useCallback(() => {
    setHasError(true);
    setIsLoaded(true);
    SplashScreen.hideAsync();
  }, []);

  const retry = useCallback(() => {
    setHasError(false);
    setIsLoaded(false);
    webViewRef.current?.reload();
  }, []);

  // Resolve a pending callback in the WebView
  const resolveCallback = useCallback((callbackId: number, result: any) => {
    if (!callbackId) return;
    webViewRef.current?.injectJavaScript(`
      window.__NATIVE_BRIDGE__?.resolve(${callbackId}, ${JSON.stringify(result)});
      true;
    `);
  }, []);

  // Reject a pending callback in the WebView
  const rejectCallback = useCallback((callbackId: number, error: string) => {
    if (!callbackId) return;
    webViewRef.current?.injectJavaScript(`
      window.__NATIVE_BRIDGE__?.reject(${callbackId}, ${JSON.stringify(error)});
      true;
    `);
  }, []);

  // Handle messages from the WebView
  const onMessage = useCallback(async (event: WebViewMessageEvent) => {
    let data: { type: string; payload: any; callbackId?: number };
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }

    const { type, payload, callbackId } = data;

    switch (type) {
      // --- Haptic Feedback ---
      case 'haptic': {
        try {
          if (payload.style === 'light') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } else if (payload.style === 'medium') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } else if (payload.style === 'success') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        } catch {
          // Haptics may not be available (e.g. simulator)
        }
        break;
      }

      // --- Native Share Sheet ---
      case 'share': {
        try {
          const message = Platform.OS === 'ios'
            ? payload.title
            : `${payload.title}\n${payload.url}`;
          await Share.share({
            message,
            url: payload.url, // iOS only
            title: payload.title,
          });
          if (callbackId) resolveCallback(callbackId, { success: true });
        } catch (e: any) {
          if (callbackId) rejectCallback(callbackId, e.message || 'Share failed');
        }
        break;
      }

      // --- Camera / Image Picker ---
      case 'camera': {
        try {
          const options: ImagePicker.ImagePickerOptions = {
            quality: 0.9,
            base64: true,
            exif: false,
          };

          let result: ImagePicker.ImagePickerResult;

          if (payload.source === 'camera') {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              if (callbackId) rejectCallback(callbackId, 'Camera permission denied');
              return;
            }
            result = await ImagePicker.launchCameraAsync(options);
          } else {
            result = await ImagePicker.launchImageLibraryAsync(options);
          }

          if (result.canceled) {
            if (callbackId) rejectCallback(callbackId, 'User cancelled');
          } else {
            const asset = result.assets[0];
            let base64 = asset.base64;

            // Read as base64 if not already provided
            if (!base64 && asset.uri) {
              base64 = await readAsStringAsync(asset.uri, {
                encoding: 'base64',
              });
            }

            const mimeType = asset.mimeType || 'image/jpeg';
            const dataUrl = `data:${mimeType};base64,${base64}`;
            const format = mimeType.split('/')[1] || 'jpeg';

            if (callbackId) resolveCallback(callbackId, { dataUrl, format });
          }
        } catch (e: any) {
          if (callbackId) rejectCallback(callbackId, e.message || 'Camera failed');
        }
        break;
      }

      default:
        break;
    }
  }, [resolveCallback, rejectCallback]);

  if (hasError) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.errorContainer}>
          <StatusBar style="dark" />
          <Image
            source={require('./assets/others/FarmFedLogo.png')}
            style={styles.errorLogo}
            resizeMode="contain"
          />
          <Text style={styles.errorTitle}>Unable to Connect</Text>
          <Text style={styles.errorMessage}>
            Please check your internet connection and try again.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={retry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />
        <WebView
          ref={webViewRef}
          source={{ uri: SITE_URL }}
          style={styles.webview}
          onNavigationStateChange={onNavigationStateChange}
          onLoadEnd={onLoadEnd}
          onError={onError}
          onHttpError={onError}
          onMessage={onMessage}
          allowsBackForwardNavigationGestures={true}
          startInLoadingState={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          sharedCookiesEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorLogo: {
    width: 220,
    height: 70,
    marginBottom: 32,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: '#2ecc71',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
