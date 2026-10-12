import { Transaction, CategoryOption } from '../types';
import { DEFAULT_CATEGORIES } from '../data/initialCategories';
import { getSampleTransactions } from '../data/sampleTransactions';

const STORAGE_KEYS = {
  TRANSACTIONS: 'artisan_finance_transactions_v2',
  CATEGORIES: 'artisan_finance_categories_v2',
  CURRENCY: 'artisan_finance_currency_symbol',
};

export function loadCategories(): CategoryOption[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading categories from localStorage:', err);
  }
  return DEFAULT_CATEGORIES;
}

export function saveCategories(categories: CategoryOption[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  } catch (err) {
    console.error('Error saving categories:', err);
  }
}

export function loadTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading transactions from localStorage:', err);
  }
  // Initialize with sample data if nothing is saved yet
  const sample = getSampleTransactions();
  saveTransactions(sample);
  return sample;
}

export function saveTransactions(transactions: Transaction[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  } catch (err) {
    console.error('Error saving transactions:', err);
  }
}

export function loadCurrencySymbol(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.CURRENCY) || '$';
  } catch {
    return '$';
  }
}

export function saveCurrencySymbol(symbol: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENCY, symbol);
  } catch (err) {
    console.error('Error saving currency:', err);
  }
}

// Descarga un archivo generado en el navegador. Con Blob no hay problema con
// caracteres como "#" (antes el CSV se cortaba en el primer "#").
function downloadFile(content: string, fileName: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function localDateStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function csvText(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function exportTransactionsToCSV(transactions: Transaction[]): void {
  const headers = [
    'ID',
    'Fecha',
    'Tipo',
    'Monto',
    'Categoría',
    'Subcategoría',
    'Descripción',
    'Método de Pago',
    'Cliente o Proveedor',
    'Comprobante',
  ];

  const rows = transactions.map((t) => [
    csvText(t.id),
    csvText(t.date),
    csvText(t.type === 'ingreso' ? 'Ingreso' : 'Egreso'),
    // Excel en español espera coma decimal
    String(t.amount).replace('.', ','),
    csvText(t.categoryName),
    csvText(t.subcategory),
    csvText(t.description),
    csvText(t.paymentMethod),
    csvText(t.supplierOrClient),
    csvText(t.receiptNumber),
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\r\n');
  downloadFile(csvContent, `registro_ingresos_egresos_${localDateStamp()}.csv`, 'text/csv;charset=utf-8');
}

export function exportBackupJSON(transactions: Transaction[], categories: CategoryOption[]): void {
  const data = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    transactions,
    categories,
  };
  downloadFile(JSON.stringify(data, null, 2), `copia_seguridad_emprendedor_${localDateStamp()}.json`, 'application/json');
}

// Valida un respaldo antes de cargarlo. Devuelve los movimientos válidos o un
// mensaje de error (antes un archivo mal armado dejaba la pantalla en blanco).
export function parseBackup(raw: unknown): { transactions: Transaction[]; categories?: CategoryOption[] } | { error: string } {
  const list = Array.isArray(raw) ? raw : (raw as any)?.transactions;
  if (!Array.isArray(list)) return { error: 'El archivo no tiene el formato de un respaldo de esta app.' };
  const valid: Transaction[] = [];
  for (const t of list) {
    const ok =
      t &&
      typeof t.id === 'string' &&
      typeof t.date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(t.date) &&
      (t.type === 'ingreso' || t.type === 'egreso') &&
      typeof t.amount === 'number' &&
      Number.isFinite(t.amount) &&
      t.amount > 0;
    if (!ok) {
      return { error: `El respaldo tiene un movimiento inválido (${valid.length + 1}° de la lista). No se cargó nada.` };
    }
    valid.push({
      ...t,
      categoryId: String(t.categoryId || 'otro'),
      categoryName: String(t.categoryName || ''),
      description: String(t.description || ''),
      paymentMethod: t.paymentMethod || 'efectivo',
      createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
    });
  }
  const cats = (raw as any)?.categories;
  const categories = Array.isArray(cats) && cats.every((c: any) => c && typeof c.id === 'string' && typeof c.name === 'string' && (c.type === 'ingreso' || c.type === 'egreso') && Array.isArray(c.subcategories)) ? cats : undefined;
  return { transactions: valid, categories };
}
