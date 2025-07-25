import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe } from '../models/Recipe';
import RNFS from 'react-native-fs';

type Listener = (recipes: Recipe[]) => void;

class RecipeStore {
  private recipes: Recipe[] = [];
  private listeners: Set<Listener> = new Set();

  async loadRecipes() {
    try {
      const data = await AsyncStorage.getItem('SavedRecipes');
      if (data) {
        // Parse and reconstruct Recipe objects
        const parsedData = JSON.parse(data);
        this.recipes = parsedData.map((item: any) => new Recipe(item));
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Failed to load recipes:', error);
    }
  }

  async saveRecipes() {
    try {
      await AsyncStorage.setItem('SavedRecipes', JSON.stringify(this.recipes));
    } catch (error) {
      console.error('Failed to save recipes:', error);
    }
  }

  async addRecipe(recipe: Recipe) {
    console.log('Adding recipe with tags:', recipe.tags);
    this.recipes.push(recipe);
    await this.saveRecipes();
    this.notifyListeners();
    return { success: true };
  }

  async deleteRecipe(recipeId: string) {
    const recipe = this.recipes.find(r => r.id === recipeId);
    if (!recipe) return;

    const imageUri = recipe.imageUri || '';
    if (imageUri && typeof imageUri === 'string' && RNFS.DocumentDirectoryPath && imageUri.includes(RNFS.DocumentDirectoryPath)) {
      try {
        if (await RNFS.exists(imageUri)) {
          await RNFS.unlink(imageUri);
        }
      } catch (error) {
        console.error('Error deleting recipe image:', error);
      }
    }

    this.recipes = this.recipes.filter(recipe => recipe.id !== recipeId);
    await this.saveRecipes();
    this.notifyListeners();
  }

  updateRecipe(updatedRecipe: Recipe) {
    const index = this.recipes.findIndex(recipe => recipe.id === updatedRecipe.id);
    if (index !== -1) {
      this.recipes[index] = updatedRecipe;
      this.saveRecipes();
      this.notifyListeners();
    }
  }

  addListener(listener: Listener) {
    this.listeners.add(listener);
  }

  removeListener(listener: Listener) {
    this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.recipes]));
  }

  getRecipeById(id: string) {
    return this.recipes.find(recipe => recipe.id === id);
  }

  getRecipeCount(): number {
    return this.recipes.length;
  }

  getAllRecipes(): Recipe[] {
    return [...this.recipes];
  }
}

export default new RecipeStore(); 