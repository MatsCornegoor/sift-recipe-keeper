import React, { useMemo } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { navigationRef } from './navigationRef';

import AddRecipe from '../screens/AddRecipe';
import AddRecipeUrl from '../screens/AddRecipeUrl';
import AddRecipeText from '../screens/AddRecipeText';
import AddRecipePicture from '../screens/AddRecipePicture';
import EditRecipe from '../screens/EditRecipe';
import EditWithAI from '../screens/EditWithAI';
import RecipeDetail from '../screens/RecipeDetail';
import ImportExport from '../screens/settings/ImportExport';
import ExportRecipes from '../screens/settings/ExportRecipes';
import About from '../screens/settings/About';
import Appearance from '../screens/settings/Appearance';
import AiModel from '../screens/settings/AiModel';
import Settings from '../screens/settings/Settings';
import RecipeList from '../screens/RecipeList';
import { useTheme } from '../hooks/useTheme';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { colors, isDarkMode } = useTheme();

  const navTheme = useMemo(() => {
    const base = isDarkMode ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.background,
        text: colors.text,
        border: colors.inputBorder,
      },
    };
  }, [isDarkMode, colors]);

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="Recipes" component={RecipeList} />
        <Stack.Screen name="Settings" component={Settings} />
        <Stack.Screen name="AddRecipe" component={AddRecipe} />
        <Stack.Screen name="AddRecipeUrl" component={AddRecipeUrl} />
        <Stack.Screen name="AddRecipeText" component={AddRecipeText} />
        <Stack.Screen name="AddRecipePicture" component={AddRecipePicture} />
        <Stack.Screen name="EditRecipe" component={EditRecipe} />
        <Stack.Screen name="EditWithAI" component={EditWithAI} />
        <Stack.Screen name="RecipeDetail" component={RecipeDetail} />
        <Stack.Screen name="About" component={About} />
        <Stack.Screen name="Appearance" component={Appearance} />
        <Stack.Screen name="AiModel" component={AiModel} />
        <Stack.Screen name="ImportExport" component={ImportExport} />
        <Stack.Screen name="ExportRecipes" component={ExportRecipes} />
      </Stack.Navigator>
    </NavigationContainer>
  );
} 