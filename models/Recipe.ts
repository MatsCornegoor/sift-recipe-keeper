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
  steps?: RecipeStep[]; // optional step-based structure for complex recipes (v2)
  ingredientsGroups?: IngredientGroup[]; // v3 grouped ingredients
  instructionGroups?: InstructionGroup[]; // v3 grouped instructions
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
    ingredientsGroups = [],
    instructionGroups = [],
  }: Partial<Recipe> = {}) {
    this.id = id;
    this.name = name;
    this.imageUri = imageUri;

    // Prefer v3 groups over steps; if groups empty and steps provided, derive groups from steps for compatibility
    let normalizedIngredientGroups: IngredientGroup[] = (ingredientsGroups || []).map(g => new IngredientGroup(g));
    let normalizedInstructionGroups: InstructionGroup[] = (instructionGroups || []).map(g => new InstructionGroup(g));

    if ((normalizedIngredientGroups.length === 0 && normalizedInstructionGroups.length === 0) && (steps && steps.length > 0)) {
      normalizedIngredientGroups = steps.map(s => new IngredientGroup({ title: s.title, items: s.ingredients }));
      normalizedInstructionGroups = steps.map(s => new InstructionGroup({ title: s.title, items: s.instructions }));
    }

    this.ingredientsGroups = normalizedIngredientGroups;
    this.instructionGroups = normalizedInstructionGroups;

    // Preserve provided steps regardless of whether we derived groups from them
    if (steps && steps.length > 0) {
      this.steps = steps.map(s => new RecipeStep(s));
    }

    // Aggregate top-level ingredients/instructions based on groups if present
    if (this.ingredientsGroups.length > 0 || this.instructionGroups.length > 0) {
      const aggregatedIngredients: Ingredient[] = [];
      this.ingredientsGroups.forEach(group => {
        group.items.forEach(ing => aggregatedIngredients.push({ id: ing.id, name: ing.name }));
      });

      const aggregatedInstructions: string[] = [];
      this.instructionGroups.forEach(group => {
        group.items.forEach(inst => aggregatedInstructions.push(inst));
      });

      this.ingredients = aggregatedIngredients.length > 0 ? aggregatedIngredients : ingredients;
      this.instructions = aggregatedInstructions.length > 0 ? aggregatedInstructions : instructions;
    } else if (steps && steps.length > 0) {
      // Legacy v2 fallback: aggregate from steps
      const aggregatedIngredients: Ingredient[] = [];
      steps.forEach(step => step.ingredients.forEach(ing => aggregatedIngredients.push({ id: ing.id, name: ing.name })));
      const aggregatedInstructions: string[] = [];
      steps.forEach(step => step.instructions.forEach(inst => aggregatedInstructions.push(inst)));
      this.ingredients = aggregatedIngredients.length > 0 ? aggregatedIngredients : ingredients;
      this.instructions = aggregatedInstructions.length > 0 ? aggregatedInstructions : instructions;
      // Steps already set above; keep this for backward compatibility
      this.steps = this.steps && this.steps.length > 0 ? this.steps : steps.map(s => new RecipeStep(s));
    } else {
      // Legacy/simple recipe (v1)
      this.ingredients = ingredients;
      this.instructions = instructions;
    }

    this.sourceUrl = sourceUrl;
    this.cookingTime = cookingTime;
    this.calories = calories;
    this.tags = tags;
    this.userId = userId;

    // Infer schemaVersion
    if (typeof schemaVersion === 'number') {
      this.schemaVersion = schemaVersion;
    } else if (this.ingredientsGroups.length > 0 || this.instructionGroups.length > 0) {
      this.schemaVersion = 3;
    } else if (this.steps && this.steps.length > 0) {
      this.schemaVersion = 2;
    } else {
      this.schemaVersion = 1;
    }
  }
} 