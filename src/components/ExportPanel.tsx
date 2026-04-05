import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { FileText, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';

export default function ExportPanel() {
  const [exportDate, setExportDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [exporting, setExporting] = useState(false);

  const handleExport = async (type: 'pdf' | 'excel') => {
    setExporting(true);
    try {
      const q = query(collection(db, 'reservations'), where('date', '==', exportDate));
      const snap = await getDocs(q);
      const reservations = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (reservations.length === 0) {
        toast.error('No hay reservas para la fecha seleccionada.');
        return;
      }

      const { exportToPDF, exportToExcel } = await import('../lib/exportUtils');

      if (type === 'pdf') {
        exportToPDF(exportDate, reservations);
      } else {
        exportToExcel(exportDate, reservations);
      }
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error('Error al exportar los datos.');
      handleFirestoreError(error, OperationType.GET, 'reservations');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
      <div className="bg-blue-950 px-6 py-4 border-b border-yellow-600/30 flex items-center">
        <FileText className="mr-2 h-5 w-5 text-yellow-500" />
        <h3 className="text-lg font-bold text-white uppercase tracking-wider">Exportar Planillas</h3>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Fecha de la Planilla</label>
          <input
            type="date"
            value={exportDate}
            onChange={(e) => setExportDate(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 text-white px-3 py-2 rounded focus:outline-none focus:border-yellow-500"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting}
            className="flex-1 flex items-center justify-center py-2 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded transition-colors disabled:opacity-50 uppercase text-xs tracking-wider"
          >
            <Download className="w-4 h-4 mr-2" /> PDF
          </button>
          <button
            onClick={() => handleExport('excel')}
            disabled={exporting}
            className="flex-1 flex items-center justify-center py-2 px-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded transition-colors disabled:opacity-50 uppercase text-xs tracking-wider"
          >
            <Download className="w-4 h-4 mr-2" /> Excel
          </button>
        </div>
      </div>
    </div>
  );
}
