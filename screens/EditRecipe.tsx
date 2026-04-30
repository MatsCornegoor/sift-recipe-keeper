import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Header from '../components/Header';
import RecipeForm, { RecipeFormHandle } from '../components/RecipeForm';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NestableScrollContainer } from 'react-native-draggable-flatlist';
import ContentWrapper from '../components/ContentWrapper';
import CustomPopup from '../components/CustomPopup';
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

  const formRef = useRef<RecipeFormHandle>(null);
  const dirtyRef = useRef(false);
  const pendingActionRef = useRef<any>(null);
  const [showUnsavedPopup, setShowUnsavedPopup] = useState(false);

  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', (e: any) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      pendingActionRef.current = e.data.action;
      setShowUnsavedPopup(true);
    });
    return sub;
  }, [navigation]);

  if (!originalRecipe) {
    navigation.goBack();
    return null;
  }

  const handleSave = async (updated: Recipe) => {
    dirtyRef.current = false;
    await RecipeStore.updateRecipe(updated);
    navigation.navigate('RecipeDetail', { id: updated.id });
  };

  const handleCancel = () => {
    dirtyRef.current = false;
    navigation.navigate('RecipeDetail', { id: originalRecipe.id });
  };

  const handleConfirmSave = () => {
    setShowUnsavedPopup(false);
    pendingActionRef.current = null;
    formRef.current?.submit();
  };

  const handleDiscard = () => {
    setShowUnsavedPopup(false);
    dirtyRef.current = false;
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (action) {
      navigation.dispatch(action);
    } else {
      navigation.goBack();
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Edit recipe" />
        <NestableScrollContainer style={{ flex: 1, backgroundColor: colors.background }}>
          <ContentWrapper>
            <RecipeForm
              ref={formRef}
              mode="edit"
              initialRecipe={originalRecipe}
              onSave={handleSave}
              onCancel={handleCancel}
              onDirtyChange={(d) => { dirtyRef.current = d; }}
            />
          </ContentWrapper>
        </NestableScrollContainer>
        <CustomPopup
          visible={showUnsavedPopup}
          title="Unsaved changes"
          message="Do you want to save the current changes?"
          buttons={[
            { text: 'No', onPress: handleDiscard, style: 'cancel' },
            { text: 'Yes', onPress: handleConfirmSave },
          ]}
          onClose={handleDiscard}
        />
      </View>
    </GestureHandlerRootView>
  );
}
