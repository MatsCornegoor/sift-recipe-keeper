import RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import { unzip } from 'react-native-zip-archive';
import { Recipe } from '../models/Recipe';
import { migrateRecipeToLatest } from '../models/RecipeMigrations';
import RecipeStore from '../store/RecipeStore';

export interface ParsedSiftImport {
  tempDir: string;
  tempZipPath: string | null;
  rawRecipes: any[];
}

export async function parseSiftFile(uri: string): Promise<ParsedSiftImport> {
  const tempDir = `${RNFS.TemporaryDirectoryPath}/sift-import/`;
  if (await RNFS.exists(tempDir)) {
    await RNFS.unlink(tempDir);
  }
  await RNFS.mkdir(tempDir);

  let zipPath = uri;
  let tempZipPath: string | null = null;

  if (Platform.OS === 'android' && zipPath.startsWith('content://')) {
    tempZipPath = `${RNFS.TemporaryDirectoryPath}/sift-import.zip`;
    await RNFS.copyFile(zipPath, tempZipPath);
    zipPath = tempZipPath;
  }

  await unzip(zipPath, tempDir);

  const recipesJson = await RNFS.readFile(`${tempDir}/recipes.json`);
  const rawRecipes = JSON.parse(recipesJson);

  return { tempDir, tempZipPath, rawRecipes };
}

export async function confirmSiftImport(parsed: ParsedSiftImport): Promise<Recipe[]> {
  const { tempDir, tempZipPath, rawRecipes } = parsed;
  const savedRecipes: Recipe[] = [];

  for (const recipeData of rawRecipes) {
    const migrated = migrateRecipeToLatest(recipeData);
    migrated.id = `${Date.now()}-${Math.random().toString(36).substring(2)}`;

    if (migrated.imageUri) {
      try {
        const timestamp = Date.now();
        const originalFileName = migrated.imageUri.split('/').pop();
        const imageDir = `${RNFS.DocumentDirectoryPath}/recipe-images/`;
        if (!(await RNFS.exists(imageDir))) {
          await RNFS.mkdir(imageDir);
        }
        const newImagePath = `file://${imageDir}${timestamp}-${originalFileName}`;
        await RNFS.copyFile(`${tempDir}/${migrated.imageUri}`, newImagePath);
        migrated.imageUri = newImagePath;
      } catch {
        migrated.imageUri = '';
      }
    }

    const recipe = new Recipe(migrated);
    await RecipeStore.addRecipe(recipe);
    savedRecipes.push(recipe);
  }

  await cleanupSiftImport(parsed);
  return savedRecipes;
}

export async function cleanupSiftImport(parsed: ParsedSiftImport): Promise<void> {
  const { tempDir, tempZipPath } = parsed;
  await RNFS.unlink(tempDir).catch(() => {});
  if (tempZipPath) {
    await RNFS.unlink(tempZipPath).catch(() => {});
  }
}

// Convenience wrapper used by ImportExport screen (document picker flow)
export async function importSiftFile(uri: string): Promise<Recipe[]> {
  const parsed = await parseSiftFile(uri);
  return confirmSiftImport(parsed);
}
