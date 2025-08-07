export const CURRENT_SCHEMA_VERSION = 2 as const;

import { Ingredient, Recipe, RecipeStep } from './Recipe';

export type AnyStoredRecipe = Partial<Recipe> & Record<string, any>;

function ensureIngredientObject(ing: any): Ingredient {
  if (ing && typeof ing === 'object' && typeof ing.name === 'string') {
    return { id: ing.id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, name: ing.name };
  }
  // fallback: treat as string
  const name = typeof ing === 'string' ? ing : String(ing ?? '');
  return { id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, name };
}

function normalizeStep(stepLike: any): RecipeStep {
  const title = typeof stepLike?.title === 'string' ? stepLike.title : undefined;
  const ingredientsRaw = Array.isArray(stepLike?.ingredients) ? stepLike.ingredients : [];
  const instructionsRaw = Array.isArray(stepLike?.instructions)
    ? stepLike.instructions
    : typeof stepLike?.instructions === 'string'
      ? [stepLike.instructions]
      : [];

  return new RecipeStep({
    title,
    ingredients: ingredientsRaw.map(ensureIngredientObject),
    instructions: instructionsRaw.map((s: any) => (typeof s === 'string' ? s : String(s ?? ''))).filter(Boolean),
  });
}

function migrateV1ToV2(v1: AnyStoredRecipe): AnyStoredRecipe {
  const name = typeof v1.name === 'string' ? v1.name : '';
  const ingredientsRaw = Array.isArray(v1.ingredients) ? v1.ingredients : [];
  const instructionsRaw = Array.isArray(v1.instructions)
    ? v1.instructions
    : typeof v1.instructions === 'string'
      ? [v1.instructions]
      : [];

  const step: RecipeStep = new RecipeStep({
    title: undefined,
    ingredients: ingredientsRaw.map(ensureIngredientObject),
    instructions: instructionsRaw.map((s: any) => (typeof s === 'string' ? s : String(s ?? ''))).filter(Boolean),
  });

  return {
    ...v1,
    name,
    steps: [step],
    schemaVersion: 2,
  } as AnyStoredRecipe;
}

type Migrator = (r: AnyStoredRecipe) => AnyStoredRecipe;

const migrations: Record<number, Migrator> = {
  // 1 -> 2
  1: migrateV1ToV2,
  // Add future migrations here: 2: migrateV2ToV3, etc.
};

export function migrateRecipeToLatest(input: AnyStoredRecipe): AnyStoredRecipe {
  let version = typeof input.schemaVersion === 'number' ? input.schemaVersion : 1;
  let out: AnyStoredRecipe = { ...input, schemaVersion: version };

  while (version < CURRENT_SCHEMA_VERSION) {
    const migrator = migrations[version];
    if (!migrator) break;
    out = migrator(out);
    version += 1;
    out.schemaVersion = version;
  }

  // Final normalization for latest schema
  if (Array.isArray(out.steps)) {
    out = { ...out, steps: out.steps.map(normalizeStep), schemaVersion: CURRENT_SCHEMA_VERSION };
  } else {
    out = { ...out, schemaVersion: CURRENT_SCHEMA_VERSION };
  }

  return out;
} 