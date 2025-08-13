export const CURRENT_SCHEMA_VERSION = 2 as const;

import { Ingredient, Recipe, RecipeStep, IngredientGroup, InstructionGroup } from './Recipe';

export type AnyStoredRecipe = Partial<Recipe> & Record<string, any>;

function ensureIngredientObject(ing: any): Ingredient {
  if (ing && typeof ing === 'object' && typeof ing.name === 'string') {
    return { id: ing.id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, name: ing.name };
  }
  // fallback: treat as string
  const name = typeof ing === 'string' ? ing : String(ing ?? '');
  return { id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, name };
}

function normalizeListOfStrings(input: any): string[] {
  if (Array.isArray(input)) return input.filter(Boolean).map(String);
  if (typeof input === 'string') return [input];
  return [];
}

function migrateV1ToV2(v1: AnyStoredRecipe): AnyStoredRecipe {
  const name = typeof v1.name === 'string' ? v1.name : '';
  const ingredientsRaw = Array.isArray(v1.ingredients) ? v1.ingredients : [];
  const instructionsRaw = normalizeListOfStrings(v1.instructions);

  const ingredientsGroups = [
    new IngredientGroup({ title: undefined, items: ingredientsRaw.map(ensureIngredientObject) })
  ];
  const instructionGroups = [
    new InstructionGroup({ title: undefined, items: instructionsRaw })
  ];

  return {
    ...v1,
    name,
    ingredientsGroups,
    instructionGroups,
    schemaVersion: 2,
  } as AnyStoredRecipe;
}

type Migrator = (r: AnyStoredRecipe) => AnyStoredRecipe;

const migrations: Record<number, Migrator> = {
  // 1 -> 2
  1: migrateV1ToV2,
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

  // Final normalization for latest schema (groups)
  if (!Array.isArray(out.ingredientsGroups)) {
    if (Array.isArray(out.steps) && out.steps.length > 0) {
      // Convert steps to groups
      out.ingredientsGroups = (out.steps as any[]).map((s: any) => new IngredientGroup({
        title: typeof s.title === 'string' ? s.title : undefined,
        items: (Array.isArray(s.ingredients) ? s.ingredients : []).map(ensureIngredientObject)
      }));
    } else if (Array.isArray(out.ingredients)) {
      out.ingredientsGroups = [new IngredientGroup({ items: out.ingredients.map(ensureIngredientObject) })];
    } else {
      out.ingredientsGroups = [];
    }
  }
  if (!Array.isArray(out.instructionGroups)) {
    if (Array.isArray(out.steps) && out.steps.length > 0) {
      out.instructionGroups = (out.steps as any[]).map((s: any) => new InstructionGroup({
        title: typeof s.title === 'string' ? s.title : undefined,
        items: normalizeListOfStrings(s.instructions)
      }));
    } else if (Array.isArray(out.instructions) || typeof out.instructions === 'string') {
      out.instructionGroups = [new InstructionGroup({ items: normalizeListOfStrings(out.instructions) })];
    } else {
      out.instructionGroups = [];
    }
  }

  out.schemaVersion = CURRENT_SCHEMA_VERSION;
  return out;
} 