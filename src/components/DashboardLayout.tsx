import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { LogOut, Menu, X, Bell } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function DashboardLayout() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const roleDisplayNames: Record<string, string> = {
    comensal: 'Comensal',
    mozo: 'Mozo',
    cocinero: 'Cocinero',
    admin_mesa: 'Admin de Mesa',
    superadmin: 'Superusuario',
  };

  const NavItem = ({ to, label, allowedRoles }: { to: string, label: string, allowedRoles: string[] }) => {
    if (!profile || !allowedRoles.includes(profile.role)) return null;
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive 
            ? 'bg-yellow-600 text-blue-950 font-bold' 
            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col font-sans text-slate-200 relative overflow-hidden">
      {/* Background watermark effect */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
        <img src="/deff.png" alt="Ejército Argentino" className="w-full max-w-[800px] h-auto max-h-[80vh] object-contain p-4" />
      </div>

      {/* Top Navigation */}
      <nav className="bg-blue-950 border-b border-yellow-600/30 shadow-md relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-2 mr-4">
                <img src="/deff.png" alt="EA" className="h-8 w-8 sm:h-10 sm:w-10 object-contain flex-shrink-0" />
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-slate-800 border border-yellow-600 flex items-center justify-center overflow-hidden p-0.5 flex-shrink-0">
                  <img src="/DEf.png" alt="Agr Com 601" className="h-full w-full object-contain" />
                </div>
              </div>
              <div className="flex flex-col hidden sm:flex">
                <span className="text-white font-bold text-lg leading-tight tracking-wide uppercase">Casino Oficiales</span>
                <span className="text-yellow-500 text-xs font-semibold tracking-widest uppercase">GECB</span>
              </div>
              
              {/* Desktop Nav Links */}
              <div className="hidden md:flex ml-8 space-x-2">
                <NavItem to="/superadmin" label="Superadmin" allowedRoles={['superadmin']} />
                <NavItem to="/admin-mesa" label="Admin Mesa" allowedRoles={['superadmin', 'admin_mesa']} />
                <NavItem to="/cocinero" label="Cocina" allowedRoles={['superadmin', 'cocinero']} />
                <NavItem to="/mozo" label="Mozo" allowedRoles={['superadmin', 'admin_mesa', 'mozo']} />
                <NavItem to="/comensal" label="Comensal" allowedRoles={['superadmin', 'admin_mesa', 'comensal']} />
                <NavItem to="/acerca-de" label="Acerca de" allowedRoles={['superadmin', 'admin_mesa', 'cocinero', 'mozo', 'comensal']} />
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-4">
              
              {/* Notifications Dropdown */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="relative p-2 text-slate-300 hover:text-white focus:outline-none transition-colors"
                >
                  <Bell className="h-6 w-6" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 block h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-blue-950">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {isNotifOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-slate-800 rounded-md shadow-lg border border-slate-700 overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Notificaciones</h3>
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllAsRead}
                          className="text-xs text-yellow-500 hover:text-yellow-400 font-medium"
                        >
                          Marcar todo leído
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-slate-400">
                          No tienes notificaciones
                        </div>
                      ) : (
                        notifications.map((notif) => {
                          const isRead = profile && notif.readBy.includes(profile.uid);
                          return (
                            <div 
                              key={notif.id} 
                              className={`px-4 py-3 border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors cursor-pointer ${!isRead ? 'bg-slate-700/20' : ''}`}
                              onClick={() => markAsRead(notif.id, notif.readBy)}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <h4 className={`text-sm font-bold ${!isRead ? 'text-yellow-500' : 'text-slate-300'}`}>
                                  {notif.title}
                                </h4>
                                {!isRead && <span className="h-2 w-2 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0"></span>}
                              </div>
                              <p className="text-xs text-slate-400 mb-2 line-clamp-2">{notif.message}</p>
                              <span className="text-[10px] text-slate-500 font-medium">
                                {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: es })}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-right mr-4 ml-2 border-l border-slate-700 pl-4">
                <p className="text-sm font-medium text-white">{profile?.name}</p>
                <p className="text-xs text-yellow-500 font-semibold uppercase tracking-wider">{profile ? roleDisplayNames[profile.role] : ''}</p>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-slate-600 text-sm leading-4 font-medium rounded-md text-slate-300 bg-slate-800 hover:text-white hover:bg-slate-700 focus:outline-none transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </button>
            </div>

            <div className="flex items-center md:hidden space-x-2">
              {/* Mobile Notifications Bell */}
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 text-slate-300 hover:text-white focus:outline-none"
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 block h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-blue-950">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Notifications Dropdown */}
        {isNotifOpen && (
          <div className="md:hidden bg-slate-800 border-b border-slate-700 max-h-96 overflow-y-auto">
            <div className="px-4 py-2 bg-slate-900/50 flex justify-between items-center sticky top-0">
              <span className="text-sm font-bold text-white uppercase">Notificaciones</span>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-xs text-yellow-500">Marcar todo leído</button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="px-4 py-4 text-center text-sm text-slate-400">No tienes notificaciones</div>
            ) : (
              notifications.map((notif) => {
                const isRead = profile && notif.readBy.includes(profile.uid);
                return (
                  <div 
                    key={notif.id} 
                    className={`px-4 py-3 border-b border-slate-700/50 ${!isRead ? 'bg-slate-700/20' : ''}`}
                    onClick={() => markAsRead(notif.id, notif.readBy)}
                  >
                    <h4 className={`text-sm font-bold ${!isRead ? 'text-yellow-500' : 'text-slate-300'}`}>{notif.title}</h4>
                    <p className="text-xs text-slate-400 my-1">{notif.message}</p>
                    <span className="text-[10px] text-slate-500">{formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: es })}</span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-slate-800 border-b border-slate-700">
            <div className="px-2 pt-2 pb-3 space-y-1 border-b border-slate-700">
              <NavItem to="/superadmin" label="Superadmin" allowedRoles={['superadmin']} />
              <NavItem to="/admin-mesa" label="Admin Mesa" allowedRoles={['superadmin', 'admin_mesa']} />
              <NavItem to="/cocinero" label="Cocina" allowedRoles={['superadmin', 'cocinero']} />
              <NavItem to="/mozo" label="Mozo" allowedRoles={['superadmin', 'admin_mesa', 'mozo']} />
              <NavItem to="/comensal" label="Comensal" allowedRoles={['superadmin', 'admin_mesa', 'comensal']} />
              <NavItem to="/acerca-de" label="Acerca de" allowedRoles={['superadmin', 'admin_mesa', 'cocinero', 'mozo', 'comensal']} />
            </div>
            <div className="px-4 py-3 border-b border-slate-700 flex justify-between items-center">
              <div>
                <div className="text-base font-medium text-white">{profile?.name}</div>
                <div className="text-sm font-medium text-yellow-500 uppercase tracking-wider">{profile ? roleDisplayNames[profile.role] : ''}</div>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-slate-600 text-sm font-medium rounded-md text-slate-300 bg-slate-900 hover:text-white hover:bg-slate-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto py-6 sm:px-6 lg:px-8 relative z-10">
        <Outlet />
      </main>
    </div>
  );
}
