import { Recipe, Ingredient, RecipeStep, IngredientGroup, InstructionGroup } from '../models/Recipe';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { CURRENT_SCHEMA_VERSION } from '../models/RecipeMigrations';
import AsyncStorage from '@react-native-async-storage/async-storage';


interface ModelConfig {
  model: string;
  temperature: number;
  seed: number;
  supportsResponseFormat?: boolean;
}

class RecipeExtractorService {
  private corsProxy = 'https://corsproxy.io/?';  
  
  private customEndpoint: string | null = null;
  private customModel: string | null = null;
  private customApiKey: string | null = null;
  private customSeed: number = 1997;
  private customTemperature: number = 0.1;
  private customSupportsResponseFormat: boolean = true;

  constructor() {
  }

  private async loadCustomModelConfig(): Promise<void> {
    try {
      const endpoint = await AsyncStorage.getItem('ai_model_endpoint');
      const model = await AsyncStorage.getItem('ai_model_name');
      const apiKey = await AsyncStorage.getItem('ai_model_api_key');
      const seed = await AsyncStorage.getItem('ai_model_seed');
      const temperature = await AsyncStorage.getItem('ai_model_temperature');
      const supportsResponseFormat = await AsyncStorage.getItem('ai_model_supports_response_format');

      if (endpoint && model) {
        this.customEndpoint = endpoint;
        this.customModel = model;
        this.customApiKey = apiKey || null;
        if (seed !== null) this.customSeed = parseInt(seed, 10);
        if (temperature !== null) this.customTemperature = parseFloat(temperature);
        if (supportsResponseFormat !== null) this.customSupportsResponseFormat = supportsResponseFormat === 'true';
      }
    } catch (error) {
      console.error('Failed to load custom AI model config:', error);
    }
  }


  async modifyRecipe(recipe: Recipe, userPrompt: string): Promise<Recipe> {
    await this.loadCustomModelConfig();

    const recipeJson = JSON.stringify({
      name: recipe.name,
      ingredientsGroups: (recipe.ingredientsGroups || []).map(g => ({
        title: g.title || '',
        items: g.items.map(i => i.name),
      })),
      instructionGroups: (recipe.instructionGroups || []).map(g => ({
        title: g.title || '',
        items: g.items,
      })),
      tags: recipe.tags,
      cookingTime: recipe.cookingTime || '',
      calories: recipe.calories || '',
    }, null, 2);

    const prompt = `
      You are a recipe modification assistant. Modify the following recipe according to the user's request.
      Apply only the changes needed to fulfill the request. Preserve all other details as-is.

      User request: ${userPrompt}

      Current recipe (JSON):
      ${recipeJson}

      Return the modified recipe as a JSON object matching this schema exactly:
      {
        "schemaVersion": 2,
        "name": "Recipe Name",
        "ingredientsGroups": [
          {
            "title": "Optional group title or empty string",
            "items": ["ingredient1", "ingredient2"]
          }
        ],
        "instructionGroups": [
          {
            "title": "Optional group title or empty string",
            "items": ["step1", "step2"]
          }
        ],
        "tags": ["tag1", "tag2"],
        "cookingTime": "30 min",
        "calories": "250 kcal"
      }

      CRITICAL:
      - Respond with ONLY the JSON object; no extra text or markdown.
      - Preserve the same group structure unless the modification requires changing it.
      - Keep all fields that don't need to change identical to the original.
    `;

    const gptResponse = await this.callGPTAPI(prompt);
    const modified = this.parseGPTResponse(gptResponse, recipe.imageUri, recipe.sourceUrl);
    // Preserve the original recipe ID so saving updates the same recipe
    modified.id = recipe.id;
    return modified;
  }

