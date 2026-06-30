/// <summary>
/// Componente ErrorBoundary.tsx
/// </summary>
import { Component } from 'react';
import type { ReactNode } from 'react';

interface Props {
    children: ReactNode;

    fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: { componentStack: string }) {
        console.error('[ErrorBoundary]', error, info.componentStack);
    }

    reset = () => this.setState({ error: null });

    render() {
        const { error } = this.state;
        if (!error) return this.props.children;

        if (this.props.fallback) {
            return this.props.fallback(error, this.reset);
        }

        return (
            <div className="error-boundary-screen" role="alert">
                <div className="error-boundary-card">
                    <div className="error-boundary-icon" aria-hidden="true">⚠️</div>
                    <h1 className="error-boundary-title">Algo salió mal</h1>
                    <p className="error-boundary-message">
                        Ocurrió un error inesperado en la aplicación. Puedes intentar recargar
                        la página o volver al inicio.
                    </p>
                    {import.meta.env.DEV && (
                        <details className="error-boundary-details">
                            <summary>Detalles técnicos</summary>
                            <pre>{error.message}</pre>
                        </details>
                    )}
                    <div className="error-boundary-actions">
                        <button
                            className="btn-primary"
                            style={{ padding: '10px 24px' }}
                            onClick={this.reset}
                        >
                            Intentar de nuevo
                        </button>
                        <button
                            className="btn-secondary"
                            style={{ padding: '10px 24px' }}
                            onClick={() => { globalThis.location.href = '/'; }}
                        >
                            Ir al inicio
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}