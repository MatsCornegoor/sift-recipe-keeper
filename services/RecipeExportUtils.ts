import RNFS from 'react-native-fs';
import { zip } from 'react-native-zip-archive';
import { Recipe } from '../models/Recipe';

export async function buildRecipeZip(recipes: Recipe[]): Promise<string> {
  const timestamp = Date.now();
  const tempDir = `${RNFS.TemporaryDirectoryPath}/sift-export-${timestamp}`;
  const tempImagesDir = `${tempDir}/images`;
const zipFileName = recipes.length === 1 
    ? `sift-recipe-${recipes[0].name.replace(/\s+/g, '-')}-${timestamp}.zip`
    : `sift-recipes-${timestamp}.zip`;
  const zipPath = `${RNFS.TemporaryDirectoryPath}/${zipFileName}`;

  await RNFS.mkdir(tempDir);
  await RNFS.mkdir(tempImagesDir);

  const exportData = await Promise.all(recipes.map(async (recipe) => {
    const recipeData: any = { ...recipe };

    if (recipe.imageUri && await RNFS.exists(recipe.imageUri)) {
      const fileName = recipe.imageUri.split('/').pop() || '';
      try {
        await RNFS.copyFile(recipe.imageUri, `${tempImagesDir}/${fileName}`);
        recipeData.imageUri = `images/${fileName}`;
      } catch {
        recipeData.imageUri = '';
      }
    } else {
      recipeData.imageUri = '';
    }

    return recipeData;
  }));

  await RNFS.writeFile(`${tempDir}/recipes.json`, JSON.stringify(exportData, null, 2));
  await zip(tempDir, zipPath);
  await RNFS.unlink(tempDir);

  return zipPath;
}