  async extractRecipe(url: string, extraInstructions?: string): Promise<Recipe> {
    await this.loadCustomModelConfig();

    const fetchUrl = Platform.OS === 'web' ? this.corsProxy + url : url;
    const headers: HeadersInit = Platform.OS === 'web'
      ? { 'Origin': (window?.location?.origin || 'https://localhost') }
      : { 'User-Agent': 'Mozilla/5.0' };

    const response = await fetch(fetchUrl, { headers });
    const html = await response.text();

    const imageUrl = this.extractFirstImage(html, url);
    const localImageUri = imageUrl ? await this.downloadAndSaveImage(imageUrl) : null;
    const cleanContent = this.cleanWebPageContent(html);

    const prompt = `
        Extract recipe information from the following content.
        Your primary rule is to ONLY extract information that is explicitly present in the text.
        Do not invent, assume, translate, or generate any information.
        If a value for a field is not found, it should be an empty string "" or an empty array [] for lists.
        Respond ONLY with a valid JSON object matching this schema exactly.

        {
          "schemaVersion": 2,
          "name": "Recipe Name",
          "ingredientsGroups": [
            {
              "title": "Optional group title (e.g., Sauce)",
              "items": ["ingredient1", "ingredient2"]
            }
          ],
          "instructionGroups": [
            {
              "title": "Optional group title (e.g., Sauce)",
              "items": ["short sub-step 1", "short sub-step 2"]
            }
          ],
          "tags": ["tag1", "tag2"],
          "cookingTime": "30 min",
          "calories": "250 kcal"
        }

        CRITICAL:
        - Respond with ONLY the JSON object; no extra text or markdown.
        - Only extract information from the content. Do not add your own text.
        - Ingredients: Extract quantities and units as written.
        - Instructions: Extract instructions as short, granular sub-steps per group. Do not rephrase or create your own text.
        - Tags: Come up with 3-5 relevant tags for the recipe.
        - Calories: Extract from content. If missing, use an empty string "". DO NOT estimate.
        - Cooking Time: Extract from content. If missing, use an empty string "".
        - Grouping: If the recipe has distinct sections with titles (like "Sauce" or "Dough"), create corresponding groups. If there are no such sections, create just one group for ingredients and one for instructions, leaving the 'title' as an empty string. DO NOT make up your own group titles. DO NOT use generic titles like "Ingredients" or "Instructions."

        Content:
        ${cleanContent}
      `;

    const gptResponse = await this.callGPTAPI(prompt);
    return this.parseGPTResponse(gptResponse, localImageUri, url);
  }

  private cleanWebPageContent(html: string): string {
    // Remove scripts
    let content = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    // Remove styles
    content = content.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    // Remove HTML tags
    content = content.replace(/<[^>]+>/g, ' ');
    // Remove extra whitespace
    content = content.replace(/\s+/g, ' ').trim();
    // Limit content length
    return content.slice(0, 20000);
  }

  private extractSectionHints(html: string, cleanContent: string): string[] {
    const hints: string[] = [];

    try {
      // Headings from HTML
      const headingRegex = /<h[1-4][^>]*>(.*?)<\/h[1-4]>/gi;
      let match: RegExpExecArray | null;
      while ((match = headingRegex.exec(html)) !== null) {
        const raw = match[1] || '';
        const text = raw.replace(/<[^>]*>/g, '').trim();
        if (!text) continue;
        const normalized = text.replace(/\s+/g, ' ').trim();
        if (normalized.length > 2 && normalized.length <= 50) {
          const lower = normalized.toLowerCase();
          // Skip generic headings
          if ([ 
            'ingredients', 'ingredient', 'instructions', 'method', 'directions', 'notes', 'nutrition', 'equipment', 'let\'s start', 'lets start', 'get started', 'getting started', 'summary', 'recipe summary'
          ].includes(lower)) continue;
          // Title case
          const title = normalized.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
          if (!hints.includes(title)) hints.push(title);
        }
        if (hints.length >= 8) break;
      }

      // Pattern: "For the X:" in text
      const forTheRegex = /(?:for the|for)\s+([a-zA-Z][a-zA-Z\s\-]{2,40})\s*:/gi;
      let m2: RegExpExecArray | null;
      while ((m2 = forTheRegex.exec(cleanContent)) !== null) {
        const title = (m2[1] || '').trim();
        if (!title) continue;
        const norm = title.replace(/\s+/g, ' ').trim();
        if (norm.length > 2 && norm.length <= 50) {
          const titled = norm.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
          if (!hints.includes(titled)) hints.push(titled);
        }
        if (hints.length >= 8) break;
      }

    } catch (e) {
      // ignore
    }

    return hints.slice(0, 8);
  }

  private async callGPTAPI(prompt: string): Promise<string> {
    if (!this.customEndpoint || !this.customModel) {
      throw new Error('AI model is not configured. Please configure it in the settings.');
    }

    const customModelConfig: ModelConfig & { apiKey?: string | null } = {
      model: this.customModel,
      temperature: this.customTemperature,
      seed: this.customSeed,
      supportsResponseFormat: this.customSupportsResponseFormat,
      apiKey: this.customApiKey,
    };
    return this.callGPTAPIWithModel(customModelConfig, prompt, this.customEndpoint);
  }

