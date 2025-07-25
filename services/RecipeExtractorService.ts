import { Recipe, Ingredient } from '../models/Recipe';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';

interface ModelConfig {
  model: string;
  temperature: number;
  seed: number;
  supportsResponseFormat?: boolean;
}

class RecipeExtractorService {
  private endpoint = 'https://siftrecipes.app/api/router';
  private corsProxy = 'https://corsproxy.io/?';  
  
  private models: ModelConfig[] = [
    { model: 'qwen/qwen3-8b:free', temperature: 0.1, seed: 1997, supportsResponseFormat: true },
    { model: 'mistralai/mistral-small-3.2-24b-instruct:free', temperature: 0.1, seed: 1997, supportsResponseFormat: true },
    { model: 'moonshotai/kimi-k2:free', temperature: 0.1, seed: 1997, supportsResponseFormat: true },
  ];

  constructor() {
    this.initializeModels();
  }

  private async initializeModels(): Promise<void> {

    try {
      // First fetch the most up-to-date model config with free models
      const response = await fetch('https://siftrecipes.app/model-config.json', {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch model config: ${response.status}`);
      }
      
      const fetchedModels = await response.json();
      // Replace the entire models array with the fetched array
      this.models = fetchedModels;
      console.log('Model config loaded successfully:', this.models);
    } catch (error) {
      console.log('Error loading model config:', error);
      // Keep the hardcoded models as fallback
      console.log('Using hardcoded model config:', this.models);
    }
  }

  async extractRecipe(url: string, extraInstructions?: string): Promise<Recipe> {
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
      
      // Prepare GPT prompt
      const prompt = `
        Extract recipe information from the following content and respond ONLY with valid JSON in this exact format:

        {
          "name": "Recipe Name",
          "ingredients": ["ingredient1", "ingredient2"],
          "instructions": ["step1", "step2"],
          "tags": ["tag1", "tag2"], 
          "cookingTime": "total time in minutes (e.g., '30 min', '1 hour 15 min')",
          "calories": "calories per serving with unit (e.g., '250 kcal', '300 calories (estimated)')"
        }

        **CRITICAL: Respond with ONLY the JSON object. No explanations, no additional text.**

        **Requirements:**
        * **Ingredients:** Include all ingredients with their quantities and units. Convert all ingredients to metric units and place the converted amount in parentheses. (e.g. 1/2 cup (113g) of butter)
        * **Instructions:** Provide a step-by-step list of instructions. Do not summarize or omit steps. 
        * **Tags:** Choose 3-5 relevant tags that describe the recipe (e.g., ["vegetarian", "quick", "italian", "pasta"]). Examples: cuisine type, dietary restrictions, meal type, cooking method.
        * **Calories:** If calorie information is not explicitly stated, estimate it based on common ingredient proportions and nutritional data.

        **Example output:**
        {
          "name": "Classic Spaghetti Carbonara",
          "ingredients": ["200g (7 oz) spaghetti", "100g (3.5 oz) pancetta", "2 large eggs", "50g (1.8 oz) pecorino cheese", "Black pepper to taste"],
          "instructions": ["Bring a large pot of salted water to boil", "Cook spaghetti according to package directions", "Meanwhile, cook pancetta until crispy", "Beat eggs with cheese and pepper", "Drain pasta and immediately toss with egg mixture"],
          "tags": ["italian", "pasta", "quick", "dinner"],
          "cookingTime": "20 min",
          "calories": "450 kcal"
        }

        **Content:** 
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
    // return content.slice(0, 16000);
    return content.slice(0, 20000);
  }

  private async callGPTAPI(prompt: string): Promise<string> {
    // Try each model in order until one works
    for (const model of this.models) {
      try {
        console.log(`Trying model: ${model.model}`);
        return await this.callGPTAPIWithModel(model, prompt);
      } catch (error) {
        console.log(`Model ${model.model} failed: ${error}`);
        continue;
      }
    }
    
    // If all models fail, throw an error
    throw new Error('All models failed to respond');
  }

  private async callGPTAPIWithModel(modelConfig: ModelConfig, prompt: string): Promise<string> {
    const requestBody: any = {
      model: modelConfig.model,
      messages: [
        {
          role: 'system',
          content: 'You are a recipe extraction assistant. You MUST respond with ONLY valid JSON. Never include explanations, markdown, or any text outside the JSON object. Always format your response as a single JSON object. The response must be parseable by JSON.parse().',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: modelConfig.temperature,
      seed: modelConfig.seed,
      max_tokens: 4000,
    };

    // Only add response_format if the model supports it
    if ('supportsResponseFormat' in modelConfig && modelConfig.supportsResponseFormat) {
      requestBody.response_format = { type: "json_object" };
    }
    
    console.log(`API request body for ${modelConfig.model}:`, JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    const data = await response.json();
    console.log(`GPT API response for ${modelConfig.model}:`, data);
    
    // Check for API errors
    if (data.error) {
      console.error(`API Error for ${modelConfig.model}:`, data.error);
      throw new Error(`API Error: ${data.error.message || 'Unknown error'}`);
    }
    
    // Add better error handling and logging
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
      // Look for og:image meta tag first
      const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"[^>]*>/);
      if (ogImageMatch && ogImageMatch[1]) {
        return this.resolveUrl(ogImageMatch[1], baseUrl);
      }

      // Then look for regular img tags
      const imgMatch = html.match(/<img[^>]*src="([^"]*)"[^>]*>/);
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
      // Handle absolute URLs
      if (imageUrl.startsWith('http')) {
        return imageUrl;
      }
      
      // Handle protocol-relative URLs
      if (imageUrl.startsWith('//')) {
        return 'https:' + imageUrl;
      }

      // Handle relative URLs
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

      // Generate a unique filename for the image
      const fileName = `${Date.now()}.jpg`;
      const imageDirectory = `${RNFS.DocumentDirectoryPath}/recipe-images`;
      const imagePath = `${imageDirectory}/${fileName}`;
      
      // Ensure the images directory exists
      const dirExists = await RNFS.exists(imageDirectory);
      if (!dirExists) {
        await RNFS.mkdir(imageDirectory);
      }

      // Download the image
      const downloadResult = RNFS.downloadFile({
        fromUrl: imageUrl,
        toFile: imagePath,
      });
      await downloadResult.promise;

      console.log('Image downloaded successfully to:', imagePath);

      // For native platforms, prefix with 'file://' is required for the Image component.
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        return 'file://' + imagePath;
      }

      return imagePath;
    } catch (error) {
      console.log('Error downloading image:', error);
      return null;
    }
  }

  private parseGPTResponse(response: string, imageUrl: string | null, sourceUrl?: string): Recipe {
    try {
      console.log('Raw response to parse:', response);
      
      // Try to find JSON in the response - look for the most complete JSON object
      let jsonMatch = response.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
      if (!jsonMatch) {
        // Fallback to simpler regex
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
      
      // Validate required fields
      if (!data.name || !data.ingredients || !data.instructions) {
        console.error('Missing required fields in parsed data:', data);
        throw new Error('Missing required fields in recipe data');
      }
      
      // Create ingredients from strings
      const ingredients = data.ingredients.map((ing: string) => new Ingredient(ing));
      
      // Create and return recipe with all fields including image
      const recipe = new Recipe({
        name: data.name,
        ingredients,
        instructions: data.instructions,
        imageUri: imageUrl,
        tags: data.tags || [],
        cookingTime: data.cookingTime || undefined,
        calories: data.calories || undefined,
        sourceUrl: sourceUrl,
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