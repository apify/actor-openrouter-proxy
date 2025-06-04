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

await server.listen({ port: 8080 });
