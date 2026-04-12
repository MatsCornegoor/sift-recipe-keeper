import RNFS from 'react-native-fs';
import { zip } from 'react-native-zip-archive';
import { Recipe } from '../models/Recipe';

export async function buildRecipeZip(recipes: Recipe[]): Promise<string> {
  const timestamp = Date.now();
  const tempDir = `${RNFS.TemporaryDirectoryPath}/sift-export-${timestamp}`;
  const tempImagesDir = `${tempDir}/images`;


  // Generate the export filename for the .sift archive.
  // For a single recipe, use a slugified version of the recipe name.
  // For multiple recipes, use a generic name with a timestamp.
  // Filename rules:
  // - Only lowercase letters, numbers, and hyphens allowed
  // - Max length of 40 characters (excluding extension)
  // - If truncation is needed, try to cut at a hyphen for better readability
  // NOTE: .sift files are standard ZIP archives and can be
  //       imported by both current and older versions of Sift (as .zip).
  const toSlug = (name: string, maxLen = 40): string => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-{2,}/g, '-');
    if (slug.length <= maxLen) return slug;
    const truncated = slug.substring(0, maxLen);
    const lastHyphen = truncated.lastIndexOf('-');
    return lastHyphen > 10 ? truncated.substring(0, lastHyphen) : truncated;
  };
  const zipFileName = recipes.length === 1
    ? `${toSlug(recipes[0].name)}.sift`
    : `sift-recipes-${timestamp}.sift`;

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

  const zipPath = `${RNFS.TemporaryDirectoryPath}/${zipFileName}`;

  await RNFS.writeFile(`${tempDir}/recipes.json`, JSON.stringify(exportData, null, 2));
  await zip(tempDir, zipPath);
  await RNFS.unlink(tempDir);

  return zipPath;
}