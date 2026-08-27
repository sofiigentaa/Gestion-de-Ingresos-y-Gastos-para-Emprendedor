import React, { useState, useEffect } from 'react';
import { Transaction, CategoryOption } from './types';
import { 
  loadTransactions, 
  saveTransactions, 
  loadCategories, 
  saveCategories, 
  exportTransactionsToCSV 
} from './utils/storage';
import { 
  isSupabaseConfigured,
  fetchTransactionsFromSupabase,
  syncTransactionToSupabase,
  deleteTransactionFromSupabase
} from './lib/supabase';
import { 
  getCurrentMonthKey, 
  getTodayDateString, 
  formatCurrency, 
  getMonthLabel,
  formatFullDateSpanish
} from './utils/formatters';

import { Dashboard } from './components/Dashboard';
import { DailyView } from './components/DailyView';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { TransactionsTable } from './components/TransactionsTable';
import { TransactionModal } from './components/TransactionModal';
import { ExportModal } from './components/ExportModal';
import { ResetDataModal } from './components/ResetDataModal';
import { getSampleTransactions } from './data/sampleTransactions';
import { DEFAULT_CATEGORIES } from './data/initialCategories';
import germaniaLogo from './assets/images/germania_logo_1787747352294.jpg';
import { 
  LayoutDashboard, 
  CalendarDays,
  Calendar,
  Boxes, 
  ReceiptText, 
  Download, 
  RotateCcw,
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  X,
  Phone,
  Hammer
} from 'lucide-react';

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadTransactions());
  const [categories, setCategories] = useState<CategoryOption[]>(() => loadCategories());
  const currencySymbol = '$'; // Pesos argentinos únicamente
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentMonthKey());
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayDateString());
  const [currentView, setCurrentView] = useState<'dashboard' | 'daily' | 'categories' | 'history'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [modalDefaultType, setModalDefaultType] = useState<'egreso' | 'ingreso'>('egreso');
  const [modalDefaultDate, setModalDefaultDate] = useState<string>(getTodayDateString());
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Sync to local storage
  useEffect(() => {
    saveTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    saveCategories(categories);
  }, [categories]);

  // Load from Supabase if configured
  useEffect(() => {
    if (isSupabaseConfigured) {
      fetchTransactionsFromSupabase().then((remoteTx) => {
        if (remoteTx && remoteTx.length > 0) {
          setTransactions(remoteTx);
        }
      });
    }
  }, []);

  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newYear}-${newMonth}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month, 1);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newYear}-${newMonth}`);
  };

  const handleOpenAddTx = (type: 'egreso' | 'ingreso' = 'egreso', customDate?: string) => {
    setEditingTransaction(null);
    setModalDefaultType(type);
    setModalDefaultDate(customDate || selectedDate || getTodayDateString());
    setIsTxModalOpen(true);
  };

  const handleOpenAddTxWithCategory = (type: 'egreso' | 'ingreso' = 'egreso', categoryId?: string) => {
    setEditingTransaction(null);
    setModalDefaultType(type);
    setModalDefaultDate(selectedDate || getTodayDateString());
    setIsTxModalOpen(true);
  };

  const handleEditTx = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsTxModalOpen(true);
  };

  const handleDeleteTx = (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este registro?')) {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      deleteTransactionFromSupabase(id);
    }
  };

  const handleSaveTx = (
    txData: Omit<Transaction, 'id' | 'createdAt'>,
    editingId?: string
  ) => {
    if (editingId) {
      const existing = transactions.find((t) => t.id === editingId);
      const updatedTx: Transaction = {
        ...txData,
        id: editingId,
        createdAt: existing?.createdAt || Date.now(),
      };
      setTransactions((prev) =>
        prev.map((t) => (t.id === editingId ? updatedTx : t))
      );
      syncTransactionToSupabase(updatedTx);
    } else {
      const newTx: Transaction = {
        ...txData,
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        createdAt: Date.now(),
      };
      setTransactions((prev) => [newTx, ...prev]);
      syncTransactionToSupabase(newTx);

      const txMonth = txData.date.slice(0, 7);
      if (txMonth !== selectedMonth) {
        setSelectedMonth(txMonth);
      }
    }
  };

  const handleRestoreBackup = (newTxList: Transaction[], newCategories?: CategoryOption[]) => {
    setTransactions(newTxList);
    if (newCategories && newCategories.length > 0) {
      setCategories(newCategories);
    }
  };

  const handleResetToEmpty = () => {
    setTransactions([]);
    saveTransactions([]);
  };

  const handleResetToSample = () => {
    const sample = getSampleTransactions();
    setTransactions(sample);
    saveTransactions(sample);
  };

  const handleResetCategories = () => {
    setCategories(DEFAULT_CATEGORIES);
    saveCategories(DEFAULT_CATEGORIES);
  };

  const handleDateChangeFromDaily = (newDate: string) => {
    setSelectedDate(newDate);
    const monthOfDate = newDate.slice(0, 7);
    if (monthOfDate !== selectedMonth) {
      setSelectedMonth(monthOfDate);
    }
  };

  // Month stats for sidebar
  const monthTransactions = transactions.filter((t) => t.date.startsWith(selectedMonth));
  const monthIncome = monthTransactions
    .filter((t) => t.type === 'ingreso')
    .reduce((acc, t) => acc + t.amount, 0);
  const monthExpense = monthTransactions
    .filter((t) => t.type === 'egreso')
    .reduce((acc, t) => acc + t.amount, 0);
  const monthBalance = monthIncome - monthExpense;

  const viewTitles: Record<string, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Vista General',
      subtitle: `Resumen de ingresos, egresos y balance para ${getMonthLabel(selectedMonth)}`,
    },
    daily: {
      title: 'Registro Diario',
      subtitle: `Detalle por día del calendario (${formatFullDateSpanish(selectedDate)})`,
    },
    categories: {
      title: 'Desglose de Egresos & Rubros',
      subtitle: 'Insumos (Madera, Vinilo, Cola, Clavos, Tornillos), Corte Láser, Nafta y Feria',
    },
    history: {
      title: 'Historial de Movimientos',
      subtitle: 'Registro completo de transacciones con filtros avanzados y exportación',
    },
  };

  return (
    <div className="h-screen w-full bg-slate-50 flex overflow-hidden font-sans text-slate-900 antialiased selection:bg-indigo-500 selection:text-white">
      
      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sleek Dark Aside Navigation (Desktop & Mobile Drawer) */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col h-full shrink-0 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* GER-MANIA Brand Header with Woodcraft Logo */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={germaniaLogo} 
              alt="GER-MANIA Logo" 
              referrerPolicy="no-referrer"
              className="w-11 h-11 rounded-xl object-cover border border-slate-700/80 shadow-md shadow-amber-950/20 shrink-0"
            />
            <div className="min-w-0">
              <h2 className="text-base font-extrabold tracking-tight text-white uppercase leading-tight truncate">
                GER-MANIA
              </h2>
              <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest leading-tight mt-0.5">
                Trabajos en Madera
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 space-y-1.5 mt-4 overflow-y-auto no-scrollbar">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Navegación
          </div>

          <button
            onClick={() => {
              setCurrentView('dashboard');
              setIsMobileMenuOpen(false);
            }}
            id="nav-dashboard"
            className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all text-left text-sm ${
              currentView === 'dashboard'
                ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span 
              className={`w-2 h-2 rounded-full transition-all ${
                currentView === 'dashboard' ? 'bg-indigo-400 ring-2 ring-indigo-400/40' : 'bg-slate-600'
              }`} 
            />
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => {
              setCurrentView('daily');
              setIsMobileMenuOpen(false);
            }}
            id="nav-daily"
            className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all text-left text-sm ${
              currentView === 'daily'
                ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span 
              className={`w-2 h-2 rounded-full transition-all ${
                currentView === 'daily' ? 'bg-indigo-400 ring-2 ring-indigo-400/40' : 'bg-slate-600'
              }`} 
            />
            <CalendarDays className="w-4 h-4 shrink-0" />
            <span>Registro por Día</span>
          </button>

          <button
            onClick={() => {
              setCurrentView('categories');
              setIsMobileMenuOpen(false);
            }}
            id="nav-categories"
            className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all text-left text-sm ${
              currentView === 'categories'
                ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span 
              className={`w-2 h-2 rounded-full transition-all ${
                currentView === 'categories' ? 'bg-indigo-400 ring-2 ring-indigo-400/40' : 'bg-slate-600'
              }`} 
            />
            <Boxes className="w-4 h-4 shrink-0" />
            <span>Insumos & Categorías</span>
          </button>

          <button
            onClick={() => {
              setCurrentView('history');
              setIsMobileMenuOpen(false);
            }}
            id="nav-history"
            className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all text-left text-sm ${
              currentView === 'history'
                ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span 
              className={`w-2 h-2 rounded-full transition-all ${
                currentView === 'history' ? 'bg-indigo-400 ring-2 ring-indigo-400/40' : 'bg-slate-600'
              }`} 
            />
            <ReceiptText className="w-4 h-4 shrink-0" />
            <span>Todos los Movimientos</span>
          </button>

          <div className="pt-4 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Opciones
          </div>

          <button
            onClick={() => {
              setIsExportOpen(true);
              setIsMobileMenuOpen(false);
            }}
            id="nav-export"
            className="w-full flex items-center space-x-3 p-3 rounded-xl transition-all text-left text-sm text-slate-400 hover:text-white hover:bg-slate-800/60"
          >
            <span className="w-2 h-2 rounded-full bg-slate-600" />
            <Download className="w-4 h-4 shrink-0 text-slate-400" />
            <span>Exportar & Respaldos</span>
          </button>

          <button
            onClick={() => {
              setIsResetModalOpen(true);
              setIsMobileMenuOpen(false);
            }}
            id="nav-reset-data"
            className="w-full flex items-center space-x-3 p-3 rounded-xl transition-all text-left text-sm text-amber-400/90 hover:text-amber-300 hover:bg-slate-800/60"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <RotateCcw className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Restablecer Datos</span>
          </button>
        </nav>

        {/* Sidebar Monthly Balance Box */}
        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/40 backdrop-blur-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">
                Balance Mensual
              </p>
              <span className="text-[10px] text-slate-500 font-mono">
                {selectedMonth}
              </span>
            </div>
            <p className={`text-lg font-bold mt-1 tracking-tight ${
              monthBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {monthBalance >= 0 ? '+' : ''}{formatCurrency(monthBalance, currencySymbol)}
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-700/50">
              <span>Ing: <strong className="text-emerald-400 font-mono">{formatCurrency(monthIncome, currencySymbol)}</strong></span>
              <span>Egr: <strong className="text-rose-400 font-mono">{formatCurrency(monthExpense, currencySymbol)}</strong></span>
            </div>
            
            <div className="mt-3 pt-2 border-t border-slate-700/30 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Almacenamiento:</span>
              <span className={`inline-flex items-center gap-1 font-medium ${
                isSupabaseConfigured ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isSupabaseConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`} />
                {isSupabaseConfigured ? 'Nube Supabase' : 'Local'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
        
        {/* Sleek Top Header Bar */}
        <header className="h-20 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shrink-0 z-10 shadow-xs">
          
          {/* Left Title & Mobile Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg lg:hidden hover:bg-slate-100"
              title="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                {viewTitles[currentView]?.title || 'Vista General'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">
                {viewTitles[currentView]?.subtitle || 'Control diario y mensual'}
              </p>
            </div>
          </div>

          {/* Right Controls & Actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            
            {/* Month Navigator Pill */}
            <div className="flex items-center bg-slate-100/90 rounded-full p-1 border border-slate-200 shadow-xs">
              <button
                onClick={handlePrevMonth}
                id="btn-header-prev-month"
                title="Mes anterior"
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-full transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-bold text-slate-700 px-2 sm:px-3 whitespace-nowrap">
                {getMonthLabel(selectedMonth)}
              </span>
              <button
                onClick={handleNextMonth}
                id="btn-header-next-month"
                title="Mes siguiente"
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-full transition-all"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Action Buttons - Ingreso first, then Egreso */}
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <button
                onClick={() => handleOpenAddTx('ingreso')}
                id="btn-header-add-income"
                className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Ingreso</span>
              </button>
              <button
                onClick={() => handleOpenAddTx('egreso')}
                id="btn-header-add-expense"
                className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Egreso</span>
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable View Body - with mobile bottom padding */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {currentView === 'dashboard' && (
              <Dashboard
                transactions={transactions}
                categories={categories}
                selectedMonth={selectedMonth}
                currencySymbol={currencySymbol}
                onOpenTransactionModal={handleOpenAddTxWithCategory}
                onSelectDay={(d) => {
                  setSelectedDate(d);
                  setCurrentView('daily');
                }}
                onEditTransaction={handleEditTx}
                onDeleteTransaction={handleDeleteTx}
                onSaveDirectTransaction={handleSaveTx}
              />
            )}

            {currentView === 'daily' && (
              <DailyView
                transactions={transactions}
                categories={categories}
                selectedDate={selectedDate}
                onDateChange={handleDateChangeFromDaily}
                currencySymbol={currencySymbol}
                onOpenTransactionModal={handleOpenAddTx}
                onEditTransaction={handleEditTx}
                onDeleteTransaction={handleDeleteTx}
              />
            )}

            {currentView === 'categories' && (
              <CategoryBreakdown
                transactions={transactions}
                categories={categories}
                selectedMonth={selectedMonth}
                currencySymbol={currencySymbol}
                onOpenTransactionModal={handleOpenAddTxWithCategory}
                onEditTransaction={handleEditTx}
                onDeleteTransaction={handleDeleteTx}
              />
            )}

            {currentView === 'history' && (
              <TransactionsTable
                transactions={transactions}
                categories={categories}
                currencySymbol={currencySymbol}
                onOpenTransactionModal={handleOpenAddTx}
                onEditTransaction={handleEditTx}
                onDeleteTransaction={handleDeleteTx}
                onExportCSV={() => exportTransactionsToCSV(transactions)}
                onOpenResetModal={() => setIsResetModalOpen(true)}
              />
            )}
          </div>
        </div>

        {/* Mobile Bottom Navigation Bar (Mobile First Thumb UX) */}
        <nav 
          id="mobile-bottom-nav"
          className="lg:hidden fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-30 flex items-center justify-around px-2 py-2 text-[10px] font-semibold text-slate-400 shadow-2xl"
        >
          <button
            onClick={() => setCurrentView('dashboard')}
            id="mobile-nav-dashboard"
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
              currentView === 'dashboard' ? 'text-indigo-400 font-bold bg-slate-800/70' : 'hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>General</span>
          </button>

          <button
            onClick={() => setCurrentView('daily')}
            id="mobile-nav-daily"
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
              currentView === 'daily' ? 'text-indigo-400 font-bold bg-slate-800/70' : 'hover:text-white'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span>Diario</span>
          </button>

          <button
            onClick={() => handleOpenAddTx('ingreso')}
            className="flex flex-col items-center justify-center -mt-4 w-12 h-12 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/40 active:scale-95 transition-transform"
            title="Registrar Ingreso"
          >
            <Plus className="w-6 h-6" />
          </button>

          <button
            onClick={() => setCurrentView('categories')}
            id="mobile-nav-categories"
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
              currentView === 'categories' ? 'text-indigo-400 font-bold bg-slate-800/70' : 'hover:text-white'
            }`}
          >
            <Boxes className="w-5 h-5" />
            <span>Insumos</span>
          </button>

          <button
            onClick={() => setCurrentView('history')}
            id="mobile-nav-history"
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all ${
              currentView === 'history' ? 'text-indigo-400 font-bold bg-slate-800/70' : 'hover:text-white'
            }`}
          >
            <ReceiptText className="w-5 h-5" />
            <span>Historial</span>
          </button>
        </nav>
      </main>

      {/* Transaction Add / Edit Modal */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSave={handleSaveTx}
        editingTransaction={editingTransaction}
        categories={categories}
        defaultDate={modalDefaultDate}
        defaultType={modalDefaultType}
        currencySymbol={currencySymbol}
      />

      {/* Export & Backup Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        transactions={transactions}
        categories={categories}
        selectedMonth={selectedMonth}
        currencySymbol={currencySymbol}
        onRestoreBackup={handleRestoreBackup}
        onOpenResetModal={() => {
          setIsExportOpen(false);
          setIsResetModalOpen(true);
        }}
      />

      {/* Reset Data Modal */}
      <ResetDataModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onResetToEmpty={handleResetToEmpty}
        onResetToSample={handleResetToSample}
        onResetCategories={handleResetCategories}
      />

      {/* Printable Report View (Visible only during print preview) */}
      <div className="hidden print:block fixed inset-0 bg-white p-8 z-50 text-black">
        <div className="border-b pb-4 mb-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img 
              src={germaniaLogo} 
              alt="GER-MANIA Logo" 
              className="w-12 h-12 rounded-lg object-cover border"
            />
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight">GER-MANIA - Trabajos en Madera</h1>
              <p className="text-xs text-gray-600">Período: {getMonthLabel(selectedMonth)}</p>
            </div>
          </div>
          <div className="text-right text-xs text-gray-500">
            Generado: {new Date().toLocaleDateString('es-AR')}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6 border p-4 rounded-xl">
          <div>
            <p className="text-xs text-gray-500">Total Ingresos</p>
            <p className="text-lg font-bold text-green-700">
              {formatCurrency(monthIncome, currencySymbol)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Egresos</p>
            <p className="text-lg font-bold text-red-700">
              {formatCurrency(monthExpense, currencySymbol)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Balance Neto</p>
            <p className="text-lg font-bold">
              {formatCurrency(monthBalance, currencySymbol)}
            </p>
          </div>
        </div>

        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="p-2">Fecha</th>
              <th className="p-2">Tipo</th>
              <th className="p-2">Categoría</th>
              <th className="p-2">Descripción</th>
              <th className="p-2">Medio Pago</th>
              <th className="p-2 text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            {monthTransactions.map((t) => (
              <tr key={t.id} className="border-b">
                <td className="p-2">{t.date}</td>
                <td className="p-2">{t.type === 'ingreso' ? 'Ingreso' : 'Egreso'}</td>
                <td className="p-2">{t.categoryName} {t.subcategory ? `(${t.subcategory})` : ''}</td>
                <td className="p-2">{t.description}</td>
                <td className="p-2">{t.paymentMethod}</td>
                <td className="p-2 text-right font-bold">
                  {t.type === 'ingreso' ? '+' : '-'}{formatCurrency(t.amount, currencySymbol)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
