import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Ha ocurrido un error inesperado en la aplicación.";
      let isFirestoreError = false;

      try {
        if (this.state.error?.message) {
          const parsedError = JSON.parse(this.state.error.message);
          if (parsedError.operationType) {
            isFirestoreError = true;
            errorMessage = "Error de permisos o conexión con la base de datos. Por favor, verifica que tienes los permisos necesarios para realizar esta acción.";
          }
        }
      } catch (e) {
        // Not a JSON error, use default message
      }

      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-red-900/50 rounded-lg shadow-2xl max-w-md w-full p-6 text-center">
            <div className="mx-auto w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mb-4 border border-red-500/30">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-wider">
              Algo salió mal
            </h2>
            <p className="text-slate-400 mb-6 text-sm">
              {errorMessage}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 px-4 bg-yellow-600 hover:bg-yellow-500 text-blue-950 font-bold rounded transition-colors uppercase tracking-wider text-sm"
            >
              Recargar la página
            </button>
            
            {isFirestoreError && (
              <div className="mt-4 text-xs text-slate-500 text-left bg-slate-900 p-3 rounded border border-slate-700 overflow-auto max-h-32">
                <p className="font-mono">{this.state.error?.message}</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
