# Sift - Recipe Keeper

A minimalist recipe keeper that uses AI to extract clean recipes from any website. No ads, no stories, just the recipe.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)


## Features

- **Free & Open Source** — No ads, no subscriptions, no hidden costs.
- **Unlimited Recipes** — Everything stored locally on your device.
- **Import from Any Website** — Save recipes with a single tap.
- **Bring Your Own Model** — Connect to any OpenAI-compatible API for full control over your data and costs.


## How It Works

Sift fetches a webpage and uses AI to extract just the recipe, leaving behind ads, stories, and other clutter. You get a clean, easy-to-follow recipe card.

To get started, go to `Settings > AI Setup` and enter your provider's API Endpoint, Model Name, and API Key.


## Supported Models

Sift works with any provider that supports the OpenAI API format. Below are tested models split by provider that work well with Sift.

> Models not listed here may still work. If you find a model that works well, feel free to open a PR.


### OpenRouter

Endpoint: `https://openrouter.ai/api/v1/chat/completions`

| Model name | Response format | Est. price |
|---|---|---|
| **Good quality, best balance between accuracy and price** | | |
| `google/gemma-3-27b-it` | On | $0.000400 |
| `mistralai/mistral-small-3.2-24b-instruct` | On | $0.000425 |
| `qwen/qwen3-coder-30b-a3b-instruct` | On | $0.000480 |
| **Great quality, but more expensive** | | |
| `google/gemini-2.5-flash` | On | $0.003400 |
| **Medium quality, cheap, but prone to mistakes** | | |
| `google/gemma-3-12b-it` | On | $0.000250 |
| `meta-llama/llama-3.1-8b-instruct` | On | $0.000110 |


### OpenAI

Endpoint: `https://api.openai.com/v1/chat/completions`

| Model name | Response format | Est. price |
|---|---|---|
| **Good quality, best balance between accuracy and price** | | |
| `gpt-4o-mini` | On | $0.001050 |
| `gpt-5.4-nano` | On | $0.001850 |
| **Great quality, but more expensive** | | |
| `gpt-5.4-mini` | On | $0.006750 |




## Roadmap


### Documentation Improvements
- [X] Short and clear documentation
- [X] List with supported models + estimated pricing
- [X] Collaboration guidelines


### UX Improvements
- [X] Improved introduction flow
- [ ] Multilayer menu to keep interface clean, but add extra functions
- [X] Clear error messages


### Import via Share Action
- [ ] By clicking the share link option in e.g. a web browser, users can send a URL directly to the Sift app for easy imports.


### Recipe Sharing
- [ ] ZIP archives will get a custom `.sift` extension to auto-open the Sift app when clicked.
- [ ] Recipes will get a share button to easily share a recipe archive with people on messaging apps.


## Building from Source

See [BUILD.md](BUILD.md) for full instructions.
