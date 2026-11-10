import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(undefined);

const readInitialTheme = () => {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* storage unavailable */
  }
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(readInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const toggleTheme = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme]);

  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
