import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Header from '../components/Header';
import CustomPopup from '../components/CustomPopup';
import ContentWrapper from '../components/ContentWrapper';
import RecipeStore from '../store/RecipeStore';
import RecipeExtractorService from '../services/RecipeExtractorService';
import { useTheme } from '../hooks/useTheme';

const PLACEHOLDER_SUGGESTIONS = [
  'Make this recipe vegan',
  'Convert all measurements to metric',
  'Upscale this recipe for 8 people',
  'Make this recipe gluten-free',
  'Simplify the instructions for beginners',
  'Add a spicy twist to this recipe',
  'Cut the cooking time in half',
  'Make this recipe dairy-free',
];

export default function EditWithAI() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params;
  const { colors } = useTheme();

  const recipe = RecipeStore.getRecipeById(Array.isArray(id) ? id[0] : id);

  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const styles = useMemo(() => stylesFactory(colors), [colors]);

  useEffect(() => {
    if (!recipe) {
      navigation.goBack();
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDER_SUGGESTIONS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleApply = async () => {
    if (!prompt.trim() || !recipe) return;

    setIsLoading(true);
    try {
      const modified = await RecipeExtractorService.modifyRecipe(recipe, prompt.trim());
      // Pass as plain object to avoid class serialization issues in navigation
      navigation.navigate('EditRecipe', {
        id: recipe.id,
        aiModifiedRecipe: JSON.parse(JSON.stringify(modified)),
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
      setShowPopup(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (!recipe) return null;

  return (
    <View style={styles.container}>
      <Header title="Edit with AI" />
      <ContentWrapper>
        <View style={styles.content}>
          <Text style={styles.description}>
            Describe how you'd like to modify "{recipe.name}" and AI will apply the changes for you to review.
          </Text>
          <TextInput
            style={styles.input}
            value={prompt}
            onChangeText={setPrompt}
            placeholder={PLACEHOLDER_SUGGESTIONS[placeholderIndex]}
            placeholderTextColor={colors.placeholderText}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.button, (!prompt.trim() || isLoading) && styles.buttonDisabled]}
            onPress={handleApply}
            disabled={!prompt.trim() || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <Text style={styles.buttonText}>Editing recipe...</Text>
            ) : (
              <Text style={styles.buttonText}>Apply changes</Text>
            )}
          </TouchableOpacity>
          {isLoading && (
            <Text style={styles.loadingHint}>This may take a moment...</Text>
          )}
        </View>
      </ContentWrapper>
      <CustomPopup
        visible={showPopup}
        title="Something went wrong"
        message={errorMessage}
        buttons={[{ text: 'OK', onPress: () => setShowPopup(false) }]}
        onClose={() => setShowPopup(false)}
      />
    </View>
  );
}

const stylesFactory = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingTop: 24,
  },
  description: {
    fontSize: 16,
    color: colors.text,
    opacity: 0.7,
    marginBottom: 20,
    lineHeight: 22,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.tint,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingHint: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
    color: colors.text,
    opacity: 0.5,
  },
});
