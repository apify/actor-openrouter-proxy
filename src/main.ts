import { PassThrough } from 'node:stream';
import { text } from 'node:stream/consumers';

import FastifyProxy from '@fastify/http-proxy';
import { Actor } from 'apify';
import Fastify from 'fastify';
import type PinoPretty from 'pino-pretty';

import { renderHomepage } from './homepage.js';

await Actor.init();

if (Actor.config.get('metaOrigin') !== 'STANDBY') {
    await Actor.exit('This Actor is intended to run in standby mode only. Look at the README.md or https://apify.com/apify/openrouter for more information.');
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

let homepageContent: string | undefined;
server.get('/', async (request, reply) => {
    if (request.headers['x-apify-container-server-readiness-probe']) {
        return reply.status(200).send('ok');
    }

    try {
        if (!homepageContent) {
            homepageContent = await renderHomepage();
        }

        return reply.status(200).type('text/html').send(homepageContent);
    } catch (error) {
        request.log.error({ error }, 'Failed to read README file');
        return reply.status(500).send('Failed to read README file');
    }
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
            // Stream must start with 'data:', but it's allowd to send just ":" to keep the connection alive
            const isStream = response.startsWith('data:') || response.startsWith(':');
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

            const cost = data?.usage?.cost;
            if (!cost || typeof cost !== 'number') {
                request.log.error({ data }, 'Cannot read cost from response');
                return;
            }

            // The Apify platform doesn't have a function for dynamic pricing. The price is calculated as a count of $0.0001 charges.
            const count = Math.max(Math.round(cost / 0.0001), 1);
            request.log.info({ cost }, `Charging $0.0001 x ${count} times`);

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
