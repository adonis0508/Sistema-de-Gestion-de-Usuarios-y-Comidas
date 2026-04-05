import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { ShieldAlert, UserCog, FileText, Download } from 'lucide-react';
import { Role } from '../types';
import { format } from 'date-fns';
import { exportToPDF, exportToExcel } from '../lib/exportUtils';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';

export default function SuperAdminView() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportDate, setExportDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'users'));
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching users:", error);
        handleFirestoreError(error, OperationType.GET, 'users');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Error al actualizar el rol.");
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleExport = async (type: 'pdf' | 'excel') => {
    setExporting(true);
    try {
      const q = query(collection(db, 'reservations'), where('date', '==', exportDate));
      const snap = await getDocs(q);
      const reservations = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (reservations.length === 0) {
        alert('No hay reservas para la fecha seleccionada.');
        return;
      }

      if (type === 'pdf') {
        exportToPDF(exportDate, reservations);
      } else {
        exportToExcel(exportDate, reservations);
      }
    } catch (error) {
      console.error("Error exporting data:", error);
      alert('Error al exportar los datos.');
      handleFirestoreError(error, OperationType.GET, 'reservations');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 px-4 sm:px-0 pb-10">
      <div className="bg-slate-800 p-4 rounded-lg shadow-lg border border-red-900/50 flex items-center">
        <ShieldAlert className="mr-3 h-6 w-6 text-red-500" />
        <h2 className="text-xl font-bold text-white uppercase tracking-wider">
          Panel de Superusuario
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Exportar Planillas */}
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
      </div>

      <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
        <div className="bg-blue-950 px-6 py-4 border-b border-yellow-600/30 flex items-center justify-between">
          <div className="flex items-center">
            <UserCog className="mr-2 h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">Gestión de Usuarios</h3>
          </div>
          <span className="bg-slate-900 text-slate-300 text-xs font-bold px-2 py-1 rounded border border-slate-700">
            {users.length} Usuarios
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-900/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Nombre
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Teléfono
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Rol Actual
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-slate-800 divide-y divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-yellow-500">Cargando usuarios...</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-700/30">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {user.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${user.role === 'superadmin' ? 'bg-red-900/50 text-red-400 border border-red-500/50' : 
                          user.role === 'admin_mesa' ? 'bg-yellow-900/50 text-yellow-500 border border-yellow-600/50' : 
                          'bg-slate-700 text-slate-300 border border-slate-600'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                        className="bg-slate-900 border border-slate-600 text-white text-sm rounded focus:ring-yellow-500 focus:border-yellow-500 block w-full p-2"
                      >
                        <option value="comensal">Comensal</option>
                        <option value="mozo">Mozo</option>
                        <option value="cocinero">Cocinero</option>
                        <option value="admin_mesa">Admin de Mesa</option>
                        <option value="superadmin">Superadmin</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
