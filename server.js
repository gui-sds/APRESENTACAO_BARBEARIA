import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const port = Number(process.env.PORT || 3000);
http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!filename.startsWith(root + path.sep) || !types[path.extname(filename)]) {
      res.writeHead(404).end('Não encontrado');
      return;
    }
    const data = await readFile(filename);
    res.writeHead(200, { 'Content-Type': types[path.extname(filename)], 'Cache-Control': 'no-cache' }).end(data);
  } catch {
    res.writeHead(404).end('Não encontrado');
  }
}).listen(port, '127.0.0.1', () => console.log(`GS RISE Barbearia: http://localhost:${port}`));
