import React from 'react';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Calculator, 
  Calendar as CalendarIcon,
  TrendingUp,
  Coins
} from 'lucide-react';
import { getMonthLabel } from '../utils/formatters';

interface NavbarProps {
  selectedMonth: string; // YYYY-MM
  onMonthChange: (newMonth: string) => void;
  onOpenTransactionModal: (type?: 'egreso' | 'ingreso') => void;
  onOpenCalculator: () => void;
  onOpenExport: () => void;
  currencySymbol: string;
  onCurrencyChange: (symbol: string) => void;
  currentView: 'dashboard' | 'daily' | 'history' | 'categories';
  onViewChange: (view: 'dashboard' | 'daily' | 'history' | 'categories') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  selectedMonth,
  onMonthChange,
  onOpenTransactionModal,
  onOpenCalculator,
  onOpenExport,
  currencySymbol,
  onCurrencyChange,
  currentView,
  onViewChange,
}) => {
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    onMonthChange(`${newYear}-${newMonth}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month, 1);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    onMonthChange(`${newYear}-${newMonth}`);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 py-3">
          
          {/* Logo & Identity */}
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-700 flex items-center justify-center text-white shadow-sm ring-2 ring-amber-700/20">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  Gestión Emprendedor
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    Taller & Ferias
                  </span>
                </h1>
                <p className="text-xs text-slate-500 hidden sm:block">
                  Control diario de insumos, corte láser, nafta, ferias y ventas
                </p>
              </div>
            </div>

            {/* Mobile quick add button */}
            <div className="flex items-center gap-2 md:hidden">
              <button
                onClick={() => onOpenTransactionModal('egreso')}
                className="p-2 bg-red-600 text-white rounded-lg shadow-xs"
                title="Nuevo Egreso"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Month Navigator & Currency */}
          <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200/80 shadow-xs">
              <button
                onClick={handlePrevMonth}
                id="btn-prev-month"
                title="Mes anterior"
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1.5 px-3 min-w-[140px] justify-center text-center">
                <CalendarIcon className="w-3.5 h-3.5 text-amber-700" />
                <span className="text-xs font-semibold text-slate-800">
                  {getMonthLabel(selectedMonth)}
                </span>
              </div>
              <button
                onClick={handleNextMonth}
                id="btn-next-month"
                title="Mes siguiente"
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Currency selector */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl px-2 py-1 border border-slate-200/80">
              <Coins className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={currencySymbol}
                onChange={(e) => onCurrencyChange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                title="Moneda"
              >
                <option value="$">$ (Pesos / Dólares)</option>
                <option value="USD">USD</option>
                <option value="€">€ (Euro)</option>
                <option value="S/.">S/. (Soles)</option>
                <option value="Bs">Bs</option>
              </select>
            </div>

            {/* Tools (Calculator & Export) */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={onOpenCalculator}
                id="btn-open-calculator"
                title="Calculadora de Costos & Precios"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl border border-slate-200 transition-colors"
              >
                <Calculator className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden lg:inline">Costos / Precios</span>
              </button>

              <button
                onClick={onOpenExport}
                id="btn-open-export"
                title="Exportar / Copia de seguridad"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl border border-slate-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden lg:inline">Exportar</span>
              </button>
            </div>

            {/* Action Buttons (Desktop) */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => onOpenTransactionModal('egreso')}
                id="btn-add-expense"
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                + Gasto
              </button>
              <button
                onClick={() => onOpenTransactionModal('ingreso')}
                id="btn-add-income"
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                + Ingreso
              </button>
            </div>
          </div>
        </div>

        {/* View Navigation Tabs */}
        <div className="flex items-center gap-1 border-t border-slate-100 pt-2 pb-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => onViewChange('dashboard')}
            id="tab-dashboard"
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              currentView === 'dashboard'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            📊 Resumen del Mes
          </button>
          <button
            onClick={() => onViewChange('daily')}
            id="tab-daily"
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              currentView === 'daily'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            📅 Registro por Día
          </button>
          <button
            onClick={() => onViewChange('categories')}
            id="tab-categories"
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              currentView === 'categories'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            🪵 Desglose de Insumos & Rubros
          </button>
          <button
            onClick={() => onViewChange('history')}
            id="tab-history"
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              currentView === 'history'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            📋 Todos los Movimientos
          </button>
        </div>
      </div>
    </header>
  );
};
