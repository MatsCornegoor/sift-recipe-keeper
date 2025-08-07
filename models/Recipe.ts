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
  schemaVersion?: number; // versioning for future migrations
  steps?: RecipeStep[]; // optional step-based structure for complex recipes
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

  constructor({
    id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name = '',
    imageUri = '',
    ingredients = [],
    instructions = [],
    sourceUrl,
    cookingTime,
    calories,
    tags = [],
    userId,
    schemaVersion,
    steps = [],
  }: Partial<Recipe> = {}) {
    this.id = id;
    this.name = name;
    this.imageUri = imageUri;

    // Normalize steps and infer version
    const normalizedSteps = (steps || []).map((s) => new RecipeStep({
      title: s.title,
      ingredients: (s.ingredients || []).map((ing) => ({ id: ing.id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, name: ing.name })),
      instructions: s.instructions || [],
    }));

    this.steps = normalizedSteps;

    // If steps exist, ensure top-level fields are aggregated for compatibility
    if (normalizedSteps.length > 0) {
      const aggregatedIngredients: Ingredient[] = [];
      normalizedSteps.forEach((step) => {
        step.ingredients.forEach((ing) => {
          aggregatedIngredients.push({ id: ing.id, name: ing.name });
        });
      });

      const aggregatedInstructions: string[] = [];
      normalizedSteps.forEach((step) => {
        // keep instructions in order; do not prefix to keep compatibility
        step.instructions.forEach((inst) => aggregatedInstructions.push(inst));
      });

      this.ingredients = aggregatedIngredients.length > 0 ? aggregatedIngredients : ingredients;
      this.instructions = aggregatedInstructions.length > 0 ? aggregatedInstructions : instructions;
    } else {
      // Legacy/simple recipe
      this.ingredients = ingredients;
      this.instructions = instructions;
    }

    this.sourceUrl = sourceUrl;
    this.cookingTime = cookingTime;
    this.calories = calories;
    this.tags = tags;
    this.userId = userId;

    // Infer schemaVersion: 2 if steps exist, otherwise 1 by default when missing
    this.schemaVersion = typeof schemaVersion === 'number' ? schemaVersion : (this.steps && this.steps.length > 0 ? 2 : 1);
  }
} 