import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const publicDir = path.join(rootDir, 'apps', 'web', 'public');
const PORT = Number(process.env.PORT || 4000);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'content-type': type,
    'cache-control': 'no-store'
  });
  res.end(body);
}

function safeJoin(base, target) {
  const targetPath = path.normalize(path.join(base, target));
  if (!targetPath.startsWith(base)) return null;
  return targetPath;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(url.pathname);

  if (pathname === '/health') {
    return send(res, 200, JSON.stringify({ ok: true, app: 'Fandqi Central Core' }), 'application/json; charset=utf-8');
  }

  if (pathname === '/') pathname = '/index.html';

  const filePath = safeJoin(publicDir, pathname);
  if (!filePath) return send(res, 403, 'Forbidden');

  fs.readFile(filePath, (error, data) => {
    if (error) {
      fs.readFile(path.join(publicDir, 'index.html'), (fallbackError, fallbackData) => {
        if (fallbackError) return send(res, 404, 'Not found');
        return send(res, 200, fallbackData, mimeTypes['.html']);
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    return send(res, 200, data, mimeTypes[ext] || 'application/octet-stream');
  });
});

server.listen(PORT, () => {
  console.log(`Fandqi Central Core running on http://localhost:${PORT}`);
  console.log('Demo logins: platform@fandqi.com / manager@fandqi.com / reception@fandqi.com (password: 123456)');
});
