import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '@/constants/Colors';

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: (value: boolean) => Promise<void>;
  colors: typeof Colors.light & typeof Colors.dark;
  colorScheme: 'light' | 'dark';
};

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: true,
  toggleTheme: async () => {},
  colors: Colors.dark,
  colorScheme: 'dark'
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const preference = await AsyncStorage.getItem('themePreference');
      setIsDarkMode(preference !== 'light');
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const toggleTheme = async (value: boolean) => {
    setIsDarkMode(value);
    await AsyncStorage.setItem('themePreference', value ? 'dark' : 'light');
  };

  const colorScheme = isDarkMode ? 'dark' : 'light' as const;
  const colors = Colors[colorScheme];

  const value: ThemeContextType = {
    isDarkMode,
    toggleTheme,
    colors,
    colorScheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 