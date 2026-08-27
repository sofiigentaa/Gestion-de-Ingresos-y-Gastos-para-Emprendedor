import React, { useState, useMemo } from 'react';
import { Transaction, CategoryOption, TransactionType } from '../types';
import { formatCurrency, formatDateSpanish } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { 
  Search, 
  Trash2, 
  Edit2, 
  Plus, 
  FileSpreadsheet,
  RotateCcw
} from 'lucide-react';

interface TransactionsTableProps {
  transactions: Transaction[];
  categories: CategoryOption[];
  currencySymbol: string;
  onOpenTransactionModal: (type?: 'egreso' | 'ingreso') => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onExportCSV: () => void;
  onOpenResetModal?: () => void;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transactions,
  categories,
  currencySymbol,
  onOpenTransactionModal,
  onEditTransaction,
  onDeleteTransaction,
  onExportCSV,
  onOpenResetModal,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'ingreso' | 'egreso'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        // Search query
        if (search) {
          const q = search.toLowerCase();
          const matchDesc = (t.description || '').toLowerCase().includes(q);
          const matchCat = (t.categoryName || '').toLowerCase().includes(q);
          const matchSub = (t.subcategory || '').toLowerCase().includes(q);
          const matchSupp = (t.supplierOrClient || '').toLowerCase().includes(q);
          const matchReceipt = (t.receiptNumber || '').toLowerCase().includes(q);
          if (!matchDesc && !matchCat && !matchSub && !matchSupp && !matchReceipt) {
            return false;
          }
        }

        // Type filter
        if (typeFilter !== 'all' && t.type !== typeFilter) {
          return false;
        }

        // Category filter
        if (categoryFilter !== 'all' && t.categoryId !== categoryFilter) {
          return false;
        }

        // Payment method filter
        if (paymentFilter !== 'all' && t.paymentMethod !== paymentFilter) {
          return false;
        }

