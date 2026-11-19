/* Servidor estático mínimo para la carpeta `dist/` de la aplicación (solo escucha en loopback).
   No ejecuta nada del repositorio: solo lee archivos. Se usa en lugar de `vite preview`, que necesita
   escribir un archivo temporal junto a `vite.config.ts` y el repositorio se monta en solo lectura.
   Uso: IYG_DIST=/ruta/dist PUERTO=4173 node scripts/servir.mjs */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const raiz = path.resolve(process.env.IYG_DIST ?? '');
const puerto = Number(process.env.PUERTO ?? 4173);
const tipos = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json', '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  try {
    const ruta = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    let archivo = path.join(raiz, ruta);
    if (!archivo.startsWith(raiz)) throw new Error('fuera de dist');
    const info = await stat(archivo).catch(() => null);
    // Sin archivo, la aplicación de una sola página responde con index.html.
    if (!info || info.isDirectory()) archivo = path.join(raiz, 'index.html');
    const cuerpo = await readFile(archivo);
    res.writeHead(200, { 'Content-Type': tipos[path.extname(archivo)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(cuerpo);
  } catch {
    res.writeHead(404).end('no encontrado');
  }
}).listen(puerto, '127.0.0.1', () => console.log(`dist servido en http://127.0.0.1:${puerto}`));
