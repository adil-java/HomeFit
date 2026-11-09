import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { typography, FONT_FAMILIES, FONT_WEIGHTS } from '@/utils/typography';
import { logger } from '@/utils/logger';

// Typography configuration - same for both light and dark modes
const sharedTypography = {
  fonts: FONT_FAMILIES,
  weights: FONT_WEIGHTS,
  styles: typography,
};

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
  typography: typeof sharedTypography;
  dark: boolean;
}

// Warm neutrals (furniture / interiors feel) with the brand navy as the
// action colour. Cards use `surface` on top of `background`.
const lightTheme: Theme = {
  colors: {
    primary: '#2F3C7E',       // Brand navy — buttons, links, active states
    secondary: '#4A4743',
    accent: '#B8925F',        // Warm oak
    background: '#F6F5F2',    // Warm off-white page
    surface: '#FFFFFF',       // Cards, inputs, sheets
    text: '#1C1B19',
    textSecondary: '#6B6862',
    border: '#E6E3DD',
    success: '#2F855A',
    warning: '#C98A12',       // Deep amber (readable on white)
    error: '#C53030',
    gradient: {
      start: '#2F3C7E',
      end: '#1E2A5E',
    },
  },
  typography: sharedTypography,
  dark: false,
};

const darkTheme: Theme = {
  colors: {
    primary: '#5576B5',       // Navy lifted for dark backgrounds (white text stays readable)
    secondary: '#B5B2AC',
    accent: '#D1A872',
    background: '#141413',    // Neutral near-black
    surface: '#1E1E1C',
    text: '#F4F3F0',
    textSecondary: '#A3A09A',
    border: '#2E2D2A',
    success: '#4FB07A',
    warning: '#E0A93B',
    error: '#E5675F',
    gradient: {
      start: '#1E1E1C',
      end: '#141413',
    },
  },
  typography: sharedTypography,
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
  const [isDark, setIsDark] = useState(true);

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
      logger.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDark;
      setIsDark(newTheme);
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      logger.error('Error saving theme:', error);
    }
  };

  const theme = isDark ? darkTheme : lightTheme;

  // Stable value: consumers re-render only when the theme actually changes.
  // (toggleTheme reads `isDark`, so it's refreshed whenever isDark changes.)
  const value = useMemo(() => ({ theme, isDark, toggleTheme }), [theme, isDark]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};