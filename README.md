## Open Router Proxy

This actor creates a proxy for the Open Router API.

Requests will be charged to your account. Pricing is the same as Open Router prices.

Supports both streaming and non-streaming responses.

## Usage
Use the same code as in Open Router: https://openrouter.ai/docs/quickstart#using-the-openai-sdk

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://michal-kalita--actor-openrouter-proxy.apify.actor/api/v1',
  apiKey: 'placeholder', // don't use a real key here, but a key is required and cannot be an empty string
  defaultHeaders: {
    Authorization: `Bearer ${process.env.APIFY_TOKEN || ''}`, // token is loaded automatically in runtime
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

main();
```