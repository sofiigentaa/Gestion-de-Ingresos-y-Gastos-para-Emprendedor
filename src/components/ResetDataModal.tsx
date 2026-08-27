import React, { useState } from 'react';
import { X, RotateCcw, Trash2, Sparkles, AlertTriangle, Check, Layers } from 'lucide-react';
import { Transaction, CategoryOption } from '../types';
import { getSampleTransactions } from '../data/sampleTransactions';
import { DEFAULT_CATEGORIES } from '../data/initialCategories';

interface ResetDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetToEmpty: () => void;
  onResetToSample: () => void;
  onResetCategories: () => void;
  totalTransactionsCount: number;
}

export const ResetDataModal: React.FC<ResetDataModalProps> = ({
  isOpen,
  onClose,
  onResetToEmpty,
  onResetToSample,
  onResetCategories,
  totalTransactionsCount,
}) => {
  const [confirmMode, setConfirmMode] = useState<'empty' | 'sample' | 'categories' | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');

  if (!isOpen) return null;

  const handleAction = (mode: 'empty' | 'sample' | 'categories') => {
    if (mode === 'empty') {
      onResetToEmpty();
      setSuccessMessage('¡Se vaciaron todos los movimientos! La app quedó limpia para producción.');
    } else if (mode === 'sample') {
      onResetToSample();
      setSuccessMessage('¡Se restauraron los datos de ejemplo de demostración de GER-MANIA!');
    } else if (mode === 'categories') {
      onResetCategories();
      setSuccessMessage('¡Se restablecieron las categorías e insumos por defecto (Madera, Vinilo, Cola, etc.)!');
    }
    setConfirmMode(null);
    setTimeout(() => {
      setSuccessMessage('');
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Restablecer Datos
              </h2>
              <p className="text-xs text-slate-500">
                Limpia los datos de prueba para empezar de cero o restaura los ejemplos
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setConfirmMode(null);
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Message */}
        {successMessage && (
          <div className="m-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-in fade-in">
            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-xs font-bold leading-relaxed">{successMessage}</p>
          </div>
        )}

        {/* Body Content */}
        {!successMessage && (
          <div className="p-6 space-y-4">
            
            {/* Warning Note */}
            <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 leading-relaxed">
                Actualmente tienes <strong>{totalTransactionsCount} movimiento{totalTransactionsCount === 1 ? '' : 's'}</strong> registrado{totalTransactionsCount === 1 ? '' : 's'}. Selecciona la opción que deseas ejecutar:
              </p>
            </div>

            {/* Option 1: Clean/Empty Data for Production */}
            <div className={`p-4 rounded-2xl border transition-all ${
              confirmMode === 'empty'
                ? 'border-rose-300 bg-rose-50/60 shadow-xs'
                : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs'
            }`}>
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/60 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900">
                      Vaciar todo (Empezar de cero para producción)
                    </h3>
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      Recomendado al subir
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Elimina todos los movimientos de prueba cargados para que puedas empezar a anotar tus ventas y gastos reales del taller desde una base limpia.
                  </p>

                  {confirmMode === 'empty' ? (
                    <div className="mt-3 p-3 bg-white border border-rose-200 rounded-xl space-y-2">
                      <p className="text-xs font-bold text-rose-700">
                        ¿Confirmas que deseas borrar todos los {totalTransactionsCount} movimientos?
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleAction('empty')}
                          className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
                        >
                          Sí, vaciar todos los datos
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmMode(null)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setConfirmMode('empty')}
                        className="px-3.5 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Vaciar todos los movimientos</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Option 2: Restore Sample Demo Data */}
            <div className={`p-4 rounded-2xl border transition-all ${
              confirmMode === 'sample'
                ? 'border-indigo-300 bg-indigo-50/60 shadow-xs'
                : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs'
            }`}>
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-bold text-slate-900">
                    Cargar datos de ejemplo de GER-MANIA
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Restaura los 12 movimientos de muestra (compras de madera, vinilo, corte láser, ventas en feria, nafta) para ver cómo funciona el sistema.
                  </p>

                  {confirmMode === 'sample' ? (
                    <div className="mt-3 p-3 bg-white border border-indigo-200 rounded-xl space-y-2">
                      <p className="text-xs font-bold text-indigo-700">
                        ¿Deseas reemplazar los datos actuales con los ejemplos de muestra?
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleAction('sample')}
                          className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                        >
                          Sí, cargar ejemplos
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmMode(null)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setConfirmMode('sample')}
                        className="px-3.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Restablecer datos de muestra</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Option 3: Reset Default Categories */}
            <div className={`p-4 rounded-2xl border transition-all ${
              confirmMode === 'categories'
                ? 'border-amber-300 bg-amber-50/60 shadow-xs'
                : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs'
            }`}>
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-bold text-slate-900">
                    Restablecer categorías originales del taller
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Restaura las categorías de fábrica con los insumos (Madera, Vinilo, Cola, Clavos, Tornillos, Corte Láser, Canon Feria, Nafta, etc.).
                  </p>

                  {confirmMode === 'categories' ? (
                    <div className="mt-3 p-3 bg-white border border-amber-200 rounded-xl space-y-2">
                      <p className="text-xs font-bold text-amber-800">
                        ¿Restablecer todas las categorías a los valores originales?
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleAction('categories')}
                          className="px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
                        >
                          Sí, restablecer categorías
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmMode(null)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setConfirmMode('categories')}
                        className="px-3.5 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Restablecer categorías originales</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={() => {
              setConfirmMode(null);
              onClose();
            }}
            className="px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200/70 rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
