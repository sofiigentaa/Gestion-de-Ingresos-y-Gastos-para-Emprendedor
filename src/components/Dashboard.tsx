import React, { useState } from 'react';
import { Transaction, CategoryOption, PaymentMethod, TransactionType } from '../types';
import { formatCurrency, formatDateSpanish, getTodayDateString } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Percent, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight,
  Sparkles,
  Layers,
  Fuel,
  Store,
  Zap,
  CheckCircle2,
  Edit2,
  Trash2,
  CircleDollarSign
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

interface DashboardProps {
  transactions: Transaction[];
  categories: CategoryOption[];
  selectedMonth: string;
  currencySymbol: string;
  onOpenTransactionModal: (type?: 'egreso' | 'ingreso', categoryId?: string) => void;
  onSelectDay: (dateStr: string) => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onSaveDirectTransaction?: (txData: Omit<Transaction, 'id' | 'createdAt'>) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  categories,
  selectedMonth,
  currencySymbol,
  onOpenTransactionModal,
  onSelectDay,
  onEditTransaction,
  onDeleteTransaction,
  onSaveDirectTransaction,
}) => {
  // Quick Entry local state
  const [quickType, setQuickType] = useState<TransactionType>('ingreso');
  const [quickDesc, setQuickDesc] = useState<string>('');
  const [quickCategoryId, setQuickCategoryId] = useState<string>('');
  const [quickAmount, setQuickAmount] = useState<string>('');
  const [quickPaymentMethod, setQuickPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [quickSuccess, setQuickSuccess] = useState<boolean>(false);

  // Month transactions
  const monthTransactions = transactions.filter((t) => t.date.startsWith(selectedMonth));

  // Totals
  const totalIncome = monthTransactions
    .filter((t) => t.type === 'ingreso')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = monthTransactions
    .filter((t) => t.type === 'egreso')
    .reduce((acc, t) => acc + t.amount, 0);

  const netBalance = totalIncome - totalExpense;
  const profitMargin = totalIncome > 0 ? ((netBalance / totalIncome) * 100).toFixed(1) : '0';

  // Insumos & Corte Láser
  const insumosMateriales = monthTransactions
    .filter((t) => 
      t.type === 'egreso' && 
      (t.categoryId === 'compra_insumos' || t.categoryId === 'corte_laser' || t.categoryId.startsWith('insumos_'))
    )
    .reduce((acc, t) => acc + t.amount, 0);

  // Canon Feria & Nafta
  const feriasLogistica = monthTransactions
    .filter((t) => 
      t.type === 'egreso' && 
      (t.categoryId === 'canon_feria' || t.categoryId === 'nafta' || t.categoryId === 'nafta_movilidad')
    )
    .reduce((acc, t) => acc + t.amount, 0);

  // Chart data
  const daysInMonth = new Date(
    Number(selectedMonth.split('-')[0]),
    Number(selectedMonth.split('-')[1]),
    0
  ).getDate();

  const dailyDataMap: Record<string, { day: string; fullDate: string; ingresos: number; egresos: number; balance: number }> = {};

  for (let i = 1; i <= daysInMonth; i++) {
    const dayStr = String(i).padStart(2, '0');
    const fullDate = `${selectedMonth}-${dayStr}`;
    dailyDataMap[fullDate] = {
      day: `${i}`,
      fullDate,
      ingresos: 0,
      egresos: 0,
      balance: 0,
    };
  }

  monthTransactions.forEach((t) => {
    if (dailyDataMap[t.date]) {
      if (t.type === 'ingreso') {
        dailyDataMap[t.date].ingresos += t.amount;
      } else {
        dailyDataMap[t.date].egresos += t.amount;
      }
      dailyDataMap[t.date].balance = dailyDataMap[t.date].ingresos - dailyDataMap[t.date].egresos;
    }
  });

  const dailyChartData = Object.values(dailyDataMap);

  // Pie chart data by category
  const expenseByCategoryMap: Record<string, { name: string; amount: number; color: string; icon: string }> = {};

  monthTransactions
    .filter((t) => t.type === 'egreso')
    .forEach((t) => {
      const cat = categories.find((c) => c.id === t.categoryId);
      const name = cat ? cat.name : t.categoryName || 'Otros Gastos';
      const color = cat ? cat.color : '#6366f1';
      const icon = cat ? cat.icon : 'CircleDot';

      if (!expenseByCategoryMap[t.categoryId]) {
        expenseByCategoryMap[t.categoryId] = { name, amount: 0, color, icon };
      }
      expenseByCategoryMap[t.categoryId].amount += t.amount;
    });

  const expensePieData = Object.values(expenseByCategoryMap)
    .sort((a, b) => b.amount - a.amount);

  const availableQuickCats = categories.filter((c) => c.type === quickType);

  // Set default category when type switches
  React.useEffect(() => {
    if (availableQuickCats.length > 0 && !availableQuickCats.some(c => c.id === quickCategoryId)) {
      setQuickCategoryId(availableQuickCats[0].id);
    }
  }, [quickType, availableQuickCats]);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(quickAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Por favor ingrese un monto válido');
      return;
    }
    const cat = categories.find((c) => c.id === quickCategoryId) || availableQuickCats[0];
    if (!cat) return;

    if (onSaveDirectTransaction) {
      onSaveDirectTransaction({
        date: getTodayDateString(),
        type: quickType,
        categoryId: cat.id,
        categoryName: cat.name,
        subcategory: cat.subcategories[0] || '',
        description: quickDesc.trim() || cat.name,
        amount: amountNum,
        paymentMethod: quickPaymentMethod,
      });

      setQuickAmount('');
      setQuickDesc('');
      setQuickSuccess(true);
      setTimeout(() => setQuickSuccess(false), 2500);
    } else {
      onOpenTransactionModal(quickType, quickCategoryId);
    }
  };

  // Recent transactions for this month
  const recentTransactions = [...monthTransactions]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
    .slice(0, 7);

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
      
      {/* 4 Top KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* KPI 1: Ingresos Mes */}
        <div className="bg-white p-5 lg:p-6 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Ingresos del Mes
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
            {formatCurrency(totalIncome, currencySymbol)}
          </p>
          <div className="flex items-center mt-2.5 text-emerald-600 text-xs font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
            <span>
              {totalIncome > 0 ? `Margen sobre ventas: ${profitMargin}%` : 'Sin ingresos'}
            </span>
          </div>
        </div>

        {/* KPI 2: Egresos Mes */}
        <div className="bg-white p-5 lg:p-6 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Egresos del Mes
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
            {formatCurrency(totalExpense, currencySymbol)}
          </p>
          <div className="flex items-center mt-2.5 text-rose-600 text-xs font-semibold">
            <ArrowDownRight className="w-3.5 h-3.5 mr-1" />
            <span>
              {monthTransactions.filter(t => t.type === 'egreso').length} registros de egreso
            </span>
          </div>
        </div>

        {/* KPI 3: Insumos & Láser */}
        <div className="bg-white p-5 lg:p-6 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Insumos & Corte Láser
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
            {formatCurrency(insumosMateriales, currencySymbol)}
          </p>
          <div className="flex items-center mt-2.5 text-indigo-600 text-xs font-semibold">
            <Layers className="w-3.5 h-3.5 mr-1" />
            <span>Madera, Vinilo, Cola, Tornillos y Láser</span>
          </div>
        </div>

        {/* KPI 4: Balance Neto */}
        <div className="bg-white p-5 lg:p-6 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Balance Neto
          </p>
          <p className={`text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight ${
            netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance, currencySymbol)}
          </p>
          <div className="flex items-center mt-2.5 text-purple-700 text-xs font-semibold">
            <Store className="w-3.5 h-3.5 mr-1 text-purple-600" />
            <span>Canon Feria & Nafta: {formatCurrency(feriasLogistica, currencySymbol)}</span>
          </div>
        </div>
      </section>

      {/* Main 3-Column / 2-Span Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Left 2 Columns: Recent Transactions Table & Evolution Chart */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Recent Transactions Card (Sleek Table Layout) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-lg tracking-tight">
                  Registros Recientes del Mes
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Últimos movimientos registrados en {selectedMonth}
                </p>
              </div>
              <button 
                onClick={() => onOpenTransactionModal('egreso')}
                className="text-indigo-600 hover:text-indigo-700 text-xs font-bold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo registro</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/70 sticky top-0 border-b border-slate-100">
                  <tr className="text-[11px] uppercase text-slate-500 font-bold tracking-wider">
                    <th className="px-5 sm:px-6 py-3.5">Fecha</th>
                    <th className="px-5 sm:px-6 py-3.5">Concepto / Detalle</th>
                    <th className="px-5 sm:px-6 py-3.5">Categoría</th>
                    <th className="px-5 sm:px-6 py-3.5 text-right">Monto</th>
                    <th className="px-4 py-3.5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {recentTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                        <CircleDollarSign className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        <p className="font-medium text-slate-600">No hay movimientos registrados en este mes</p>
                        <p className="text-xs text-slate-400 mt-1">Usa el formulario rápido o los botones superiores para registrar tu primer movimiento.</p>
                      </td>
                    </tr>
                  ) : (
                    recentTransactions.map((tx) => (
                      <tr key={tx.id} className="text-slate-700 hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 sm:px-6 py-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                          {formatDateSpanish(tx.date)}
                        </td>
                        <td className="px-5 sm:px-6 py-4">
                          <p className="font-semibold text-slate-900 leading-snug">{tx.description}</p>
                          {tx.subcategory && (
                            <p className="text-xs text-slate-500 mt-0.5">{tx.subcategory}</p>
                          )}
                        </td>
                        <td className="px-5 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${getCategoryBadgeClass(tx.categoryId, tx.type)}`}>
                            <CategoryIcon name={categories.find(c => c.id === tx.categoryId)?.icon || 'CircleDot'} className="w-3.5 h-3.5" />
                            <span>{tx.categoryName}</span>
                          </span>
                        </td>
                        <td className="px-5 sm:px-6 py-4 text-right font-bold whitespace-nowrap">
                          <span className={tx.type === 'ingreso' ? 'text-emerald-600' : 'text-slate-900'}>
                            {tx.type === 'ingreso' ? '+' : '-'}{formatCurrency(tx.amount, currencySymbol)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => onEditTransaction(tx)}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteTransaction(tx.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100"
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

            {monthTransactions.length > 7 && (
              <div className="p-4 bg-slate-50/50 border-t border-slate-100 text-center">
                <button 
                  onClick={() => onSelectDay(getTodayDateString())}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  Ver todos los {monthTransactions.length} registros del mes &rarr;
                </button>
              </div>
            )}
          </div>

          {/* Evolution Chart */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="font-bold text-slate-800 text-lg tracking-tight">
                  Evolución Diaria del Mes
                </h3>
                <p className="text-xs text-slate-500">
                  Comparativa de ingresos (verde) vs egresos (rojo) día por día
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1 text-emerald-600">
                  <span className="w-3 h-3 rounded bg-emerald-500" /> Ingresos
                </span>
                <span className="flex items-center gap-1 text-rose-500">
                  <span className="w-3 h-3 rounded bg-rose-500" /> Egresos
                </span>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `$${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(Number(value), currencySymbol), '']}
                    labelFormatter={(label) => `Día ${label} de ${selectedMonth}`}
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: '1px solid #e2e8f0', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={16} />
                  <Bar dataKey="egresos" name="Egresos" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Quick Entry Sleek Form & Expense Donut Chart */}
        <div className="space-y-6">
          
          {/* Quick Registration Card */}
          <div className="bg-indigo-900 rounded-3xl shadow-xl p-6 sm:p-7 flex flex-col text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-300" />
                Registro Rápido
              </h3>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-800 text-indigo-200 border border-indigo-700/50">
                Directo
              </span>
            </div>

            <form onSubmit={handleQuickSubmit} className="space-y-4">
              {/* Type Switcher */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-indigo-300 uppercase tracking-widest">
                  Tipo de Operación
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button" 
                    onClick={() => setQuickType('ingreso')}
                    className={`py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs ${
                      quickType === 'ingreso'
                        ? 'bg-emerald-500 text-white shadow-md ring-2 ring-emerald-400/50'
                        : 'bg-indigo-950/60 text-indigo-300 hover:bg-indigo-800/80 border border-indigo-700/40'
                    }`}
                  >
                    💰 Ingreso (Venta)
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setQuickType('egreso')}
                    className={`py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs ${
                      quickType === 'egreso'
                        ? 'bg-white text-indigo-950 shadow-md ring-2 ring-white/50'
                        : 'bg-indigo-950/60 text-indigo-300 hover:bg-indigo-800/80 border border-indigo-700/40'
                    }`}
                  >
                    💸 Egreso (Insumo)
                  </button>
                </div>
              </div>

              {/* Concept / Detail */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-indigo-300 uppercase tracking-widest">
                  Concepto / Detalle
                </label>
                <input 
                  type="text" 
                  value={quickDesc}
                  onChange={(e) => setQuickDesc(e.target.value)}
                  placeholder={quickType === 'egreso' ? 'Ej: Madera MDF, Vinilo, Cola, Tornillos' : 'Ej: Venta en feria, Pedido'}
                  className="w-full bg-indigo-950/70 border border-indigo-800/80 rounded-xl p-3 text-sm text-white placeholder-indigo-400/70 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-indigo-300 uppercase tracking-widest">
                  Categoría
                </label>
                <select 
                  value={quickCategoryId}
                  onChange={(e) => setQuickCategoryId(e.target.value)}
                  className="w-full bg-indigo-950/70 border border-indigo-800/80 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                >
                  {availableQuickCats.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount & Payment Method */}
              <div className="grid grid-cols-2 gap-3 items-start">
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider whitespace-nowrap h-5 flex items-center">
                    Monto ({currencySymbol})
                  </label>
                  <input 
                    type="number" 
                    step="any"
                    value={quickAmount}
                    onChange={(e) => setQuickAmount(e.target.value)}
                    placeholder="0"
                    className="h-11 w-full bg-indigo-950/70 border border-indigo-800/80 rounded-xl px-3 text-white placeholder-indigo-400/70 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono text-sm font-bold"
                  />
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider whitespace-nowrap h-5 flex items-center">
                    Medio de Pago
                  </label>
                  <select 
                    value={quickPaymentMethod}
                    onChange={(e) => setQuickPaymentMethod(e.target.value as PaymentMethod)}
                    className="h-11 w-full bg-indigo-950/70 border border-indigo-800/80 rounded-xl px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                  >
                    <option value="efectivo" className="bg-slate-900 text-white">Efectivo</option>
                    <option value="transferencia" className="bg-slate-900 text-white">Transferencia</option>
                    <option value="mercado_pago" className="bg-slate-900 text-white">Mercado Pago</option>
                    <option value="tarjeta_debito" className="bg-slate-900 text-white">Tarjeta Débito</option>
                    <option value="tarjeta_credito" className="bg-slate-900 text-white">Tarjeta Crédito</option>
                  </select>
                </div>
              </div>

              {/* Submit Button - with single plus icon */}
              <button 
                type="submit"
                className="w-full bg-indigo-500 hover:bg-indigo-400 text-white py-3.5 rounded-2xl font-black text-sm tracking-wider uppercase transition-all shadow-lg shadow-indigo-500/30 active:scale-95 flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                {quickSuccess ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-300 animate-bounce" />
                    <span>¡REGISTRADO CON ÉXITO!</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>GUARDAR REGISTRO</span>
                  </>
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={() => onOpenTransactionModal(quickType, quickCategoryId)}
              className="mt-3 text-center text-xs text-indigo-300 hover:text-white underline"
            >
              Abrir formulario completo con comprobante &rarr;
            </button>
          </div>

          {/* Expense Distribution Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-6">
            <h3 className="font-bold text-slate-800 text-base tracking-tight mb-1">
              Distribución de Egresos
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Porcentaje destinado a cada rubro de egreso
            </p>

            {expensePieData.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Sin egresos en este mes
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensePieData}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={68}
                        paddingAngle={3}
                      >
                        {expensePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val: any) => [formatCurrency(Number(val), currencySymbol), '']}
                        contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {expensePieData.map((item) => {
                    const pct = totalExpense > 0 ? ((item.amount / totalExpense) * 100).toFixed(1) : '0';
                    return (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate pr-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="font-medium text-slate-700 truncate">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 font-mono">
                          <span className="font-semibold text-slate-900">{formatCurrency(item.amount, currencySymbol)}</span>
                          <span className="text-slate-400 text-[10px]">({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
