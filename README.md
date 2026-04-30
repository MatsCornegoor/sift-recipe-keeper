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

| Model name | Response format | Images | Est. price |
|---|---|---|---|
| **Good quality, best balance between accuracy and price** | | | |
| `mistralai/mistral-small-2603` | On | Yes | $0.001050 |
| `mistralai/mistral-small-3.2-24b-instruct` | On | Yes | $0.000425 |
| `minimax/minimax-m2.5` | On | No | $0.001600 |
| `stepfun/step-3.5-flash` | On | No | $0.000600 |
| `google/gemma-4-31b-it` | On | Yes | $0.000770 |
| `google/gemini-2.5-flash-lite` | On | Yes | $0.000700 |
| `qwen/qwen3.6-35b-a3b` | On | Yes | $0.001449 |
| **Great quality, but more expensive** | | | |
| `google/gemini-2.5-flash` | On | Yes | $0.003400 |
| `moonshotai/kimi-k2.6` | On | Yes | $0.005750 |



### OpenAI

Endpoint: `https://api.openai.com/v1/chat/completions`

| Model name | Response format | Images | Est. price |
|---|---|---|---|
| **Good quality, best balance between accuracy and price** | | | |
| `gpt-5.4-nano` | On | Yes | $0.001850 |
| `gpt-4o-mini` | On | Yes | $0.001050 |
| **Great quality, but more expensive** | | | |
| `gpt-5.4-mini` | On | Yes | $0.006750 |



## Building from Source

See [BUILD.md](BUILD.md) for full instructions.
