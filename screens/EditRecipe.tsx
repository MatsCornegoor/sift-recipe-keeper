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

export default function EditRecipe() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params;
  const originalRecipe = RecipeStore.getRecipeById(Array.isArray(id) ? id[0] : id);

  if (!originalRecipe) {
    navigation.goBack();
    return null;
  }

  const handleSave = async (updated: Recipe) => {
    await RecipeStore.updateRecipe(updated);
    navigation.goBack();
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <Header title="Edit recipe" />
        <NestableScrollContainer style={{ flex: 1 }}>
          <ContentWrapper>
            <RecipeForm mode="edit" initialRecipe={originalRecipe} onSave={handleSave} />
          </ContentWrapper>
        </NestableScrollContainer>
      </View>
    </GestureHandlerRootView>
  );
} 