#!/usr/bin/env node

// Fetches 3 recipe pages for every model in supportedModels.json,
// extracts the recipe using the same logic as RecipeExtractorService,
// then rates each extraction with a smart reasoning model.
//
// Usage:
//   OPENROUTER_API_KEY=<key> node testModels.js

const SECTIONS = require('./supportedModels.json');

// ─── Config ──────────────────────────────────────────────────────────────────

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

// Smart reasoning model used to judge extraction quality.
// Must be capable of careful analysis — reasoning models work best here.
const RATING_MODEL = 'google/gemini-2.5-pro';

// Three diverse recipe pages to test against: simple, multi-section, and complex.
const TEST_URLS = [
  'https://www.indianhealthyrecipes.com/butter-chicken/',
  'https://www.recipetineats.com/spaghetti-bolognese/',
];

// ─── HTML fetching & cleaning (mirrors RecipeExtractorService) ────────────────

function cleanWebPageContent(html) {
  let content = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  content = content.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  content = content.replace(/<[^>]+>/g, ' ');
  content = content.replace(/\s+/g, ' ').trim();
  return content.slice(0, 20000);
}

async function fetchAndClean(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${url}`);
  const html = await response.text();
  return cleanWebPageContent(html);
}

// ─── Recipe extraction (mirrors RecipeExtractorService) ───────────────────────

const SYSTEM_PROMPT =
  'You are a recipe extraction assistant. You MUST respond with ONLY valid JSON. ' +
  'Never include explanations, markdown, or any text outside the JSON object. ' +
  'Always format your response as a single JSON object. ' +
  'The response must be parseable by JSON.parse().';

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

async function extractRecipe(modelId, cleanContent) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  let response;
  try {
    response = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
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

  return data.choices[0].message.content;
}

// ─── Rating ───────────────────────────────────────────────────────────────────

// Depth-tracking JSON extractor — handles content before/after the JSON object.
// Mirrors the approach in RecipeExtractorService.ts.
function extractJson(text) {
  const start = text.indexOf('{');
  if (start === -1) throw new Error('No JSON object found in response');

  let depth = 0, inString = false, escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return JSON.parse(text.slice(start, i + 1)); }
  }
  throw new Error('Malformed JSON: unbalanced braces');
}

function buildRatingPrompt(cleanContent, extractedJson, url) {
  return `
You are a quality evaluator for an AI recipe extraction system.
Your job is to identify concrete mistakes in an extraction, comparing it against the source content.

Source URL: ${url}

Source webpage content (first 6000 chars of cleaned text):
<content>
${cleanContent.slice(0, 6000)}
</content>

Extracted recipe JSON:
<extracted>
${extractedJson}
</extracted>

Score each category from 0 to 10 (10 = flawless):
- name: Was the recipe name correctly extracted?
- ingredients: Are all ingredients present with correct quantities and units? Penalise for missing items or wrong amounts.
- instructions: Are the instructions complete, accurate, and properly broken into sub-steps? Penalise for hallucinated, missing, or heavily rephrased steps.
- metadata: Was cookingTime/servings/calories only populated when present in the source? Penalise for invented values.
- schema: Is the JSON structurally valid with correct grouping behaviour (no invented group titles, no generic titles like "Ingredients")?

List every concrete mistake you found. Be specific (e.g. "missing '2 cups flour' ingredient", not "some ingredients missing").

Respond with ONLY this JSON — no extra text:
{
  "scores": {
    "name": <0-10>,
    "ingredients": <0-10>,
    "instructions": <0-10>,
    "metadata": <0-10>,
    "schema": <0-10>
  },
  "total": <sum of scores, 0-50>,
  "mistakes": ["mistake 1", "mistake 2"]
}
`;
}

async function rateExtraction(cleanContent, extractedJson, url) {
  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: RATING_MODEL,
      messages: [{ role: 'user', content: buildRatingPrompt(cleanContent, extractedJson, url) }],
      temperature: 0,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) throw new Error(`Rating API ${response.status}`);

  const data = await response.json();
  // Strip thinking blocks (e.g. <thinking>...</thinking>) before parsing —
  // reasoning models like gemini-2.5-pro emit these before the JSON output.
  const raw = (data.choices[0].message.content ?? '').replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');

  return extractJson(raw);
}

// ─── Per-model test run ───────────────────────────────────────────────────────

async function testModel(modelId, cleanPages) {
  const results = [];

  for (let i = 0; i < TEST_URLS.length; i++) {
    const url = TEST_URLS[i];
    const cleanContent = cleanPages[i];
    process.stdout.write(`    [${i + 1}/${TEST_URLS.length}] ${url.slice(0, 60)}... `);

    try {
      const extracted = await extractRecipe(modelId, cleanContent);
      process.stdout.write('responded, scoring... ');
      const rating = await rateExtraction(cleanContent, extracted, url);
      console.log(`${rating.total}/50`);
      results.push({ url, score: rating.total, scores: rating.scores, mistakes: rating.mistakes });
    } catch (err) {
      console.log(`ERROR: ${err.message.slice(0, 80)}`);
      results.push({ url, score: 0, error: err.message });
    }
  }

  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!OPENROUTER_API_KEY) {
    console.error('Error: OPENROUTER_API_KEY environment variable is required.');
    process.exit(1);
  }

  const allModels = SECTIONS.flatMap(s => s.groups.flatMap(g => g.models));
  console.log(`Testing ${allModels.length} models on ${TEST_URLS.length} URLs each`);
  console.log(`Rating model: ${RATING_MODEL}\n`);
  console.log('Test URLs:');
  TEST_URLS.forEach((url, i) => console.log(`  ${i + 1}. ${url}`));

  // Fetch and clean each test URL once, shared across all models.
  console.log('\nFetching test pages...');
  const cleanPages = await Promise.all(
    TEST_URLS.map(async (url) => {
      process.stdout.write(`  ${url.slice(0, 60)}... `);
      const content = await fetchAndClean(url);
      console.log('done');
      return content;
    })
  );

  const report = [];

  for (const section of SECTIONS) {
    console.log(`\n${section.heading}`);

    for (const group of section.groups) {
      console.log(`\n  ${group.label}`);

      for (const modelId of group.models) {
        console.log(`\n  ${modelId}`);
        const results = await testModel(modelId, cleanPages);
        const totalScore = results.reduce((sum, r) => sum + (r.score ?? 0), 0);
        const maxScore = TEST_URLS.length * 50;
        const pct = Math.round((totalScore / maxScore) * 100);
        console.log(`  => ${totalScore}/${maxScore} (${pct}%)`);

        // Print any mistakes found
        for (const r of results) {
          if (r.mistakes?.length) {
            console.log(`     Mistakes (${new URL(r.url).hostname}):`);
            r.mistakes.forEach(m => console.log(`       - ${m}`));
          }
        }

        report.push({ modelId, results, totalScore, maxScore, pct });
      }
    }
  }

  // ─── Summary table ──────────────────────────────────────────────────────────

  const col = 52;
  console.log('\n\n' + '='.repeat(col + 20));
  console.log('SUMMARY (sorted by score)');
  console.log('='.repeat(col + 20));
  console.log(`${'Model'.padEnd(col)} Score     %`);
  console.log('-'.repeat(col + 20));

  for (const { modelId, totalScore, maxScore, pct } of [...report].sort((a, b) => b.totalScore - a.totalScore)) {
    const bar = '█'.repeat(Math.round(pct / 10)).padEnd(10);
    console.log(`${modelId.padEnd(col)} ${String(totalScore).padStart(3)}/${maxScore}  ${bar} ${pct}%`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
