// Shared config for generateDataset.js and testModels.js

module.exports = {
  OPENROUTER_ENDPOINT: 'https://openrouter.ai/api/v1/chat/completions',

  // Smart model used to generate the ground-truth dataset (run once).
  DATASET_MODEL: 'google/gemini-2.5-pro',

  // Recipe pages used for testing. Edit here to add/remove test cases.
  TEST_URLS: [
    'https://www.indianhealthyrecipes.com/butter-chicken/',
    'https://www.recipetineats.com/spaghetti-bolognese/',
  ],
};
