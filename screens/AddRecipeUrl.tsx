import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import NetInfo from '@react-native-community/netinfo';
import RecipeExtractorService from '../services/RecipeExtractorService';
import RecipeStore from '../store/RecipeStore';
import { useTheme } from '../hooks/useTheme';
import { useLoadingDots } from '../hooks/useLoadingDots';
import Header from '../components/Header';
import CustomPopup from '../components/CustomPopup';
import ContentWrapper from '../components/ContentWrapper';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import InstagramExtractor from '../components/instagramExtractor';
import { Recipe } from '../models/Recipe';

const isInstagramUrl = (url: string) => /instagram\.com\/(p|reel|tv)\//.test(url);

// This helper function checks for a live internet connection in a privacy-friendly way.
const checkInternetConnection = async () => {
  const state = await NetInfo.fetch();
  return state.isConnected;
};

export default function AddRecipeUrl() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'AddRecipeUrl'>>();
  const [url, setUrl] = useState(route.params?.initialUrl ?? '');
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();
  const [showPopup, setShowPopup] = useState(false);
  const [showInstagramExtractor, setShowInstagramExtractor] = useState(false);
  const dots = useLoadingDots(loading);
  const [popupConfig, setPopupConfig] = useState<{
    title: string;
    message: string;
    buttons: Array<{ text: string; onPress: () => void; style?: 'default' | 'cancel' }>;
  }>({
    title: '',
    message: '',
    buttons: [],
  });

  const styles = useMemo(() => stylesFactory(colors), [colors]);

  const showError = useCallback((message: string) => {
    setPopupConfig({
      title: 'Could not import recipe',
      message,
      buttons: [{ text: 'OK', onPress: () => setShowPopup(false) }],
    });
    setShowPopup(true);
  }, []);

  const handleInstagramSuccess = useCallback(async (recipe: Recipe) => {
    recipe.sourceUrl = url.trim();
    await RecipeStore.addRecipe(recipe);
    setShowInstagramExtractor(false);
    setLoading(false);
    navigation.goBack();
  }, [url, navigation]);

  const handleInstagramError = useCallback((error: Error) => {
    setShowInstagramExtractor(false);
    setLoading(false);
    showError(error.message);
  }, [showError]);

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

    if (isInstagramUrl(url)) {
      setShowInstagramExtractor(true);
      return;
    }

    try {
      const recipe = await RecipeExtractorService.extractRecipeFromUrl(url);
      recipe.sourceUrl = url.trim();
      await RecipeStore.addRecipe(recipe);
      navigation.goBack();
    } catch (error) {
      console.error('Failed to extract recipe from URL:', error);
      showError(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.flexView}>
      <Header title="Add recipe" />
      <ScrollView 
        style={styles.flexView}
        contentContainerStyle={styles.flexGrow}
      >
        <ContentWrapper>
          <View style={styles.container}>
            <Input
              placeholder="www.cookingwebsite.com/recipe"
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />

            <Button onPress={handleExtractRecipe} disabled={loading}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <Text style={[styles.buttonText, { color: colors.background }]}>Adding</Text>
                  <Text style={[styles.buttonText, styles.dotsContainer, { color: colors.background }]}>{dots}</Text>
                </View>
              ) : (
                <Text style={[styles.buttonText, { color: colors.background }]}>Add Recipe</Text>
              )}
            </Button>
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
      {showInstagramExtractor && (
        <InstagramExtractor
          url={url}
          onSuccess={handleInstagramSuccess}
          onError={handleInstagramError}
        />
      )}
    </View>
  );
}

const stylesFactory = (colors: any) => StyleSheet.create({
  flexView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flexGrow: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'transparent',
  },
  input: {
    height: 48,
    marginBottom: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
  },
  dotsContainer: {
    width: 24,
  },
});
 