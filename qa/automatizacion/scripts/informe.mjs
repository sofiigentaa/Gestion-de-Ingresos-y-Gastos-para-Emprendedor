/* Convierte test-results/resultados.json en el registro de la ejecución:
   ../ejecuciones/21.80-evidencia-AAAA-MM-DD-playwright.md
   Uso: [IYG_INFORME=original] node scripts/informe.mjs ["versión probada"] */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const datos = JSON.parse(readFileSync(path.join(raiz, 'test-results/resultados.json'), 'utf8'));
const version = process.argv[2] ?? 'sin indicar';
const sufijo = process.env.IYG_INFORME ? `-${process.env.IYG_INFORME}` : '';
const hoy = new Date().toLocaleDateString('sv-SE');

const filas = [];
(function recorrer(suites) {
  for (const s of suites ?? []) {
    for (const spec of s.specs ?? []) {
      for (const t of spec.tests) {
        const r = t.results.at(-1) ?? {};
        filas.push({
          archivo: spec.file, titulo: spec.title.replace(/\s@\S+/g, ''), proyecto: t.projectName,
          estado: t.status, ms: r.duration ?? 0,
          observado: (t.annotations ?? []).filter((a) => a.type === 'observado').map((a) => a.description),
          error: (r.errors ?? []).map((e) => e.message).join('\n').replace(/\u001b\[[0-9;]*m/g, '').replaceAll(raiz + path.sep, ''),
        });
      }
    }
    recorrer(s.suites);
  }
})(datos.suites);

const paso = (f) => f.estado === 'expected';
const fallan = filas.filter((f) => !paso(f));
const l = [
  `# 21.80 Ejecución automática del ${hoy} (Playwright)`, '',
  `- Versión probada: ${version}.`,
  `- Herramienta: Playwright ${datos.config.version}, Chrome del equipo.`,
  '- Entorno: aislado con `bwrap` (`correr.sh`), sin red; la aplicación se sirve desde su `dist/` en loopback (modo local, sin Supabase).',
  '- Reloj simulado: 2026-11-19 12:00 (Buenos Aires); cada prueba abre la aplicación en un contexto nuevo, con los datos de prueba del plan (DS-01) o los que indica el caso.',
  `- Resultado: **${filas.length - fallan.length} de ${filas.length} pruebas pasan**.`, '',
  '## Resumen', '', '| Prueba | Proyecto | Resultado | Tiempo |', '|---|---|---|---|',
  ...filas.map((f) => `| ${f.titulo} | ${f.proyecto} | ${paso(f) ? 'Pasa' : '**Falla**'} | ${(f.ms / 1000).toFixed(1)} s |`),
];
if (fallan.length) {
  l.push('', '## Fallas', '');
  for (const f of fallan) l.push(`### ${f.titulo} (${f.proyecto})`, '', `Archivo: \`tests/${f.archivo}\``, '', '```', f.error.trim().split('\n').slice(0, 25).join('\n'), '```', '');
}
const observados = filas.filter((f) => f.observado.length);
if (observados.length) {
  l.push('## Observado sin resultado esperado definido', '', 'Pasos del plan marcados `[A]`: la prueba no afirma nada y anota lo que hizo la aplicación.', '');
  for (const f of observados) for (const o of f.observado) l.push(`- ${f.titulo}: ${o}`);
  l.push('');
}
const salida = path.resolve(raiz, '../ejecuciones');
mkdirSync(salida, { recursive: true });
const destino = path.join(salida, `21.80-evidencia-${hoy}-playwright${sufijo}.md`);
writeFileSync(destino, l.join('\n') + '\n');
console.log(`informe: ${destino}`);
