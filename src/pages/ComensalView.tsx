import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, setDoc, deleteDoc, doc } from 'firebase/firestore';
import { format, parseISO, startOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, Utensils, AlertTriangle, CheckCircle2, Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';

export default function ComensalView() {
  const { profile } = useAuth();
  
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [currentHour, setCurrentHour] = useState(new Date().getHours());

  // Actualizar la hora en tiempo real cada minuto para el bloqueo de las 10:00 AM
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Start the week on Monday (weekStartsOn: 1)
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const [menus, setMenus] = useState<Record<string, any>>({});
  const [reservations, setReservations] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [showReminder, setShowReminder] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Generate array of 7 dates for the current week view
  const weekDates = Array.from({ length: 7 }).map((_, i) => format(addDays(currentWeekStart, i), 'yyyy-MM-dd'));

  useEffect(() => {
    if (!profile) return;
    setLoading(true);

    // Fetch menus for the entire week
    const menuQ = query(collection(db, 'menus'), where('date', 'in', weekDates));
    const unsubscribeMenus = onSnapshot(menuQ, (menuSnap) => {
      const menusData: Record<string, any> = {};
      menuSnap.forEach(d => {
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
          ...data,
          casinoMenuAlmuerzo: parseMenu(data.casinoMenuAlmuerzo || data.casinoMenu),
          casinoMenuCena: parseMenu(data.casinoMenuCena || data.casinoMenu)
        };
      });
      
      setMenus(prev => ({ ...prev, ...menusData }));
    }, (error) => {
      console.error("Error fetching menus:", error);
      handleFirestoreError(error, OperationType.GET, 'menus');
    });

    // Fetch user's reservations for the entire week
    const resQ = query(
      collection(db, 'reservations'),
      where('userId', '==', profile.uid),
      where('date', 'in', weekDates)
    );
    const unsubscribeRes = onSnapshot(resQ, (resSnap) => {
      const resData: Record<string, any[]> = {};
      resSnap.forEach(d => {
        const data = d.data();
        if (!resData[data.date]) resData[data.date] = [];
        resData[data.date].push({ id: d.id, ...data });
      });
      setReservations(resData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching reservations:", error);
      handleFirestoreError(error, OperationType.GET, 'reservations');
      setLoading(false);
    });

    return () => {
      unsubscribeMenus();
      unsubscribeRes();
    };
  }, [profile, currentWeekStart]); // Re-fetch when week changes

  // Recordatorio de límite de hora (08:00 AM - 10:00 AM)
  useEffect(() => {
    if (!profile || loading) return;

    const checkDeadline = () => {
      const now = new Date();
      const hour = now.getHours();
      
      // Si entra entre las 08:00 y las 10:00 AM
      if (hour >= 8 && hour < 10) {
        const todayRes = reservations[todayStr] || [];
        if (todayRes.length === 0) {
          const reminderKey = `reminder_shown_${todayStr}`;
          if (!localStorage.getItem(reminderKey)) {
            setShowReminder(true);
            // Marcar inmediatamente para evitar spam de notificaciones si hay re-renders
            localStorage.setItem(reminderKey, 'true');
            
            // También intentar notificación push si está permitida
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification('Recordatorio de Casino', { 
                  body: 'Recuerda que las inscripciones cierran a las 10:00 AM. ¡Anota tu comida!',
                  icon: '/DEf.png'
                });
              } catch (error) {
                console.error('Error al mostrar la notificación push:', error);
              }
            }
          }
        }
      }
    };

    checkDeadline();
  }, [profile, reservations, loading, todayStr]);

  // Ocultar el recordatorio automáticamente si el usuario hace una reserva
  useEffect(() => {
    const todayRes = reservations[todayStr] || [];
    if (todayRes.length > 0 && showReminder) {
      setShowReminder(false);
    }
  }, [reservations, todayStr, showReminder]);

  const dismissReminder = () => {
    localStorage.setItem(`reminder_shown_${todayStr}`, 'true');
    setShowReminder(false);
  };

  const handleReserve = async (date: string, meal: 'almuerzo' | 'cena', menuType: 'casino' | 'rancho') => {
    if (!profile) return;
    
    setActionLoading(`${date}-${meal}`);
    if (!navigator.onLine) {
      toast.success('Estás sin conexión. La reserva se guardará cuando recuperes la señal.', { duration: 4000 });
    }

    try {
      const newRes = {
        userId: profile.uid,
        userName: profile.name,
        date,
        meal,
        menuType,
        attended: false,
        createdAt: new Date().toISOString()
      };
      
      // Deterministic ID to prevent duplicates: userId_date_meal
      const deterministicId = `${profile.uid}_${date}_${meal}`;
      
      // No hacemos await si estamos offline para no bloquear la UI, 
      // Firestore actualizará la caché local inmediatamente y onSnapshot hará el resto.
      const promise = setDoc(doc(db, 'reservations', deterministicId), newRes);
      if (navigator.onLine) {
        await promise;
      }
    } catch (error) {
      console.error("Error reserving:", error);
      toast.error("Error al registrar la reserva.");
      handleFirestoreError(error, OperationType.CREATE, 'reservations');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (date: string, id: string) => {
    setActionLoading(`cancel-${id}`);
    if (!navigator.onLine) {
      toast.success('Estás sin conexión. La cancelación se sincronizará luego.', { duration: 4000 });
    }

    try {
      const promise = deleteDoc(doc(db, 'reservations', id));
      if (navigator.onLine) {
        await promise;
      }
    } catch (error) {
      console.error("Error cancelling:", error);
      toast.error("Error al cancelar la reserva.");
      handleFirestoreError(error, OperationType.DELETE, `reservations/${id}`);
    } finally {
      setActionLoading(null);
    }
  };

  const nextWeek = () => setCurrentWeekStart(addDays(currentWeekStart, 7));
  const prevWeek = () => setCurrentWeekStart(addDays(currentWeekStart, -7));
  const goToCurrentWeek = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  return (
    <div className="space-y-6 px-4 sm:px-0 pb-10">
      {/* Visual Alert Reminder */}
      {showReminder && (
        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 flex items-start justify-between">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-yellow-500 font-bold uppercase tracking-wider text-sm">¡Recordatorio Importante!</h3>
              <p className="text-slate-300 text-sm mt-1">Aún no te has anotado para el menú de hoy. Recuerda que las inscripciones cierran a las 10:00 AM.</p>
            </div>
          </div>
          <button onClick={dismissReminder} className="text-slate-400 hover:text-white transition-colors p-1">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Header & Navigation */}
      <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center">
          <Calendar className="mr-2 h-5 w-5 text-yellow-500" />
          Menú Semanal
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

      {loading ? (
        <div className="text-center py-10 text-yellow-500 font-bold uppercase tracking-wider">Cargando semana...</div>
      ) : (
        <div className="space-y-6">
          {weekDates.filter(dateStr => dateStr >= todayStr).length === 0 ? (
            <div className="text-center py-10 bg-slate-800 rounded-lg border border-slate-700">
              <p className="text-slate-400 font-medium uppercase tracking-wider text-sm">
                Los días anteriores ya no están disponibles para inscripción.
              </p>
            </div>
          ) : (
            weekDates.map(dateStr => {
              const isPast = dateStr < todayStr;
              if (isPast) return null; // Ocultar días pasados

              const isToday = dateStr === todayStr;
              // Bloqueo a las 10:00 AM para el día actual
              const isTimeUp = isToday && currentHour >= 10;
              
              const dayMenu = menus[dateStr] || {};
              const dayRes = reservations[dateStr] || [];
              
              const resAlmuerzo = dayRes.find(r => r.meal === 'almuerzo');
              const resCena = dayRes.find(r => r.meal === 'cena');

              return (
                <div key={dateStr} className={`bg-slate-800 rounded-lg shadow-lg border ${isToday ? 'border-yellow-500/50 ring-1 ring-yellow-500/20' : 'border-slate-700'} overflow-hidden`}>
                  {/* Day Header */}
                  <div className={`px-6 py-3 border-b flex justify-between items-center ${isToday ? 'bg-yellow-600/10 border-yellow-600/30' : 'bg-slate-700/50 border-slate-600'}`}>
                    <h3 className={`text-lg font-bold uppercase tracking-wider ${isToday ? 'text-yellow-500' : 'text-white'}`}>
                      {format(parseISO(dateStr), "EEEE, d 'de' MMMM", { locale: es })}
                      {isToday && <span className="ml-3 text-xs bg-yellow-500 text-blue-950 px-2 py-0.5 rounded-full font-bold">HOY</span>}
                    </h3>
                    {isTimeUp && (
                      <span className="flex items-center text-xs font-bold text-red-400 uppercase tracking-wider bg-red-400/10 px-2 py-1 rounded border border-red-400/20">
                        <Clock className="h-3 w-3 mr-1" /> Cerrado
                      </span>
                    )}
                  </div>

                  {/* Meals Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-700">
                    {/* Almuerzo */}
                    <MealSection 
                      title="Almuerzo"
                      meal="almuerzo"
                      date={dateStr}
                      menuData={dayMenu.casinoMenuAlmuerzo || { principal: '', bebida: '', postre: '' }}
                      reservation={resAlmuerzo}
                      isTimeUp={isTimeUp}
                      actionLoading={actionLoading}
                      onReserve={handleReserve}
                      onCancel={handleCancel}
                    />
                    {/* Cena */}
                    <MealSection 
                      title="Cena"
                      meal="cena"
                      date={dateStr}
                      menuData={dayMenu.casinoMenuCena || { principal: '', bebida: '', postre: '' }}
                      reservation={resCena}
                      isTimeUp={isTimeUp}
                      actionLoading={actionLoading}
                      onReserve={handleReserve}
                      onCancel={handleCancel}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function MealSection({ title, meal, date, menuData, reservation, isTimeUp, actionLoading, onReserve, onCancel }: any) {
  const hasMenu = menuData.principal || menuData.bebida || menuData.postre;

  return (
    <div className="p-5 flex flex-col h-full">
      <h4 className="text-slate-300 font-bold uppercase tracking-widest text-sm mb-4 flex items-center">
        <Utensils className="h-4 w-4 mr-2 text-slate-500" /> {title}
      </h4>
      
      <div className="mb-5 flex-1 space-y-3">
        <div className="bg-slate-900/50 p-3 rounded border border-slate-700">
          <span className="text-yellow-500 font-bold uppercase tracking-widest text-[10px] block mb-2 border-b border-slate-700/50 pb-1">Menú Casino</span>
          {hasMenu ? (
            <div className="space-y-2">
              {menuData.principal && (
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Plato Principal</span>
                  <span className="text-white text-sm">{menuData.principal}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {menuData.bebida && (
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Bebida</span>
                    <span className="text-white text-sm">{menuData.bebida}</span>
                  </div>
                )}
                {menuData.postre && (
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Postre</span>
                    <span className="text-white text-sm">{menuData.postre}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-sm italic">No configurado aún</p>
          )}
        </div>
        <div className="bg-slate-900/50 p-3 rounded border border-slate-700">
          <span className="text-yellow-500 font-bold uppercase tracking-widest text-[10px] block mb-1">Menú del Rancho</span>
          <p className="text-slate-400 text-sm">Menú estándar de tropa</p>
        </div>
      </div>

      <div className="mt-auto">
        {reservation ? (
          <div className="space-y-3">
            <div className="flex items-center text-green-400 bg-green-400/10 p-2.5 rounded border border-green-400/20 text-sm">
              <CheckCircle2 className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="font-medium">Anotado: {reservation.menuType === 'casino' ? 'Casino' : 'Rancho'}</span>
            </div>
            {!isTimeUp && (
              <button
                onClick={() => onCancel(date, reservation.id)}
                disabled={actionLoading === `cancel-${reservation.id}`}
                className="w-full py-1.5 px-3 border border-red-500/50 text-red-400 rounded hover:bg-red-500/10 transition-colors font-medium uppercase text-xs tracking-wider disabled:opacity-50"
              >
                {actionLoading === `cancel-${reservation.id}` ? 'Procesando...' : 'Cancelar Reserva'}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <button
              disabled={isTimeUp || actionLoading === `${date}-${meal}`}
              onClick={() => onReserve(date, meal, 'casino')}
              className="w-full py-2 px-3 bg-yellow-600 hover:bg-yellow-500 text-blue-950 font-bold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase text-xs tracking-wider"
            >
              {actionLoading === `${date}-${meal}` ? 'Procesando...' : 'Anotarse (Casino)'}
            </button>
            <button
              disabled={isTimeUp || actionLoading === `${date}-${meal}`}
              onClick={() => onReserve(date, meal, 'rancho')}
              className="w-full py-2 px-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase text-xs tracking-wider"
            >
              {actionLoading === `${date}-${meal}` ? 'Procesando...' : 'Anotarse (Rancho)'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
