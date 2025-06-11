## Open Router Proxy

This actor creates a proxy for the Open Router API.

Requests will be charged to your account. Pricing is the same as Open Router prices.

Supports both streaming and non-streaming responses.

## Usage

Install the `openai` package: `npm install openai`.

Then use the following code to make requests to the Open Router API:

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://michal-kalita--actor-openrouter-proxy.apify.actor/api/v1',
  apiKey: 'no-key-required-but-must-not-be-empty', // Any non-empty string is required here; do NOT use a real API key.
  defaultHeaders: {
    Authorization: `Bearer ${process.env.APIFY_TOKEN}`, // Apify token is loaded automatically in runtime
  },
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: 'openai/gpt-4o',
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
