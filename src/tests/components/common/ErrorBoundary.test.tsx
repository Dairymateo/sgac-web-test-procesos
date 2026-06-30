/// <summary>
/// Componente ErrorBoundary.test.tsx
/// </summary>
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ErrorBoundary } from '../../../components/common/ErrorBoundary';

const ThrowError = () => {
    throw new Error('Test Error');
};

describe('ErrorBoundary', () => {
    it('renderiza el children cuando no hay error', () => {
        render(
            <ErrorBoundary>
                <div>Everything is fine</div>
            </ErrorBoundary>
        );
        expect(screen.getByText('Everything is fine')).toBeInTheDocument();
    });

    it('captura el error y renderiza la UI de error por defecto', () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(
            <ErrorBoundary>
                <ThrowError />
            </ErrorBoundary>
        );
        expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
        expect(screen.getByText(/Ocurrió un error inesperado/i)).toBeInTheDocument();

        consoleErrorSpy.mockRestore();
    });

    it('renderiza fallback personalizado si se provee', () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const fallback = vi.fn().mockImplementation((error, reset) => (
            <div>
                <span>Custom Fallback: {error.message}</span>
                <button onClick={reset}>Reset Custom</button>
            </div>
        ));

        render(
            <ErrorBoundary fallback={fallback}>
                <ThrowError />
            </ErrorBoundary>
        );

        expect(screen.getByText('Custom Fallback: Test Error')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Reset Custom'));

        consoleErrorSpy.mockRestore();
    });

    it('el boton de intentar de nuevo reinicia el estado', () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const { unmount } = render(
            <ErrorBoundary>
                <ThrowError />
            </ErrorBoundary>
        );

        expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Intentar de nuevo'));

        consoleErrorSpy.mockRestore();
        unmount();
    });

    it('el boton de ir al inicio redirecciona', () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        delete (globalThis as any).location;
        globalThis.location = { href: '' } as any;

        render(
            <ErrorBoundary>
                <ThrowError />
            </ErrorBoundary>
        );

        fireEvent.click(screen.getByText('Ir al inicio'));
        expect(globalThis.location.href).toBe('/');

        consoleErrorSpy.mockRestore();
    });
});