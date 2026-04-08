import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { ShieldAlert, UserCog, ExternalLink, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Role } from '../types';
import toast from 'react-hot-toast';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import ExportPanel from '../components/ExportPanel';
import DatabaseMaintenance from '../components/DatabaseMaintenance';

export default function SuperAdminView() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<{id: string, name: string} | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users:", error);
      handleFirestoreError(error, OperationType.GET, 'users');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    setActionLoading(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      toast.success("Rol actualizado exitosamente.");
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Error al actualizar el rol.");
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    } finally {
      setActionLoading(null);
    }
  };

  const confirmDeleteUser = (userId: string, userName: string) => {
    setUserToDelete({ id: userId, name: userName });
  };

  const executeDeleteUser = async () => {
    if (!userToDelete) return;
    const { id: userId, name: userName } = userToDelete;
    
    setActionLoading(userId);
    try {
      // 1. Delete user document
      await deleteDoc(doc(db, 'users', userId));

      // 2. Cascading delete: Find and delete all reservations for this user
      const resQuery = query(collection(db, 'reservations'), where('userId', '==', userId));
      const resSnapshot = await getDocs(resQuery);
      
      if (!resSnapshot.empty) {
        const batch = writeBatch(db);
        resSnapshot.docs.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
      }

      toast.success(`Usuario ${userName} y sus reservas eliminados.`);
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Error al eliminar el usuario.");
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    } finally {
      setActionLoading(null);
      setUserToDelete(null);
    }
  };

  return (
    <div className="space-y-6 px-4 sm:px-0 pb-10">
      {/* Modal de Confirmación de Eliminación */}
      {userToDelete && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-lg border border-red-900/50 p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center">
              <ShieldAlert className="mr-2 text-red-500" /> Confirmar Eliminación
            </h3>
            <p className="text-slate-300 mb-6">
              ¿Estás seguro de que deseas eliminar al usuario <strong className="text-white">{userToDelete.name}</strong>? Esta acción eliminará también todas sus reservas y no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors font-medium"
              >
                Cancelar
              </button>
              <button 
                onClick={executeDeleteUser}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold transition-colors shadow-lg shadow-red-900/20"
              >
                Eliminar Usuario
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-800 p-4 rounded-lg shadow-lg border border-red-900/50 flex items-center">
        <ShieldAlert className="mr-3 h-6 w-6 text-red-500" />
        <h2 className="text-xl font-bold text-white uppercase tracking-wider">
          Panel de Superusuario
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Exportar Planillas */}
        <ExportPanel />

        {/* Mantenimiento de Base de Datos */}
        <DatabaseMaintenance />

        {/* Accesos Rápidos */}
        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden md:col-span-2">
          <div className="bg-blue-950 px-6 py-4 border-b border-yellow-600/30 flex items-center">
            <ExternalLink className="mr-2 h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">Accesos Rápidos</h3>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-slate-400 text-sm">Como Superadmin, tienes permisos para acceder a todas las vistas operativas:</p>
            <div className="flex flex-col gap-3">
              <Link to="/admin-mesa" className="inline-flex items-center justify-center px-4 py-3 border border-red-600/50 text-red-400 hover:bg-red-600/10 rounded transition-colors uppercase text-sm font-bold tracking-wider">
                Vista Admin Mesa <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
              <Link to="/comensal" className="inline-flex items-center justify-center px-4 py-3 border border-yellow-600/50 text-yellow-500 hover:bg-yellow-600/10 rounded transition-colors uppercase text-sm font-bold tracking-wider">
                Vista Comensal <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
              <Link to="/mozo" className="inline-flex items-center justify-center px-4 py-3 border border-slate-600 text-slate-300 hover:bg-slate-700 rounded transition-colors uppercase text-sm font-bold tracking-wider">
                Vista Mozo <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
              <Link to="/cocina" className="inline-flex items-center justify-center px-4 py-3 border border-slate-600 text-slate-300 hover:bg-slate-700 rounded transition-colors uppercase text-sm font-bold tracking-wider">
                Vista Cocina <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
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
        
        <div className="hidden md:block overflow-x-auto">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 flex items-center space-x-3">
                      <select
                        value={user.role}
                        disabled={actionLoading === user.id}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                        className="bg-slate-900 border border-slate-600 text-white text-sm rounded focus:ring-yellow-500 focus:border-yellow-500 block w-full p-2 disabled:opacity-50"
                      >
                        <option value="comensal">Comensal</option>
                        <option value="mozo">Mozo</option>
                        <option value="cocinero">Cocinero</option>
                        <option value="admin_mesa">Admin de Mesa</option>
                        <option value="superadmin">Superadmin</option>
                      </select>
                      <button
                        onClick={() => confirmDeleteUser(user.id, user.name)}
                        disabled={actionLoading === user.id}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden divide-y divide-slate-700">
          {loading ? (
            <div className="p-6 text-center text-yellow-500">Cargando usuarios...</div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-white font-bold text-sm">{user.name}</h4>
                    <p className="text-slate-400 text-xs mt-1">{user.phone}</p>
                  </div>
                  <span className={`px-2 py-1 inline-flex text-[10px] leading-4 font-bold uppercase tracking-wider rounded-full 
                    ${user.role === 'superadmin' ? 'bg-red-900/50 text-red-400 border border-red-500/50' : 
                      user.role === 'admin_mesa' ? 'bg-yellow-900/50 text-yellow-500 border border-yellow-600/50' : 
                      'bg-slate-700 text-slate-300 border border-slate-600'}`}>
                    {user.role}
                  </span>
                </div>
                <div className="flex items-center space-x-2 pt-2 border-t border-slate-700/50">
                  <select
                    value={user.role}
                    disabled={actionLoading === user.id}
                    onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                    className="flex-1 bg-slate-900 border border-slate-600 text-white text-sm rounded focus:ring-yellow-500 focus:border-yellow-500 block p-2 disabled:opacity-50"
                  >
                    <option value="comensal">Comensal</option>
                    <option value="mozo">Mozo</option>
                    <option value="cocinero">Cocinero</option>
                    <option value="admin_mesa">Admin de Mesa</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                  <button
                    onClick={() => confirmDeleteUser(user.id, user.name)}
                    disabled={actionLoading === user.id}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded border border-red-900/50 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
