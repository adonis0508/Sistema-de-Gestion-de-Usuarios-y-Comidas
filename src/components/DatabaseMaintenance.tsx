import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { subYears, format } from 'date-fns';
import { Database, AlertTriangle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';

export default function DatabaseMaintenance() {
  const [isCleaning, setIsCleaning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleCleanup = async () => {
    setIsCleaning(true);
    setShowConfirm(false);
    
    try {
      const oneYearAgo = subYears(new Date(), 1);
      const oneYearAgoStr = format(oneYearAgo, 'yyyy-MM-dd');
      
      let deletedCount = 0;

      // 1. Delete old reservations
      const resQuery = query(collection(db, 'reservations'), where('date', '<', oneYearAgoStr));
      const resSnapshot = await getDocs(resQuery);
      
      if (!resSnapshot.empty) {
        const batch = writeBatch(db);
        resSnapshot.docs.forEach((docSnap) => {
          batch.delete(docSnap.ref);
          deletedCount++;
        });
        await batch.commit();
      }

      // 2. Delete old menus
      const menuQuery = query(collection(db, 'menus'), where('date', '<', oneYearAgoStr));
      const menuSnapshot = await getDocs(menuQuery);
      
      if (!menuSnapshot.empty) {
        const batch = writeBatch(db);
        menuSnapshot.docs.forEach((docSnap) => {
          batch.delete(docSnap.ref);
          deletedCount++;
        });
        await batch.commit();
      }

      toast.success(`Mantenimiento completado. Se eliminaron ${deletedCount} registros antiguos.`);
    } catch (error) {
      console.error("Error during database cleanup:", error);
      toast.error("Error al limpiar la base de datos.");
      handleFirestoreError(error, OperationType.DELETE, 'maintenance');
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
      <div className="bg-blue-950 px-6 py-4 border-b border-yellow-600/30 flex items-center">
        <Database className="mr-2 h-5 w-5 text-yellow-500" />
        <h3 className="text-lg font-bold text-white uppercase tracking-wider">Mantenimiento de BD</h3>
      </div>
      
      <div className="p-6 space-y-4">
        <p className="text-slate-400 text-sm">
          Esta herramienta elimina automáticamente todas las reservas y menús que tengan más de 1 año de antigüedad.
          Ayuda a mantener la base de datos ligera y gratuita.
        </p>
        
        <button
          onClick={() => setShowConfirm(true)}
          disabled={isCleaning}
          className="w-full flex items-center justify-center px-4 py-3 bg-red-600/20 text-red-500 hover:bg-red-600/30 border border-red-900/50 rounded transition-colors uppercase text-sm font-bold tracking-wider disabled:opacity-50"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {isCleaning ? 'Limpiando...' : 'Limpiar Registros Antiguos (> 1 año)'}
        </button>
      </div>

      {/* Modal de Confirmación */}
      {showConfirm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-lg border border-red-900/50 p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center">
              <AlertTriangle className="mr-2 text-red-500" /> Confirmar Limpieza
            </h3>
            <p className="text-slate-300 mb-6 text-sm">
              ¿Estás seguro de que deseas eliminar permanentemente todos los registros (reservas y menús) anteriores a hace 1 año? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors font-medium"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCleanup}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold transition-colors shadow-lg shadow-red-900/20"
              >
                Sí, Limpiar Base de Datos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
