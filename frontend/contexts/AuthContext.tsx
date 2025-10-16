import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { apiService } from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  WebBrowser.maybeCompleteAuthSession();
  const redirectUri = (makeRedirectUri as any)({ useProxy: true });
  const googleConfig: any = {
    clientId: "1066517448696-tgpl2cf5snd5auej7brq4hjb6sg1ugv9.apps.googleusercontent.com",
    androidClientId: "1066517448696-k90lkfdsea2geec1nof73k3fh96ioij7.apps.googleusercontent.com",
    redirectUri,
  };
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(googleConfig as any);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get the ID token for API calls
          const token = await firebaseUser.getIdToken();

          // Try to verify token with backend but don't block if it fails
          try {
            const backendResponse = await apiService.verifyToken();

            const user: User = {
              id: backendResponse.user.uid,
              email: backendResponse.user.email || "",
              name: backendResponse.user.displayName || firebaseUser.email?.split("@")[0] || "",
              role: backendResponse.user.role || 'seller'
            };

            setUser(user);
            setToken(token);

            // Store for offline access
            await SecureStore.setItemAsync("token", token);
            await SecureStore.setItemAsync("user", JSON.stringify(user));
          } catch (backendError) {
            // Backend verification failed, use fallback logic
            console.warn('Backend verification failed, using Firebase data:', backendError);
            const user: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email || "",
              name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "",
              role: firebaseUser.email?.includes('seller') ? 'seller' : 'customer'
            };

            setUser(user);
            setToken(token);

            await SecureStore.setItemAsync("token", token);
            await SecureStore.setItemAsync("user", JSON.stringify(user));
          }
        } catch (error) {
          console.error('Firebase authentication error:', error);
          setUser(null);
          setToken(null);
        }
      } else {
        setUser(null);
        setToken(null);
        await SecureStore.deleteItemAsync("token");
        await SecureStore.deleteItemAsync("user");
      }
      setIsLoading(false);
    });

    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential);
    }
    else{
      console.log("Google login failed");
    }

    return () => unsubscribe();
  }, [response]);

  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Immediately use Firebase token so UI can proceed without waiting on backend
      const token = await userCredential.user.getIdToken();
      setToken(token);

      // Optimistically set minimal user; full user will be set by onAuthStateChanged + verifyToken
      const optimisticUser = {
        id: userCredential.user.uid,
        email: userCredential.user.email || '',
        name: userCredential.user.displayName || (userCredential.user.email?.split('@')[0] || ''),
        role: userCredential.user.email?.includes('seller') ? 'seller' : 'customer',
      };
      setUser(optimisticUser);
      await SecureStore.setItemAsync('token', token);
      await SecureStore.setItemAsync('user', JSON.stringify(optimisticUser));

      // Best-effort: notify backend to create/update user based on Firebase token
      // Any error here should not block the UI
      apiService
        .login()
        .then(() => console.log('Backend login verification successful'))
        .catch((backendError) => console.warn('Backend login verification failed:', backendError));

      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed');
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Update the user's display name
      await updateProfile(userCredential.user, {
        displayName: name,
      });

      // Immediately use Firebase token so UI can proceed
      const token = await userCredential.user.getIdToken();
      setToken(token);

      const optimisticUser = {
        id: userCredential.user.uid,
        email: userCredential.user.email || '',
        name: name || userCredential.user.displayName || (userCredential.user.email?.split('@')[0] || ''),
        role: userCredential.user.email?.includes('seller') ? 'seller' : 'customer',
      };
      setUser(optimisticUser);
      await SecureStore.setItemAsync('token', token);
      await SecureStore.setItemAsync('user', JSON.stringify(optimisticUser));

      // Best-effort: notify backend to create user entry
      apiService
        .register()
        .then(() => console.log('Backend registration verification successful'))
        .catch((backendError) => console.warn('Backend registration verification failed:', backendError));

      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.message || 'Registration failed');
    }
  };

  const loginWithGoogle = async () => {
    try {
      await (promptAsync as any)({ useProxy: true });
    } catch (error: any) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      router.replace('/auth');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, loginWithGoogle, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};