/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import DashboardLayout from './components/DashboardLayout';

const ComensalView = lazy(() => import('./pages/ComensalView'));
const MozoView = lazy(() => import('./pages/MozoView'));
const CocineroView = lazy(() => import('./pages/CocineroView'));
const AdminMesaView = lazy(() => import('./pages/AdminMesaView'));
const SuperAdminView = lazy(() => import('./pages/SuperAdminView'));
const AboutView = lazy(() => import('./pages/AboutView'));

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-yellow-500 font-bold uppercase tracking-widest">Cargando...</div>;
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

const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-900 text-yellow-500 font-bold uppercase tracking-widest">Cargando vista...</div>}>
    {children}
  </Suspense>
);

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<RoleBasedRedirect />} />
            <Route path="comensal" element={<ProtectedRoute allowedRoles={['comensal', 'admin_mesa', 'superadmin']}><SuspenseWrapper><ComensalView /></SuspenseWrapper></ProtectedRoute>} />
            <Route path="mozo" element={<ProtectedRoute allowedRoles={['mozo', 'admin_mesa', 'superadmin']}><SuspenseWrapper><MozoView /></SuspenseWrapper></ProtectedRoute>} />
            <Route path="cocinero" element={<ProtectedRoute allowedRoles={['cocinero', 'superadmin']}><SuspenseWrapper><CocineroView /></SuspenseWrapper></ProtectedRoute>} />
            <Route path="admin-mesa" element={<ProtectedRoute allowedRoles={['admin_mesa', 'superadmin']}><SuspenseWrapper><AdminMesaView /></SuspenseWrapper></ProtectedRoute>} />
            <Route path="superadmin" element={<ProtectedRoute allowedRoles={['superadmin']}><SuspenseWrapper><SuperAdminView /></SuspenseWrapper></ProtectedRoute>} />
            <Route path="acerca-de" element={<ProtectedRoute><SuspenseWrapper><AboutView /></SuspenseWrapper></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
