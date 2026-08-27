import React, { useState } from 'react';
import { Transaction, CategoryOption, TransactionType } from '../types';
import { formatCurrency, formatDateSpanish, formatFullDateSpanish, getTodayDateString } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  Clock,
  Trash2,
  Edit2
} from 'lucide-react';

interface DailyViewProps {
  transactions: Transaction[];
  categories: CategoryOption[];
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (newDate: string) => void;
  currencySymbol: string;
  onOpenTransactionModal: (type?: 'egreso' | 'ingreso', defaultDate?: string) => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const DailyView: React.FC<DailyViewProps> = ({
  transactions,
  categories,
  selectedDate,
  onDateChange,
  currencySymbol,
  onOpenTransactionModal,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const [viewYearMonth, setViewYearMonth] = useState(() => selectedDate.slice(0, 7));

  // Daily transactions
  const dayTransactions = transactions.filter((t) => t.date === selectedDate);

  const dayIncome = dayTransactions
    .filter((t) => t.type === 'ingreso')
    .reduce((acc, t) => acc + t.amount, 0);

  const dayExpense = dayTransactions
    .filter((t) => t.type === 'egreso')
    .reduce((acc, t) => acc + t.amount, 0);

  const dayBalance = dayIncome - dayExpense;

  // Jump to prev or next day
  const handlePrevDay = () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() - 1);
    const newDate = d.toISOString().split('T')[0];
    onDateChange(newDate);
    setViewYearMonth(newDate.slice(0, 7));
  };

