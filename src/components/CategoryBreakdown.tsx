import React, { useState } from 'react';
import { Transaction, CategoryOption } from '../types';
import { formatCurrency, formatDateSpanish } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { Plus, Edit2, Trash2 } from 'lucide-react';

interface CategoryBreakdownProps {
  transactions: Transaction[];
  categories: CategoryOption[];
  selectedMonth: string;
  currencySymbol: string;
  onOpenTransactionModal: (type?: 'egreso' | 'ingreso', categoryId?: string) => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({
  transactions,
  categories,
  selectedMonth,
  currencySymbol,
  onOpenTransactionModal,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('all_expenses');
  const [filterType, setFilterType] = useState<'egreso' | 'ingreso'>('egreso');

  const monthTransactions = transactions.filter((t) => t.date.startsWith(selectedMonth));
  const totalExpense = monthTransactions
    .filter((t) => t.type === 'egreso')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalIncome = monthTransactions
    .filter((t) => t.type === 'ingreso')
    .reduce((acc, t) => acc + t.amount, 0);

  // Group transactions by category
  const categoriesWithStats = categories
    .filter((c) => c.type === filterType)
    .map((cat) => {
      const catTransactions = monthTransactions.filter((t) => t.categoryId === cat.id);
      const totalAmount = catTransactions.reduce((acc, t) => acc + t.amount, 0);
      const totalComparison = filterType === 'egreso' ? totalExpense : totalIncome;
      const percentage = totalComparison > 0 ? (totalAmount / totalComparison) * 100 : 0;

      // Subcategory breakdown
      const subcatMap: Record<string, number> = {};
      catTransactions.forEach((t) => {
        const sub = t.subcategory || 'General';
        subcatMap[sub] = (subcatMap[sub] || 0) + t.amount;
      });

      return {
        ...cat,
        totalAmount,
        percentage,
        transactionCount: catTransactions.length,
        transactions: catTransactions,
        subcategoriesStats: Object.entries(subcatMap).map(([name, amount]) => ({
          name,
          amount,
          pct: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
        })),
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);

  const activeCategory = selectedCategoryTab !== 'all_expenses' 
    ? categoriesWithStats.find((c) => c.id === selectedCategoryTab) 
    : null;

  return (
    <div className="space-y-6">
      {/* Header & Type Toggle */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
            Desglose por Categorías & Insumos
          </h2>
          <p className="text-xs text-slate-500">
            Control detallado de compras de insumos (madera, vinilo, cola, clavos, tornillos), corte láser, nafta y ferias
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => {
              setFilterType('ingreso');
              setSelectedCategoryTab('all_expenses');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              filterType === 'ingreso'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ingresos ({formatCurrency(totalIncome, currencySymbol)})
          </button>
          <button
            onClick={() => {
              setFilterType('egreso');
              setSelectedCategoryTab('all_expenses');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              filterType === 'egreso'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Egresos ({formatCurrency(totalExpense, currencySymbol)})
          </button>
        </div>
      </div>

      {/* Categories Grid Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        {categoriesWithStats.map((cat) => {
          const isSelected = selectedCategoryTab === cat.id;

          return (
            <div
              key={cat.id}
              onClick={() => setSelectedCategoryTab(isSelected ? 'all_expenses' : cat.id)}
              className={`bg-white rounded-3xl p-5 sm:p-6 border transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              {/* Top Row: Icon, Name & Percentage */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
                    style={{ backgroundColor: cat.color }}
                  >
                    <CategoryIcon name={cat.icon} className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {cat.transactionCount} {cat.transactionCount === 1 ? 'registro' : 'registros'}
                    </p>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <p className="text-sm font-extrabold text-slate-900">
                    {formatCurrency(cat.totalAmount, currencySymbol)}
                  </p>
                  <span className="text-[10px] font-bold text-slate-400">
                    {cat.percentage.toFixed(1)}% del total
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(cat.percentage, 100)}%`,
                    backgroundColor: cat.color,
                  }}
                />
              </div>

              {/* Subcategories preview tags */}
              <div className="flex flex-wrap gap-1">
                {cat.subcategories.map((sub) => (
                  <span
                    key={sub}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200/80 font-medium"
                  >
                    {sub}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Category Section if Selected */}
      {activeCategory && (
        <div className="bg-white rounded-3xl p-6 border border-indigo-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-xs"
                style={{ backgroundColor: activeCategory.color }}
              >
                <CategoryIcon name={activeCategory.icon} className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {activeCategory.name} — Detalle de Subcategorías
                </h3>
                <p className="text-xs text-slate-500">
                  Total acumulado en {selectedMonth}: <strong className="text-slate-800">{formatCurrency(activeCategory.totalAmount, currencySymbol)}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenTransactionModal(activeCategory.type, activeCategory.id)}
                className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registrar en {activeCategory.name}</span>
              </button>
              <button
                onClick={() => setSelectedCategoryTab('all_expenses')}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cerrar
              </button>
            </div>
          </div>

          {/* Subcategory stats breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {activeCategory.subcategoriesStats.map((sub) => (
              <div key={sub.name} className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/80">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800">{sub.name}</span>
                  <span className="font-extrabold font-mono text-slate-900">
                    {formatCurrency(sub.amount, currencySymbol)}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1 mt-2">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${sub.pct}%`, backgroundColor: activeCategory.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Itemized Transactions list for this category */}
          <div className="pt-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Movimientos del mes en esta categoría ({activeCategory.transactions.length})
            </h4>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {activeCategory.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-xs transition-all flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-400">{formatDateSpanish(tx.date)}</span>
                    <span className="font-semibold text-slate-800">{tx.description}</span>
                    {tx.subcategory && (
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-medium">
                        {tx.subcategory}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold font-mono text-slate-900">
                      {formatCurrency(tx.amount, currencySymbol)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditTransaction(tx)}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded-md"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
