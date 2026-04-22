import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter, Linking, NativeModules } from 'react-native';

const { ShareIntent } = NativeModules;
import AppNavigator from './navigation/AppNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from './hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import KeepAwake from 'react-native-keep-awake';
import { navigationRef } from './navigation/navigationRef';
import {
  parseSiftFile,
  confirmSiftImport,
  cleanupSiftImport,
  ParsedSiftImport,
} from './utils/importSiftFile';
import CustomPopup from './components/CustomPopup';

function AppContent() {
  const { colors } = useTheme();
  const [pendingImport, setPendingImport] = useState<ParsedSiftImport | null>(null);

  useEffect(() => {
    const initKeepAwake = async () => {
      try {
        const value = await AsyncStorage.getItem('keepScreenAwake');
        if (value === null || value === 'true') {
          KeepAwake.activate();
        }
      } catch (error) {
        console.error('Error initializing screen awake setting:', error);
      }
    };
    initKeepAwake();

    const handleUrl = async (uri: string) => {
      if (!uri.startsWith('content://') && !uri.startsWith('file://')) return;
      try {
        const parsed = await parseSiftFile(uri);
        const navigateHome = () => {
          if (navigationRef.isReady()) {
            navigationRef.navigate('Recipes' as any);
            setPendingImport(parsed);
          } else {
            setTimeout(navigateHome, 100);
          }
        };
        navigateHome();
      } catch (e) {
        console.error('Failed to parse .sift file:', e);
      }
    };

    Linking.getInitialURL().then(url => {
      if (url) handleUrl(url);
    });

    const handleSharedUrl = (sharedUrl: string) => {
      const navigate = () => {
        if (navigationRef.isReady()) {
          navigationRef.navigate('AddRecipeUrl' as any, { initialUrl: sharedUrl });
        } else {
          setTimeout(navigate, 100);
        }
      };
      navigate();
    };

    ShareIntent?.getSharedUrl().then((sharedUrl: string | null) => {
      if (sharedUrl) handleSharedUrl(sharedUrl);
    });

    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    const shareSub = DeviceEventEmitter.addListener('ShareIntentUrl', handleSharedUrl);
    return () => {
      sub.remove();
      shareSub.remove();
    };
  }, []);

  const handleConfirm = async () => {
    if (!pendingImport) return;
    const parsed = pendingImport;
    setPendingImport(null);
    await confirmSiftImport(parsed);
  };

  const handleCancel = async () => {
    if (!pendingImport) return;
    const parsed = pendingImport;
    setPendingImport(null);
    await cleanupSiftImport(parsed);
  };

  const count = pendingImport?.rawRecipes.length ?? 0;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <AppNavigator />
      <CustomPopup
        visible={pendingImport !== null}
        title="Import recipes"
        message={`Do you want to import ${count} ${count === 1 ? 'recipe' : 'recipes'}?`}
        buttons={[
          { text: 'Cancel', onPress: handleCancel, style: 'cancel' },
          { text: 'Yes', onPress: handleConfirm },
        ]}
        onClose={handleCancel}
      />
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
