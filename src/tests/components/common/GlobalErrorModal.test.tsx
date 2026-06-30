/// <summary>
/// Componente GlobalErrorModal.test.tsx
/// </summary>
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import GlobalErrorModal from '../../../components/common/GlobalErrorModal';

describe('GlobalErrorModal', () => {
    it('no se renderiza por defecto', () => {
        render(<GlobalErrorModal />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('se renderiza cuando se dispara el evento global_api_error con mensaje de red', () => {
        render(<GlobalErrorModal />);

        act(() => {
            const event = new CustomEvent('global_api_error', { detail: 'Error de conexión a internet' });
            globalThis.dispatchEvent(event);
        });

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Error de conexión a internet')).toBeInTheDocument();
        expect(screen.getByText('Problema de conexión')).toBeInTheDocument();
    });

    it('se renderiza cuando se dispara el evento global_api_error con otro mensaje', () => {
        render(<GlobalErrorModal />);

        act(() => {
            const event = new CustomEvent('global_api_error', { detail: 'Error interno del servidor' });
            globalThis.dispatchEvent(event);
        });

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Error interno del servidor')).toBeInTheDocument();
    });

    it('se cierra al hacer clic en el botón de cerrar', async () => {
        const user = userEvent.setup();
        render(<GlobalErrorModal />);

        act(() => {
            const event = new CustomEvent('global_api_error', { detail: 'Error de prueba' });
            globalThis.dispatchEvent(event);
        });

        expect(screen.getByRole('dialog')).toBeInTheDocument();

        const closeButton = screen.getByLabelText('Cerrar');
        await user.click(closeButton);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('se cierra al hacer clic en el botón "Entendido"', async () => {
        const user = userEvent.setup();
        render(<GlobalErrorModal />);

        act(() => {
            const event = new CustomEvent('global_api_error', { detail: 'Error de prueba' });
            globalThis.dispatchEvent(event);
        });

        expect(screen.getByRole('dialog')).toBeInTheDocument();

        const understoodButton = screen.getByText('Entendido');
        await user.click(understoodButton);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('se renderiza con mensaje por defecto si no se provee detail', () => {
        render(<GlobalErrorModal />);

        act(() => {
            const event = new CustomEvent('global_api_error');
            globalThis.dispatchEvent(event);
        });

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Ocurrió un error de conexión.')).toBeInTheDocument();
    });
});