import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { Alert } from 'react-native';
// Lazy-loaded to prevent crash in Expo Go (native module not available)
let GoogleSignin: any = null;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
} catch (e) {
  console.warn('[Auth] Google Sign-In native module not available (expected in Expo Go)');
}
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
  uid: string;
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

  // Configure Google Sign-In for native popup (skipped if module unavailable)
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
        console.warn('[Auth] Failed to configure Google Sign-In:', e);
      }
    }
  }, []);

  // Handle Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get the ID token for API calls
          const token = await firebaseUser.getIdToken();

          // Try to verify token with backend but don't block if it fails
          try {
            const backendResponse = await apiService.verifyToken();
            console.log('Backend response:', backendResponse); // Debug log

            // Check if the response has the expected structure
            const userData = backendResponse.user || backendResponse; // Handle different response formats
            
            // Convert role to lowercase for consistency
            const role = userData.role?.toLowerCase() || 
                        (firebaseUser.email?.toLowerCase().includes('seller') ? 'seller' : 'customer');
            
            const user: User = {
              id: firebaseUser.uid, // Use firebaseUser.uid as the source of truth
              uid: userData.id,
              email: firebaseUser.email || "",
              name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "",
              role: role
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
              uid: firebaseUser.uid,
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

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      setToken(token);

      // First try to get the user role from the backend
      try {
        const backendResponse = await apiService.login();
        // console.log('Login backend response:', backendResponse);
        
        const userData = backendResponse.user || backendResponse; // Handle different response formats
        const role = userData.role?.toLowerCase() || 
                    (userCredential.user.email?.toLowerCase().includes('seller') ? 'seller' : 'customer');
        
        const user: User = {
          id: userCredential.user.uid,
          uid: userData.id,
          email: userCredential.user.email || '',
          name: userCredential.user.displayName || (userCredential.user.email?.split('@')[0] || ''),
          role: role,
        };
        
        setUser(user);
        await SecureStore.setItemAsync('token', token);
        await SecureStore.setItemAsync('user', JSON.stringify(user));
      } catch (backendError) {
        console.warn('Backend login verification failed, using fallback:', backendError);
        // Fallback to optimistic user if backend fails
        const optimisticUser: User = {
          id: userCredential.user.uid,
          uid: userCredential.user.uid,
          email: userCredential.user.email || '',
          name: userCredential.user.displayName || (userCredential.user.email?.split('@')[0] || ''),
          role: userCredential.user.email?.includes('seller') ? 'seller' : 'customer',
        };
        setUser(optimisticUser);
        await SecureStore.setItemAsync('token', token);
        await SecureStore.setItemAsync('user', JSON.stringify(optimisticUser));
      }

      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed');
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, {
        displayName: name,
      });

      const token = await userCredential.user.getIdToken();
      setToken(token);

      // First try to register with the backend to get the user role
      try {
        const backendResponse = await apiService.register();
        console.log('Registration backend response:', backendResponse);
        
        const userData = backendResponse.user || backendResponse; // Handle different response formats
        const user: User = {
          id: userCredential.user.uid,
          uid: userData.id,
          email: userCredential.user.email || '',
          name: name || userCredential.user.displayName || (userCredential.user.email?.split('@')[0] || ''),
          role: userData.role || (userCredential.user.email?.includes('seller') ? 'seller' : 'customer'),
        };
        
        setUser(user);
        await SecureStore.setItemAsync('token', token);
        await SecureStore.setItemAsync('user', JSON.stringify(user));
      } catch (backendError) {
        console.warn('Backend registration failed, using fallback:', backendError);
        // Fallback to optimistic user if backend fails
        const optimisticUser: User = {
          id: userCredential.user.uid,
          uid: userCredential.user.uid,
          email: userCredential.user.email || '',
          name: name || userCredential.user.displayName || (userCredential.user.email?.split('@')[0] || ''),
          role: userCredential.user.email?.includes('seller') ? 'seller' : 'customer',
        };
        setUser(optimisticUser);
        await SecureStore.setItemAsync('token', token);
        await SecureStore.setItemAsync('user', JSON.stringify(optimisticUser));
      }

      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.message || 'Registration failed');
    }
  };

  const loginWithGoogle = async () => {
    try {
      // Check if Google Sign-In is available (not available in Expo Go)
      if (!GoogleSignin) {
        Alert.alert(
          'Not Available',
          'Google Sign-In requires a development or production build. It is not supported in Expo Go.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Check Google Play Services
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Show native Google Sign-In popup
      const userInfo = await GoogleSignin.signIn();

      // Get tokens using getTokens() method - more reliable for ID token
      const tokens = await GoogleSignin.getTokens();

      const idToken = tokens.idToken;

      if (!idToken) {
        Alert.alert(
          'Sign-In Error',
          'No ID token received from Google. Please check your Firebase configuration and SHA-1 certificate.',
          [{ text: 'OK' }]
        );
        throw new Error('No ID token received from Google');
      }

      // Sign in to Firebase
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      
      // Get Firebase token for backend API calls
      const firebaseToken = await result.user.getIdToken();
      setToken(firebaseToken);
      
      // Sync with backend database (same flow as manual login)
      try {
        // First try login (existing user)
        const backendResponse = await apiService.login();
        // console.log('Google login backend response:', backendResponse);
        
        const userData = backendResponse.user || backendResponse;
        const role = userData.role?.toLowerCase() || 
                    (result.user.email?.toLowerCase().includes('seller') ? 'seller' : 'customer');
        
        const user: User = {
          id: result.user.uid,
          uid: userData.id,
          email: result.user.email || '',
          name: result.user.displayName || (result.user.email?.split('@')[0] || ''),
          role: role,
        };
        
        setUser(user);
        await SecureStore.setItemAsync('token', firebaseToken);
        await SecureStore.setItemAsync('user', JSON.stringify(user));
        
        Alert.alert('Welcome Back!', `Signed in as ${result.user.email}`, [{ text: 'OK' }]);
      } catch (loginError: any) {
        // If user doesn't exist, register them
        try {
          const backendResponse = await apiService.register();
          console.log('Google register backend response:', backendResponse);
          
          const userData = backendResponse.user || backendResponse;
          const user: User = {
            id: result.user.uid,
            uid: userData.id,
            email: result.user.email || '',
            name: result.user.displayName || (result.user.email?.split('@')[0] || ''),
            role: userData.role?.toLowerCase() || 'customer',
          };
          
          setUser(user);
          await SecureStore.setItemAsync('token', firebaseToken);
          await SecureStore.setItemAsync('user', JSON.stringify(user));
          
          Alert.alert('Account Created!', `Welcome ${result.user.displayName || result.user.email}!`, [{ text: 'OK' }]);
        } catch (registerError: any) {
          // Fallback to Firebase-only user if backend fails
          console.warn('Backend registration failed for Google user, using fallback:', registerError);
          const fallbackUser: User = {
            id: result.user.uid,
            uid: result.user.uid,
            email: result.user.email || '',
            name: result.user.displayName || (result.user.email?.split('@')[0] || ''),
            role: result.user.email?.includes('seller') ? 'seller' : 'customer',
          };
          
          setUser(fallbackUser);
          await SecureStore.setItemAsync('token', firebaseToken);
          await SecureStore.setItemAsync('user', JSON.stringify(fallbackUser));
          
          Alert.alert('Notice', 'Signed in successfully. Profile sync will happen later.', [{ text: 'OK' }]);
        }
      }
      
      router.replace('/(tabs)');
      
    } catch (error: any) {
      if (error.code === '12501' || error.code === 'SIGN_IN_CANCELLED') {
        return;
      }
      
      // Show detailed error based on error code
      let errorTitle = 'Sign-In Failed';
      let errorMessage = error.message || 'Unknown error occurred';
      
      if (error.code === '-5' || error.message?.includes('DEVELOPER_ERROR')) {
        errorTitle = 'Configuration Error';
        errorMessage = 'Google Sign-In is not properly configured. Please check:\n\n1. SHA-1 certificate is added to Firebase\n2. google-services.json is correct\n3. Web Client ID matches Firebase';
      }
      
      Alert.alert(errorTitle, errorMessage, [{ text: 'OK' }]);
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