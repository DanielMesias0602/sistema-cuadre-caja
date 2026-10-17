import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Algo salió mal
          </h2>
          <p className="text-slate-500 text-center mb-6 max-w-md">
            {this.state.error?.message || 'Ocurrió un error inesperado. Por favor, intenta nuevamente.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl font-semibold transition shadow-md"
          >
            <RefreshCw className="w-5 h-5" />
            Recargar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
