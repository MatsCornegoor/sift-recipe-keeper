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

  constructor() {
  }

  private async loadCustomModelConfig(): Promise<void> {
    try {
      const endpoint = await AsyncStorage.getItem('ai_model_endpoint');
      const model = await AsyncStorage.getItem('ai_model_name');
      const apiKey = await AsyncStorage.getItem('ai_model_api_key');
      
      if (endpoint && model) {
        this.customEndpoint = endpoint;
        this.customModel = model;
        this.customApiKey = apiKey || null;
        console.log('Loaded custom AI model configuration.');
      }
    } catch (error) {
      console.error('Failed to load custom AI model config', error);
    }
  }


  async extractRecipe(url: string, extraInstructions?: string): Promise<Recipe> {
    await this.loadCustomModelConfig();
    try {
      // Add cors proxy to the URL if on web platform
      const fetchUrl = Platform.OS === 'web' ? this.corsProxy + url : url;
      console.log('Fetching URL:', fetchUrl);
      
      // Fetch webpage content with appropriate headers
      const headers: HeadersInit = Platform.OS === 'web' 
        ? { 'Origin': (window?.location?.origin || 'https://localhost') }
        : { 'User-Agent': 'Mozilla/5.0' }; // Add a user agent for mobile requests
      
      const response = await fetch(fetchUrl, { headers });
      const html = await response.text();
      
      // Extract the first image URL
      const imageUrl = this.extractFirstImage(html, url);
      
      // Download and save the image if found
      const localImageUri = imageUrl ? await this.downloadAndSaveImage(imageUrl) : null;
      
      // Clean and prepare content
      const cleanContent = this.cleanWebPageContent(html);
      
      // Prepare GPT prompt for groups schema (v2)
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

      // Call API
      const gptResponse = await this.callGPTAPI(prompt);
      
      // Parse and create recipe with local image
      return this.parseGPTResponse(gptResponse, localImageUri, url);
    } catch (error) {
      console.log('Error extracting recipe:', error);
      throw error;
    }
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

    try {
      console.log(`Trying custom model: ${this.customModel}`);
      const customModelConfig: ModelConfig & { apiKey?: string | null } = {
        model: this.customModel,
        temperature: 0.1,
        seed: 1997,
        supportsResponseFormat: true, // Assume custom endpoints support this for simplicity
        apiKey: this.customApiKey,
      };
      return await this.callGPTAPIWithModel(customModelConfig, prompt, this.customEndpoint);
    } catch (error) {
      console.log(`Custom model failed: ${error}`);
      throw new Error('Custom model failed to respond');
    }
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

    console.log(`API request body for ${modelConfig.model}:`, JSON.stringify(requestBody, null, 2));

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
      throw new Error(`API call failed: ${response.status}`);
    }

    const data = await response.json();
    console.log(`GPT API response for ${modelConfig.model}:`, data);

    if (data.error) {
      console.error(`API Error for ${modelConfig.model}:`, data.error);
      throw new Error(`API Error: ${data.error.message || 'Unknown error'}`);
    }

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error(`Invalid response structure for ${modelConfig.model}:`, data);
      throw new Error('Invalid API response structure');
    }

    const content = data.choices[0].message.content;
    console.log(`GPT API content for ${modelConfig.model}:`, content);

    if (!content || content.trim() === '') {
      console.error(`Empty content in API response for ${modelConfig.model}`);
      throw new Error('Empty content in API response');
    }

    return content;
  }

  private extractFirstImage(html: string, baseUrl: string): string | null {
    try {
      const ogImageMatch = html.match(/<meta[^>]*property=\"og:image\"[^>]*content=\"([^\"]*)\"[^>]*>/);
      if (ogImageMatch && ogImageMatch[1]) {
        return this.resolveUrl(ogImageMatch[1], baseUrl);
      }

      const imgMatch = html.match(/<img[^>]*src=\"([^\"]*)\"[^>]*>/);
      if (imgMatch && imgMatch[1]) {
        return this.resolveUrl(imgMatch[1], baseUrl);
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

      console.log('Image downloaded successfully to:', imagePath);

      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        return 'file://' + imagePath;
      }

      return imagePath;
    } catch (error) {
      console.log('Error downloading image:', error);
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
    try {
      console.log('Raw response to parse:', response);
      
      let jsonMatch = response.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
      if (!jsonMatch) {
        jsonMatch = response.match(/\{[^{}]*\}/);
      }
      
      if (!jsonMatch) {
        console.error('No JSON found in response. Full response:', response);
        throw new Error('No JSON found in response');
      }

      const jsonString = jsonMatch[0];
      console.log('Extracted JSON string:', jsonString);
      
      const data = JSON.parse(jsonString);
      console.log('Parsed GPT response:', data);
      console.log('Tags from response:', data.tags);
      
      if (!data.name) {
        console.error('Missing name in parsed data:', data);
        throw new Error('Missing name in recipe data');
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

      console.log('Created recipe with tags:', recipe.tags);
      return recipe;
    } catch (error) {
      console.error('Error parsing GPT response:', error);
      console.error('Full response that failed to parse:', response);
      throw error;
    }
  }
}

export default new RecipeExtractorService();