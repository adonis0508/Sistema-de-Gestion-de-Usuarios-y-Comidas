import React, { useState, useEffect } from 'react';
import { db, secondaryAuth } from '../lib/firebase';
import { collection, query, where, doc, setDoc, addDoc, onSnapshot } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { format, parseISO, startOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Settings, UserPlus, ExternalLink, Calendar, ChevronLeft, ChevronRight, CalendarX2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import ExportPanel from '../components/ExportPanel';

export default function AdminMesaView() {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekDates = Array.from({ length: 7 }).map((_, i) => format(addDays(currentWeekStart, i), 'yyyy-MM-dd'));
  
  const [menus, setMenus] = useState<Record<string, { almuerzo: { principal: string, bebida: string, postre: string }, cena: { principal: string, bebida: string, postre: string } }>>({});
  const [savingDate, setSavingDate] = useState<string | null>(null);
  const [loadingMenus, setLoadingMenus] = useState(true);

  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('comensal');
  const [creatingUser, setCreatingUser] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Prevent accidental navigation if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    setLoadingMenus(true);
    const q = query(collection(db, 'menus'), where('date', 'in', weekDates));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const menusData: Record<string, { almuerzo: { principal: string, bebida: string, postre: string }, cena: { principal: string, bebida: string, postre: string } }> = {};
      
      // Initialize with empty strings
      weekDates.forEach(date => {
        menusData[date] = { 
          almuerzo: { principal: '', bebida: '', postre: '' }, 
          cena: { principal: '', bebida: '', postre: '' } 
        };
      });

      snap.forEach(d => {
        const data = d.data();
        
        const parseMenu = (menuData: any) => {
          if (typeof menuData === 'string') return { principal: menuData, bebida: '', postre: '' };
          if (typeof menuData === 'object' && menuData !== null) return { 
            principal: menuData.principal || '', 
            bebida: menuData.bebida || '', 
            postre: menuData.postre || '' 
          };
          return { principal: '', bebida: '', postre: '' };
        };

        menusData[data.date] = {
          almuerzo: parseMenu(data.casinoMenuAlmuerzo || data.casinoMenu),
          cena: parseMenu(data.casinoMenuCena || data.casinoMenu)
        };
      });
      setMenus(menusData);
      setLoadingMenus(false);
    }, (error) => {
      console.error("Error fetching menus:", error);
      handleFirestoreError(error, OperationType.GET, 'menus');
      setLoadingMenus(false);
    });

    return () => unsubscribe();
  }, [currentWeekStart]);

  const handleMenuChange = (date: string, meal: 'almuerzo' | 'cena', field: 'principal' | 'bebida' | 'postre', value: string) => {
    setIsDirty(true);
    setMenus(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        [meal]: {
          ...prev[date][meal],
          [field]: value
        }
      }
    }));
  };

  const handleSaveMenu = async (date: string) => {
    if (!navigator.onLine) {
      toast.success('Estás sin conexión. El menú se guardará cuando recuperes la señal.', { duration: 4000 });
    }
    
    setSavingDate(date);
    try {
      const menuData = menus[date];
      const promise1 = setDoc(doc(db, 'menus', date), {
        date: date,
        casinoMenuAlmuerzo: menuData.almuerzo,
        casinoMenuCena: menuData.cena,
        ranchoMenu: 'Menú estándar de tropa',
        updatedAt: new Date().toISOString()
      });

      const displayDate = format(parseISO(date), "EEEE, d 'de' MMMM", { locale: es });
      const promise2 = addDoc(collection(db, 'notifications'), {
        userId: 'ALL',
        title: 'Menú Actualizado',
        message: `El Administrador de Mesa ha publicado o modificado el menú para el día ${displayDate}.`,
        createdAt: new Date().toISOString(),
        readBy: []
      });

      if (navigator.onLine) {
        await Promise.all([promise1, promise2]);
        toast.success(`Menú del ${displayDate} guardado exitosamente.`);
      } else {
        // Optimistic success for offline
        toast.success(`Menú guardado localmente. Se sincronizará pronto.`);
      }
      setIsDirty(false);
    } catch (error) {
      console.error("Error saving menu:", error);
      toast.error('Error al guardar el menú.');
      handleFirestoreError(error, OperationType.WRITE, `menus/${date}`);
    } finally {
      setSavingDate(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!navigator.onLine) {
      toast.error('Necesitas conexión a internet para registrar un nuevo usuario.');
      return;
    }
    
    setCreatingUser(true);
    try {
      // Create user in Firebase Auth using secondary instance to prevent logging out admin
      const email = `${newUserPhone}@gecb.mil.ar`;
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, newUserPassword);
      
      try {
        // Create user profile in Firestore
        await setDoc(doc(db, 'users', userCred.user.uid), {
          uid: userCred.user.uid,
          phone: newUserPhone,
          name: newUserName,
          role: newUserRole,
          createdAt: new Date().toISOString()
        });

        // Sign out from the secondary auth instance to clean up
        await signOut(secondaryAuth);

        toast.success('Usuario creado exitosamente.');
        setNewUserPhone('');
        setNewUserName('');
        setNewUserPassword('');
      } catch (dbError) {
        // Rollback: delete the user from Auth if Firestore write fails
        if (userCred && userCred.user) {
          await userCred.user.delete().catch(console.error);
        }
        await signOut(secondaryAuth);
        throw dbError;
      }
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(`Error al crear usuario: ${error.message}`);
    } finally {
      setCreatingUser(false);
    }
  };

  const nextWeek = () => setCurrentWeekStart(addDays(currentWeekStart, 7));
  const prevWeek = () => setCurrentWeekStart(addDays(currentWeekStart, -7));
  const goToCurrentWeek = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  return (
    <div className="space-y-6 px-4 sm:px-0 pb-10">
      <div className="bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-700 flex items-center">
        <Settings className="mr-3 h-6 w-6 text-yellow-500" />
        <h2 className="text-xl font-bold text-white uppercase tracking-wider">
          Administración de Mesa
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Registrar Usuario */}
        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
          <div className="bg-blue-950 px-6 py-4 border-b border-yellow-600/30 flex items-center">
            <UserPlus className="mr-2 h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">Registrar Comensal</h3>
          </div>
          <form onSubmit={handleCreateUser} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Grado, Nombre y APELLIDO</label>
              <input
                type="text"
                required
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 text-white px-3 py-2 rounded focus:outline-none focus:border-yellow-500"
                placeholder="Ej: Tte 1ro Perez"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Número de Teléfono</label>
              <input
                type="text"
                required
                value={newUserPhone}
                onChange={(e) => setNewUserPhone(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 text-white px-3 py-2 rounded focus:outline-none focus:border-yellow-500"
                placeholder="Ej: 1123456789"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Contraseña</label>
              <input
                type="password"
                required
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 text-white px-3 py-2 rounded focus:outline-none focus:border-yellow-500"
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Rol</label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 text-white px-3 py-2 rounded focus:outline-none focus:border-yellow-500"
              >
                <option value="comensal">Comensal</option>
                <option value="mozo">Mozo</option>
                <option value="cocinero">Cocinero</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={creatingUser}
              className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded transition-colors disabled:opacity-50 uppercase text-sm tracking-wider"
            >
              {creatingUser ? 'Registrando...' : 'Registrar Usuario'}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          {/* Exportar Planillas */}
          <ExportPanel />

          {/* Accesos Rápidos */}
          <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
            <div className="bg-blue-950 px-6 py-4 border-b border-yellow-600/30 flex items-center">
              <ExternalLink className="mr-2 h-5 w-5 text-yellow-500" />
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">Accesos Rápidos</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-slate-400 text-sm">Como Administrador de Mesa, tienes permisos heredados para acceder a las siguientes vistas operativas:</p>
              <div className="flex flex-col gap-3">
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
      </div>

      {/* Configurar Menú Semanal */}
      <div className="space-y-6 pt-4">
        {/* Header & Navigation */}
        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-yellow-500" />
            Configurar Menú Semanal
          </h2>
          
          <div className="flex items-center space-x-4 bg-slate-900 rounded-lg p-1 border border-slate-700">
            <button onClick={prevWeek} className="p-2 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-sm font-bold text-yellow-500 uppercase tracking-wider px-2 text-center min-w-[200px]">
              {format(weekDates[0], "d MMM", { locale: es })} - {format(weekDates[6], "d MMM", { locale: es })}
            </div>
            <button onClick={nextWeek} className="p-2 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          
          <button 
            onClick={goToCurrentWeek}
            className="text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white border border-slate-600 hover:bg-slate-700 px-3 py-1.5 rounded transition-colors"
          >
            Semana Actual
          </button>
        </div>

        {loadingMenus ? (
          <div className="text-center py-10 text-yellow-500 font-bold uppercase tracking-wider">Cargando menús...</div>
        ) : (
          <div className="space-y-6">
            {weekDates.filter(dateStr => dateStr >= todayStr).length === 0 ? (
              <div className="text-center py-12 bg-slate-800 rounded-lg border border-slate-700 flex flex-col items-center justify-center">
                <CalendarX2 className="h-12 w-12 text-slate-500 mb-4 opacity-20" />
                <p className="text-slate-400 font-medium uppercase tracking-wider text-sm">
                  Los días anteriores ya no están disponibles para configuración.
                </p>
              </div>
            ) : (
              weekDates.map(dateStr => {
                const isPast = dateStr < todayStr;
                if (isPast) return null;

                const isToday = dateStr === todayStr;
                const dayMenu = menus[dateStr] || { 
                  almuerzo: { principal: '', bebida: '', postre: '' }, 
                  cena: { principal: '', bebida: '', postre: '' } 
                };
                const isSaving = savingDate === dateStr;

                return (
                  <div key={dateStr} className={`bg-slate-800 rounded-lg shadow-lg border ${isToday ? 'border-yellow-500/50 ring-1 ring-yellow-500/20' : 'border-slate-700'} overflow-hidden`}>
                    {/* Day Header */}
                    <div className={`px-6 py-3 border-b flex justify-between items-center ${isToday ? 'bg-yellow-600/10 border-yellow-600/30' : 'bg-slate-700/50 border-slate-600'}`}>
                      <h3 className={`text-lg font-bold uppercase tracking-wider ${isToday ? 'text-yellow-500' : 'text-white'}`}>
                        {format(parseISO(dateStr), "EEEE, d 'de' MMMM", { locale: es })}
                        {isToday && <span className="ml-3 text-xs bg-yellow-500 text-blue-950 px-2 py-0.5 rounded-full font-bold">HOY</span>}
                      </h3>
                      <button
                        onClick={() => handleSaveMenu(dateStr)}
                        disabled={isSaving}
                        className="py-1.5 px-4 bg-yellow-600 hover:bg-yellow-500 text-blue-950 font-bold rounded transition-colors disabled:opacity-50 uppercase text-xs tracking-wider"
                      >
                        {isSaving ? 'Guardando...' : 'Guardar Día'}
                      </button>
                    </div>

                    {/* Meals Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-700 p-4 gap-4 md:gap-0">
                      <div className="md:pr-4 space-y-3">
                        <h4 className="font-bold text-yellow-500 uppercase tracking-wider text-sm border-b border-slate-700 pb-1">Almuerzo</h4>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Plato Principal</label>
                          <input
                            value={dayMenu.almuerzo.principal}
                            onChange={(e) => handleMenuChange(dateStr, 'almuerzo', 'principal', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 text-white px-3 py-2 rounded focus:outline-none focus:border-yellow-500 text-sm"
                            placeholder="Ej: Milanesa con puré..."
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Bebida</label>
                            <input
                              value={dayMenu.almuerzo.bebida}
                              onChange={(e) => handleMenuChange(dateStr, 'almuerzo', 'bebida', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-600 text-white px-3 py-2 rounded focus:outline-none focus:border-yellow-500 text-sm"
                              placeholder="Ej: Jugo / Gaseosa"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Postre</label>
                            <input
                              value={dayMenu.almuerzo.postre}
                              onChange={(e) => handleMenuChange(dateStr, 'almuerzo', 'postre', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-600 text-white px-3 py-2 rounded focus:outline-none focus:border-yellow-500 text-sm"
                              placeholder="Ej: Helado"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="md:pl-4 pt-4 md:pt-0 space-y-3">
                        <h4 className="font-bold text-yellow-500 uppercase tracking-wider text-sm border-b border-slate-700 pb-1">Cena</h4>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Plato Principal</label>
                          <input
                            value={dayMenu.cena.principal}
                            onChange={(e) => handleMenuChange(dateStr, 'cena', 'principal', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 text-white px-3 py-2 rounded focus:outline-none focus:border-yellow-500 text-sm"
                            placeholder="Ej: Pollo al horno con papas..."
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Bebida</label>
                            <input
                              value={dayMenu.cena.bebida}
                              onChange={(e) => handleMenuChange(dateStr, 'cena', 'bebida', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-600 text-white px-3 py-2 rounded focus:outline-none focus:border-yellow-500 text-sm"
                              placeholder="Ej: Jugo / Gaseosa"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Postre</label>
                            <input
                              value={dayMenu.cena.postre}
                              onChange={(e) => handleMenuChange(dateStr, 'cena', 'postre', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-600 text-white px-3 py-2 rounded focus:outline-none focus:border-yellow-500 text-sm"
                              placeholder="Ej: Fruta"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
