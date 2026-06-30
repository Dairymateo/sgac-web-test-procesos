/// <summary>
/// Componente CotizacionAprobarModal.test.tsx
/// </summary>
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CotizacionAprobarModal from '../../../../pages/Cotizaciones/components/CotizacionAprobarModal';
import { approveCotizacion } from '../../../../services/cotizaciones.service';

vi.mock('../../../../services/cotizaciones.service', () => ({
    approveCotizacion: vi.fn(),
}));

describe('CotizacionAprobarModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('no se renderiza si no esta abierto', () => {
        const { container } = render(
            <CotizacionAprobarModal isOpen={false} onClose={vi.fn()} onSuccess={vi.fn()} cotizacionId={1} />
        );

        expect(container.firstChild).toBeNull();
    });

    it('renderiza correctamente cuando se abre', () => {
        render(
            <CotizacionAprobarModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} cotizacionId={1} />
        );

        expect(screen.getByText('Aprobar Cotización #1')).toBeInTheDocument();
        expect(screen.getByLabelText(/Prima final/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Tipo de documento/i)).toBeInTheDocument();
    });

    it('llama al API de aprobar sin campos opcionales y cierra al no tener policy_id', async () => {
        (approveCotizacion as any).mockResolvedValue({ id: 1, status: 'approved' });
        const onCloseMock = vi.fn();
        const onSuccessMock = vi.fn();

        render(
            <CotizacionAprobarModal isOpen={true} onClose={onCloseMock} onSuccess={onSuccessMock} cotizacionId={1} />
        );

        fireEvent.submit(screen.getByTestId('aprobar-form'));

        await waitFor(() => {
            expect(approveCotizacion).toHaveBeenCalledWith(1, { document_type: 'new' });
            expect(onSuccessMock).toHaveBeenCalled();
            expect(onCloseMock).toHaveBeenCalled();
        });
    });

    it('muestra estado de exito con policy_id cuando el API retorna uno', async () => {
        (approveCotizacion as any).mockResolvedValue({ id: 1, status: 'approved', policy_id: 42 });
        const onCloseMock = vi.fn();
        const onSuccessMock = vi.fn();

        render(
            <CotizacionAprobarModal isOpen={true} onClose={onCloseMock} onSuccess={onSuccessMock} cotizacionId={1} />
        );

        fireEvent.submit(screen.getByTestId('aprobar-form'));

        await waitFor(() => {
            expect(onSuccessMock).toHaveBeenCalled();
            expect(screen.getByText(/póliza en borrador con ID/i)).toBeInTheDocument();
            expect(screen.getByText(/#42/i)).toBeInTheDocument();
        });

        expect(onCloseMock).not.toHaveBeenCalled();
    });

    it('envia prima final opcional cuando se ingresa', async () => {
        (approveCotizacion as any).mockResolvedValue({ id: 1, status: 'approved' });

        render(
            <CotizacionAprobarModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} cotizacionId={1} />
        );

        fireEvent.change(screen.getByLabelText(/Prima final/i), { target: { value: '510.00' } });
        fireEvent.submit(screen.getByTestId('aprobar-form'));

        await waitFor(() => {
            expect(approveCotizacion).toHaveBeenCalledWith(1, { final_premium: '510.00', document_type: 'new' });
        });
    });

    it('envia el tipo de documento seleccionado al aprobar', async () => {
        (approveCotizacion as any).mockResolvedValue({ id: 1, status: 'approved' });

        render(
            <CotizacionAprobarModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} cotizacionId={1} />
        );

        fireEvent.change(screen.getByLabelText(/Tipo de documento/i), { target: { value: 'renewal' } });
        fireEvent.submit(screen.getByTestId('aprobar-form'));

        await waitFor(() => {
            expect(approveCotizacion).toHaveBeenCalledWith(1, { document_type: 'renewal' });
        });
    });

    it('muestra mensaje de error si la API falla', async () => {
        (approveCotizacion as any).mockRejectedValue(new Error('Network error'));

        render(
            <CotizacionAprobarModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} cotizacionId={1} />
        );

        fireEvent.submit(screen.getByTestId('aprobar-form'));

        await waitFor(() => {
            expect(screen.getByText('Network error')).toBeInTheDocument();
        });
    });
});