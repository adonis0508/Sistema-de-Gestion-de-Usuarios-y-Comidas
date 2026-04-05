import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { format } from 'date-fns';
import { ChefHat } from 'lucide-react';

export default function CocineroView() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [counts, setCounts] = useState({
    almuerzo: { casino: 0, rancho: 0 },
    cena: { casino: 0, rancho: 0 }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'reservations'), where('date', '==', selectedDate));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const newCounts = {
        almuerzo: { casino: 0, rancho: 0 },
        cena: { casino: 0, rancho: 0 }
      };

      snap.docs.forEach(doc => {
        const data = doc.data();
        if (data.meal === 'almuerzo' || data.meal === 'cena') {
          if (data.menuType === 'casino' || data.menuType === 'rancho') {
            newCounts[data.meal][data.menuType]++;
          }
        }
      });

      setCounts(newCounts);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching counts:", error);
      handleFirestoreError(error, OperationType.GET, 'reservations');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedDate]);

  return (
    <div className="space-y-6 px-4 sm:px-0">
      <div className="bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center">
          <ChefHat className="mr-2 h-5 w-5 text-yellow-500" />
          Dashboard de Cocina
        </h2>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-slate-900 border border-slate-600 text-white px-3 py-2 rounded focus:outline-none focus:border-yellow-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-10 text-yellow-500">Calculando porciones...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CountCard title="Almuerzo" data={counts.almuerzo} />
          <CountCard title="Cena" data={counts.cena} />
        </div>
      )}
    </div>
  );
}

function CountCard({ title, data }: { title: string, data: { casino: number, rancho: number } }) {
  const total = data.casino + data.rancho;
  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
      <div className="bg-blue-950 px-6 py-4 border-b border-yellow-600/30 flex justify-between items-center">
        <h3 className="text-xl font-bold text-white uppercase tracking-wider">{title}</h3>
        <span className="bg-slate-900 text-white text-sm font-bold px-3 py-1 rounded border border-slate-700">
          Total: {total}
        </span>
      </div>
      <div className="p-6 grid grid-cols-2 gap-4">
        <div className="bg-slate-900/50 p-4 rounded border border-yellow-600/30 text-center">
          <p className="text-yellow-500 font-bold uppercase tracking-widest text-xs mb-2">Menú Casino</p>
          <p className="text-4xl font-black text-white">{data.casino}</p>
        </div>
        <div className="bg-slate-900/50 p-4 rounded border border-slate-600 text-center">
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">Menú Rancho</p>
          <p className="text-4xl font-black text-white">{data.rancho}</p>
        </div>
      </div>
    </div>
  );
}
