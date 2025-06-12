import { PassThrough } from 'node:stream';
import { text } from 'node:stream/consumers';

import FastifyProxy from '@fastify/http-proxy';
import { Actor } from 'apify';
import Fastify from 'fastify';

await Actor.init();

if (Actor.config.get('metaOrigin') !== 'STANDBY') {
    await Actor.exit('This Actor is intended to run in standby mode only.');
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
if (!OPENROUTER_API_KEY) {
    await Actor.exit('OPENROUTER_API_KEY environment variable is not set. Please set it to your OpenRouter API key.');
}

const server = Fastify({
    logger: true,
});

server.get('/', async (request, reply) => {
    if (request.headers['x-apify-container-server-readiness-probe']) {
        return reply.status(200).send('ok');
    }
    return reply.status(200).type('text/html').send(`<!DOCTYPE html>
<html>
<head>
    <title>Open Router proxy Actor</title>
</head>
<body>
    <h1>Open Router proxy Actor</h1>
    <p>This proxy is usable with <a href="https://github.com/openai/openai-node">OpenAI library</a></p>
    <p>Read more in <a href="https://apify.com/michal.kalita/actor-openrouter-proxy">Actor description</a></p>
</body>
</html>`);
});

server.register(FastifyProxy, {
    upstream: 'https://openrouter.ai',
    prefix: '/api',
    rewritePrefix: '/api',
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    preHandler: async (request) => {
        request.headers.authorization = `Bearer ${OPENROUTER_API_KEY}`;
        request.headers['accept-encoding'] = 'identity'; // Disable content-encoding

        if (typeof request.body === 'object' && request.body !== null) {
            // Force request for usage data to calculate prices
            (request.body as Record<string, unknown>).usage = { include: true };
        }
    },
    proxyPayloads: false, // Disable proxy payload, request body will be decoded and modified by preHandler
    replyOptions: {
        onResponse: (request, reply, res) => {
            // @ts-expect-error stream is not defined in the type definitions
            const stream = res.stream as NodeJS.ReadableStream;

            const streamClone = new PassThrough();
            stream.pipe(streamClone);

            // Direct stream to the reply, don't wait for JSON parse
            reply.send(stream);

            // Wait for end of stream and read as text
            text(streamClone)
                .then((response) => {
                    const isStream = response.startsWith('data:') || response.startsWith(': OPENROUTER PROCESSING');

                    if (isStream) {
                        request.log.info('Stream response mode');
                        const lines = response.split('\n').filter((line) => line.trim());
                        const data = JSON.parse(lines[lines.length - 2].replace('data: ', ''));
                        return data.usage?.cost || 0;
                    }

                    request.log.info('Single response mode');
                    const json = JSON.parse(response);
                    request.log.info(`Cost ${json.usage.cost}`);
                    return json.usage?.cost || 0;
                })
                .then(chargeUser)
                .catch(console.error);
        },
    },
});

async function chargeUser(amount: number) {
    const chargePrice = amount * 1.1; // Add 10% fee
    const count = Math.max(Math.round(chargePrice / 0.0001), 1);
    console.log(`Charging $${chargePrice}, by charge $0.0001 x ${count} times`);
    await Actor.charge({ eventName: 'credit-0-0001', count });
}

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully');
    await server.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully');
    await server.close();
    process.exit(0);
});

const port = Actor.config.get('standbyPort');
await server.listen({ port, host: '0.0.0.0' });
