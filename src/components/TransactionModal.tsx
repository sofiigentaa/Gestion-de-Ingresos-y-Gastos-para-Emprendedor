import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, PaymentMethod, CategoryOption } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { getTodayDateString } from '../utils/formatters';
import { X, Plus, Check, Calendar, CreditCard, User, FileText, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id' | 'createdAt'>, editingId?: string) => void;
  editingTransaction?: Transaction | null;
  categories: CategoryOption[];
  defaultDate?: string;
  defaultType?: TransactionType;
  currencySymbol: string;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTransaction,
  categories,
  defaultDate,
  defaultType = 'egreso',
  currencySymbol,
}) => {
  const [type, setType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayDateString());
  const [categoryId, setCategoryId] = useState<string>('');
  const [subcategory, setSubcategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transferencia');
  const [supplierOrClient, setSupplierOrClient] = useState<string>('');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [customSubcategory, setCustomSubcategory] = useState<string>('');

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(editingTransaction.amount.toString());
      setDate(editingTransaction.date);
      setCategoryId(editingTransaction.categoryId);
      setSubcategory(editingTransaction.subcategory || '');
      setDescription(editingTransaction.description);
      setPaymentMethod(editingTransaction.paymentMethod);
      setSupplierOrClient(editingTransaction.supplierOrClient || '');
      setReceiptNumber(editingTransaction.receiptNumber || '');
    } else {
      setType(defaultType);
      setAmount('');
      setDate(defaultDate || getTodayDateString());
      setDescription('');
      setSupplierOrClient('');
      setReceiptNumber('');
      setCustomSubcategory('');

      // Pick first matching category
      const matchingCats = categories.filter((c) => c.type === defaultType);
      if (matchingCats.length > 0) {
        setCategoryId(matchingCats[0].id);
        setSubcategory(matchingCats[0].subcategories[0] || '');
      } else {
        setCategoryId('');
        setSubcategory('');
      }
    }
  }, [editingTransaction, isOpen, defaultDate, defaultType, categories]);

  // When type changes, adjust available categories
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const available = categories.filter((c) => c.type === newType);
    if (available.length > 0) {
      setCategoryId(available[0].id);
      setSubcategory(available[0].subcategories[0] || '');
    } else {
      setCategoryId('');
      setSubcategory('');
    }
  };

  const currentCategory = categories.find((c) => c.id === categoryId);

  const handleCategorySelect = (cat: CategoryOption) => {
    setCategoryId(cat.id);
    if (cat.subcategories.length > 0) {
      setSubcategory(cat.subcategories[0]);
    } else {
      setSubcategory('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Por favor ingrese un monto válido mayor a 0');
      return;
    }

    const cat = categories.find((c) => c.id === categoryId);
    const finalCategoryName = cat ? cat.name : (type === 'egreso' ? 'Egreso General' : 'Ingreso General');
    const finalSubcategory = customSubcategory.trim() || subcategory;

    onSave(
      {
        type,
        amount: numAmount,
        date,
        categoryId: categoryId || 'otro',
        categoryName: finalCategoryName,
        subcategory: finalSubcategory || undefined,
        description: description.trim(),
        paymentMethod,
        supplierOrClient: supplierOrClient.trim() || undefined,
        receiptNumber: receiptNumber.trim() || undefined,
      },
      editingTransaction?.id
    );

    onClose();
  };

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) => c.type === type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div 
        id="transaction-modal"
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[90vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/80">
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">
              {editingTransaction ? 'Editar Movimiento' : 'Registrar Nuevo Movimiento'}
            </h2>
            <p className="text-xs text-slate-500">
              {type === 'egreso' ? 'Compra de insumos (madera, vinilo, cola, clavos, tornillos), corte láser, nafta o canon de feria' : 'Ventas en ferias o productos personalizados por encargue'}
            </p>
          </div>
          <button
            onClick={onClose}
            id="btn-close-modal"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Type Selector (Ingreso first, then Egreso) */}
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              id="btn-type-ingreso"
              onClick={() => handleTypeChange('ingreso')}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs transition-all shadow-xs ${
                type === 'ingreso'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              Ingreso (Venta / Cobro)
            </button>
            <button
              type="button"
              id="btn-type-egreso"
              onClick={() => handleTypeChange('egreso')}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs transition-all shadow-xs ${
                type === 'egreso'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              Egreso (Insumo / Compra)
            </button>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                Monto ({currencySymbol}) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-base">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="any"
                  id="input-transaction-amount"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-lg font-mono font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                  autoFocus={!editingTransaction}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                Fecha del Movimiento *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  id="input-transaction-date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Categories Grid */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
              Categoría Principal *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5">
              {filteredCategories.map((cat) => {
                const isSelected = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    id={`cat-btn-${cat.id}`}
                    onClick={() => handleCategorySelect(cat)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border text-left text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/90 text-indigo-950 ring-2 ring-indigo-600/30 font-bold shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white shadow-xs"
                      style={{ backgroundColor: cat.color }}
                    >
                      <CategoryIcon name={cat.icon} className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-semibold">{cat.name}</span>
                      {cat.id === 'compra_insumos' && (
                        <span className="text-[10px] text-indigo-600 font-medium truncate">Madera, Vinilo, Cola, Clavos, Tornillos</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subcategory / Insumo Selector */}
          {currentCategory && currentCategory.subcategories && currentCategory.subcategories.length > 0 && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {currentCategory.id === 'compra_insumos' ? '🪵 ¿Qué Insumo compraste? (Elegí uno)' : '📌 Subtipo / Detalle'}
                </label>
                <span className="text-[11px] text-slate-500 font-medium">Opcional</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {currentCategory.subcategories.map((sub) => {
                  const isSelected = (subcategory === sub && !customSubcategory);
                  return (
                    <button
                      key={sub}
                      type="button"
                      id={`subcat-btn-${sub.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => {
                        setSubcategory(sub);
                        setCustomSubcategory('');
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/30 scale-[1.02]'
                          : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-100/70'
                      }`}
                    >
                      {sub === 'Madera' && '🪵'}
                      {sub === 'Vinilo' && '🎨'}
                      {sub === 'Cola' && '🧴'}
                      {sub === 'Clavos' && '🔨'}
                      {sub === 'Tornillos' && '🔩'}
                      {sub}
                    </button>
                  );
                })}
              </div>

              {/* Custom subcategory input */}
              <div className="pt-1.5">
                <input
                  type="text"
                  placeholder="O escribe otro insumo específico si no está en la lista..."
                  value={customSubcategory}
                  onChange={(e) => {
                    setCustomSubcategory(e.target.value);
                    if (e.target.value) setSubcategory(e.target.value);
                  }}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
              Descripción / Concepto
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <textarea
                id="input-transaction-desc"
                rows={2}
                placeholder={
                  type === 'egreso'
                    ? 'Ej: Compra de insumos (madera, vinilo, cola, clavos, tornillos), corte láser, nafta o canon...'
                    : 'Ej: Venta en feria o cartel personalizado por encargue...'
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-sm text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-300 resize-none"
              />
            </div>
          </div>

          {/* Payment Method, Supplier/Client & Receipt */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                Método de Pago
              </label>
              <select
                id="select-payment-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
              >
                <option value="efectivo">💵 Efectivo</option>
                <option value="transferencia">🏦 Transferencia Bancaria</option>
                <option value="mercado_pago">📱 Mercado Pago</option>
                <option value="tarjeta_debito">💳 Tarjeta de Débito</option>
                <option value="tarjeta_credito">💳 Tarjeta de Crédito</option>
                <option value="otro">🔄 Otro medio</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                {type === 'egreso' ? 'Proveedor / Negocio' : 'Cliente / Comprador'}
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  id="input-supplier-client"
                  placeholder={type === 'egreso' ? 'Maderera / Ferretería' : 'Nombre cliente / Feria'}
                  value={supplierOrClient}
                  onChange={(e) => setSupplierOrClient(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                N° Ticket / Factura (Opcional)
              </label>
              <input
                type="text"
                id="input-receipt-num"
                placeholder="TK-00123 / Factura B"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                className="w-full px-3 py-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              id="btn-cancel-transaction"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-submit-transaction"
              className={`flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-all active:scale-95 ${
                type === 'egreso'
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
              }`}
            >
              <Check className="w-4 h-4" />
              {editingTransaction ? 'Guardar Cambios' : 'Registrar Movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