  private async callGPTAPIWithModel(modelConfig: ModelConfig & { apiKey?: string | null }, prompt: string, endpoint: string): Promise<string> {
    const requestBody: any = {
      model: modelConfig.model,
      messages: [
        { role: 'system', content: 'You are a recipe extraction assistant. You MUST respond with ONLY valid JSON. Never include explanations, markdown, or any text outside the JSON object. Always format your response as a single JSON object. The response must be parseable by JSON.parse().' },
        { role: 'user', content: prompt },
      ],
      temperature: modelConfig.temperature,
      seed: modelConfig.seed,
      max_tokens: 4000,
    };

    if ('supportsResponseFormat' in modelConfig && modelConfig.supportsResponseFormat) {
      requestBody.response_format = { type: 'json_object' };
    }

    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (modelConfig.apiKey) {
        headers['Authorization'] = `Bearer ${modelConfig.apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`The AI service returned an error (HTTP ${response.status}). Please check your endpoint and API key.`);
    }

    const data = await response.json();
    if (data.error) {
      console.error(`API error from ${modelConfig.model}:`, data.error);
      throw new Error(`AI service error: ${data.error.message || 'Unknown error'}`);
    }

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error(`Unexpected response structure from ${modelConfig.model}:`, data);
      throw new Error('The AI returned an unexpected response format. Try a different model.');
    }

    const content = data.choices[0].message.content;

    if (!content || content.trim() === '') {
      throw new Error('The AI returned an empty response. Please try again.');
    }

    return content;
  }

  private extractFirstImage(html: string, baseUrl: string): string | null {
    try {
      // 1. JSON-LD structured data (most reliable for recipe pages)
      const ldJsonMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
      if (ldJsonMatch) {
        try {
          const ld = JSON.parse(ldJsonMatch[1]);
          const entries = Array.isArray(ld) ? ld : [ld];
          for (const entry of entries) {
            const target = entry['@type'] === 'Recipe' ? entry : (entry['@graph'] || []).find((n: any) => n['@type'] === 'Recipe');
            if (target?.image) {
              const img = Array.isArray(target.image) ? target.image[0] : target.image;
              const url = typeof img === 'string' ? img : img?.url;
              if (url) return this.resolveUrl(url, baseUrl);
            }
          }
        } catch {
          // malformed LD+JSON, fall through
        }
      }

      // 2. og:image meta tag (handles any quote style and attribute order)
      const ogImageMatch = html.match(/<meta[^>]*\bproperty=["']og:image["'][^>]*\bcontent=["']([^"']+)["']/i)
        || html.match(/<meta[^>]*\bcontent=["']([^"']+)["'][^>]*\bproperty=["']og:image["']/i);
      if (ogImageMatch?.[1]) {
        return this.resolveUrl(ogImageMatch[1], baseUrl);
      }

      // 3. twitter:image meta tag
      const twitterImageMatch = html.match(/<meta[^>]*\bname=["']twitter:image["'][^>]*\bcontent=["']([^"']+)["']/i)
        || html.match(/<meta[^>]*\bcontent=["']([^"']+)["'][^>]*\bname=["']twitter:image["']/i);
      if (twitterImageMatch?.[1]) {
        return this.resolveUrl(twitterImageMatch[1], baseUrl);
      }

      // 4. First <img> with a meaningful src (skip data URIs and tiny tracking pixels)
      const imgRegex = /<img[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
      let imgMatch;
      while ((imgMatch = imgRegex.exec(html)) !== null) {
        const src = imgMatch[1];
        if (!src.startsWith('data:') && !src.includes('pixel') && !src.includes('tracking')) {
          return this.resolveUrl(src, baseUrl);
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting image:', error);
      return null;
    }
  }

  private resolveUrl(imageUrl: string, baseUrl: string): string {
    try {
      if (imageUrl.startsWith('http')) return imageUrl;
      if (imageUrl.startsWith('//')) return 'https:' + imageUrl;

      const base = new URL(baseUrl);
      if (imageUrl.startsWith('/')) {
        return `${base.protocol}//${base.host}${imageUrl}`;
      } else {
        return `${base.protocol}//${base.host}${base.pathname.replace(/[^/]*$/, '')}${imageUrl}`;
      }
    } catch (error) {
      console.error('Error resolving URL:', error);
      return imageUrl;
    }
  }

  private async downloadAndSaveImage(imageUrl: string): Promise<string | null> {
    try {
      if (!imageUrl) return null;

      const fileName = `${Date.now()}.jpg`;
      const imageDirectory = `${RNFS.DocumentDirectoryPath}/recipe-images`;
      const imagePath = `${imageDirectory}/${fileName}`;
      
      const dirExists = await RNFS.exists(imageDirectory);
      if (!dirExists) {
        await RNFS.mkdir(imageDirectory);
      }

      const downloadResult = RNFS.downloadFile({ fromUrl: imageUrl, toFile: imagePath });
      await downloadResult.promise;

      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        return 'file://' + imagePath;
      }

      return imagePath;
    } catch (error) {
      console.warn('Error downloading image:', error);
      return null;
    }
  }

  private normalizeInstructions(input: any): string[] {
    try {
      const rawList: string[] = Array.isArray(input)
        ? input
        : typeof input === 'string'
          ? [input]
          : [];

      const substeps: string[] = [];

      for (const item of rawList) {
        if (!item || typeof item !== 'string') continue;
        const lines = item.split(/\r?\n+/).map(s => s.trim()).filter(Boolean);
        for (const line of lines) {
          const parts = line
            .split(/(?=(?:\d+\.\s|\d+\)\s|[-*•]\s))/) // Corrected regex for escaped characters
            .map(s => s.trim())
            .filter(Boolean);
          for (let part of parts) {
            part = part.replace(/^(?:\d+\.\s|\d+\)\s|[-*•]\s)/, '').trim();
            if (part) substeps.push(part);
          }
        }
      }

      const result = substeps.filter(Boolean);
      return result.length > 0 ? result : rawList.map(s => (typeof s === 'string' ? s.trim() : '')).filter(Boolean);
    } catch (e) {
      return Array.isArray(input) ? input : typeof input === 'string' ? [input] : [];
    }
  }

  private parseGPTResponse(response: string, imageUrl: string | null, sourceUrl?: string): Recipe {
    const start = response.indexOf('{');
      if (start === -1) {
        console.error('No JSON found in AI response:', response);
        throw new Error('No recipe was found on this page. The page may not contain a recipe or may be blocking access.');
      }

      let depth = 0;
      let inString = false;
      let escape = false;
      let end = -1;

      for (let i = start; i < response.length; i++) {
        const ch = response[i];
        if (escape) { escape = false; continue; }
        if (ch === '\\' && inString) { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) { end = i; break; } }
      }

      if (end === -1) {
        console.error('Malformed JSON in AI response:', response);
        throw new Error('The AI returned a malformed response. Please try again.');
      }

      const data = JSON.parse(response.slice(start, end + 1));

      if (!data.name) {
        console.error('Recipe name missing in parsed data:', data);
        throw new Error('No recipe was found on this page. Try a different URL.');
      }

      // Read groups (required), fallback to legacy if absent
      let ingredientsGroups: IngredientGroup[] = [];
      let instructionGroups: InstructionGroup[] = [];

      if (Array.isArray(data.ingredientsGroups) || Array.isArray(data.instructionGroups)) {
        ingredientsGroups = (data.ingredientsGroups || []).map((g: any) => new IngredientGroup({
          title: g.title || undefined,
          items: (g.items || []).map((txt: string) => new Ingredient(txt)),
        }));
        instructionGroups = (data.instructionGroups || []).map((g: any) => new InstructionGroup({
          title: g.title || undefined,
          items: this.normalizeInstructions(g.items),
        }));
      } else {
        // Legacy
        const ingredients = Array.isArray(data.ingredients) ? data.ingredients : [];
        const instructions = this.normalizeInstructions(data.instructions);
        ingredientsGroups = [new IngredientGroup({ items: ingredients.map((txt: string) => new Ingredient(txt)) })];
        instructionGroups = [new InstructionGroup({ items: instructions })];
      }

      // Aggregate top-level
      const ingredientsAgg: Ingredient[] = [];
      ingredientsGroups.forEach(g => g.items.forEach(ing => ingredientsAgg.push(new Ingredient(ing.name))));
      const instructionsAgg: string[] = [];
      instructionGroups.forEach(g => g.items.forEach(inst => instructionsAgg.push(inst)));

      const recipe = new Recipe({
        name: data.name,
        ingredients: ingredientsAgg,
        instructions: instructionsAgg,
        imageUri: imageUrl,
        tags: data.tags || [],
        cookingTime: data.cookingTime || undefined,
        calories: data.calories || undefined,
        sourceUrl: sourceUrl,
        ingredientsGroups,
        instructionGroups,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      });

      return recipe;
  }
}

export default new RecipeExtractorService();