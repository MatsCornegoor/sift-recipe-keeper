import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import AppNavigator from './navigation/AppNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from './hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import KeepAwake from 'react-native-keep-awake';

function AppContent() {
  const { colors } = useTheme();

  useEffect(() => {
    const initKeepAwake = async () => {
      try {
        const value = await AsyncStorage.getItem('keepScreenAwake');
        if (value === 'true') {
          KeepAwake.activate();
        }
      } catch (error) {
        console.error('Error initializing screen awake setting:', error);
      }
    };
    initKeepAwake();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <AppNavigator />
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
} 