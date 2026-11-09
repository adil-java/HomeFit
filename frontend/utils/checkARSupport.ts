import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { logger } from '@/utils/logger';

let cachedResult: boolean | null = null;

interface ARSupportOptions {
  /** Kept for compatibility; detection is always strict now. */
  strict?: boolean;
}

const TIMEOUT_MS = 4000;

/**
 * Does this phone support camera AR?
 *  - Android: asks ARCore (Google Play Services for AR) through ViroReact.
 *    Only phones on Google's ARCore supported-devices list return true.
 *  - iOS: asks ARKit.
 *    ARCore often says "still checking" at first, so we re-ask until it
 *    gives a final answer.
 *  - Expo Go / web / any error / no answer in 4s: false → the in-screen 3D
 *    viewer is used instead, which works on every phone.
 *
 * The result is cached for the session.
 */
export async function checkARSupport(_options: ARSupportOptions = {}): Promise<boolean> {
  if (cachedResult !== null) return cachedResult;

  try {
    if (Platform.OS === 'web' || Constants.appOwnership === 'expo') {
      cachedResult = false;
      return false;
    }

    const viro = require('@reactvision/react-viro');
    const query: (() => Promise<{ isARSupported?: boolean }>) | undefined = viro?.isARSupportedOnDevice;
    if (typeof query !== 'function') {
      cachedResult = false;
      return false;
    }

    // ARCore's check is asynchronous: the first call on a fresh launch usually
    // answers "TRANSIENT" (still checking). Google's guidance is to ask again
    // shortly, so poll until a final answer or the time limit.
    const ask = (): Promise<'yes' | 'no' | 'retry'> =>
      query()
        .then((res) => (res?.isARSupported === true ? 'yes' : 'no'))
        // Viro rejects with the ARCore status: UNSUPPORTED / UNKNOWN / TRANSIENT
        .catch((e: unknown) => {
          const status = String((e as any)?.message ?? e ?? '').toUpperCase();
          return status.includes('TRANSIENT') ? 'retry' : status.includes('UNSUPPORTED') ? 'no' : 'retry';
        }) as Promise<'yes' | 'no' | 'retry'>;

    const deadline = Date.now() + TIMEOUT_MS;
    let answer: 'yes' | 'no' | 'retry' = 'retry';
    while (Date.now() < deadline) {
      answer = await Promise.race([
        ask(),
        new Promise<'retry'>((resolve) => setTimeout(() => resolve('retry'), Math.max(0, deadline - Date.now()))),
      ]);
      if (answer !== 'retry') break;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // No final answer in time (still checking / unknown): don't cache, so the
    // next tap asks ARCore again instead of locking the phone out of AR.
    if (answer === 'retry') return false;
    cachedResult = answer === 'yes';
    return cachedResult;
  } catch (error) {
    // Native module missing or anything unexpected → safe fallback (3D viewer)
    logger.warn('[AR Support] Detection failed, using 3D viewer:', error);
    cachedResult = false;
    return false;
  }
}

/** Reset the cached result (e.g. after the user installs ARCore). */
export function resetARSupportCache(): void {
  cachedResult = null;
}
