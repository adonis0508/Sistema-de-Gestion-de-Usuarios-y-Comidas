import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { CheckSquare, Square, Users, Search, Download } from 'lucide-react';
import { exportToPDF, exportToExcel } from '../lib/exportUtils';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';

export default function MozoView() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMeal, setSelectedMeal] = useState<'almuerzo' | 'cena'>('almuerzo');

  useEffect(() => {
    const fetchReservations = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'reservations'), where('date', '==', selectedDate));
        const snap = await getDocs(q);
        setReservations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching reservations:", error);
        handleFirestoreError(error, OperationType.GET, 'reservations');
      } finally {
        setLoading(false);
      }
    };
    fetchReservations();
  }, [selectedDate]);

  const toggleAttendance = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'reservations', id), { attended: !currentStatus });
      setReservations(reservations.map(r => r.id === id ? { ...r, attended: !currentStatus } : r));
    } catch (error) {
      console.error("Error updating attendance:", error);
      handleFirestoreError(error, OperationType.UPDATE, `reservations/${id}`);
    }
  };

  const filteredReservations = reservations.filter(r => {
    const matchesMeal = r.meal === selectedMeal;
    const matchesSearch = r.userName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesMeal && matchesSearch;
  });

  return (
    <div className="space-y-6 px-4 sm:px-0 pb-10">
      <div className="bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center">
          <Users className="mr-2 h-5 w-5 text-yellow-500" />
          Control de Asistencia
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-900 border border-slate-600 text-white px-3 py-2 rounded focus:outline-none focus:border-yellow-500"
          />
          <div className="flex gap-2">
            <button 
              onClick={() => exportToPDF(selectedDate, reservations)}
              className="flex-1 sm:flex-none flex items-center justify-center bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded font-bold text-xs uppercase tracking-wider transition-colors"
            >
              <Download className="w-4 h-4 mr-1" /> PDF
            </button>
            <button 
              onClick={() => exportToExcel(selectedDate, reservations)}
              className="flex-1 sm:flex-none flex items-center justify-center bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded font-bold text-xs uppercase tracking-wider transition-colors"
            >
              <Download className="w-4 h-4 mr-1" /> Excel
            </button>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-700 space-y-4">
        {/* Tabs for Meal Filter */}
        <div className="flex border-b border-slate-700">
          <button
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${selectedMeal === 'almuerzo' ? 'text-yellow-500 border-b-2 border-yellow-500 bg-slate-700/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/10'}`}
            onClick={() => setSelectedMeal('almuerzo')}
          >
            Almuerzo
          </button>
          <button
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${selectedMeal === 'cena' ? 'text-yellow-500 border-b-2 border-yellow-500 bg-slate-700/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/10'}`}
            onClick={() => setSelectedMeal('cena')}
          >
            Cena
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-500" />
          </div>
          <input
            type="text"
            placeholder="Buscar por Grado/Apellido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-slate-600 rounded-md leading-5 bg-slate-900 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-yellow-500 font-bold uppercase tracking-wider">Cargando reservas...</div>
      ) : (
        <MealList 
          title={selectedMeal === 'almuerzo' ? 'Almuerzo' : 'Cena'} 
          reservations={filteredReservations} 
          onToggle={toggleAttendance} 
        />
      )}
    </div>
  );
}

function MealList({ title, reservations, onToggle }: any) {
  const presentCount = reservations.filter((r: any) => r.attended).length;

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
      <div className="bg-blue-950 px-6 py-3 border-b border-yellow-600/30 flex justify-between items-center">
        <h3 className="text-lg font-bold text-white uppercase tracking-wider">{title}</h3>
        <div className="flex gap-2">
          <span className="bg-slate-900 text-yellow-500 text-xs font-bold px-2 py-1 rounded border border-slate-700">
            {reservations.length} Anotados
          </span>
          <span className="bg-green-900/50 text-green-400 text-xs font-bold px-2 py-1 rounded border border-green-700/50">
            {presentCount} Presentes
          </span>
        </div>
      </div>
      <div className="divide-y divide-slate-700/50">
        {reservations.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">No hay reservas que coincidan con la búsqueda.</div>
        ) : (
          reservations.map((res: any) => (
            <div key={res.id} className="p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors">
              <div>
                <p className="text-white font-medium">{res.userName}</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">
                  Menú: <span className={res.menuType === 'casino' ? 'text-yellow-500' : 'text-slate-300'}>{res.menuType}</span>
                </p>
              </div>
              <button
                onClick={() => onToggle(res.id, res.attended)}
                className={`p-2 rounded transition-colors ${res.attended ? 'text-green-400 hover:bg-green-400/10' : 'text-slate-500 hover:bg-slate-600'}`}
              >
                {res.attended ? <CheckSquare className="h-6 w-6" /> : <Square className="h-6 w-6" />}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
