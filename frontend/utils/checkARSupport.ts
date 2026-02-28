import { Platform } from 'react-native';

let cachedResult: boolean | null = null;

/**
 * Check if the device supports ARCore (Android) or ARKit (iOS).
 * 
 * - iOS: ARKit is built-in on iPhone 6s+, so we assume true.
 * - Android: We attempt to detect ARCore availability.
 * - Web: Always returns false.
 * 
 * Results are cached after the first check to avoid repeated lookups.
 * If detection fails for any reason, defaults to false (safer fallback to 3D viewer).
 */
export async function checkARSupport(): Promise<boolean> {
  // Return cached result if available
  if (cachedResult !== null) {
    return cachedResult;
  }

  try {
    if (Platform.OS === 'web') {
      cachedResult = false;
      return false;
    }

    if (Platform.OS === 'ios') {
      // ARKit is available on iPhone 6s+ (A9 chip and later).
      // Virtually all iOS devices running modern Expo are supported.
      cachedResult = true;
      return true;
    }

    if (Platform.OS === 'android') {
      // On Android, we try to dynamically import ViroARSceneNavigator.
      // If ViroReact/ARCore is not properly set up the import or instantiation
      // will throw, letting us know AR is not available.
      try {
        // Check if the ViroReact native module can be resolved.
        // This will succeed only if ARCore is installed and the Viro native
        // libraries are linked correctly in this build.
        const viro = await import('@reactvision/react-viro');
        
        // If the import succeeds the native modules are present, which means
        // ARCore is available (Viro requires it at build time on Android).
        if (viro && viro.ViroARSceneNavigator) {
          cachedResult = true;
          return true;
        }

        cachedResult = false;
        return false;
      } catch {
        // ViroReact native module not available → ARCore not supported
        console.log('[AR Support] ViroReact not available on this device, falling back to 3D viewer');
        cachedResult = false;
        return false;
      }
    }

    // Unknown platform
    cachedResult = false;
    return false;
  } catch (error) {
    // If anything unexpected happens, default to the safer fallback (3D viewer)
    console.warn('[AR Support] Detection failed, defaulting to 3D viewer:', error);
    cachedResult = false;
    return false;
  }
}

/**
 * Reset the cached AR support result.
 * Useful for testing or if user installs ARCore after first check.
 */
export function resetARSupportCache(): void {
  cachedResult = null;
}
