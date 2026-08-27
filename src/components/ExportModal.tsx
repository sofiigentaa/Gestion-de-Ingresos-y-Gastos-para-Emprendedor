import React, { useRef } from 'react';
import { X, FileSpreadsheet, Download, Upload, Printer, RotateCcw, Database } from 'lucide-react';
import { Transaction, CategoryOption } from '../types';
import { exportTransactionsToCSV, exportBackupJSON } from '../utils/storage';
import { formatCurrency, getMonthLabel } from '../utils/formatters';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  categories: CategoryOption[];
  selectedMonth: string;
  currencySymbol: string;
  onRestoreBackup: (transactions: Transaction[], categories?: CategoryOption[]) => void;
  onOpenResetModal?: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  categories,
  selectedMonth,
  currencySymbol,
  onRestoreBackup,
  onOpenResetModal,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const monthTransactions = transactions.filter((t) => t.date.startsWith(selectedMonth));

  const handleExportCSV = () => {
    exportTransactionsToCSV(transactions);
  };

  const handleExportMonthCSV = () => {
    exportTransactionsToCSV(monthTransactions);
  };

  const handleExportJSON = () => {
    exportBackupJSON(transactions, categories);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed && Array.isArray(parsed.transactions)) {
          onRestoreBackup(parsed.transactions, parsed.categories);
          alert('¡Copia de seguridad restaurada con éxito!');
          onClose();
        } else if (Array.isArray(parsed)) {
          onRestoreBackup(parsed);
          alert('¡Copia de seguridad restaurada con éxito!');
          onClose();
        } else {
          alert('El archivo no contiene un formato de respaldo válido.');
        }
      } catch (err) {
        alert('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                Exportar & Respaldos
              </h2>
              <p className="text-xs text-slate-500">
                Descarga tus datos en Excel, crea copias de seguridad o imprime informes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          
          {/* Option 1: Excel CSV */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs transition-all">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-bold text-slate-900">
                  Exportar a Excel / Planilla (CSV)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Compatible con Excel, Google Sheets, LibreOffice y Calc.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={handleExportMonthCSV}
                    className="px-3.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
                  >
                    Descargar Mes ({getMonthLabel(selectedMonth)})
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
                  >
                    Historial Completo
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Option 2: JSON Backup */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs transition-all">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-bold text-slate-900">
                  Copia de Seguridad y Restauración (JSON)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Guarda una copia completa o restaura en otra computadora o celular.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={handleExportJSON}
                    className="px-3.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors"
                  >
                    Descargar Respaldo
                  </button>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImportFile}
                    accept=".json"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" /> Restaurar Archivo
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Option 3: Print */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs transition-all">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
                <Printer className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-bold text-slate-900">
                  Imprimir Informe / Guardar en PDF
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Genera una versión imprimible limpia o guarda el reporte en formato PDF.
                </p>
                <div className="mt-3">
                  <button
                    onClick={handlePrint}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
                  >
                    Imprimir Vista Actual
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Option 4: Restablecer Datos */}
          <div className="p-4 rounded-2xl border border-amber-200/80 bg-amber-50/40 hover:bg-amber-50/70 hover:shadow-xs transition-all">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-bold text-slate-900">
                  Restablecer Datos del Sistema
                </h3>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Vacía los movimientos de prueba para empezar de cero en producción o recarga los ejemplos.
                </p>
                <div className="mt-3">
                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenResetModal) onOpenResetModal();
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold text-amber-800 bg-amber-100/90 hover:bg-amber-200 border border-amber-300 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Abrir panel para Restablecer Datos</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
