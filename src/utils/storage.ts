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
    `"${t.id}"`,
    `"${t.date}"`,
    `"${t.type === 'ingreso' ? 'Ingreso' : 'Egreso'}"`,
    t.amount,
    `"${t.categoryName || ''}"`,
    `"${t.subcategory || ''}"`,
    `"${(t.description || '').replace(/"/g, '""')}"`,
    `"${t.paymentMethod}"`,
    `"${(t.supplierOrClient || '').replace(/"/g, '""')}"`,
    `"${(t.receiptNumber || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
    [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `registro_ingresos_egresos_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportBackupJSON(transactions: Transaction[], categories: CategoryOption[]): void {
  const data = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    transactions,
    categories,
  };

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
  const link = document.createElement('a');
  link.setAttribute('href', dataStr);
  link.setAttribute('download', `copia_seguridad_emprendedor_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
