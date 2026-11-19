import { Golondrina, type Accion, type Parametros } from '../golondrina';
import { CategoryOption, Transaction, TransactionType } from '../types';
import { formatCurrency, getMonthLabel, getTodayDateString } from '../utils/formatters';
import { exportBackupJSON, exportTransactionsToCSV } from '../utils/storage';
import { extraerRubro, interpretarMovimiento, rubrosConocidos } from './movimientos';

/**
 * Asistente + Golondrina para GER-MANIA.
 * App.tsx la monta y le da las acciones; lo que la usuaria hace a mano se
 * registra para que Golondrina aprenda sus costumbres (qué carga, cuándo, en qué orden).
 */
export const asistente = new Golondrina({
  app: 'germania-finanzas',
  acciones: [],
  colorPrimario: '#b45309', // ámbar madera, como la marca
  abajo: 88, // por encima de la barra inferior en celular
  saludo:
    '¡Hola! Soy Golondrina. Contame los movimientos como los dirías: «gasté 15 mil en madera», «vendí 32.500 en la feria». ' +
    'También preguntame «¿cuánto gané este mes?» o pedime «exportar a Excel». Con el uso aprendo tus costumbres y te las adelanto.',
});

export type Vista = 'dashboard' | 'daily' | 'categories' | 'history';

export interface FiltroHistorial {
  request: number;
  search?: string;
  type?: 'all' | 'ingreso' | 'egreso';
  categoryId?: string;
  startDate?: string;
  endDate?: string;
}

