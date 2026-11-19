/* Datos de prueba del plan (21.80-plan-de-pruebas.md, sección 5). Todo ficticio.
   Los totales esperados están calculados a mano a partir de las tablas, no se obtuvieron de la aplicación. */

export type Mov = {
  id: string;
  type: 'ingreso' | 'egreso';
  amount: number;
  date: string;
  categoryId: string;
  categoryName: string;
  subcategory?: string;
  description: string;
  paymentMethod: string;
  supplierOrClient?: string;
  receiptNumber?: string;
  createdAt: number;
};

/* Fecha de ejecución simulada (F): jueves 2026-11-19 12:00 en Buenos Aires. Los esperados de "hoy",
   "ayer" y "anteayer" salen de aquí. */
export const F = { iso: '2026-11-19T12:00:00-03:00', dia: '2026-11-19', ayer: '2026-11-18', anteayer: '2026-11-17', mes: '2026-11' };

const c = {
  feria: { categoryId: 'venta_feria', categoryName: 'Ventas en Feria' },
  encargue: { categoryId: 'pedido_personalizado', categoryName: 'Personalizados por Encargue' },
  insumos: { categoryId: 'compra_insumos', categoryName: 'Compra de Insumos' },
  laser: { categoryId: 'corte_laser', categoryName: 'Corte Láser' },
  nafta: { categoryId: 'nafta', categoryName: 'Nafta' },
  canon: { categoryId: 'canon_feria', categoryName: 'Pago de Canon para Feria' },
};

/* DS-01: base mensual conocida. Los id m01..m11 son los del plan. */
export const ds01: Mov[] = [
  { id: 'ds01-m01', type: 'ingreso', amount: 40000, date: '2026-10-01', ...c.feria, subcategory: 'Puesto Feria', description: 'Venta feria octubre', paymentMethod: 'transferencia', createdAt: 1790000000001 },
  { id: 'ds01-m02', type: 'egreso', amount: 10000, date: '2026-10-31', ...c.insumos, subcategory: 'Madera', description: 'Madera fin de octubre', paymentMethod: 'efectivo', createdAt: 1790000000002 },
  { id: 'ds01-m03', type: 'egreso', amount: 5000.5, date: '2026-10-12', ...c.nafta, subcategory: 'Peajes', description: 'Peajes octubre', paymentMethod: 'efectivo', createdAt: 1790000000003 },
  { id: 'ds01-m04', type: 'ingreso', amount: 30000, date: '2026-11-01', ...c.encargue, subcategory: 'Cartelería', description: 'Cartel primero de noviembre', paymentMethod: 'mercado_pago', createdAt: 1790000000004 },
  { id: 'ds01-m05', type: 'egreso', amount: 12000, date: '2026-11-01', ...c.insumos, subcategory: 'Vinilo', description: 'Vinilo primero de noviembre', paymentMethod: 'transferencia', createdAt: 1790000000005 },
  { id: 'ds01-m06', type: 'egreso', amount: 8000, date: '2026-11-10', ...c.canon, subcategory: 'Canon de puesto feria', description: 'Canon feria noviembre', paymentMethod: 'efectivo', createdAt: 1790000000006 },
  { id: 'ds01-m07', type: 'ingreso', amount: 20000, date: '2026-11-18', ...c.feria, subcategory: 'Puesto Feria', description: 'Venta del dia', paymentMethod: 'efectivo', createdAt: 1790000000007 },
  { id: 'ds01-m08', type: 'egreso', amount: 3000, date: '2026-11-18', ...c.nafta, subcategory: 'Nafta / Combustible', description: 'Nafta del dia', paymentMethod: 'efectivo', createdAt: 1790000000008 },
  { id: 'ds01-m09', type: 'egreso', amount: 6500.25, date: '2026-11-30', ...c.laser, subcategory: 'Corte', description: 'Corte fin de noviembre', paymentMethod: 'tarjeta_debito', createdAt: 1790000000009 },
  { id: 'ds01-m10', type: 'egreso', amount: 1500, date: '2026-11-30', ...c.insumos, description: 'Sin subcategoria', paymentMethod: 'efectivo', createdAt: 1790000000010 },
  { id: 'ds01-m11', type: 'ingreso', amount: 9000, date: '2026-12-01', ...c.feria, subcategory: 'Evento', description: 'Evento primero de diciembre', paymentMethod: 'transferencia', createdAt: 1790000000011 },
];

/* Totales de DS-01 por mes (plan, sección 5). */
export const totales = {
  '2026-10': { ingresos: '$ 40.000', egresos: '$ 15.000,5', balance: '+$ 24.999,5', insumosLaser: '$ 10.000', canonNafta: '$ 5.000,5', margen: 62.49875, registrosEgreso: 2 },
  '2026-11': { ingresos: '$ 50.000', egresos: '$ 31.000,25', balance: '+$ 18.999,75', insumosLaser: '$ 20.000,25', canonNafta: '$ 11.000', margen: 37.9995, registrosEgreso: 5 },
  '2026-12': { ingresos: '$ 9.000', egresos: '$ 0', balance: '+$ 9.000', insumosLaser: '$ 0', canonNafta: '$ 0', margen: 100, registrosEgreso: 0 },
  '2026-09': { ingresos: '$ 0', egresos: '$ 0', balance: '+$ 0', insumosLaser: '$ 0', canonNafta: '$ 0', margen: null, registrosEgreso: 0 },
} as const;

