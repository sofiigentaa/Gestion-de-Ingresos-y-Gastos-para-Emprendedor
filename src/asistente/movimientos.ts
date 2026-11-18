/**
 * Entiende movimientos dichos con palabras:
 *   "gasté 15 mil en madera en efectivo"  → egreso $15.000 · Compra de Insumos › Madera · efectivo · hoy
 *   "ayer vendí 32.500 en la feria"       → ingreso $32.500 · Ventas en Feria › Puesto Feria · ayer
 */
import { CategoryOption, PaymentMethod, TransactionType } from '../types';
import { normalizar } from '../golondrina';
import { getTodayDateString } from '../utils/formatters';

/** Palabras que usa la gente → rubro (subcategoría) del sistema. */
const ALIAS: Record<TransactionType, Record<string, { categoria: string; sub: string }>> = {
  egreso: {
    madera: { categoria: 'compra_insumos', sub: 'Madera' },
    tablas: { categoria: 'compra_insumos', sub: 'Madera' },
    mdf: { categoria: 'compra_insumos', sub: 'Madera' },
    fibrofacil: { categoria: 'compra_insumos', sub: 'Madera' },
    vinilo: { categoria: 'compra_insumos', sub: 'Vinilo' },
    cola: { categoria: 'compra_insumos', sub: 'Cola' },
    pegamento: { categoria: 'compra_insumos', sub: 'Cola' },
    clavos: { categoria: 'compra_insumos', sub: 'Clavos' },
    tornillos: { categoria: 'compra_insumos', sub: 'Tornillos' },
    insumos: { categoria: 'compra_insumos', sub: '' },
    laser: { categoria: 'corte_laser', sub: 'Corte' },
    corte: { categoria: 'corte_laser', sub: 'Corte' },
    grabado: { categoria: 'corte_laser', sub: 'Grabado' },
    nafta: { categoria: 'nafta', sub: 'Nafta / Combustible' },
    combustible: { categoria: 'nafta', sub: 'Nafta / Combustible' },
    peaje: { categoria: 'nafta', sub: 'Peajes' },
    peajes: { categoria: 'nafta', sub: 'Peajes' },
    canon: { categoria: 'canon_feria', sub: 'Canon de puesto feria' },
    puesto: { categoria: 'canon_feria', sub: 'Canon de puesto feria' },
    feria: { categoria: 'canon_feria', sub: 'Canon de puesto feria' },
    stand: { categoria: 'canon_feria', sub: 'Alquiler de stand / mesa' },
    mesa: { categoria: 'canon_feria', sub: 'Alquiler de stand / mesa' },
  },
  ingreso: {
    feria: { categoria: 'venta_feria', sub: 'Puesto Feria' },
    puesto: { categoria: 'venta_feria', sub: 'Puesto Feria' },
    artesanal: { categoria: 'venta_feria', sub: 'Feria Artesanal' },
    evento: { categoria: 'venta_feria', sub: 'Evento' },
    encargo: { categoria: 'pedido_personalizado', sub: 'Trabajos a Medida' },
    encargue: { categoria: 'pedido_personalizado', sub: 'Trabajos a Medida' },
    pedido: { categoria: 'pedido_personalizado', sub: 'Trabajos a Medida' },
    medida: { categoria: 'pedido_personalizado', sub: 'Trabajos a Medida' },
    personalizado: { categoria: 'pedido_personalizado', sub: 'Trabajos a Medida' },
    cartel: { categoria: 'pedido_personalizado', sub: 'Cartelería' },
    carteles: { categoria: 'pedido_personalizado', sub: 'Cartelería' },
    carteleria: { categoria: 'pedido_personalizado', sub: 'Cartelería' },
    souvenir: { categoria: 'pedido_personalizado', sub: 'Souvenirs' },
    souvenirs: { categoria: 'pedido_personalizado', sub: 'Souvenirs' },
    regalo: { categoria: 'pedido_personalizado', sub: 'Regalos' },
    regalos: { categoria: 'pedido_personalizado', sub: 'Regalos' },
  },
};

const GENERALES = new Set(['feria', 'puesto', 'encargo', 'encargue', 'pedido', 'personalizado', 'insumos', 'medida']);

