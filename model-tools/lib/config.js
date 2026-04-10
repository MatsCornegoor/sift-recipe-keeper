// Shared config for all model-tools scripts.
// Loads OPENROUTER_API_KEY from model-tools/.env if present
// (environment variables already set take precedence).

const fs = require('fs');
const path = require('path');

// ─── .env loader ─────────────────────────────────────────────────────────────

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    // Don't override variables already set in the environment
    if (key && !(key in process.env)) process.env[key] = val;
  });
}

// ─── Constants ───────────────────────────────────────────────────────────────

module.exports = {
  OPENROUTER_ENDPOINT: 'https://openrouter.ai/api/v1/chat/completions',

  // Smart model used to generate the ground-truth dataset and rate extractions.
  DATASET_MODEL: 'google/gemini-2.5-pro',
  // DATASET_MODEL: 'anthropic/claude-sonnet-4.6',

  // Recipe pages used for testing. Edit here to add/remove test cases,
  // then re-run generateDataset.js to refresh the ground truth.
  TEST_URLS: [
    'https://www.indianhealthyrecipes.com/butter-chicken/',
    'https://www.recipetineats.com/spaghetti-bolognese/',
  ],
};