/* DS-02: 50 movimientos en 2026-11 para los filtros (CA-04). Grupos del plan; "Otros" se define aquí:
   2 egresos en efectivo (Corte Láser), 2 egresos por transferencia (Canon), 3 ingresos por transferencia
   (Personalizados) y 3 ingresos por Mercado Pago (Ventas en Feria), todos de $ 500. */
const grupo = (n: number, base: Omit<Mov, 'id' | 'date' | 'createdAt' | 'description'>, etiqueta: string, desde: number): Mov[] =>
  Array.from({ length: n }, (_, i) => ({
    ...base,
    id: `ds02-${etiqueta}-${i + 1}`,
    date: `2026-11-${String(((desde + i) % 28) + 1).padStart(2, '0')}`,
    description: `${etiqueta} ${i + 1}`,
    createdAt: 1790000100000 + desde * 100 + i,
  }));
export const ds02: Mov[] = [
  ...grupo(8, { type: 'egreso', amount: 1000, ...c.nafta, subcategory: 'Nafta / Combustible', paymentMethod: 'efectivo' }, 'Objetivo', 0),
  ...grupo(8, { type: 'egreso', amount: 1100, ...c.nafta, subcategory: 'Nafta / Combustible', paymentMethod: 'transferencia' }, 'Senuelo1', 3),
  ...grupo(8, { type: 'egreso', amount: 1200, ...c.nafta, subcategory: 'Peajes', paymentMethod: 'tarjeta_debito' }, 'Senuelo2', 6),
  ...grupo(8, { type: 'egreso', amount: 1300, ...c.insumos, subcategory: 'Madera', paymentMethod: 'efectivo' }, 'Senuelo3', 9),
  ...grupo(8, { type: 'ingreso', amount: 1400, ...c.feria, subcategory: 'Puesto Feria', paymentMethod: 'efectivo' }, 'Senuelo4', 12),
  ...grupo(2, { type: 'egreso', amount: 500, ...c.laser, subcategory: 'Corte', paymentMethod: 'efectivo' }, 'OtrosA', 15),
  ...grupo(2, { type: 'egreso', amount: 500, ...c.canon, subcategory: 'Canon de puesto feria', paymentMethod: 'transferencia' }, 'OtrosB', 17),
  ...grupo(3, { type: 'ingreso', amount: 500, ...c.encargue, subcategory: 'Souvenirs', paymentMethod: 'transferencia' }, 'OtrosC', 19),
  ...grupo(3, { type: 'ingreso', amount: 500, ...c.feria, subcategory: 'Evento', paymentMethod: 'mercado_pago' }, 'OtrosD', 22),
];

/* Respaldo con el formato de la aplicación (JSON de "Descargar Respaldo"). */
export const respaldo = (transactions: unknown[], categories?: unknown[]) =>
  JSON.stringify({ version: '1.0', exportDate: '2026-11-19T15:00:00.000Z', transactions, ...(categories ? { categories } : {}) });

/* Categorías iniciales (documento funcional, sección 7). */
export const categoriasIniciales = [
  { id: 'compra_insumos', name: 'Compra de Insumos', type: 'egreso', icon: 'Layers', color: '#2563eb', subcategories: ['Madera', 'Vinilo', 'Cola', 'Clavos', 'Tornillos'] },
  { id: 'corte_laser', name: 'Corte Láser', type: 'egreso', icon: 'Zap', color: '#ea580c', subcategories: ['Corte', 'Grabado'] },
  { id: 'nafta', name: 'Nafta', type: 'egreso', icon: 'Fuel', color: '#dc2626', subcategories: ['Nafta / Combustible', 'Peajes'] },
  { id: 'canon_feria', name: 'Pago de Canon para Feria', type: 'egreso', icon: 'Store', color: '#9333ea', subcategories: ['Canon de puesto feria', 'Alquiler de stand / mesa'] },
  { id: 'venta_feria', name: 'Ventas en Feria', type: 'ingreso', icon: 'Store', color: '#16a34a', subcategories: ['Puesto Feria', 'Feria Artesanal', 'Evento'] },
  { id: 'pedido_personalizado', name: 'Personalizados por Encargue', type: 'ingreso', icon: 'Sparkles', color: '#0284c7', subcategories: ['Cartelería', 'Souvenirs', 'Trabajos a Medida', 'Regalos'] },
];

/* DS-03: las categorías iniciales con la subcategoría "Resina" agregada a Compra de Insumos. */
export const categoriasConResina = categoriasIniciales.map((cat) =>
  cat.id === 'compra_insumos' ? { ...cat, subcategories: [...cat.subcategories, 'Resina'] } : cat,
);

/* Texto de aviso de RN-01. */
export const AVISO_MONTO = 'Por favor ingrese un monto válido mayor a 0';
