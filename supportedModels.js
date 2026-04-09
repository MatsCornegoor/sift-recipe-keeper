const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────

// Estimated token usage per recipe import
// Input: scraped webpage HTML + system prompt
// Output: structured recipe JSON
const ESTIMATED_INPUT_TOKENS = 3000;
const ESTIMATED_OUTPUT_TOKENS = 1000;

const README_PATH = path.join(__dirname, 'README.md');

// Table structure for the README. Each section maps to a provider heading.
// models use OpenRouter IDs; displayName strips the provider prefix for
// sections where the native API doesn't use it (e.g. OpenAI).
const SECTIONS = [
  {
    heading: '### OpenRouter',
    stripProviderPrefix: false,
    groups: [
      {
        label: 'Good quality, best balance between accuracy and price',
        models: [
          'google/gemma-3-27b-it',
          'mistralai/mistral-small-3.2-24b-instruct',
          'qwen/qwen3-coder-30b-a3b-instruct',
        ],
      },
      {
        label: 'Great quality, but more expensive',
        models: [
          'google/gemma-4-31b-it',
          'google/gemini-2.5-flash',
        ],
      },
      {
        label: 'Medium quality, cheap, but prone to mistakes',
        models: [
          'google/gemma-3-12b-it',
          'meta-llama/llama-3.1-8b-instruct',
        ],
      },
      {
        label: 'Free, rate limits might apply' 
        models: [
          'arcee-ai/trinity-large-preview:free'
        ], 
      },
    ],
  },
  {
    heading: '### OpenAI',
    stripProviderPrefix: true,
    groups: [
      {
        label: 'Good quality, best balance between accuracy and price',
        models: [
          'openai/gpt-4o-mini',
          'openai/gpt-5.4-nano',
        ],
      },
      {
        label: 'Great quality, but more expensive',
        models: [
          'openai/gpt-5.4-mini',
        ],
      },
    ],
  },
];

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchModelData() {
  const response = await fetch('https://openrouter.ai/api/v1/models');
  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
  }

  const { data: models } = await response.json();
  const result = {};

  for (const model of models) {
    const inputPricePerToken = parseFloat(model.pricing?.prompt ?? 0);
    const outputPricePerToken = parseFloat(model.pricing?.completion ?? 0);

    result[model.id] = {
      price: inputPricePerToken * ESTIMATED_INPUT_TOKENS + outputPricePerToken * ESTIMATED_OUTPUT_TOKENS,
      supportsResponseFormat: model.supported_parameters?.includes('response_format') ?? null,
    };
  }

  return result;
}

// ─── Table generation ─────────────────────────────────────────────────────────

function generateTable(section, modelData) {
  const lines = [
    '| Model name | Response format | Est. price |',
    '|---|---|---|',
  ];

  for (const group of section.groups) {
    lines.push(`| **${group.label}** | | |`);

    for (const modelId of group.models) {
      const data = modelData[modelId];
      const displayId = section.stripProviderPrefix
        ? modelId.split('/').slice(1).join('/')
        : modelId;

      const priceStr = data ? `$${data.price.toFixed(6)}` : 'N/A';
      const responseFormat = data?.supportsResponseFormat === null
        ? 'Unknown'
        : data?.supportsResponseFormat
          ? 'On'
          : 'Off';

      lines.push(`| \`${displayId}\` | ${responseFormat} | ${priceStr} |`);
    }
  }

  return lines.join('\n');
}

// ─── README update ────────────────────────────────────────────────────────────

function updateReadme(modelData) {
  const lines = fs.readFileSync(README_PATH, 'utf-8').split('\n');

  for (const section of SECTIONS) {
    const headingIdx = lines.findIndex((l) => l.trim() === section.heading);
    if (headingIdx === -1) {
      console.warn(`Warning: heading "${section.heading}" not found in README`);
      continue;
    }

    // Find the start and end of the table after this heading
    let tableStart = -1;
    let tableEnd = -1;
    for (let i = headingIdx + 1; i < lines.length; i++) {
      if (lines[i].startsWith('|')) {
        if (tableStart === -1) tableStart = i;
        tableEnd = i;
      } else if (tableStart !== -1 && tableEnd !== -1 && !lines[i].startsWith('|')) {
        break;
      }
    }

    if (tableStart === -1) {
      console.warn(`Warning: no table found under "${section.heading}"`);
      continue;
    }

    const newTableLines = generateTable(section, modelData).split('\n');
    lines.splice(tableStart, tableEnd - tableStart + 1, ...newTableLines);
  }

  fs.writeFileSync(README_PATH, lines.join('\n'));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const modelData = await fetchModelData();

  // Print results to console
  const col1 = 50;
  const col2 = 10;
  const col3 = 18;

  console.log('Estimated recipe import cost');
  console.log(`Input tokens:  ${ESTIMATED_INPUT_TOKENS}`);
  console.log(`Output tokens: ${ESTIMATED_OUTPUT_TOKENS}`);
  console.log();
  console.log(
    'Model'.padEnd(col1) +
    'Res. fmt'.padEnd(col2) +
    'Est. per recipe'
  );
  console.log('-'.repeat(col1 + col2 + col3));

  for (const section of SECTIONS) {
    console.log(`\n${section.heading}`);
    for (const group of section.groups) {
      console.log(`  ${group.label}`);
      for (const modelId of group.models) {
        const data = modelData[modelId];
        if (!data) {
          console.log(`  ${'  ' + modelId}`.padEnd(col1) + 'Not found on OpenRouter');
          continue;
        }
        const responseFormat = data.supportsResponseFormat === null
          ? '?'
          : data.supportsResponseFormat ? 'On' : 'Off';
        console.log(
          `  ${modelId}`.padEnd(col1) +
          responseFormat.padEnd(col2) +
          `$${data.price.toFixed(6)}`
        );
      }
    }
  }

  updateReadme(modelData);
  console.log('\nREADME.md updated.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
