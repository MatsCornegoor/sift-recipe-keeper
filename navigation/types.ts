import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Main: undefined;
  AddRecipe: undefined;
  AddRecipeUrl: undefined;
  EditRecipe: { recipeId: string };
  RecipeDetail: { recipeId: string };
  About: undefined;
  Appearance: undefined;
  ImportExport: undefined;
  Settings: undefined;
  Recipes: undefined;
};

export type AppNavigationProp = NativeStackNavigationProp<RootStackParamList>; 