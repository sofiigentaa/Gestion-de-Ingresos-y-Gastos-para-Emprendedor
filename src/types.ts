export type TransactionType = 'ingreso' | 'egreso';

export type PaymentMethod = 
  | 'efectivo'
  | 'transferencia'
  | 'tarjeta_debito'
  | 'tarjeta_credito'
  | 'mercado_pago'
  | 'otro';

export interface CategoryOption {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  subcategories: string[];
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string; // YYYY-MM-DD
  categoryId: string;
  categoryName: string;
  subcategory?: string;
  description: string;
  paymentMethod: PaymentMethod;
  supplierOrClient?: string;
  receiptNumber?: string;
  createdAt: number;
}

export interface MonthSummary {
  monthKey: string; // YYYY-MM
  label: string;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  profitMargin: number;
  count: number;
  categoryExpenses: Record<string, number>;
}

export interface DaySummary {
  date: string; // YYYY-MM-DD
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  transactions: Transaction[];
}

export interface FilterState {
  search: string;
  type: 'all' | 'ingreso' | 'egreso';
  categoryId: string;
  paymentMethod: string;
  startDate: string;
  endDate: string;
  sortBy: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
}

export interface ProductCostItem {
  id: string;
  name: string;
  category: 'madera' | 'vinilo' | 'corte_laser' | 'ferreteria' | 'pegamento' | 'otro';
  cost: number;
}
