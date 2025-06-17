import { PassThrough } from 'node:stream';
import { text } from 'node:stream/consumers';

import FastifyProxy from '@fastify/http-proxy';
import { Actor } from 'apify';
import Fastify from 'fastify';
import type PinoPretty from 'pino-pretty';

await Actor.init();

if (Actor.config.get('metaOrigin') !== 'STANDBY') {
    await Actor.exit('This Actor is intended to run in standby mode only.');
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
if (!OPENROUTER_API_KEY) {
    await Actor.exit('OPENROUTER_API_KEY environment variable is not set. Please set it to your OpenRouter API key.');
}

const server = Fastify({
    logger: {
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                minimumLevel: 'debug',
                ignore: 'hostname,time,pid,reqId',
                messageFormat: '{if reqId}[{reqId}] {end}{msg}',
            } as PinoPretty.PrettyOptions,
        },
    },
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
    <p>Read more in <a href="https://apify.com/michal.kalita/openrouter-proxy">Actor description</a></p>
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
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onResponse: async (request, reply, res) => {
            // @ts-expect-error stream is not defined in the type definitions
            const stream = res.stream as NodeJS.ReadableStream;

            const streamClone = new PassThrough();
            stream.pipe(streamClone);

            // Direct stream to the reply, don't wait for JSON parse
            reply.send(stream);

            let response;
            try {
                // Wait for end of stream and read as text
                response = await text(streamClone);
            } catch (error) {
                request.log.error({ error }, 'Cannot read response');
                return;
            }

            let jsonString;
            const isStream = response.startsWith('data:') || response.startsWith(': OPENROUTER PROCESSING');
            if (isStream) {
                request.log.info('Stream response mode');
                const lines = response.split('\n').filter((line) => line.trim());
                jsonString = lines[lines.length - 2].replace('data: ', '');
            } else {
                jsonString = response;
            }

            let data;
            try {
                data = JSON.parse(jsonString);
            } catch (error) {
                request.log.error({ error, jsonString }, 'Failed to parse JSON response');
                return;
            }

            // eslint-disable-next-line prefer-destructuring
            const cost = data.usage.cost;
            if (!cost) {
                request.log.error({ data }, 'Cannot read cost from response');
                return;
            }

            const costWithFee = cost * 1.1; // Add 10% fee
            const count = Math.max(Math.round(costWithFee / 0.0001), 1);
            request.log.info({ originalCost: cost, costWithFee }, `Charging $0.0001 x ${count} times`);

            await Actor.charge({ eventName: 'credit-0-0001', count });
        },
    },
});

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
