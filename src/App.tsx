/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import DashboardLayout from './components/DashboardLayout';
import ComensalView from './pages/ComensalView';
import MozoView from './pages/MozoView';
import CocineroView from './pages/CocineroView';
import AdminMesaView from './pages/AdminMesaView';
import SuperAdminView from './pages/SuperAdminView';
import AboutView from './pages/AboutView';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-yellow-500">Cargando...</div>;
  if (!user || !profile) return <Navigate to="/login" />;

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

function RoleBasedRedirect() {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (!profile) return <Navigate to="/login" />;

  switch (profile.role) {
    case 'comensal': return <Navigate to="/comensal" />;
    case 'mozo': return <Navigate to="/mozo" />;
    case 'cocinero': return <Navigate to="/cocinero" />;
    case 'admin_mesa': return <Navigate to="/admin-mesa" />;
    case 'superadmin': return <Navigate to="/superadmin" />;
    default: return <Navigate to="/login" />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<RoleBasedRedirect />} />
            <Route path="comensal" element={<ProtectedRoute allowedRoles={['comensal', 'admin_mesa', 'superadmin']}><ComensalView /></ProtectedRoute>} />
            <Route path="mozo" element={<ProtectedRoute allowedRoles={['mozo', 'admin_mesa', 'superadmin']}><MozoView /></ProtectedRoute>} />
            <Route path="cocinero" element={<ProtectedRoute allowedRoles={['cocinero', 'superadmin']}><CocineroView /></ProtectedRoute>} />
            <Route path="admin-mesa" element={<ProtectedRoute allowedRoles={['admin_mesa', 'superadmin']}><AdminMesaView /></ProtectedRoute>} />
            <Route path="superadmin" element={<ProtectedRoute allowedRoles={['superadmin']}><SuperAdminView /></ProtectedRoute>} />
            <Route path="acerca-de" element={<ProtectedRoute><AboutView /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
