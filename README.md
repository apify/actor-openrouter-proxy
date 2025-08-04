# OpenRouter Proxy

This Apify Actor creates a proxy for the Open Router API, allowing you to access multiple AI models through a unified OpenAI-compatible interface. All requests are charged to your Apify account on a pay-per-event basis.

## What this Actor does

- **Proxy access**: Routes your API requests to Open Router's extensive collection of AI models
- **OpenAI compatibility**: Works seamlessly with the OpenAI SDK and any OpenAI-compatible client
- **Transparent billing**: Charges are applied to your Apify account at the same rates as Open Router
- **Full feature support**: Supports both streaming and non-streaming responses
- **No API key management**: Uses your Apify token for authentication - no need to manage separate Open Router API keys
- **Standby mode**: Actor runs in standby mode only and has a static URL address, like a standard web server.

## Pricing

This Actor uses a pay-per-event pricing model through Apify. Each API request counts as one event, and no additional fees are applied beyond the standard Apify event pricing.

## Quick start

### 1. Install the [OpenAI package](https://www.npmjs.com/package/openai)

```bash
npm install openai
```

### 2. Basic usage

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https:/openrouter.apify.actor/api/v1',
  apiKey: 'no-key-required-but-must-not-be-empty', // Any non-empty string works; do NOT use a real API key.
  defaultHeaders: {
    Authorization: `Bearer ${process.env.APIFY_TOKEN}`, // Apify token is loaded automatically in runtime
  },
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: 'openrouter/auto',
    messages: [
      {
        role: 'user',
        content: 'What is the meaning of life?',
      },
    ],
  });

  console.log(completion.choices[0].message);
}

await main();
```

### 3. Streaming responses

```javascript
const stream = await openai.chat.completions.create({
  model: 'openrouter/auto',
  messages: [
    {
      role: 'user',
      content: 'Write a short story about a robot.',
    },
  ],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

## Available models

This proxy supports all models available through Open Router from providers including:

- OpenAI
- Anthropic
- Google
- Meta
- Perplexity
- And many more...

For a complete list of available models, visit [Open Router's models page](https://openrouter.ai/models).

## Authentication

The Actor uses your Apify token for authentication. In Apify Actor environments, `APIFY_TOKEN` is automatically available. For local development, you can:

1. Set the environment variable: `export APIFY_TOKEN=your_token_here`
2. Or pass it directly in the Authorization header
3. Find your token in the [Apify Console](https://console.apify.com/account/integrations)

## Support

For issues related to this Actor, please contact the Actor developer.
