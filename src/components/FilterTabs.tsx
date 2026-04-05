import React from 'react';

interface FilterTabsProps {
  filterType: 'all' | 'casino' | 'rancho' | 'pending';
  setFilterType: (type: 'all' | 'casino' | 'rancho' | 'pending') => void;
}

export default function FilterTabs({ filterType, setFilterType }: FilterTabsProps) {
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      <button
        onClick={() => setFilterType('all')}
        className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded border transition-colors ${filterType === 'all' ? 'bg-slate-600 text-white border-slate-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
      >
        Todos
      </button>
      <button
        onClick={() => setFilterType('casino')}
        className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded border transition-colors ${filterType === 'casino' ? 'bg-yellow-600/20 text-yellow-500 border-yellow-600/50' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
      >
        Solo Casino
      </button>
      <button
        onClick={() => setFilterType('rancho')}
        className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded border transition-colors ${filterType === 'rancho' ? 'bg-blue-600/20 text-blue-400 border-blue-600/50' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
      >
        Solo Rancho
      </button>
      <button
        onClick={() => setFilterType('pending')}
        className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded border transition-colors ${filterType === 'pending' ? 'bg-red-600/20 text-red-400 border-red-600/50' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
      >
        Pendientes
      </button>
    </div>
  );
}
