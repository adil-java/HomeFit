import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile as updateFirebaseProfile,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { apiService } from '../services/api';
import { useAppDispatch } from '../store/hooks';
import { resetUserData } from '../store/actions';
import { NOTIFICATIONS_STORAGE_KEY } from '../store/slices/notificationsSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';
import { friendlyError, FriendlyError } from '@/utils/errorMessages';

// Lazy-loaded to prevent a crash in Expo Go (native module not available)
let GoogleSignin: any = null;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
} catch {
  logger.warn('[Auth] Google Sign-In native module not available (expected in Expo Go)');
}

export interface User {
  id: string;     // Firebase UID
  uid: string;    // Backend (database) user id
  email: string;
  name: string;
  role: string;
  photoURL?: string | null;
  phone?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  /** Save name / phone / photo (data URI) to the account; updates `user`. */
  updateProfile: (changes: { name?: string; phoneNumber?: string; photo?: string }) => Promise<void>;
  /** True only while restoring the session at app start. */
  isLoading: boolean;
  /**
   * Set while signing in / out (e.g. "Signing you in…"). A full-screen loader
   * is shown for it at the app root, so it stays up across navigation and
   * blocks double taps.
   */
  authBusy: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const USER_KEY = 'user';
const TOKEN_KEY = 'token';

async function readCachedUser(): Promise<User | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

type SyncMode = 'verify' | 'login' | 'register' | 'google';

/**
 * Build the app user for a Firebase account. The role comes from the backend;
 * if the backend is slow/unreachable we keep the last known profile for this
 * same account (so a seller isn't shown as a customer after a reload), and
 * only fall back to a basic customer profile for a brand-new device.
 */
async function loadProfile(fbUser: FirebaseUser, mode: SyncMode, nameOverride?: string): Promise<User> {
  const base = {
    id: fbUser.uid,
    email: fbUser.email || '',
    name: nameOverride || fbUser.displayName || fbUser.email?.split('@')[0] || '',
  };

  try {
    let response: any;
    if (mode === 'verify') response = await apiService.verifyToken();
    else if (mode === 'login') response = await apiService.login();
    else if (mode === 'register') response = await apiService.register();
    else {
      // Google: existing account → login, otherwise create it
      try {
        response = await apiService.login();
      } catch {
        response = await apiService.register();
      }
    }
    const data = response?.user || response || {};
    return {
      ...base,
      // The account's saved profile (editable in Personal information) wins
      name: data.name || base.name,
      uid: data.id || fbUser.uid,
      role: String(data.role || 'customer').toLowerCase(),
      photoURL: data.photoURL || fbUser.photoURL || null,
      phone: data.phoneNumber || null,
    };
  } catch (error) {
    logger.warn('[Auth] Profile sync failed, using cached profile:', error);
    const cached = await readCachedUser();
    if (cached && cached.id === fbUser.uid) return { ...cached, ...base, name: cached.name || base.name };
    return { ...base, uid: fbUser.uid, role: 'customer', photoURL: fbUser.photoURL || null };
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState<string | null>(null);
  const dispatch = useAppDispatch();

  // Incremented on every auth change and on logout. Async work started for an
  // older generation must not touch state (fixes "logged out, then put back
  // into the app" when a slow profile request finished after logout).
  const generation = useRef(0);
  // True while login/register/Google is running; that flow sets the user itself.
  const signInFlow = useRef(false);
  // Latest user, readable from async code
  const userRef = useRef<User | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const isCurrent = (gen: number, fbUid: string) =>
    gen === generation.current && auth.currentUser?.uid === fbUid;

  const commitUser = useCallback(async (next: User, fbUser: FirebaseUser) => {
    // Unchanged profile (usual case after a reload) → keep the same object so
    // screens that depend on `user` don't re-render or refetch.
    if (JSON.stringify(next) !== JSON.stringify(userRef.current)) setUser(next);
    try {
      const idToken = await fbUser.getIdToken();
      setToken(idToken);
      await SecureStore.setItemAsync(TOKEN_KEY, idToken);
    } catch {
      // Offline: token refreshes on the next API call
    }
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const clearSession = useCallback(async () => {
    setUser(null);
    setToken(null);
    // Drop this user's data (cart, wishlist, orders, addresses, …) so the next
    // account on this device never sees it.
    dispatch(resetUserData());
    AsyncStorage.removeItem(NOTIFICATIONS_STORAGE_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
  }, [dispatch]);

  // Configure Google Sign-In for the native popup (skipped if module unavailable)
  useEffect(() => {
    if (GoogleSignin) {
      try {
        GoogleSignin.configure({
          webClientId: '1066517448696-tgpl2cf5snd5auej7brq4hjb6sg1ugv9.apps.googleusercontent.com',
          iosClientId: '1066517448696-rffitabve6rg0j8bhje6quh1j8mqie9o.apps.googleusercontent.com',
          offlineAccess: true,
          scopes: ['profile', 'email'],
          forceCodeForRefreshToken: true,
        });
      } catch (e) {
        logger.warn('[Auth] Failed to configure Google Sign-In:', e);
      }
    }
  }, []);

  // Session restore and external auth changes (token revoked, etc.)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      const gen = ++generation.current;

      if (!fbUser) {
        await clearSession();
        if (gen === generation.current) setIsLoading(false);
        return;
      }

      // login/register/Google set the user themselves when they finish
      if (signInFlow.current) return;

      // Fast path on app reload: show the saved profile right away (no logout
      // flash, no waiting on a cold backend), then refresh it in the background.
      const cached = await readCachedUser();
      if (!isCurrent(gen, fbUser.uid)) return;
      if (cached && cached.id === fbUser.uid) {
        setUser(cached);
        setIsLoading(false);
      }

      const fresh = await loadProfile(fbUser, 'verify');
      if (!isCurrent(gen, fbUser.uid)) return; // signed out / switched meanwhile
      await commitUser(fresh, fbUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [clearSession, commitUser]);

  /**
   * Shared tail of every sign-in: load the profile, then go Home. The busy
   * loader stays up until Home is on screen.
   */
  const finishSignIn = async (fbUser: FirebaseUser, mode: SyncMode, toast: { title: string }, nameOverride?: string) => {
    const gen = generation.current;
    const profile = await loadProfile(fbUser, mode, nameOverride);
    if (!isCurrent(gen, fbUser.uid)) return;
    await commitUser(profile, fbUser);
    setIsLoading(false);
    router.replace('/(tabs)');
    Toast.show({
      type: 'welcome',
      text1: toast.title,
      text2: profile.name || profile.email,
      props: { photoURL: profile.photoURL, email: profile.email },
      position: 'top',
      visibilityTime: 2600,
    });
  };

  const runSignIn = async (message: string, work: () => Promise<void>) => {
    if (signInFlow.current) return; // already signing in — ignore double taps
    signInFlow.current = true;
    setAuthBusy(message);
    const gen = generation.current;
    try {
      await work();
    } catch (error) {
      // Failed half-way (e.g. Firebase signed in but the profile step threw):
      // sign out so the app and Firebase agree that nobody is signed in.
      if (gen === generation.current && auth.currentUser && !userRef.current) {
        await signOut(auth).catch(() => {});
      }
      throw error;
    } finally {
      signInFlow.current = false;
      // Let Home mount behind the loader before removing it
      setTimeout(() => setAuthBusy(null), 350);
    }
  };

  const login = async (email: string, password: string) => {
    await runSignIn('Signing you in…', async () => {
      try {
        const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
        await finishSignIn(credential.user, 'login', { title: 'Welcome back' });
      } catch (error: any) {
        logger.error('Login error:', error);
        throw new FriendlyError(error, 'Could not sign in. Please try again.');
      }
    });
  };

  const register = async (email: string, password: string, name: string) => {
    await runSignIn('Creating your account…', async () => {
      try {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateFirebaseProfile(credential.user, { displayName: name });
        await finishSignIn(credential.user, 'register', { title: 'Welcome to HomeFit' }, name);
      } catch (error: any) {
        logger.error('Registration error:', error);
        throw new FriendlyError(error, 'Could not create your account. Please try again.');
      }
    });
  };

  const loginWithGoogle = async () => {
    if (!GoogleSignin) {
      Alert.alert(
        'Not available',
        'Google sign-in needs the installed app. Please sign in with your email and password.',
        [{ text: 'OK' }]
      );
      return;
    }
    if (signInFlow.current) return;

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Account picker. The loader starts once an account is chosen.
      const result = await GoogleSignin.signIn();
      if (result?.type === 'cancelled') return; // closed the picker

      await runSignIn('Signing you in…', async () => {
        const tokens = await GoogleSignin.getTokens();
        if (!tokens?.idToken) {
          throw Object.assign(new Error('No ID token received from Google'), { code: '-5' });
        }
        const credential = await signInWithCredential(auth, GoogleAuthProvider.credential(tokens.idToken));
        await finishSignIn(credential.user, 'google', { title: 'Welcome' });
      });
    } catch (error: any) {
      if (error?.code === '12501' || error?.code === 'SIGN_IN_CANCELLED') {
        return;
      }
      logger.error('Google sign-in error:', error);
      // Setup problems (SHA-1 / client ID) are for developers, not users
      const isConfigError = error?.code === '-5' || String(error?.message || '').includes('DEVELOPER_ERROR');
      Alert.alert(
        'Sign-in failed',
        isConfigError
          ? 'Google sign-in is not available right now. Please sign in with your email and password.'
          : friendlyError(error, 'Google sign-in failed. Please try again.'),
        [{ text: 'OK' }]
      );
    }
  };

  const updateProfile = async (changes: { name?: string; phoneNumber?: string; photo?: string }) => {
    const fbUser = auth.currentUser;
    const current = userRef.current;
    if (!fbUser || !current) throw new Error('Please sign in again.');
    try {
      const saved = await apiService.updateMe(changes);
      const next: User = {
        ...current,
        name: saved.name || current.name,
        photoURL: saved.photoURL ?? current.photoURL,
        phone: saved.phoneNumber ?? null,
      };
      await commitUser(next, fbUser);
    } catch (error) {
      logger.error('Update profile error:', error);
      throw new FriendlyError(error, 'Could not update your profile. Please try again.');
    }
  };

  const logout = async () => {
    // Invalidate any profile request still in flight, and leave immediately
    generation.current++;
    signInFlow.current = false;
    setAuthBusy('Signing out…');
    try {
      await clearSession();
      await signOut(auth);
      // Next "Continue with Google" shows the account picker again
      if (GoogleSignin) await GoogleSignin.signOut().catch(() => {});
    } catch (error) {
      logger.error('Logout error:', error);
    } finally {
      router.replace('/auth');
      setTimeout(() => setAuthBusy(null), 300);
    }
  };

  // Stable value: consumers re-render only when auth state changes. The
  // functions only use refs, setters and stable callbacks.
  const value = React.useMemo(
    () => ({ user, token, login, register, loginWithGoogle, logout, updateProfile, isLoading, authBusy }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, token, isLoading, authBusy]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
