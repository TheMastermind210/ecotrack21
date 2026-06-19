import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import {
  HttpError,
  createNarrativeWithOpenRouter,
  parseActivityWithOpenRouter,
  readJsonBody,
  validateActivityPayload,
  validateHistoryPayload,
} from './openRouterProxy.mjs';

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
};

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

export function setSecurityHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  response.setHeader('X-Frame-Options', 'DENY');
}

function createRateLimiter() {
  const clients = new Map();
  return clientId => {
    const now = Date.now();
    const current = clients.get(clientId);
    if (!current || now - current.startedAt >= WINDOW_MS) {
      clients.set(clientId, { count: 1, startedAt: now });
      return true;
    }
    current.count += 1;
    return current.count <= MAX_REQUESTS_PER_WINDOW;
  };
}

export function isAllowedOrigin(request, allowedOrigins) {
  const origin = request.headers.origin;
  if (!origin) return true;

  const forwardedProto = request.headers['x-forwarded-proto'];
  const protocol = typeof forwardedProto === 'string' ? forwardedProto : 'http';
  const host = request.headers.host;
  const sameOrigin = host ? `${protocol}://${host}` : '';
  return origin === sameOrigin || allowedOrigins.has(origin);
}

function safeStaticPath(distDir, pathname) {
  const decoded = decodeURIComponent(pathname);
  const requested = normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  const absolute = resolve(distDir, `.${requested}`);
  return absolute.startsWith(resolve(distDir)) ? absolute : null;
}

function serveStatic(response, distDir, pathname) {
  let filePath = safeStaticPath(distDir, pathname);
  if (!filePath) return false;

  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(distDir, 'index.html');
  }
  if (!existsSync(filePath)) return false;

  response.writeHead(200, {
    'Content-Type': MIME_TYPES[extname(filePath)] || 'application/octet-stream',
    'Cache-Control': filePath.endsWith('index.html')
      ? 'no-cache'
      : 'public, max-age=31536000, immutable',
  });
  createReadStream(filePath).pipe(response);
  return true;
}

export function createEcoTrackServer({
  apiKey = process.env.OPENROUTER_API_KEY || '',
  model = process.env.OPENROUTER_MODEL,
  fetchImpl = fetch,
  distDir = resolve('dist'),
  apiOnly = false,
  allowedOrigins = new Set(
    (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean),
  ),
} = {}) {
  const allowRequest = createRateLimiter();

  return createServer(async (request, response) => {
    setSecurityHeaders(response);

    try {
      const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

      if (url.pathname.startsWith('/api/')) {
        if (!isAllowedOrigin(request, allowedOrigins)) {
          throw new HttpError(403, 'Origin is not allowed');
        }
        if (!allowRequest(request.socket.remoteAddress || 'unknown')) {
          response.setHeader('Retry-After', '60');
          throw new HttpError(429, 'Too many requests');
        }

        if (request.method === 'GET' && url.pathname === '/api/health') {
          sendJson(response, 200, {
            status: 'ok',
            aiConfigured: Boolean(apiKey),
          });
          return;
        }

        if (request.method !== 'POST') {
          throw new HttpError(405, 'Method not allowed');
        }
        if (!String(request.headers['content-type'] || '').startsWith('application/json')) {
          throw new HttpError(415, 'Content-Type must be application/json');
        }

        const body = await readJsonBody(request);
        const providerOptions = { apiKey, fetchImpl, ...(model ? { model } : {}) };

        if (url.pathname === '/api/parse-activity') {
          const text = validateActivityPayload(body);
          const result = await parseActivityWithOpenRouter(providerOptions, text);
          sendJson(response, 200, result);
          return;
        }

        if (url.pathname === '/api/attribution') {
          const history = validateHistoryPayload(body);
          const narrative = await createNarrativeWithOpenRouter(providerOptions, history);
          sendJson(response, 200, { narrative });
          return;
        }

        throw new HttpError(404, 'API endpoint not found');
      }

      if (!apiOnly && (request.method === 'GET' || request.method === 'HEAD')) {
        if (serveStatic(response, distDir, url.pathname)) return;
      }

      throw new HttpError(404, 'Not found');
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof HttpError
        ? error.message
        : 'Internal server error';
      if (!response.headersSent) sendJson(response, status, { error: message });
      else response.end();
    }
  });
}
