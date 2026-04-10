// Shared recipe fetching and extraction logic.
// Mirrors RecipeExtractorService.ts so test conditions match production.

const { OPENROUTER_ENDPOINT } = require('./config');

const SYSTEM_PROMPT =
  'You are a recipe extraction assistant. You MUST respond with ONLY valid JSON. ' +
  'Never include explanations, markdown, or any text outside the JSON object. ' +
  'Always format your response as a single JSON object. ' +
  'The response must be parseable by JSON.parse().';

function cleanWebPageContent(html) {
  let content = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  content = content.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  content = content.replace(/<[^>]+>/g, ' ');
  content = content.replace(/\s+/g, ' ').trim();
  return content.slice(0, 20000);
}

async function fetchAndClean(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${url}`);
  return cleanWebPageContent(await response.text());
}

// Depth-tracking JSON extractor — handles preamble/postamble and thinking blocks.
// Mirrors the approach in RecipeExtractorService.ts.
function extractJson(text) {
  // Strip thinking blocks emitted by reasoning models (e.g. gemini-2.5-pro).
  const stripped = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
  const start = stripped.indexOf('{');
  if (start === -1) throw new Error('No JSON object found in response');

  let depth = 0, inString = false, escape = false;
  for (let i = start; i < stripped.length; i++) {
    const ch = stripped[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return JSON.parse(stripped.slice(start, i + 1)); }
  }

  // Recovery: response was likely truncated (e.g. thinking model hit max_tokens).
  // Try closing the unclosed braces and parsing anyway.
  if (depth > 0) {
    try {
      return JSON.parse(stripped.slice(start) + '}'.repeat(depth));
    } catch {
      // fall through to error
    }
  }

  throw new Error('Malformed JSON: unbalanced braces');
}

function buildExtractionPrompt(cleanContent) {
  return `
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
      "calories": "250 kcal",
      "servings": "4"
    }

    CRITICAL:
    - Respond with ONLY the JSON object; no extra text or markdown.
    - Only extract information from the content. Do not add your own text.
    - Ingredients: Extract quantities and units as written.
    - Instructions: Extract instructions as short, granular sub-steps per group. Do not rephrase or create your own text.
    - Tags: Come up with 3-5 relevant tags for the recipe.
    - Calories: Extract from content. If missing, use an empty string "". DO NOT estimate.
    - Cooking Time: Extract from content. If missing, use an empty string "".
    - Servings: Extract from content. If missing, use an empty string "". DO NOT estimate.
    - Grouping: If the recipe has distinct sections with titles (like "Sauce" or "Dough"), create corresponding groups.
      If there are no such sections, create just one group with the 'title' as an empty string.
      DO NOT make up your own group titles. DO NOT use generic titles like "Ingredients" or "Instructions."

    Content:
    ${cleanContent}
  `;
}

async function extractRecipe(modelId, cleanContent, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  let response;
  try {
    response = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildExtractionPrompt(cleanContent) },
        ],
        temperature: 0.1,
        seed: 1997,
        max_tokens: 4000,
      }),
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Timed out after 30s');
    throw err;
  }
  clearTimeout(timeout);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  if (data.error) throw new Error(`Model error: ${data.error.message || JSON.stringify(data.error)}`);
  if (!data.choices?.[0]?.message?.content) throw new Error('Empty response from model');

  return extractJson(data.choices[0].message.content);
}

module.exports = { cleanWebPageContent, fetchAndClean, extractJson, extractRecipe };
