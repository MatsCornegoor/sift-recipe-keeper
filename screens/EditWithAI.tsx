import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Header from '../components/Header';
import CustomPopup from '../components/CustomPopup';
import ContentWrapper from '../components/ContentWrapper';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
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
  const [dots, setDots] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const styles = stylesFactory();

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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setDots(prev => {
          if (prev === '') return '.';
          if (prev === '.') return '..';
          if (prev === '..') return '...';
          return '';
        });
      }, 400);
    }
    return () => {
      if (interval) clearInterval(interval);
      setDots('');
    };
  }, [isLoading]);

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Edit with AI" />
      <ContentWrapper>
        <View style={styles.content}>
          <Text style={[styles.description, { color: colors.text }]}>
            Describe how you'd like to modify "{recipe.name}" and AI will apply the changes for you to review.
          </Text>
          <Input
            value={prompt}
            onChangeText={setPrompt}
            placeholder={PLACEHOLDER_SUGGESTIONS[placeholderIndex]}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!isLoading}
            style={styles.input}
          />
          <Button
            onPress={handleApply}
            disabled={!prompt.trim() || isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={[styles.buttonText, { color: colors.background }]}>Editing recipe</Text>
                <Text style={[styles.buttonText, styles.dotsContainer, { color: colors.background }]}>{dots}</Text>
              </View>
            ) : (
              <Text style={[styles.buttonText, { color: colors.background }]}>Apply changes</Text>
            )}
          </Button>
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

const stylesFactory = () => StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 24,
  },
  description: {
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 20,
    lineHeight: 22,
  },
  input: {
    minHeight: 120,
    padding: 16,
    marginBottom: 16,
    textAlignVertical: 'top',
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
