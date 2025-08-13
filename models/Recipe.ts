export interface Ingredient {
  id: string;
  name: string;
}

export class Ingredient {
  id: string;
  name: string;

  constructor(name: string) {
    this.id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.name = name;
  }
}

export interface RecipeStep {
  id: string;
  title?: string;
  ingredients: Ingredient[];
  instructions: string[];
}

export class RecipeStep {
  id: string;
  title?: string;
  ingredients: Ingredient[];
  instructions: string[];

  constructor({ title, ingredients = [], instructions = [] }: Partial<RecipeStep> = {}) {
    this.id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.title = title;
    this.ingredients = ingredients;
    this.instructions = instructions;
  }
}

export interface IngredientGroup {
  id: string;
  title?: string;
  items: Ingredient[];
}

export interface InstructionGroup {
  id: string;
  title?: string;
  items: string[];
}

export class IngredientGroup {
  id: string;
  title?: string;
  items: Ingredient[];

  constructor({ title, items = [] }: Partial<IngredientGroup> = {}) {
    this.id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.title = title;
    this.items = items.map(i => ({ id: i.id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, name: i.name }));
  }
}

export class InstructionGroup {
  id: string;
  title?: string;
  items: string[];

  constructor({ title, items = [] }: Partial<InstructionGroup> = {}) {
    this.id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.title = title;
    this.items = items;
  }
}

import { CURRENT_SCHEMA_VERSION } from './RecipeMigrations';

export interface Recipe {
  id: string;
  name: string;
  imageUri: string | null;
  ingredients: Ingredient[];
  instructions: string[];
  sourceUrl?: string;
  cookingTime?: string;
  calories?: string;
  tags: string[];
  userId?: string;
  schemaVersion?: number; // persisted schema version
  // Steps are retained for backward-compatibility in type shape only; constructor no longer derives from them
  steps?: RecipeStep[];
  ingredientsGroups?: IngredientGroup[];
  instructionGroups?: InstructionGroup[];
}

export class Recipe {
  id: string;
  name: string;
  imageUri: string | null;
  ingredients: Ingredient[];
  instructions: string[];
  sourceUrl?: string;
  cookingTime?: string;
  calories?: string;
  tags: string[];
  userId?: string;
  schemaVersion?: number;
  steps?: RecipeStep[];
  ingredientsGroups?: IngredientGroup[];
  instructionGroups?: InstructionGroup[];

  constructor({
    id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name = '',
    imageUri = null,
    ingredients = [],
    instructions = [],
    sourceUrl,
    cookingTime,
    calories,
    tags = [],
    userId,
    schemaVersion,
    steps, // accepted but not used to derive fields
    ingredientsGroups = [],
    instructionGroups = [],
  }: Partial<Recipe> = {}) {
    this.id = id;
    this.name = name;
    this.imageUri = imageUri;

    // Normalize groups only (canonical v2 shape)
    const normalizedIngredientGroups: IngredientGroup[] = (ingredientsGroups || []).map(g => new IngredientGroup(g));
    const normalizedInstructionGroups: InstructionGroup[] = (instructionGroups || []).map(g => new InstructionGroup(g));

    this.ingredientsGroups = normalizedIngredientGroups;
    this.instructionGroups = normalizedInstructionGroups;

    // Aggregate top-level ingredients/instructions from groups only
    const aggregatedIngredients: Ingredient[] = [];
    normalizedIngredientGroups.forEach(group => {
      group.items.forEach(ing => aggregatedIngredients.push({ id: ing.id, name: ing.name }));
    });

    const aggregatedInstructions: string[] = [];
    normalizedInstructionGroups.forEach(group => {
      group.items.forEach(inst => aggregatedInstructions.push(inst));
    });

    this.ingredients = aggregatedIngredients.length > 0 ? aggregatedIngredients : ingredients;
    this.instructions = aggregatedInstructions.length > 0 ? aggregatedInstructions : instructions;

    // Accept but do not derive from steps; preserve if provided
    if (Array.isArray(steps) && steps.length > 0) {
      this.steps = steps.map(s => new RecipeStep(s));
    }

    this.sourceUrl = sourceUrl;
    this.cookingTime = cookingTime;
    this.calories = calories;
    this.tags = tags;
    this.userId = userId;

    // Use provided schemaVersion or default to current
    this.schemaVersion = typeof schemaVersion === 'number' ? schemaVersion : CURRENT_SCHEMA_VERSION;
  }
} 