const MEDIOS: [RegExp, PaymentMethod][] = [
  [/\befectivo\b|\bcash\b/, 'efectivo'],
  [/\bmercado ?pago\b|\bmp\b/, 'mercado_pago'],
  [/\btransferencia\b|\btransferi|\bcbu\b|\balias\b/, 'transferencia'],
  [/\bdebito\b/, 'tarjeta_debito'],
  [/\bcredito\b|\btarjeta\b/, 'tarjeta_credito'],
];

export interface MovimientoInterpretado {
  monto: number | null;
  categoria: CategoryOption | null;
  subcategoria: string;
  fecha: string;
  medio: PaymentMethod | null;
}

/** "15000", "15.000", "$15.000,50", "15 mil", "15k", "1,5 millones" → número. */
export function extraerMonto(texto: string): number | null {
  // Se sacan las fechas ("el 12/10") para no confundirlas con el monto.
  const t = texto.toLowerCase().replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, ' ').replace(/\$/g, ' ');
  const m = t.match(/(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?\s*(mil\b|k\b|lucas?\b|millon(?:es)?\b|palos?\b)?/);
  if (!m) return null;
  let valor = Number(m[1].replace(/\./g, '') + (m[2] ? `.${m[2]}` : ''));
  const mult = m[3] ?? '';
  if (/^(mil|k|luca)/.test(mult)) valor *= 1000;
  if (/^(millon|palo)/.test(mult)) valor *= 1_000_000;
  return valor > 0 ? valor : null;
}

function fechaRelativa(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function extraerFecha(texto: string): string {
  const n = normalizar(texto);
  if (/\banteayer\b/.test(n)) return fechaRelativa(2);
  if (/\bayer\b/.test(n)) return fechaRelativa(1);
  const m = n.match(/\b(\d{1,2}) (\d{1,2})(?: (\d{2,4}))?\b/);
  // "el 12/10" queda como "12 10" después de normalizar
  if (m && /\d{1,2}\/\d{1,2}/.test(texto)) {
    const hoy = new Date();
    const anio = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : hoy.getFullYear();
    return `${anio}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return getTodayDateString();
}

/** Busca el rubro: primero las subcategorías reales del usuario, después las palabras comunes. */
export function extraerRubro(texto: string, tipo: TransactionType, categorias: CategoryOption[]) {
  const n = ` ${normalizar(texto)} `;
  const propias = categorias.filter((c) => c.type === tipo);
  for (const cat of propias) {
    for (const sub of cat.subcategories) {
      const s = normalizar(sub);
      if (s && n.includes(` ${s} `)) return { categoria: cat, subcategoria: sub };
    }
  }
  for (const cat of propias) {
    const s = normalizar(cat.name);
    if (s && n.includes(` ${s} `)) return { categoria: cat, subcategoria: cat.subcategories[0] ?? '' };
  }
  // Las palabras específicas ("canon", "carteles") ganan a las generales ("feria", "encargo").
  const alias = Object.entries(ALIAS[tipo]).sort((a, b) => Number(GENERALES.has(a[0])) - Number(GENERALES.has(b[0])));
  for (const [palabra, destino] of alias) {
    if (!n.includes(` ${palabra} `) && !n.includes(` ${palabra}s `)) continue;
    const cat = propias.find((c) => c.id === destino.categoria);
    if (cat) return { categoria: cat, subcategoria: destino.sub || cat.subcategories[0] || '' };
  }
  return null;
}

export function interpretarMovimiento(texto: string, tipo: TransactionType, categorias: CategoryOption[]): MovimientoInterpretado {
  const n = normalizar(texto);
  const rubro = extraerRubro(texto, tipo, categorias);
  return {
    monto: extraerMonto(texto),
    categoria: rubro?.categoria ?? null,
    subcategoria: rubro?.subcategoria ?? '',
    fecha: extraerFecha(texto),
    medio: MEDIOS.find(([re]) => re.test(n))?.[1] ?? null,
  };
}

/** Nombres de rubros que el asistente reconoce (para que Golondrina aprenda "qué" se registra). */
export function rubrosConocidos(tipo: TransactionType, categorias: CategoryOption[]): string[] {
  const subs = categorias.filter((c) => c.type === tipo).flatMap((c) => c.subcategories);
  return [...new Set([...subs, ...categorias.filter((c) => c.type === tipo).map((c) => c.name)])];
}
