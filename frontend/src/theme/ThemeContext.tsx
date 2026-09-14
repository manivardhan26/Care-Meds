import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { LightColors, DarkColors, ThemeColors } from './colors';
import { getSettings, saveSettings } from '../storage/medicineStorage';

interface ThemeContextType {
  isDarkMode: boolean;
  colors: ThemeColors;
  toggleDarkMode: (enabled?: boolean) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  colors: LightColors,
  toggleDarkMode: async () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Load saved preference on app launch
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const settings = await getSettings();
        if (isMounted && typeof settings?.isDarkMode === 'boolean') {
          setIsDarkMode(settings.isDarkMode);
        }
      } catch (err) {
        console.warn('Failed to load theme preference:', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleDarkMode = useCallback(async (enabled?: boolean) => {
    setIsDarkMode((prev) => {
      const nextVal = typeof enabled === 'boolean' ? enabled : !prev;
      // Persist preference asynchronously to AsyncStorage & API
      saveSettings({ isDarkMode: nextVal }).catch((err) => {
        console.warn('Failed to save theme setting:', err);
      });
      return nextVal;
    });
  }, []);

  const colors = useMemo(() => (isDarkMode ? DarkColors : LightColors), [isDarkMode]);

  const value = useMemo(
    () => ({
      isDarkMode,
      colors,
      toggleDarkMode,
    }),
    [isDarkMode, colors, toggleDarkMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
