import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    gradient: {
      start: string;
      end: string;
    };
  };
  dark: boolean;
}

const lightTheme: Theme = {
  colors: {
    primary: '#2F3C7E',    // Deep blue for primary actions
    secondary: '#4A4A4A',  // Dark grey for secondary elements
    accent: '#C5A880',    // Warm wood-like accent color
    background: '#FFFFFF', // Pure white background
    surface: '#F8F8F8',   // Light grey surface
    text: '#1A1A1A',      // Almost black for primary text
    textSecondary: '#666666', // Dark grey for secondary text
    border: '#E0E0E0',    // Light border color
    success: '#28A745',   // Success green
    warning: '#FFC107',   // Warning amber
    error: '#DC3545',     // Error red
    gradient: {
      start: '#2F3C7E',   // Deep blue
      end: '#1E2A5E',     // Darker blue
    },
  },
  dark: false,
};

const darkTheme: Theme = {
  colors: {
    primary: '#4A6FA5',    // Muted blue for primary actions
    secondary: '#A0AEC0',  // Light grey for secondary elements
    accent: '#D4A76A',    // Warm wood-like accent color
    background: '#1A202C', // Dark background
    surface: '#2D3748',   // Slightly lighter dark surface
    text: '#F7FAFC',      // Off-white for text
    textSecondary: '#CBD5E0', // Light grey for secondary text
    border: '#4A5568',    // Dark border color
    success: '#48BB78',   // Success green
    warning: '#ECC94B',   // Warning yellow
    error: '#F56565',     // Error red
    gradient: {
      start: '#2D3748',   // Dark surface
      end: '#1A202C',     // Darker background
    },
  },
  dark: true,
};

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme !== null) {
        setIsDark(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDark;
      setIsDark(newTheme);
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};