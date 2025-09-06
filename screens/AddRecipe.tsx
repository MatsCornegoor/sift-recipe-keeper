import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import RecipeForm from '../components/RecipeForm';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NestableScrollContainer } from 'react-native-draggable-flatlist';
import ContentWrapper from '../components/ContentWrapper';
import RecipeStore from '../store/RecipeStore';
import { Recipe } from '../models/Recipe';

export default function AddRecipe() {
  const router = useNavigation();

  const handleSave = async (recipe: Recipe) => {
    await RecipeStore.addRecipe(recipe);
    router.goBack();
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <Header title="Add recipe" />
        <NestableScrollContainer style={{ flex: 1 }}>
          <ContentWrapper>
            <RecipeForm mode="add" onSave={handleSave} />
          </ContentWrapper>
        </NestableScrollContainer>
      </View>
    </GestureHandlerRootView>
  );
} 