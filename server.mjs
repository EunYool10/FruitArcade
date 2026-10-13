// Serves the built game (dist/) for hosts that run `npm start`, such as a Render web service,
// plus the score API under /api/ (server/api.mjs). GitHub Pages serves dist/ directly and calls
// this server for scores.
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { promisify } from 'node:util';
import zlib from 'node:zlib';
import { handleApi, scoresEnabled } from './server/api.mjs';

const ROOT = fileURLToPath(new URL('./dist/', import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

// When the host's build step only installs packages, build once here instead
if (!existsSync(path.join(ROOT, 'index.html')) || !existsSync(new URL('./dist-server/verify.js', import.meta.url))) {
  console.log('dist/ not found, building it now (a build command of "npm ci && npm run build" skips this)');
  execSync('npm run build', { stdio: 'inherit' });
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.webmanifest', '.svg', '.txt']);
// Async so a slow (free-tier) CPU doesn't stall other requests; quality 5 is quick and still beats gzip
const brotli = promisify(zlib.brotliCompress);
const gzip = promisify(zlib.gzip);

// Hashed build files never change; the page, service worker and manifest must always be checked
function cacheControl(rel) {
  if (rel.startsWith('assets/')) return 'public, max-age=31536000, immutable';
  if (rel === 'index.html' || rel === 'sw.js' || rel.endsWith('.webmanifest')) return 'no-cache';
  return 'public, max-age=3600';
}

/** File contents, compressed once per encoding and kept in memory (dist/ is small) */
const cache = new Map();
async function body(file, mtimeMs, encoding) {
  const key = `${file}|${mtimeMs}|${encoding}`;
  let buf = cache.get(key);
  if (!buf) {
    const raw = await readFile(file);
    if (encoding === 'br') buf = await brotli(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } });
    else if (encoding === 'gzip') buf = await gzip(raw, { level: 6 });
    else buf = raw;
    cache.set(key, buf);
  }
  return buf;
}

/** Absolute path inside dist/ for a URL path, or null if it would leave dist/ */
function fileFor(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  if (decoded.endsWith('/')) decoded += 'index.html';
  const file = path.resolve(ROOT, '.' + decoded);
  return file.startsWith(ROOT) ? file : null;
}

async function findFile(pathname) {
  const file = fileFor(pathname);
  if (!file) return null;
  const info = await stat(file).catch(() => null);
  if (info?.isFile()) return { file, info };
  // Unknown page paths get the app; missing files (e.g. an old build's chunk) stay 404
  if (!path.extname(file)) {
    const index = path.join(ROOT, 'index.html');
    return { file: index, info: await stat(index) };
  }
  return null;
}

const server = createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url || '/', 'http://localhost');
    if (pathname.startsWith('/api/')) {
      await handleApi(req, res, pathname);
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    const found = await findFile(pathname);
    if (!found) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
      return;
    }

    const { file, info } = found;
    const ext = path.extname(file).toLowerCase();
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    const etag = `W/"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}"`;
    const headers = {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Cache-Control': cacheControl(rel),
      ETag: etag,
      'X-Content-Type-Options': 'nosniff',
    };

    let encoding = 'identity';
    if (COMPRESSIBLE.has(ext)) {
      headers.Vary = 'Accept-Encoding';
      const accepts = String(req.headers['accept-encoding'] || '');
      if (/\bbr\b/.test(accepts)) encoding = 'br';
      else if (/\bgzip\b/.test(accepts)) encoding = 'gzip';
      if (encoding !== 'identity') headers['Content-Encoding'] = encoding;
    }

    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, headers).end();
      return;
    }

    const data = await body(file, info.mtimeMs, encoding);
    headers['Content-Length'] = data.length;
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Server error');
  }
});

server.listen(PORT, '0.0.0.0', () =>
  console.log(`FRUIT ARCADE serving dist/ on port ${PORT}; score checks ${scoresEnabled ? 'on' : 'off (SCORE_SECRET not set)'}`)
);
