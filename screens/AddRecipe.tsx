import React, { useRef } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import RecipeForm, { RecipeFormHandle } from '../components/RecipeForm';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NestableScrollContainer } from 'react-native-draggable-flatlist';
import ContentWrapper from '../components/ContentWrapper';
import RecipeStore from '../store/RecipeStore';
import { Recipe } from '../models/Recipe';
import { useTheme } from '../hooks/useTheme';

export default function AddRecipe() {
  const router = useNavigation();
  const { colors } = useTheme();
  const formRef = useRef<RecipeFormHandle>(null);

  const handleSave = async (recipe: Recipe) => {
    await RecipeStore.addRecipe(recipe);
    router.goBack();
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <Header
          title="Add recipe"
          rightElement={
            <Pressable
              onPress={() => formRef.current?.submit()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={[styles.saveText, { color: colors.tint }]}>Save</Text>
            </Pressable>
          }
        />
        <NestableScrollContainer style={{ flex: 1 }}>
          <ContentWrapper>
            <RecipeForm ref={formRef} mode="add" onSave={handleSave} hideSubmitButton />
          </ContentWrapper>
        </NestableScrollContainer>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  saveText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
