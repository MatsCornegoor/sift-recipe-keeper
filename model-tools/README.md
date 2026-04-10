# Model Tools

Scripts for managing and benchmarking the AI models used by Sift.

## Setup

Copy `.env.example` to `.env` and add your OpenRouter API key:

```
OPENROUTER_API_KEY=your_key_here
```

## Adding a model

Open `supportedModels.json` and add the model ID to the appropriate section and group:

```json
{
  "label": "Good quality, best balance between accuracy and price",
  "models": [
    "google/gemma-3-27b-it",
    "your/new-model-id"   ← add here
  ]
}
```

Use the [OpenRouter model ID](https://openrouter.ai/models) exactly as listed.
For OpenAI models, use the `openai/` prefix (e.g. `openai/gpt-4o-mini`).

To update the pricing table in README.md after adding a model:

```bash
node model-tools/scripts/supportedModels.js
```

## Running benchmark tests

**Step 1 — generate the ground-truth dataset** (once, or when test URLs change):

```bash
node model-tools/scripts/generateDataset.js
```

This fetches each test URL and extracts a reference recipe using a smart model.
The result is saved to `cache/groundTruth.json`.

**Step 2 — benchmark all models**:

```bash
node model-tools/scripts/testModels.js
```

Each model extracts the same recipes and is rated against the ground truth by the
smart model. Extractions are cached in `cache/modelExtractions.json` — re-runs skip
already-extracted models and go straight to rating.

To force a full re-run, delete `cache/modelExtractions.json`.

## File structure

```
model-tools/
  lib/
    config.js          — shared config and .env loader
    extract.js         — HTML fetching and recipe extraction (mirrors the app)
    scoring.js         — deterministic scoring utilities (unused, kept for reference)
  scripts/
    generateDataset.js — generates testDataset.json
    testModels.js      — benchmarks all models
    supportedModels.js — updates README.md pricing tables
  supportedModels.json — model list (edit this to add/remove models)
  cache/
    groundTruth.json   — ground-truth recipes extracted by smart model (gitignored)
    modelExtractions.json — cached per-model extractions (gitignored)
  .env                 — API keys (gitignored)
  .env.example         — template for .env
```


Last score:
========================================================================
SUMMARY (sorted by score)
========================================================================
Model                                                Score     %
------------------------------------------------------------------------
google/gemini-2.5-flash                              100/100  ██████████ 100%
mistralai/mistral-small-3.2-24b-instruct              94/100  █████████  94%
openai/gpt-5.4-nano                                   93/100  █████████  93%
google/gemma-3-27b-it                                 80/100  ████████   80%
openai/gpt-5.4-mini                                   79/100  ████████   79%
openai/gpt-4o-mini                                    78/100  ████████   78%
qwen/qwen3-coder-30b-a3b-instruct                     75/100  ████████   75%
arcee-ai/trinity-large-preview:free                   75/100  ████████   75%
google/gemma-4-31b-it                                 64/100  ██████     64%
meta-llama/llama-3.1-8b-instruct                      64/100  ██████     64%
google/gemma-3-12b-it                                 48/100  █████      48%