// Servidor local que imita a Vercel: arquivos estáticos + /api/* (funções serverless).
// Uso:  DATABASE_URL=postgres://... ADMIN_PASSWORD=teste node dev-server.mjs
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = fileURLToPath(new URL('.', import.meta.url));
const PORTA = Number(process.env.PORT || 3000);
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon', '.pdf': 'application/pdf' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) {
      const nome = url.pathname.replace('/api/', '').replace(/[^a-z0-9_-]/gi, '');
      const mod = await import(pathToFileURL(join(RAIZ, 'api', `${nome}.js`)).href);
      let corpo = '';
      for await (const c of req) corpo += c;
      req.query = Object.fromEntries(url.searchParams);
      req.body = corpo ? (() => { try { return JSON.parse(corpo); } catch { return corpo; } })() : {};
      res.status = (n) => { res.statusCode = n; return res; };
      res.json = (o) => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); return res; };
      return await mod.default(req, res);
    }
    let caminho = url.pathname === '/' ? '/index.html' : url.pathname;
    if (!extname(caminho)) caminho += '.html';
    const arq = normalize(join(RAIZ, caminho));
    if (!arq.startsWith(RAIZ)) { res.statusCode = 403; return res.end('403'); }
    const dados = await readFile(arq);
    res.setHeader('Content-Type', TIPOS[extname(arq)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(dados);
  } catch (e) {
    if (e.code === 'ENOENT') { res.statusCode = 404; return res.end('404'); }
    console.error(e); res.statusCode = 500; res.end('erro');
  }
}).listen(PORTA, () => console.log(`Dev server em http://localhost:${PORTA}  ( / · /telao · /admin )`));
