const fs = require('fs');
const path = require('path');

// Models from the README (OpenRouter model IDs)
const MODELS = [
  'google/gemma-3-27b-it',
  'mistralai/mistral-small-3.2-24b-instruct',
  'qwen/qwen3-coder-30b-a3b-instruct',
  'google/gemini-2.5-flash',
  'google/gemma-3-12b-it',
  'meta-llama/llama-3.1-8b-instruct',
  'openai/gpt-4o-mini',
  'openai/gpt-5.4-nano',
  'openai/gpt-5.4-mini',
];

// Estimated token usage per recipe import
// Input: scraped webpage HTML + system prompt
// Output: structured recipe JSON
const ESTIMATED_INPUT_TOKENS = 3000;
const ESTIMATED_OUTPUT_TOKENS = 1000;

const README_PATH = path.join(__dirname, 'README.md');

async function fetchPrices() {
  const response = await fetch('https://openrouter.ai/api/v1/models');
  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
  }

  const { data: models } = await response.json();
  const modelMap = Object.fromEntries(models.map((m) => [m.id, m]));

  const prices = {};
  for (const modelId of MODELS) {
    const model = modelMap[modelId];
    if (!model) continue;

    const inputPricePerToken = parseFloat(model.pricing.prompt);
    const outputPricePerToken = parseFloat(model.pricing.completion);
    const cost =
      inputPricePerToken * ESTIMATED_INPUT_TOKENS +
      outputPricePerToken * ESTIMATED_OUTPUT_TOKENS;

    // Index by full ID (e.g. "openai/gpt-4o-mini") and short name (e.g. "gpt-4o-mini")
    prices[modelId] = cost;
    const shortName = modelId.includes('/') ? modelId.split('/').slice(1).join('/') : modelId;
    prices[shortName] = cost;
  }
  return prices;
}

function processRow(line, tableHasPrice, prices) {
  const parts = line.split('|');
  // parts = ['', col1, col2, ..., '']

  const cols = parts.slice(1, -1);

  // Header row
  if (cols.some((c) => c.trim() === 'Model name')) {
    if (!tableHasPrice) {
      cols.push(' Est. price ');
    } else {
      cols[cols.length - 1] = ' Est. price ';
    }
    return ['', ...cols, ''].join('|');
  }

  // Separator row
  if (cols.every((c) => /^-+$/.test(c.trim()))) {
    if (!tableHasPrice) {
      cols.push('---');
    }
    return ['', ...cols, ''].join('|');
  }

  // Data row — look for a model ID in backticks in the first column
  const modelMatch = cols[0]?.match(/`([^`]+)`/);
  if (modelMatch) {
    const modelId = modelMatch[1];
    const price = prices[modelId];
    const priceStr = price !== undefined ? `$${price.toFixed(6)}` : 'N/A';

    if (!tableHasPrice) {
      cols.push(` ${priceStr} `);
    } else {
      cols[cols.length - 1] = ` ${priceStr} `;
    }
  } else if (!tableHasPrice) {
    // Label row (e.g. quality heading) — add empty cell to keep column count consistent
    cols.push(' ');
  }

  return ['', ...cols, ''].join('|');
}

function updateReadme(prices) {
  const lines = fs.readFileSync(README_PATH, 'utf-8').split('\n');
  const result = [];

  let inTable = false;
  let tableHasPrice = false;

  for (const line of lines) {
    if (line.startsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableHasPrice = line.includes('Est. price');
      }
      result.push(processRow(line, tableHasPrice, prices));
    } else {
      inTable = false;
      tableHasPrice = false;
      result.push(line);
    }
  }

  fs.writeFileSync(README_PATH, result.join('\n'));
}

async function main() {
  const prices = await fetchPrices();

  // Print results to console
  const col1 = 50;
  const col2 = 18;
  const col3 = 18;

  console.log(`Estimated recipe import cost`);
  console.log(`Input tokens:  ${ESTIMATED_INPUT_TOKENS}`);
  console.log(`Output tokens: ${ESTIMATED_OUTPUT_TOKENS}`);
  console.log();
  console.log(
    'Model'.padEnd(col1) +
    'Input ($/1M)'.padEnd(col2) +
    'Output ($/1M)'.padEnd(col3) +
    'Est. per recipe'
  );
  console.log('-'.repeat(col1 + col2 + col3 + 16));

  const { data: models } = await (await fetch('https://openrouter.ai/api/v1/models')).json();
  const modelMap = Object.fromEntries(models.map((m) => [m.id, m]));

  for (const modelId of MODELS) {
    const model = modelMap[modelId];
    if (!model) {
      console.log(modelId.padEnd(col1) + 'Not found on OpenRouter');
      continue;
    }

    const inputPricePerToken = parseFloat(model.pricing.prompt);
    const outputPricePerToken = parseFloat(model.pricing.completion);
    const inputPricePerMillion = inputPricePerToken * 1_000_000;
    const outputPricePerMillion = outputPricePerToken * 1_000_000;
    const estimatedCost =
      inputPricePerToken * ESTIMATED_INPUT_TOKENS +
      outputPricePerToken * ESTIMATED_OUTPUT_TOKENS;

    console.log(
      modelId.padEnd(col1) +
      `$${inputPricePerMillion.toFixed(2)}`.padEnd(col2) +
      `$${outputPricePerMillion.toFixed(2)}`.padEnd(col3) +
      `$${estimatedCost.toFixed(6)}`
    );
  }

  // Update README
  updateReadme(prices);
  console.log('\nREADME.md updated with estimated prices.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
