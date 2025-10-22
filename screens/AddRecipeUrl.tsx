import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import RecipeExtractorService from '../services/RecipeExtractorService';
import RecipeStore from '../store/RecipeStore';
import { useTheme } from '../hooks/useTheme';
import Header from '../components/Header';
import CustomPopup from '../components/CustomPopup';
import ContentWrapper from '../components/ContentWrapper';

// This helper function checks for a live internet connection in a privacy-friendly way.
const checkInternetConnection = async () => {
  if (Platform.OS === 'web') {
    // For web, use a standard CORS-friendly endpoint.
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      await fetch('https://httpbin.org/status/200', { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      console.log('Web connectivity check failed:', error);
      return false;
    }
  }

  // For native, try multiple privacy-focused DNS providers for resilience.
  const endpoints = [
    'https://1.1.1.1', // Cloudflare (privacy-focused)
    'https://9.9.9.9', // Quad9 (privacy-focused)
  ];

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      // Use a shorter timeout per endpoint
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      await fetch(endpoint, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeoutId);
      return true; // Success, we have a connection.
    } catch (error) {
      console.log(`Connectivity check failed for ${endpoint}:`, error);
      // This endpoint failed, but the loop will allow us to try the next one.
    }
  }

  return false; // All endpoints failed.
};

export default function AddRecipeUrl() {
  const navigation = useNavigation();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();
  const [showPopup, setShowPopup] = useState(false);
  const [dots, setDots] = useState('');
  const [popupConfig, setPopupConfig] = useState<{
    title: string;
    message: string;
    buttons: Array<{ text: string; onPress: () => void; style?: 'default' | 'cancel' }>;
  }>({
    title: '',
    message: '',
    buttons: [],
  });
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setDots(prev => {
          if (prev === '') return '.';
          if (prev === '.') return '..';
          if (prev === '..') return '...';
          return '';
        });
      }, 400); // Change dots every 400ms
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
      setDots('');
    };
  }, [loading]);

  const handleExtractRecipe = async () => {
    if (!url.trim()) {
      setPopupConfig({
        title: 'Missing Information',
        message: 'Please enter a URL',
        buttons: [{ text: 'OK', onPress: () => setShowPopup(false) }],
      });
      setShowPopup(true);
      return;
    }

    // Check internet connectivity
    const isConnected = await checkInternetConnection();
    if (!isConnected) {
      setPopupConfig({
        title: 'No Internet Connection',
        message: 'You are not connected to the internet',
        buttons: [{ text: 'OK', onPress: () => setShowPopup(false) }],
      });
      setShowPopup(true);
      return;
    }

    setLoading(true);
    try {
      const recipe = await RecipeExtractorService.extractRecipe(url);
      recipe.sourceUrl = url.trim();
      await RecipeStore.addRecipe(recipe);
      navigation.goBack();
    } catch (error) {
      console.error('Failed to extract recipe from URL:', error);
      setPopupConfig({
        title: 'Error',
        message: 'Failed to extract recipe. Please try again.',
        buttons: [{ text: 'OK', onPress: () => setShowPopup(false) }],
      });
      setShowPopup(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Add recipe" />
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <ContentWrapper>
          <View style={styles.container}>
                        <TextInput
               style={[styles.input, {
                 borderColor: colors.inputBorder,
                 color: colors.text,
               }]}
               placeholder="www.cookingwebite.com/recipe"
               placeholderTextColor={colors.deleteButton}
               value={url}
               onChangeText={setUrl}
               autoCapitalize="none"
               autoCorrect={false}
             />

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.tint }]}
              onPress={handleExtractRecipe}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <Text style={[styles.buttonText, { color: colors.background }]}>
                    Adding
                  </Text>
                  <Text style={[styles.buttonText, styles.dotsContainer, { color: colors.background }]}>
                    {dots}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.buttonText, { color: colors.background }]}>
                  Add Recipe
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ContentWrapper>
      </ScrollView>
      <CustomPopup
        visible={showPopup}
        title={popupConfig.title}
        message={popupConfig.message}
        buttons={popupConfig.buttons}
        onClose={() => setShowPopup(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'transparent',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    height: 48,
    textAlignVertical: 'center',
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
  },
  dotsContainer: {
    width: 24, // Fixed width for 3 dots
  },
  instructionsTitle: {
    fontSize: 14,
    marginTop: 10,
    marginBottom: 8,
    opacity: 0.7,
  },
  instructionsInput: {
    borderBottomWidth: 1,
    borderWidth: 0,
    borderRadius: 0,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
}); 