export interface EstadoFinanzas {
  transactions: Transaction[];
  categories: CategoryOption[];
  selectedMonth: string;
  currentView: Vista;
  setCurrentView: (v: Vista) => void;
  setSelectedMonth: (m: string) => void;
  setSelectedDate: (d: string) => void;
  guardar: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  abrirFormulario: (tipo: TransactionType, categoryId?: string, subcategoria?: string, monto?: number) => void;
  editar: (tx: Transaction) => void;
  borrar: (id: string) => void;
  abrirExportar: () => void;
  filtrarHistorial: (f: FiltroHistorial) => void;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const pesos = (n: number) => formatCurrency(n, '$');

function mesDesplazado(mes: string, delta: number) {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(a, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** "octubre" → el octubre más reciente que no esté en el futuro. */
function mesPorNombre(nombre: string): string {
  const i = MESES.indexOf(nombre.toLowerCase());
  const hoy = new Date();
  const anio = i > hoy.getMonth() ? hoy.getFullYear() - 1 : hoy.getFullYear();
  return `${anio}-${String(i + 1).padStart(2, '0')}`;
}

/** Mes del que habla la frase: "mes pasado", "octubre"... o el que está en pantalla. */
function mesDeLaFrase(texto: string, actual: string): string {
  const n = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/mes pasado|mes anterior/.test(n)) return mesDesplazado(actual, -1);
  const nombre = MESES.find((m) => new RegExp(`\\b${m}\\b`).test(n));
  return nombre ? mesPorNombre(nombre) : actual;
}

function tipoDeLaFrase(texto: string): TransactionType | null {
  const n = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/\b(gasto|gastos|gaste|egreso|egresos|compras?|pague|pagos)\b/.test(n)) return 'egreso';
  if (/\b(ingreso|ingresos|venta|ventas|vendi|cobre|cobros|encargos?)\b/.test(n)) return 'ingreso';
  return null;
}

function resumen(transactions: Transaction[], mes: string) {
  const delMes = transactions.filter((t) => t.date.startsWith(mes));
  const ingresos = delMes.filter((t) => t.type === 'ingreso').reduce((a, t) => a + t.amount, 0);
  const egresos = delMes.filter((t) => t.type === 'egreso').reduce((a, t) => a + t.amount, 0);
  return { delMes, ingresos, egresos, neta: ingresos - egresos, margen: ingresos ? ((ingresos - egresos) / ingresos) * 100 : 0 };
}

export function accionesDeFinanzas(e: EstadoFinanzas): Accion[] {
  const { transactions, categories, selectedMonth } = e;
  const ultimo = () => [...transactions].sort((a, b) => b.createdAt - a.createdAt)[0];

  /** Registrar un movimiento: con monto se guarda directo; sin monto abre el formulario ya completado. */
  const registrar = (tipo: TransactionType) => (p: Parametros) => {
    const texto = p['detalle'] ?? '';
    const mov = interpretarMovimiento(texto, tipo, categories);
    // Si viene de una sugerencia de Golondrina, trae el rubro aprendido.
    const porRubro = !mov.categoria && p['rubro'] ? extraerRubro(p['rubro'], tipo, categories) : null;
    const categoria = mov.categoria ?? porRubro?.categoria ?? null;
    const sub = mov.subcategoria || porRubro?.subcategoria || '';
    // Golondrina recuerda el rubro (no el monto) para aprender el hábito.
    if (categoria) p['rubro'] = sub || categoria.name;
    const nombre = tipo === 'ingreso' ? 'ingreso' : 'gasto';

    if (!mov.monto || !categoria) {
      p['_sinRegistro'] = '1'; // solo abre el formulario: Golondrina aprende cuando se guarda
      e.abrirFormulario(tipo, categoria?.id, sub, mov.monto ?? undefined);
      if (!categoria && mov.monto) return `Te abrí el formulario de ${nombre} por ${pesos(mov.monto)}: elegí el rubro y guardá.`;
      return categoria
        ? `Te abrí el formulario de ${nombre} con «${sub || categoria.name}» elegido. Completá el monto y guardá.`
        : `Te abrí el formulario de ${nombre}. La próxima podés decirme todo junto: «${tipo === 'egreso' ? 'gasté 15000 en madera' : 'vendí 30000 en la feria'}».`;
    }
    e.guardar({
      type: tipo,
      amount: mov.monto,
      date: mov.fecha,
      categoryId: categoria.id,
      categoryName: categoria.name,
      subcategory: sub,
      description: texto.trim() || sub || categoria.name,
      paymentMethod: mov.medio ?? 'efectivo',
    });
    const cuando = mov.fecha === getTodayDateString() ? '' : ` · ${mov.fecha.split('-').reverse().join('/')}`;
    return `Registré ${nombre === 'gasto' ? 'un gasto' : 'un ingreso'} de ${pesos(mov.monto)} · ${categoria.name}${sub ? ` › ${sub}` : ''} · ${(mov.medio ?? 'efectivo').replace('_', ' ')}${cuando}.\nSi algo quedó mal, pedime «corregir el último» o «borrar el último».`;
  };

  return [
    // ───────── Registrar movimientos ─────────
    {
      id: 'registrar-egreso',
      ejemplo: 'gasté 15 mil en madera en efectivo',
      grupo: 'Registrar',
      menu: 'Nuevo gasto',
      titulo: 'Registrar gasto {rubro}',
      descripcion: 'registrar un gasto diciéndomelo, por ejemplo «gasté 15 mil en madera»',
      frases: ['gasté {detalle}', 'pagué {detalle}', 'compré {detalle}', 'cargué {detalle}', 'registrar gasto {detalle}', 'nuevo egreso {detalle}', 'anotá un gasto {detalle}'],
      parametros: [
        { nombre: 'detalle', libre: true, completo: true, memorizable: false },
        { nombre: 'rubro', soloMemoria: true, opciones: () => rubrosConocidos('egreso', categories) },
      ],
      descubrible: true,
      comoHacerlo: 'Monto, rubro y medio de pago en una sola frase.',
      ejecutar: registrar('egreso'),
    },
    {
      id: 'registrar-ingreso',
      ejemplo: 'vendí 32.500 en la feria',
      grupo: 'Registrar',
      menu: 'Nuevo ingreso',
      titulo: 'Registrar ingreso {rubro}',
      descripcion: 'registrar una venta diciéndomela, por ejemplo «vendí 32.500 en la feria»',
      frases: ['vendí {detalle}', 'cobré {detalle}', 'me pagaron {detalle}', 'registrar ingreso {detalle}', 'nueva venta {detalle}', 'entró {detalle}'],
      parametros: [
        { nombre: 'detalle', libre: true, completo: true, memorizable: false },
        { nombre: 'rubro', soloMemoria: true, opciones: () => rubrosConocidos('ingreso', categories) },
      ],
      descubrible: true,
      ejecutar: registrar('ingreso'),
    },
    {
      id: 'corregir-ultimo',
      grupo: 'Registrar',
      menu: 'Corregir el último',
      titulo: 'Corregir el último movimiento',
      frases: ['corregir el último', 'editar el último movimiento', 'me equivoqué', 'modificar el último'],
      disponible: () => transactions.length > 0,
      requisito: 'Todavía no hay movimientos cargados.',
      ejecutar: () => {
        const t = ultimo();
        e.editar(t);
        return `Abrí «${t.description || t.categoryName}» (${pesos(t.amount)}) para que lo corrijas.`;
      },
    },
    {
      id: 'borrar-ultimo',
      grupo: 'Registrar',
      menu: 'Borrar el último',
      titulo: 'Borrar el último movimiento',
      frases: ['borrar el último', 'eliminar el último movimiento', 'deshacer'],
      disponible: () => transactions.length > 0,
      requisito: 'Todavía no hay movimientos cargados.',
      ejecutar: () => {
        const t = ultimo();
        e.borrar(t.id); // pide confirmación
        return `Te pedí confirmación para borrar «${t.description || t.categoryName}» (${pesos(t.amount)}).`;
      },
    },

    // ───────── Consultas: ganancia y totales ─────────
    {
      id: 'ganancia',
      ejemplo: 'cuánto gané este mes',
      grupo: 'Consultar',
      menu: 'Ganancia del mes',
      titulo: '¿Cuánto gané este mes?',
      descripcion: 'preguntarme cuánto ganaste, con lo que entró y lo que salió',
      frases: ['cuánto gané', 'ganancia del mes', 'cómo vengo este mes', 'balance del mes', 'resumen del mes', 'cuánto gané {detalle}'],
      parametros: [{ nombre: 'detalle', libre: true, completo: true, memorizable: false }],
      descubrible: true,
      ejecutar: (p) => {
        const mes = mesDeLaFrase(p['detalle'] ?? '', selectedMonth);
        const r = resumen(transactions, mes);
        if (!r.delMes.length) return `No hay movimientos en ${getMonthLabel(mes)}.`;
        const previo = resumen(transactions, mesDesplazado(mes, -1));
        const comp = previo.delMes.length
          ? `\nEl mes anterior la ganancia fue ${pesos(previo.neta)} (${r.neta >= previo.neta ? 'vas mejor' : 'venías mejor'}).`
          : '';
        return `${getMonthLabel(mes)}:\n• Entró ${pesos(r.ingresos)}\n• Salió ${pesos(r.egresos)}\n• Ganancia neta ${pesos(r.neta)} (margen ${r.margen.toFixed(1)}%)${comp}`;
      },
    },
    {
      id: 'cuanto-gaste',
      ejemplo: 'cuánto gasté en nafta este mes',
      grupo: 'Consultar',
      menu: 'Cuánto gasté en…',
      alTocar: 'escribir',
      titulo: '¿Cuánto gasté en un rubro?',
      descripcion: 'preguntarme cuánto gastaste en nafta, madera, láser…',
      frases: ['cuánto gasté {detalle}', 'cuánto llevo gastado {detalle}', 'total de gastos {detalle}'],
      parametros: [{ nombre: 'detalle', libre: true, completo: true, memorizable: false }],
      descubrible: true,
      ejecutar: (p) => {
        const texto = p['detalle'] ?? '';
        const mes = mesDeLaFrase(texto, selectedMonth);
        const rubro = extraerRubro(texto, 'egreso', categories);
        // En insumos se distingue el material (madera, vinilo...); en el resto, el rubro completo.
        const porMaterial = rubro?.categoria.id === 'compra_insumos' && !!rubro.subcategoria;
        const lista = resumen(transactions, mes).delMes.filter(
          (t) => t.type === 'egreso' && (!rubro || (t.categoryId === rubro.categoria.id && (!porMaterial || t.subcategory === rubro.subcategoria))),
        );
        const total = lista.reduce((a, t) => a + t.amount, 0);
        const que = rubro ? (porMaterial ? rubro.subcategoria : rubro.categoria.name) : 'todo'
        return `En ${getMonthLabel(mes)} gastaste ${pesos(total)} en ${que} (${lista.length} movimiento${lista.length === 1 ? '' : 's'}).`;
      },
    },
    {
      id: 'cuanto-vendi',
      ejemplo: 'cuánto vendí en ferias',
      grupo: 'Consultar',
      menu: 'Cuánto vendí',
      titulo: '¿Cuánto vendí?',
      descripcion: 'preguntarme cuánto vendiste en ferias o por encargo',
      frases: ['cuánto vendí {detalle}', 'cuánto entró {detalle}', 'total de ventas {detalle}', 'cuánto cobré {detalle}'],
      parametros: [{ nombre: 'detalle', libre: true, completo: true, memorizable: false }],
      ejecutar: (p) => {
        const texto = p['detalle'] ?? '';
        const mes = mesDeLaFrase(texto, selectedMonth);
        const rubro = extraerRubro(texto, 'ingreso', categories);
        const lista = resumen(transactions, mes).delMes.filter((t) => t.type === 'ingreso' && (!rubro || t.categoryId === rubro.categoria.id));
        const total = lista.reduce((a, t) => a + t.amount, 0);
        return `En ${getMonthLabel(mes)} entraron ${pesos(total)}${rubro ? ` por ${rubro.categoria.name}` : ''} (${lista.length} venta${lista.length === 1 ? '' : 's'}).`;
      },
    },
    {
      id: 'mayor-gasto',
      grupo: 'Consultar',
      menu: 'En qué gasto más',
      titulo: '¿En qué gasto más?',
      descripcion: 'preguntarme en qué se te va más la plata',
      frases: ['en qué gasto más', 'mayor gasto', 'dónde se va la plata', 'gastos más grandes'],
      descubrible: true,
      ejecutar: () => {
        const r = resumen(transactions, selectedMonth);
        const porRubro: Record<string, number> = {};
        r.delMes.filter((t) => t.type === 'egreso').forEach((t) => {
          porRubro[t.categoryName] = (porRubro[t.categoryName] ?? 0) + t.amount;
        });
        const orden = Object.entries(porRubro).sort((a, b) => b[1] - a[1]);
        if (!orden.length) return `No hay gastos en ${getMonthLabel(selectedMonth)}.`;
        const lineas = orden.map(([n, v]) => `• ${n}: ${pesos(v)} (${((v / r.egresos) * 100).toFixed(0)}%)`);
        return `Gastos de ${getMonthLabel(selectedMonth)}:\n${lineas.join('\n')}`;
      },
    },

    // ───────── Navegar ─────────
    {
      id: 'ver-panel',
      grupo: 'Ver',
      menu: 'Panel general',
      titulo: 'Ver el panel general',
      frases: ['ver el panel', 'ir al dashboard', 'vista general', 'ver gráficos', 'ver totales'],
      ejecutar: () => {
        e.setCurrentView('dashboard');
        return 'Panel general con totales, ganancia neta y gráficos.';
      },
    },
    {
      id: 'ver-dia',
      grupo: 'Ver',
      menu: 'Registro de hoy',
      titulo: 'Ver el registro del día',
      frases: ['ver el día', 'registro diario', 'movimientos de hoy', 'qué hice hoy', 'ver ayer'],
      parametros: [{ nombre: 'detalle', libre: true, completo: true, memorizable: false }],
      ejecutar: (p) => {
        const ayer = /ayer/i.test(p['detalle'] ?? '') ;
        const d = new Date();
        if (ayer) d.setDate(d.getDate() - 1);
        const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        e.setSelectedDate(fecha);
        e.setSelectedMonth(fecha.slice(0, 7));
        e.setCurrentView('daily');
        const delDia = transactions.filter((t) => t.date === fecha);
        return `${ayer ? 'Ayer' : 'Hoy'}: ${delDia.length} movimiento${delDia.length === 1 ? '' : 's'}.`;
      },
    },
    {
      id: 'ver-insumos',
      grupo: 'Ver',
      menu: 'Insumos y rubros',
      titulo: 'Ver insumos y rubros',
      frases: ['ver insumos', 'ver categorías', 'desglose de gastos', 'ver rubros'],
      ejecutar: () => {
        e.setCurrentView('categories');
        return 'Desglose de gastos por rubro.';
      },
    },
    {
      id: 'ver-historial',
      grupo: 'Ver',
      menu: 'Todos los movimientos',
      titulo: 'Ver todos los movimientos',
      frases: ['ver historial', 'todos los movimientos', 'ver movimientos', 'lista de movimientos'],
      ejecutar: () => {
        e.filtrarHistorial({ request: Date.now(), search: '', type: 'all', categoryId: 'all', startDate: '', endDate: '' });
        e.setCurrentView('history');
        return 'Todos los movimientos, sin filtros.';
      },
    },
    {
      id: 'ir-mes',
      ejemplo: 'ir a octubre',
      grupo: 'Ver',
      menu: 'Ir a otro mes…',
      alTocar: 'escribir',
      titulo: 'Ver {mes}',
      frases: ['ir a {mes}', 'ver {mes}', 'mostrar {mes}', 'cambiar a {mes}'],
      parametros: [{ nombre: 'mes', opciones: () => MESES, requerido: true, pregunta: '¿Qué mes?' }],
      ejecutar: ({ mes }) => {
        const clave = mesPorNombre(mes);
        e.setSelectedMonth(clave);
        return `Ahora ves ${getMonthLabel(clave)}.`;
      },
    },
    {
      id: 'mes-anterior',
      grupo: 'Ver',
      menu: 'Mes anterior',
      titulo: 'Ver el mes anterior',
      frases: ['mes anterior', 'mes pasado', 'ir al mes pasado'],
      ejecutar: () => {
        const m = mesDesplazado(selectedMonth, -1);
        e.setSelectedMonth(m);
        return `Ahora ves ${getMonthLabel(m)}.`;
      },
    },
    {
      id: 'mes-siguiente',
      grupo: 'Ver',
      menu: 'Mes siguiente',
      titulo: 'Ver el mes siguiente',
      frases: ['mes siguiente', 'próximo mes'],
      ejecutar: () => {
        const m = mesDesplazado(selectedMonth, 1);
        e.setSelectedMonth(m);
        return `Ahora ves ${getMonthLabel(m)}.`;
      },
    },

    // ───────── Filtrar ─────────
    {
      id: 'filtrar',
      ejemplo: 'mostrar gastos de madera de octubre',
      grupo: 'Filtrar y buscar',
      menu: 'Filtrar o buscar…',
      alTocar: 'escribir',
      titulo: 'Filtrar movimientos {rubro}',
      descripcion: 'pedirme movimientos filtrados, por ejemplo «gastos de nafta de octubre»',
      frases: ['filtrar {detalle}', 'mostrar gastos de {detalle}', 'mostrar ingresos de {detalle}', 'ver gastos de {detalle}', 'ver ventas de {detalle}', 'buscar {detalle}'],
      parametros: [
        { nombre: 'detalle', libre: true, memorizable: false },
        { nombre: 'rubro', soloMemoria: true, opciones: () => categories.map((c) => c.name) },
      ],
      descubrible: true,
      ejecutar: (p) => {
        const texto = `${p['detalle'] ?? ''} ${p['rubro'] ?? ''}`;
        const tipo = tipoDeLaFrase(texto);
        const rubro = extraerRubro(texto, tipo ?? 'egreso', categories) ?? (tipo ? null : extraerRubro(texto, 'ingreso', categories));
        const nombreMes = MESES.find((m) => texto.toLowerCase().includes(m)) || /mes pasado|este mes/.test(texto);
        const mes = mesDeLaFrase(texto, selectedMonth);
        const [a, m] = mes.split('-').map(Number);
        const fin = new Date(a, m, 0).getDate();
        // Lo que no es tipo, rubro ni mes se usa como búsqueda libre ("Juan", "souvenirs del casamiento").
        const restoLibre = !tipo && !rubro && !nombreMes ? (p['detalle'] ?? '').trim() : '';
        e.filtrarHistorial({
          request: Date.now(),
          search: restoLibre,
          type: tipo ?? (rubro ? rubro.categoria.type : 'all'),
          categoryId: rubro?.categoria.id ?? 'all',
          startDate: nombreMes ? `${mes}-01` : '',
          endDate: nombreMes ? `${mes}-${String(fin).padStart(2, '0')}` : '',
        });
        e.setCurrentView('history');
        if (rubro) p['rubro'] = rubro.categoria.name;
        const partes = [tipo === 'egreso' ? 'gastos' : tipo === 'ingreso' ? 'ingresos' : 'movimientos', rubro ? `de ${rubro.categoria.name}` : '', restoLibre ? `con «${restoLibre}»` : '', nombreMes ? `en ${getMonthLabel(mes)}` : ''];
        return `Te muestro ${partes.filter(Boolean).join(' ')}.`;
      },
    },

    // ───────── Exportar ─────────
    {
      id: 'exportar-excel',
      ejemplo: 'exportar a excel',
      grupo: 'Exportar',
      menu: 'Exportar todo a Excel',
      titulo: 'Exportar a Excel',
      descripcion: 'descargar los movimientos en Excel (CSV) con una frase',
      frases: ['exportar a excel', 'descargar movimientos', 'exportar csv', 'bajar planilla', 'exportar {detalle}'],
      parametros: [{ nombre: 'detalle', libre: true, completo: true, memorizable: false }],
      descubrible: true,
      ejecutar: (p) => {
        const texto = p['detalle'] ?? '';
        const soloMes = /mes|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre/i.test(texto);
        const mes = mesDeLaFrase(texto, selectedMonth);
        const lista = soloMes ? transactions.filter((t) => t.date.startsWith(mes)) : transactions;
        exportTransactionsToCSV(lista);
        return `Descargué ${lista.length} movimientos${soloMes ? ` de ${getMonthLabel(mes)}` : ''} en un archivo que abre Excel.`;
      },
    },
    {
      id: 'respaldo',
      grupo: 'Exportar',
      menu: 'Copia de seguridad',
      titulo: 'Descargar copia de seguridad',
      frases: ['hacer copia de seguridad', 'descargar respaldo', 'backup', 'guardar respaldo'],
      ejecutar: () => {
        exportBackupJSON(transactions, categories);
        return 'Descargué la copia de seguridad. Guardala en un lugar seguro.';
      },
    },
    {
      id: 'imprimir',
      grupo: 'Exportar',
      menu: 'Imprimir reporte / PDF',
      titulo: 'Imprimir el reporte del mes',
      frases: ['imprimir reporte', 'reporte en pdf', 'imprimir el mes', 'sacar reporte'],
      ejecutar: () => {
        setTimeout(() => window.print(), 300);
        return `Abriendo la impresión del reporte de ${getMonthLabel(selectedMonth)} (podés guardarlo como PDF).`;
      },
    },
    {
      id: 'abrir-exportar',
      grupo: 'Exportar',
      menu: 'Restaurar respaldo y más',
      titulo: 'Abrir exportar y respaldos',
      frases: ['abrir exportar', 'opciones de exportación', 'restaurar respaldo'],
      ejecutar: () => {
        e.abrirExportar();
        return 'Abrí la ventana de exportar y respaldos.';
      },
    },
    // ───────── Atajos de filtro y exportación (para el menú) ─────────
    {
      id: 'ver-gastos',
      grupo: 'Filtrar y buscar',
      menu: 'Solo gastos del mes',
      titulo: 'Ver solo los gastos del mes',
      frases: ['ver solo gastos', 'solo egresos', 'gastos del mes'],
      ejecutar: () => {
        const [a, m] = selectedMonth.split('-').map(Number);
        e.filtrarHistorial({ request: Date.now(), search: '', type: 'egreso', categoryId: 'all', startDate: `${selectedMonth}-01`, endDate: `${selectedMonth}-${String(new Date(a, m, 0).getDate()).padStart(2, '0')}` });
        e.setCurrentView('history');
        return `Gastos de ${getMonthLabel(selectedMonth)}.`;
      },
    },
    {
      id: 'ver-ingresos',
      grupo: 'Filtrar y buscar',
      menu: 'Solo ingresos del mes',
      titulo: 'Ver solo los ingresos del mes',
      frases: ['ver solo ingresos', 'solo ventas', 'ingresos del mes'],
      ejecutar: () => {
        const [a, m] = selectedMonth.split('-').map(Number);
        e.filtrarHistorial({ request: Date.now(), search: '', type: 'ingreso', categoryId: 'all', startDate: `${selectedMonth}-01`, endDate: `${selectedMonth}-${String(new Date(a, m, 0).getDate()).padStart(2, '0')}` });
        e.setCurrentView('history');
        return `Ingresos de ${getMonthLabel(selectedMonth)}.`;
      },
    },
    {
      id: 'exportar-mes',
      grupo: 'Exportar',
      menu: 'Exportar el mes a Excel',
      titulo: 'Exportar el mes a Excel',
      frases: ['exportar el mes', 'excel del mes', 'descargar el mes'],
      ejecutar: () => {
        const lista = transactions.filter((t) => t.date.startsWith(selectedMonth));
        exportTransactionsToCSV(lista);
        return `Descargué ${lista.length} movimientos de ${getMonthLabel(selectedMonth)} en un archivo que abre Excel.`;
      },
    },
  ];
}
