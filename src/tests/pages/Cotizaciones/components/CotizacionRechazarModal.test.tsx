/// <summary>
/// Componente CotizacionRechazarModal.test.tsx
/// </summary>
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CotizacionRechazarModal from '../../../../pages/Cotizaciones/components/CotizacionRechazarModal';
import { rejectCotizacion } from '../../../../services/cotizaciones.service';

vi.mock('../../../../services/cotizaciones.service', () => ({
    rejectCotizacion: vi.fn(),
}));

describe('CotizacionRechazarModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('no se renderiza si no esta abierto', () => {
        const { container } = render(
            <CotizacionRechazarModal isOpen={false} onClose={vi.fn()} onSuccess={vi.fn()} cotizacionId={1} />
        );

        expect(container.firstChild).toBeNull();
    });

    it('renderiza correctamente cuando se abre', () => {
        render(
            <CotizacionRechazarModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} cotizacionId={1} />
        );

        expect(screen.getByText('Rechazar Cotización')).toBeInTheDocument();
        expect(screen.getByLabelText(/Motivo de Rechazo/i)).toBeInTheDocument();
    });

    it('muestra error de validacion si faltan datos', async () => {
        render(
            <CotizacionRechazarModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} cotizacionId={1} />
        );

        fireEvent.submit(screen.getByTestId('rechazar-form'));

        await waitFor(() => {
            expect(screen.getByText(/Debe ingresar un motivo válido/i)).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText(/Motivo de Rechazo/i), { target: { value: 'abc' } });
        fireEvent.submit(screen.getByTestId('rechazar-form'));

        await waitFor(() => {
            expect(screen.getByText(/mínimo 5 caracteres/i)).toBeInTheDocument();
        });
    });

    it('llama al API de rechazar y cierra al tener exito', async () => {
        (rejectCotizacion as any).mockResolvedValue({ id: 1, status: 'rejected' });
        const onCloseMock = vi.fn();
        const onSuccessMock = vi.fn();

        render(
            <CotizacionRechazarModal isOpen={true} onClose={onCloseMock} onSuccess={onSuccessMock} cotizacionId={1} />
        );

        fireEvent.change(screen.getByLabelText(/Motivo de Rechazo/i), { target: { value: 'Riesgo alto' } });
        fireEvent.submit(screen.getByTestId('rechazar-form'));

        await waitFor(() => {
            expect(rejectCotizacion).toHaveBeenCalledWith(1, { rejection_reason: 'Riesgo alto' });
            expect(onSuccessMock).toHaveBeenCalled();
            expect(onCloseMock).toHaveBeenCalled();
        });
    });

    it('muestra mensaje de error si la API falla', async () => {
        (rejectCotizacion as any).mockRejectedValue(new Error('Network error'));

        render(
            <CotizacionRechazarModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} cotizacionId={1} />
        );

        fireEvent.change(screen.getByLabelText(/Motivo de Rechazo/i), { target: { value: 'No pasa políticas' } });
        fireEvent.submit(screen.getByTestId('rechazar-form'));

        await waitFor(() => {
            expect(screen.getByText('Network error')).toBeInTheDocument();
        });
    });
});