/// <summary>
/// Componente CotizacionAjusteModal.test.tsx
/// </summary>
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CotizacionAjusteModal from '../../../../pages/Cotizaciones/components/CotizacionAjusteModal';
import { adjustCotizacion } from '../../../../services/cotizaciones.service';

vi.mock('../../../../services/cotizaciones.service', () => ({
    adjustCotizacion: vi.fn(),
}));

describe('CotizacionAjusteModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('no se renderiza si no esta abierto', () => {
        const { container } = render(
            <CotizacionAjusteModal isOpen={false} onClose={vi.fn()} onSuccess={vi.fn()} cotizacionId={1} currentPremium="100.0" />
        );

        expect(container.firstChild).toBeNull();
    });

    it('renderiza con los datos iniciales correctos', () => {
        render(
            <CotizacionAjusteModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} cotizacionId={1} currentPremium="100.0" />
        );

        expect(screen.getByText('Ajuste Manual de Prima')).toBeInTheDocument();
        const input = screen.getByLabelText(/Prima Final Asegurada/i) as HTMLInputElement;
        expect(input.value).toBe('100.0');
    });

    it('muestra error de validacion si faltan datos', async () => {
        render(
            <CotizacionAjusteModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} cotizacionId={1} currentPremium="100.0" />
        );

        fireEvent.submit(screen.getByTestId('ajuste-form'));

        await waitFor(() => {
            expect(screen.getByText(/Debe ingresar una justificación válida/i)).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText(/Justificación de Ajuste/i), { target: { value: 'abc' } });
        fireEvent.submit(screen.getByTestId('ajuste-form'));

        await waitFor(() => {
            expect(screen.getByText(/mínimo 5 caracteres/i)).toBeInTheDocument();
        });
    });

    it('llama al API de ajuste y cierra al tener exito', async () => {
        (adjustCotizacion as any).mockResolvedValue({ id: 1 });
        const onCloseMock = vi.fn();
        const onSuccessMock = vi.fn();

        render(
            <CotizacionAjusteModal isOpen={true} onClose={onCloseMock} onSuccess={onSuccessMock} cotizacionId={1} currentPremium="100.0" />
        );

        fireEvent.change(screen.getByLabelText(/Prima Final Asegurada/i), { target: { value: '150.0' } });
        fireEvent.change(screen.getByLabelText(/Justificación de Ajuste/i), { target: { value: 'Ajuste aprobado' } });
        fireEvent.submit(screen.getByTestId('ajuste-form'));

        await waitFor(() => {
            expect(adjustCotizacion).toHaveBeenCalledWith(1, {
                final_premium: '150.0',
                manual_override_reason: 'Ajuste aprobado',
            });
            expect(onSuccessMock).toHaveBeenCalled();
            expect(onCloseMock).toHaveBeenCalled();
        });
    });

    it('muestra mensaje de error si la API falla', async () => {
        (adjustCotizacion as any).mockRejectedValue(new Error('Network error'));

        render(
            <CotizacionAjusteModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} cotizacionId={1} currentPremium="100.0" />
        );

        fireEvent.change(screen.getByLabelText(/Justificación de Ajuste/i), { target: { value: 'Justificación' } });
        fireEvent.submit(screen.getByTestId('ajuste-form'));

        await waitFor(() => {
            expect(screen.getByText('Network error')).toBeInTheDocument();
        });
    });
});