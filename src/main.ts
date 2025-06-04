import http from 'node:http';
import https from 'node:https';

import { Actor } from 'apify';

await Actor.init();

const TARGET_HOST = 'openrouter.ai';

const OPENROUTER_KEY = process.env.OPENROUTER_KEY || '';
if (!OPENROUTER_KEY) {
    await Actor.exit('OPENROUTER_KEY environment variable is not set. Please set it to your OpenRouter API key.');
}

const server = http.createServer((req, res) => {
    // Handle Apify standby readiness probe
    if (req.headers['x-apify-container-server-readiness-probe']) {
        res.writeHead(200);
        res.end('ok');
        return;
    }

    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Hello from Actor Standby!\n');
        return;
    }

    // Clone and modify the incoming request headers
    const headers = { ...req.headers };
    delete headers.host;
    headers.host = TARGET_HOST;
    headers.authorization = `Bearer ${OPENROUTER_KEY}`;

    // Set options for the outgoing proxy request
    const options = {
        hostname: TARGET_HOST,
        // port: TARGET_PORT,
        path: req.url || '/',
        method: req.method,
        headers,
    };

    console.log('Proxying request', options);

    // Make the proxy request to the target server
    const proxyReq = https.request(options, (proxyRes) => {
        let body = '';
        console.log('Proxy response headers:', proxyRes.headers);

        proxyRes.on('data', (chunk) => {
            body += chunk;
        });

        proxyRes.on('end', () => {
            res.writeHead(proxyRes.statusCode || 200, { 'Content-Type': 'application/json' });
            try {
                const jsonData = JSON.parse(body);
                res.end(JSON.stringify(jsonData, null, 2));
            } catch (error) {
                res.end(body);
                console.error('Error parsing JSON response:', error);
            }
        });
    });

    // Handle errors on the proxy request
    proxyReq.on('error', (error) => {
        console.error('Proxy request error:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal server error');
    });

    req.pipe(proxyReq);
});

const PORT = 8080;
server.listen(PORT, () => {
    console.log(`Proxy server is running on port ${PORT}`);
});
