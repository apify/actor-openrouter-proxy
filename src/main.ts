import { PassThrough } from 'node:stream';
import { text } from 'node:stream/consumers';

import FastifyProxy from '@fastify/http-proxy';
import { Actor } from 'apify';
import Fastify from 'fastify';

await Actor.init();

const OPENROUTER_KEY = process.env.OPENROUTER_KEY || '';
if (!OPENROUTER_KEY) {
    await Actor.exit('OPENROUTER_KEY environment variable is not set. Please set it to your OpenRouter API key.');
}

const server = Fastify({
    logger: true,
});

server.get('/', async (request, reply) => {
    if (request.headers['x-apify-container-server-readiness-probe']) {
        return reply.status(200).send('ok');
    }

    return reply.status(200).send('Hello from Actor Standby!');
});

server.register(FastifyProxy, {
    upstream: 'https://openrouter.ai',
    prefix: '/api',
    rewritePrefix: '/api',
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    preHandler: async (request) => {
        request.headers.authorization = `Bearer ${OPENROUTER_KEY}`;

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

            const streamClone = new PassThrough()
            stream.pipe(streamClone);

            // Direct stream to the reply, don't wait for JSON parse
            reply.send(stream);

            // Wait for end of stream and read as text
            text(streamClone).then(async (textResponse) => {
                // console.log('Response text:', textResponse);

                const json = JSON.parse(textResponse); // Parse the JSON response
                request.log.info(`Cost ${json.usage.cost}`);

                return triggerPricing(json.usage.cost)
            }).catch(console.error);
        },
    },
});

async function triggerPricing(amount: number) {
    // const allowedAmounts = [
    //     0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01, 0.02, 0.03, 0.04, 0.05, 0.1,
    // ];
    // const closestAmount = allowedAmounts.reduce((prev, curr) => {
    //     return Math.abs(curr - amount) < Math.abs(prev - amount) ? curr : prev;
    // });
    const count = Math.max(Math.round(amount / 0.001), 1);
    console.log(`Charging $${amount}, by charge $0.001 x ${count} times`);
    await Actor.charge({ eventName: 'credit-0-001', count });
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

await server.listen({ port: Actor.config.get('standbyPort'), host: '0.0.0.0' });
