import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
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
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: "1066517448696-6snmnbvgh3km9l20hs9dqdhrb6uie4m3.apps.googleusercontent.com",
    
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get the ID token for API calls
          const token = await firebaseUser.getIdToken();
          
          // Verify token with backend and get user info
          const backendResponse = await apiService.verifyToken();
          
          const user: User = {
            id: backendResponse.user.uid,
            email: backendResponse.user.email || "",
            name: backendResponse.user.displayName || firebaseUser.email?.split("@")[0] || "",
            role: backendResponse.user.role || 'customer'
          };

          setUser(user);
          setToken(token);
          
          // Store for offline access
          await SecureStore.setItemAsync("token", token);
          await SecureStore.setItemAsync("user", JSON.stringify(user));
        } catch (error) {
          console.error('Backend verification failed:', error);
          // Fallback to Firebase user data if backend fails
          const user: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email || "",
            name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "",
            role: firebaseUser.email?.includes('admin') ? 'admin' : 'customer'
          };
          
          const token = await firebaseUser.getIdToken();
          setUser(user);
          setToken(token);
          
          await SecureStore.setItemAsync("token", token);
          await SecureStore.setItemAsync("user", JSON.stringify(user));
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
      const token = await userCredential.user.getIdToken();
      console.log('Firebase ID Token:', token);
      
      // Call backend login endpoint to verify token
      try {
        const backendResponse = await apiService.login();
        if (backendResponse && backendResponse.token) {
          console.log('Backend JWT Token:', backendResponse.token);
          setToken(backendResponse.token);
        }
      } catch (backendError) {
        console.error('Backend login verification failed:', backendError);
        // Continue with frontend login even if backend fails
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
      
      // Update the user's display name
      await updateProfile(userCredential.user, {
        displayName: name
      });
      
      // Call backend register endpoint to verify token
      try {
        await apiService.register();
      } catch (backendError) {
        console.error('Backend registration verification failed:', backendError);
        // Continue with frontend registration even if backend fails
      }
      
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.message || 'Registration failed');
    }
  };

  const loginWithGoogle = async () => {
    try {
      await promptAsync();
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