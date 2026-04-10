#!/usr/bin/env node

// Generates testDataset.json — a ground-truth dataset used by testModels.js.
// Run this once (or whenever TEST_URLS change) before running tests.
//
// Usage:
//   node model-tools/scripts/generateDataset.js

const fs = require('fs');
const path = require('path');
const { fetchAndClean, extractRecipe } = require('../lib/extract');
const { TEST_URLS, DATASET_MODEL } = require('../lib/config');

const DATASET_PATH = path.join(__dirname, '..', 'cache', 'groundTruth.json');
const API_KEY = process.env.OPENROUTER_API_KEY;

async function main() {
  if (!API_KEY) {
    console.error('Error: OPENROUTER_API_KEY is not set. Add it to model-tools/.env or set it in your environment.');
    process.exit(1);
  }

  console.log(`Generating ground-truth dataset using ${DATASET_MODEL}`);
  console.log(`${TEST_URLS.length} URLs to process\n`);

  const entries = [];

  for (const url of TEST_URLS) {
    process.stdout.write(`Fetching ${url.slice(0, 60)}... `);
    let cleanContent;
    try {
      cleanContent = await fetchAndClean(url);
      console.log('done');
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      process.exit(1);
    }

    process.stdout.write(`Extracting with ${DATASET_MODEL}... `);
    try {
      const recipe = await extractRecipe(DATASET_MODEL, cleanContent, API_KEY);
      console.log(`done — "${recipe.name}"`);
      entries.push({ url, recipe });
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      process.exit(1);
    }
  }

  const dataset = {
    generatedAt: new Date().toISOString(),
    model: DATASET_MODEL,
    entries,
  };

  fs.writeFileSync(DATASET_PATH, JSON.stringify(dataset, null, 2));
  console.log(`\nGround truth saved to model-tools/cache/groundTruth.json`);
  console.log('Run testModels.js to benchmark models against it.');
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
