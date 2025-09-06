import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

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

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('token');
      const storedUser = await SecureStore.getItemAsync('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // Simulate API call - replace with actual backend integration
      const mockUser = {
        id: '1',
        email,
        name: 'John Doe',
        role: email.includes('admin') ? 'admin' : 'customer',
      };
      const mockToken = 'mock-jwt-token-' + Date.now();

      await SecureStore.setItemAsync('token', mockToken);
      await SecureStore.setItemAsync('user', JSON.stringify(mockUser));
      
      setToken(mockToken);
      setUser(mockUser);
      
      router.replace('/(tabs)');
    } catch (error) {
      throw new Error('Login failed');
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      // Simulate API call - replace with actual backend integration
      const mockUser = {
        id: '1',
        email,
        name,
        role: 'customer',
      };
      const mockToken = 'mock-jwt-token-' + Date.now();

      await SecureStore.setItemAsync('token', mockToken);
      await SecureStore.setItemAsync('user', JSON.stringify(mockUser));
      
      setToken(mockToken);
      setUser(mockUser);
      
      router.replace('/(tabs)');
    } catch (error) {
      throw new Error('Registration failed');
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
      setToken(null);
      setUser(null);
      router.replace('/auth');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};