        // Date range
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') return b.date.localeCompare(a.date) || b.createdAt - a.createdAt;
        if (sortBy === 'date_asc') return a.date.localeCompare(b.date) || a.createdAt - b.createdAt;
        if (sortBy === 'amount_desc') return b.amount - a.amount;
        if (sortBy === 'amount_asc') return a.amount - b.amount;
        return 0;
      });
  }, [transactions, search, typeFilter, categoryFilter, paymentFilter, startDate, endDate, sortBy]);

  // Filtered totals
  const filteredIncome = filteredTransactions
    .filter((t) => t.type === 'ingreso')
    .reduce((acc, t) => acc + t.amount, 0);

  const filteredExpense = filteredTransactions
    .filter((t) => t.type === 'egreso')
    .reduce((acc, t) => acc + t.amount, 0);

  const filteredBalance = filteredIncome - filteredExpense;

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setPaymentFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = search || typeFilter !== 'all' || categoryFilter !== 'all' || paymentFilter !== 'all' || startDate || endDate;

  const getCategoryBadgeClass = (catId: string, type: TransactionType) => {
    if (type === 'ingreso') return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
    if (catId === 'compra_insumos' || catId.startsWith('insumos_')) return 'bg-blue-50 text-blue-700 border-blue-200/60';
    if (catId === 'corte_laser') return 'bg-orange-50 text-orange-700 border-orange-200/60';
    if (catId === 'nafta' || catId === 'nafta_movilidad') return 'bg-red-50 text-red-700 border-red-200/60';
    if (catId === 'canon_feria') return 'bg-purple-50 text-purple-700 border-purple-200/60';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6">
      
      {/* Header with Search and Filter Controls */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        
        {/* Top bar: Title + Action buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Historial de Movimientos
            </h2>
            <p className="text-xs text-slate-500">
              Consulta, filtra y edita tus compras de insumos, corte láser, nafta, ferias y ventas
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            {onOpenResetModal && (
              <button
                onClick={onOpenResetModal}
                id="btn-table-reset-data"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 transition-colors"
                title="Restablecer o vaciar datos"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                <span>Restablecer Datos</span>
              </button>
            )}

            <button
              onClick={onExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Descargar Excel (CSV)</span>
            </button>

            <button
              onClick={() => onOpenTransactionModal('ingreso')}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ingreso</span>
            </button>
            <button
              onClick={() => onOpenTransactionModal('egreso')}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Egreso</span>
            </button>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por concepto o proveedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="all">Todos los Tipos</option>
              <option value="ingreso">💰 Solo Ingresos (Ventas)</option>
              <option value="egreso">💸 Solo Egresos</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="all">Todas las Categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.type === 'ingreso' ? '🟢' : '🔴'} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="all">Todos los Medios de Pago</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="mercado_pago">Mercado Pago</option>
              <option value="tarjeta_debito">Tarjeta Débito</option>
              <option value="tarjeta_credito">Tarjeta Crédito</option>
            </select>
          </div>
        </div>

        {/* Date Filters & Sorting Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 font-medium">Rango:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700"
              title="Fecha inicial"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700"
              title="Fecha final"
            />

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-indigo-600 hover:text-indigo-800 font-semibold ml-2 hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium"
            >
              <option value="date_desc">Más recientes primero</option>
              <option value="date_asc">Más antiguos primero</option>
              <option value="amount_desc">Mayor monto</option>
              <option value="amount_asc">Menor monto</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Bar for current filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs text-slate-500 font-semibold">Total Ingresos Filtrados:</span>
          <span className="text-sm font-extrabold text-emerald-600 font-mono">
            {formatCurrency(filteredIncome, currencySymbol)}
          </span>
        </div>
        <div className="flex items-center justify-between px-2 border-y sm:border-y-0 sm:border-x border-slate-100 py-1 sm:py-0">
          <span className="text-xs text-slate-500 font-semibold">Total Egresos Filtrados:</span>
          <span className="text-sm font-extrabold text-rose-600 font-mono">
            {formatCurrency(filteredExpense, currencySymbol)}
          </span>
        </div>
        <div className="flex items-center justify-between px-2">
          <span className="text-xs text-slate-500 font-semibold">Balance Filtrado:</span>
          <span className={`text-sm font-extrabold font-mono ${
            filteredBalance >= 0 ? 'text-slate-900' : 'text-rose-600'
          }`}>
            {filteredBalance >= 0 ? '+' : ''}{formatCurrency(filteredBalance, currencySymbol)}
          </span>
        </div>
      </div>

      {/* Transactions Data Container (Responsive: Mobile Cards + Desktop Table) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Mobile View: Clean Card List */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <p className="font-semibold text-slate-600 text-sm">No se encontraron movimientos</p>
              <p className="text-xs text-slate-400 mt-1">Prueba cambiando los filtros seleccionados.</p>
            </div>
          ) : (
            filteredTransactions.map((tx) => (
              <div key={tx.id} className="p-4 hover:bg-slate-50/80 transition-colors space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      tx.type === 'ingreso' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {tx.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {formatDateSpanish(tx.date)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className={`text-base font-extrabold font-mono ${
                      tx.type === 'ingreso' ? 'text-emerald-600' : 'text-slate-900'
                    }`}>
                      {tx.type === 'ingreso' ? '+' : '-'}{formatCurrency(tx.amount, currencySymbol)}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="font-bold text-slate-900 text-sm">{tx.description}</p>
                  {tx.receiptNumber && (
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Comprobante: {tx.receiptNumber}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] border ${getCategoryBadgeClass(tx.categoryId, tx.type)}`}>
                      <CategoryIcon name={categories.find(c => c.id === tx.categoryId)?.icon || 'CircleDot'} className="w-3 h-3" />
                      <span>{tx.categoryName}</span>
                    </span>
                    {tx.subcategory && (
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {tx.subcategory}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditTransaction(tx)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteTransaction(tx.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Full Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-[11px] uppercase text-slate-500 font-bold tracking-wider">
                <th className="px-5 py-3.5">Fecha</th>
                <th className="px-5 py-3.5">Tipo</th>
                <th className="px-5 py-3.5">Concepto / Detalle</th>
                <th className="px-5 py-3.5">Categoría / Subcategoría</th>
                <th className="px-5 py-3.5">Medio de Pago</th>
                <th className="px-5 py-3.5">Proveedor / Cliente</th>
                <th className="px-5 py-3.5 text-right">Monto</th>
                <th className="px-4 py-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-600 text-sm">No se encontraron movimientos</p>
                    <p className="text-xs text-slate-400 mt-1">Prueba cambiando los términos de búsqueda o filtros seleccionados.</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors text-slate-700">
                    <td className="px-5 py-4 font-mono whitespace-nowrap text-slate-500">
                      {formatDateSpanish(tx.date)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.type === 'ingreso' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {tx.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-900">{tx.description}</p>
                      {tx.receiptNumber && (
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">Comprobante: {tx.receiptNumber}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold border ${getCategoryBadgeClass(tx.categoryId, tx.type)}`}>
                        <CategoryIcon name={categories.find(c => c.id === tx.categoryId)?.icon || 'CircleDot'} className="w-3.5 h-3.5" />
                        <span>{tx.categoryName}</span>
                      </span>
                      {tx.subcategory && (
                        <span className="block text-[11px] text-slate-500 mt-0.5 font-medium">
                          {tx.subcategory}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap capitalize text-slate-600">
                      {tx.paymentMethod.replace('_', ' ')}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-slate-600">
                      {tx.supplierOrClient || '-'}
                    </td>
                    <td className="px-5 py-4 text-right font-extrabold font-mono text-sm whitespace-nowrap">
                      <span className={tx.type === 'ingreso' ? 'text-emerald-600' : 'text-slate-900'}>
                        {tx.type === 'ingreso' ? '+' : '-'}{formatCurrency(tx.amount, currencySymbol)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => onEditTransaction(tx)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteTransaction(tx.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
