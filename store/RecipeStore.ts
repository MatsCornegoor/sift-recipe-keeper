import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe } from '../models/Recipe';
import RNFS from 'react-native-fs';
import { migrateRecipeToLatest } from '../models/RecipeMigrations';

type Listener = (recipes: Recipe[]) => void;

class RecipeStore {
  private recipes: Recipe[] = [];
  private listeners: Set<Listener> = new Set();

  async loadRecipes() {
    try {
      const data = await AsyncStorage.getItem('SavedRecipes');
      if (data) {
        const parsedData = JSON.parse(data);
        let didMigrate = false;

        const migrated = parsedData.map((item: any) => {
          const latest = migrateRecipeToLatest(item);
          // Construct Recipe class which normalizes aggregated fields
          const recipe = new Recipe(latest);
          if ((item?.schemaVersion ?? 1) !== (latest?.schemaVersion ?? 1)) {
            didMigrate = true;
          }
          return recipe;
        });

        this.recipes = migrated;
        this.notifyListeners();

        if (didMigrate) {
          // Persist migrated data
          await this.saveRecipes();
        }
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
    let resolvedImageUri = recipe.imageUri;
    if (resolvedImageUri) {
      const permanentDir = RNFS.DocumentDirectoryPath;
      const isLocal = resolvedImageUri.startsWith('file://') || resolvedImageUri.startsWith('/') || resolvedImageUri.startsWith('content://');

      if (isLocal && !resolvedImageUri.includes(permanentDir)) {
        try {
          resolvedImageUri = await this.copyImageToAppDirectory(resolvedImageUri);
        } catch (error) {
          console.error('Error copying image:', error);
          if (!resolvedImageUri.startsWith('file://') && !resolvedImageUri.startsWith('/')) {
            resolvedImageUri = null;
          }
        }
      }
    }
    const toStore = resolvedImageUri !== recipe.imageUri
      ? { ...recipe, imageUri: resolvedImageUri } as Recipe
      : recipe;
    this.recipes.push(toStore);
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

  async updateRecipe(updatedRecipe: Recipe) {
    const index = this.recipes.findIndex(recipe => recipe.id === updatedRecipe.id);
    if (index !== -1) {
      const oldRecipe = this.recipes[index];
      let resolvedImageUri = updatedRecipe.imageUri;

      if (resolvedImageUri && resolvedImageUri !== oldRecipe.imageUri) {
        const permanentDir = RNFS.DocumentDirectoryPath;
        const isLocal = resolvedImageUri.startsWith('file://') || resolvedImageUri.startsWith('/') || resolvedImageUri.startsWith('content://');

        if (isLocal && !resolvedImageUri.includes(permanentDir)) {
          try {
            resolvedImageUri = await this.copyImageToAppDirectory(resolvedImageUri);
          } catch (error) {
            console.error('Error copying image:', error);
            resolvedImageUri = oldRecipe.imageUri;
          }
        }

        if (resolvedImageUri !== oldRecipe.imageUri) {
          const oldUri = oldRecipe.imageUri || '';
          if (oldUri && oldUri.includes(permanentDir)) {
            const oldPath = oldUri.replace(/^file:\/\//, '');
            try {
              if (await RNFS.exists(oldPath)) {
                await RNFS.unlink(oldPath);
              }
            } catch (error) {
              console.error('Error deleting old image:', error);
            }
          }
        }
      }

      const toStore = resolvedImageUri !== updatedRecipe.imageUri
        ? { ...updatedRecipe, imageUri: resolvedImageUri } as Recipe
        : updatedRecipe;
      this.recipes[index] = toStore;
      await this.saveRecipes();
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
    const found = this.recipes.find(recipe => recipe.id === id);
    return found ? new Recipe(found) : undefined;
  }

  getRecipeCount(): number {
    return this.recipes.length;
  }

  getAllRecipes(): Recipe[] {
    return this.recipes.map(r => new Recipe(r));
  }
  
  private async copyImageToAppDirectory(uri: string): Promise<string> {
    const fileName = uri.split('/').pop() || 'image.jpg';
    const imageDir = `${RNFS.DocumentDirectoryPath}/recipe-images`;
    if (!(await RNFS.exists(imageDir))) {
      await RNFS.mkdir(imageDir);
    }
    const destPath = `${imageDir}/${Date.now()}-${fileName}`;
    const sourcePath = uri.replace(/^file:\/\//, '');

    await RNFS.copyFile(sourcePath, destPath);
    return `file://${destPath}`;
  }
}

export default new RecipeStore(); 