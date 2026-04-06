import React from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Header from '../components/Header';
import RecipeForm from '../components/RecipeForm';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NestableScrollContainer } from 'react-native-draggable-flatlist';
import ContentWrapper from '../components/ContentWrapper';
import RecipeStore from '../store/RecipeStore';
import { Recipe } from '../models/Recipe';
import { useTheme } from '../hooks/useTheme';

export default function EditRecipe() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const { id, aiModifiedRecipe } = route.params;
  const storedRecipe = RecipeStore.getRecipeById(Array.isArray(id) ? id[0] : id);
  const originalRecipe = aiModifiedRecipe ? new Recipe(aiModifiedRecipe) : storedRecipe;

  if (!originalRecipe) {
    navigation.goBack();
    return null;
  }

  const handleSave = async (updated: Recipe) => {
    await RecipeStore.updateRecipe(updated);
    navigation.navigate('RecipeDetail', { id: updated.id });
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Edit recipe" />
        <NestableScrollContainer style={{ flex: 1, backgroundColor: colors.background }}>
          <ContentWrapper>
            <RecipeForm mode="edit" initialRecipe={originalRecipe} onSave={handleSave} onCancel={() => navigation.navigate('RecipeDetail', { id: originalRecipe.id })} />
          </ContentWrapper>
        </NestableScrollContainer>
      </View>
    </GestureHandlerRootView>
  );
} 