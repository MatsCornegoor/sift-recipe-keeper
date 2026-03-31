# Sift - Recipe Keeper

A minimalist recipe keeper that uses AI to extract clean recipes from any website — no ads, no stories, just the recipe.

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

### OpenRouter

Endpoint: `https://openrouter.ai/api/v1/chat/completions`

**Good quality — best balance between accuracy and price**

| Model name | Response format |
|---|---|
| `google/gemma-3-27b-it` | On |
| `mistralai/mistral-small-3.2-24b-instruct` | On |
| `qwen/qwen3-coder-30b-a3b-instruct` | On |

**Great quality, but more expensive**

| Model name | Response format |
|---|---|
| `google/gemini-2.5-flash` | On |

**Medium quality, cheap, but prone to mistakes**

| Model name | Response format |
|---|---|
| `google/gemma-3-12b-it` | On |
| `meta-llama/llama-3.1-8b-instruct` | On |


### OpenAI

Endpoint: `https://api.openai.com/v1/chat/completions`

**Good quality — best balance between accuracy and price**

| Model name | Response format |
|---|---|
| `gpt-4o-mini` | On |
| `gpt-5.4-nano` | On |

**Great quality, but more expensive**

| Model name | Response format |
|---|---|
| `gpt-5.4-mini` | On |

> Models not listed here may still work. If you find a model that works well, feel free to open a PR.


## Building from Source

See [BUILD.md](BUILD.md) for full instructions.
