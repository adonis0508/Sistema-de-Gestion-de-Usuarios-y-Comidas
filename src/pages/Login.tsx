import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // We append a fake domain to use Firebase Email/Password auth with a phone number
      const email = `${phone}@gecb.mil.ar`;
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError('Credenciales inválidas o error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background watermark effect */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
        <img src="/deff.png" alt="Ejército Argentino" className="w-full max-w-[800px] h-auto max-h-[80vh] object-contain p-4" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center space-x-6 items-center">
          <img src="/deff.png" alt="Ejército Argentino" className="h-16 w-16 sm:h-20 sm:w-20 object-contain drop-shadow-lg flex-shrink-0" />
          <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-slate-800 border-4 border-yellow-600 flex items-center justify-center shadow-[0_0_15px_rgba(202,138,4,0.5)] overflow-hidden p-1 flex-shrink-0">
            <img src="/DEf.png" alt="Agr Com 601" className="h-full w-full object-contain" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight">
          Casino de Oficiales
        </h2>
        <p className="mt-2 text-center text-sm text-yellow-500 font-medium uppercase tracking-widest">
          Agrupación de Comunicaciones 601
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-800/90 backdrop-blur-sm py-8 px-4 shadow-2xl shadow-black/50 sm:rounded-lg sm:px-10 border border-slate-700">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded relative text-sm text-center">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-300">
                Número de Teléfono
              </label>
              <div className="mt-1">
                <input
                  id="phone"
                  name="phone"
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm bg-slate-900 text-white"
                  placeholder="Ej: 1123456789"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Contraseña
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm bg-slate-900 text-white"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-blue-950 bg-yellow-500 hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 focus:ring-offset-slate-900 uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                {loading ? 'Ingresando...' : 'Ingresar al Sistema'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
