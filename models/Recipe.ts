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
  }: Partial<Recipe> = {}) {
    this.id = id;
    this.name = name;
    this.imageUri = imageUri;
    this.ingredients = ingredients;
    this.instructions = instructions;
    this.sourceUrl = sourceUrl;
    this.cookingTime = cookingTime;
    this.calories = calories;
    this.tags = tags;
    this.userId = userId;
  }
} 