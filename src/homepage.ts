import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { marked } from 'marked';


export async function renderHomepage(): Promise<string> {
    const readmePath = join(process.cwd(), 'README.md');
    const readmeContent = readFileSync(readmePath, 'utf8');

    // Convert markdown to HTML
    const markdownHtml = await marked(readmeContent);

    // Wrap in a complete HTML document with GitHub-like styling
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>OpenRouter Proxy</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/prismjs@1.30.0/themes/prism.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.30.0/prism.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/prismjs@1.30.0/plugins/autoloader/prism-autoloader.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
            font-size: 16px;
            line-height: 1.5;
            color: #1f2328;
            background-color: #ffffff;
            max-width: 1012px;
            margin: 0 auto;
            padding: 32px;
        }
        
        h1, h2, h3, h4, h5, h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
        }
        
        h1 {
            font-size: 2em;
            border-bottom: 1px solid #d1d9e0;
            padding-bottom: 0.3em;
        }
        
        h2 {
            font-size: 1.5em;
            border-bottom: 1px solid #d1d9e0;
            padding-bottom: 0.3em;
        }
        
        h3 { font-size: 1.25em; }
        h4 { font-size: 1em; }
        h5 { font-size: 0.875em; }
        h6 { font-size: 0.85em; color: #656d76; }
        
        p {
            margin-top: 0;
            margin-bottom: 16px;
        }
        
        a {
            color: #0969da;
            text-decoration: none;
        }
        
        a:hover {
            text-decoration: underline;
        }
        
        pre {
            background-color: #f6f8fa;
            border-radius: 6px;
            font-size: 85%;
            line-height: 1.45;
            overflow: auto;
            padding: 16px;
            margin: 16px 0;
        }
        
        code {
            background-color: #f6f8fa;
            border-radius: 6px;
            font-size: 85%;
            margin: 0;
            padding: 0.2em 0.4em;
        }
        
        pre code {
            background-color: transparent;
            border: 0;
            display: inline;
            line-height: inherit;
            margin: 0;
            overflow: visible;
            padding: 0;
            word-wrap: normal;
        }
        
        blockquote {
            border-left: 0.25em solid #d1d9e0;
            color: #656d76;
            margin: 0;
            padding: 0 1em;
        }
        
        ul, ol {
            margin-bottom: 16px;
            margin-top: 0;
            padding-left: 2em;
        }
        
        li {
            margin-bottom: 0.25em;
        }
        
        table {
            border-collapse: collapse;
            border-spacing: 0;
            display: block;
            margin-bottom: 16px;
            margin-top: 0;
            overflow: auto;
            width: 100%;
        }
        
        table th, table td {
            border: 1px solid #d1d9e0;
            padding: 6px 13px;
        }
        
        table th {
            background-color: #f6f8fa;
            font-weight: 600;
        }
        
        table tr {
            background-color: #ffffff;
            border-top: 1px solid #d1d9e0;
        }
        
        table tr:nth-child(2n) {
            background-color: #f6f8fa;
        }
        
        .actor-link-banner {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            margin-bottom: 32px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .actor-link-banner a {
            color: white;
            text-decoration: none;
            font-weight: 600;
            font-size: 18px;
        }
        
        .actor-link-banner a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="actor-link-banner">
        <a href="https://apify.com/apify/openrouter" target="_blank">🚀 View this Actor on Apify Store</a>
    </div>
    ${markdownHtml}
</body>
</html>`;

    return htmlContent;
}