  const handleNextDay = () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + 1);
    const newDate = d.toISOString().split('T')[0];
    onDateChange(newDate);
    setViewYearMonth(newDate.slice(0, 7));
  };

  const handleSetToday = () => {
    const today = getTodayDateString();
    onDateChange(today);
    setViewYearMonth(today.slice(0, 7));
  };

  // Calendar matrix calculation
  const [calYear, calMonth] = viewYearMonth.split('-').map(Number);
  const firstDayIndex = new Date(calYear, calMonth - 1, 1).getDay(); // 0 is Sunday
  const daysInCalMonth = new Date(calYear, calMonth, 0).getDate();

  // Transactions mapped by day for activity dots
  const dayActivityMap: Record<string, { hasIncome: boolean; hasExpense: boolean; count: number }> = {};
  transactions.forEach((t) => {
    if (!dayActivityMap[t.date]) {
      dayActivityMap[t.date] = { hasIncome: false, hasExpense: false, count: 0 };
    }
    dayActivityMap[t.date].count += 1;
    if (t.type === 'ingreso') dayActivityMap[t.date].hasIncome = true;
    if (t.type === 'egreso') dayActivityMap[t.date].hasExpense = true;
  });

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
      {/* Header Day Navigator */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Date Selector Navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevDay}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            title="Día anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center sm:text-left">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 capitalize tracking-tight">
                {formatFullDateSpanish(selectedDate)}
              </h2>
              {selectedDate === getTodayDateString() && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  HOY
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {dayTransactions.length} {dayTransactions.length === 1 ? 'movimiento registrado' : 'movimientos registrados'}
            </p>
          </div>

          <button
            onClick={handleNextDay}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            title="Día siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls - Single plus only */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={handleSetToday}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Ir a Hoy
          </button>
          <button
            onClick={() => onOpenTransactionModal('ingreso', selectedDate)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ingreso Día</span>
          </button>
          <button
            onClick={() => onOpenTransactionModal('egreso', selectedDate)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Egreso Día</span>
          </button>
        </div>
      </div>

      {/* Grid: Day Stats & Interactive Calendar Mini-Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Day Summary + List of day movements */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Day KPIs */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ingresos Hoy</span>
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1">
                {formatCurrency(dayIncome, currencySymbol)}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                <span>Egresos Hoy</span>
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-rose-600 mt-1">
                {formatCurrency(dayExpense, currencySymbol)}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                <Wallet className="w-3.5 h-3.5 text-indigo-600" />
                <span>Balance Día</span>
              </div>
              <p className={`text-xl sm:text-2xl font-extrabold mt-1 ${
                dayBalance >= 0 ? 'text-slate-900' : 'text-rose-600'
              }`}>
                {dayBalance >= 0 ? '+' : ''}{formatCurrency(dayBalance, currencySymbol)}
              </p>
            </div>
          </div>

          {/* List of Movements for Selected Day */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 tracking-tight">
                  Detalle de Movimientos del Día
                </h3>
                <p className="text-xs text-slate-500">
                  {dayTransactions.length} registros para el día seleccionado
                </p>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) {
                    onDateChange(e.target.value);
                    setViewYearMonth(e.target.value.slice(0, 7));
                  }
                }}
                className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-semibold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {dayTransactions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30 text-indigo-600" />
                <p className="text-sm font-bold text-slate-600">Sin movimientos para esta fecha</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Registra compras de insumos (madera, vinilo, cola, clavos, tornillos), corte láser, nafta o canon de feria para este día.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    onClick={() => onOpenTransactionModal('ingreso', selectedDate)}
                    className="flex items-center gap-1 px-3.5 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Registrar Ingreso</span>
                  </button>
                  <button
                    onClick={() => onOpenTransactionModal('egreso', selectedDate)}
                    className="flex items-center gap-1 px-3.5 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Registrar Egreso</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {dayTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="py-3.5 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`p-2 rounded-xl border ${getCategoryBadgeClass(tx.categoryId, tx.type)}`}>
                        <CategoryIcon name={categories.find(c => c.id === tx.categoryId)?.icon || 'CircleDot'} className="w-4 h-4" />
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{tx.description}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span>{tx.categoryName}</span>
                          {tx.subcategory && (
                            <>
                              <span>•</span>
                              <span className="text-slate-600 font-medium">{tx.subcategory}</span>
                            </>
                          )}
                          <span>•</span>
                          <span className="capitalize">{tx.paymentMethod}</span>
                          {tx.supplierOrClient && (
                            <>
                              <span>•</span>
                              <span className="italic">{tx.supplierOrClient}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className={`text-base font-extrabold font-mono ${
                          tx.type === 'ingreso' ? 'text-emerald-600' : 'text-slate-900'
                        }`}>
                          {tx.type === 'ingreso' ? '+' : '-'}{formatCurrency(tx.amount, currencySymbol)}
                        </span>
                        {tx.receiptNumber && (
                          <p className="text-[10px] text-slate-400 font-mono">Doc: {tx.receiptNumber}</p>
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
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Mini Calendar & Quick Jump */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-sm">
                Calendario del Mes
              </h3>
              <span className="text-xs font-mono font-semibold text-slate-500">
                {viewYearMonth}
              </span>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              <span>Do</span>
              <span>Lu</span>
              <span>Ma</span>
              <span>Mi</span>
              <span>Ju</span>
              <span>Vi</span>
              <span>Sá</span>
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty leading days */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="h-9" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInCalMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dayStr = String(dayNum).padStart(2, '0');
                const cellDate = `${viewYearMonth}-${dayStr}`;
                const isSelected = cellDate === selectedDate;
                const isToday = cellDate === getTodayDateString();
                const activity = dayActivityMap[cellDate];

                return (
                  <button
                    key={cellDate}
                    onClick={() => onDateChange(cellDate)}
                    className={`h-9 rounded-xl flex flex-col items-center justify-center relative transition-all text-xs font-medium ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-bold shadow-md ring-2 ring-indigo-300'
                        : isToday
                        ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span>{dayNum}</span>
                    {activity && (
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {activity.hasIncome && (
                          <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                        )}
                        {activity.hasExpense && (
                          <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-rose-500'}`} />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Ingreso
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Egreso
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" /> Seleccionado
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
