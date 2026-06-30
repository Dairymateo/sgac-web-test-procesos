/// <summary>
/// CotizacionAprobarModal.extended.test.tsx — additional coverage tests
/// </summary>
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CotizacionAprobarModal from '../../../../pages/Cotizaciones/components/CotizacionAprobarModal';
import { approveCotizacion } from '../../../../services/cotizaciones.service';

vi.mock('../../../../services/cotizaciones.service', () => ({
    approveCotizacion: vi.fn(),
}));

const renderModal = (props = {}) =>
    render(<CotizacionAprobarModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} cotizacionId={1} {...props} />);

describe('CotizacionAprobarModal — cobertura extendida', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (approveCotizacion as any).mockResolvedValue({ id: 1, status: 'approved' });
    });

    it('no renderiza nada si cotizacionId es null', () => {
        const { container } = render(
            <CotizacionAprobarModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} cotizacionId={null} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('muestra campo Numero de renovacion cuando documentType es renewal', () => {
        renderModal();
        fireEvent.change(screen.getByLabelText(/Tipo de documento/i), { target: { value: 'renewal' } });
        expect(screen.getByLabelText(/Numero de renovacion/i)).toBeInTheDocument();
    });

    it('oculta Numero de renovacion al cambiar a new', () => {
        renderModal();
        fireEvent.change(screen.getByLabelText(/Tipo de documento/i), { target: { value: 'renewal' } });
        expect(screen.getByLabelText(/Numero de renovacion/i)).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText(/Tipo de documento/i), { target: { value: 'new' } });
        expect(screen.queryByLabelText(/Numero de renovacion/i)).not.toBeInTheDocument();
    });

    it('muestra campo Documento afectado para endorsement_addition', () => {
        renderModal();
        fireEvent.change(screen.getByLabelText(/Tipo de documento/i), { target: { value: 'endorsement_addition' } });
        expect(screen.getByLabelText(/Documento afectado/i)).toBeInTheDocument();
    });

    it('muestra campo Documento afectado para endorsement_inclusion', () => {
        renderModal();
        fireEvent.change(screen.getByLabelText(/Tipo de documento/i), { target: { value: 'endorsement_inclusion' } });
        expect(screen.getByLabelText(/Documento afectado/i)).toBeInTheDocument();
    });

    it('oculta Documento afectado al cambiar a new', () => {
        renderModal();
        fireEvent.change(screen.getByLabelText(/Tipo de documento/i), { target: { value: 'endorsement_addition' } });
        expect(screen.getByLabelText(/Documento afectado/i)).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText(/Tipo de documento/i), { target: { value: 'new' } });
        expect(screen.queryByLabelText(/Documento afectado/i)).not.toBeInTheDocument();
    });

    it('envia renewal_number cuando documentType es renewal', async () => {
        renderModal();
        fireEvent.change(screen.getByLabelText(/Tipo de documento/i), { target: { value: 'renewal' } });
        fireEvent.change(screen.getByLabelText(/Numero de renovacion/i), { target: { value: '3' } });
        fireEvent.submit(screen.getByTestId('aprobar-form'));

        await waitFor(() => {
            expect(approveCotizacion).toHaveBeenCalledWith(1, expect.objectContaining({
                document_type: 'renewal',
                renewal_number: 3,
            }));
        });
    });

    it('envia affected_document en mayusculas para endorsement_addition', async () => {
        renderModal();
        fireEvent.change(screen.getByLabelText(/Tipo de documento/i), { target: { value: 'endorsement_addition' } });
        fireEvent.change(screen.getByLabelText(/Documento afectado/i), { target: { value: 'pol-001' } });
        fireEvent.submit(screen.getByTestId('aprobar-form'));

        await waitFor(() => {
            expect(approveCotizacion).toHaveBeenCalledWith(1, expect.objectContaining({
                affected_document: 'POL-001',
            }));
        });
    });

    it('envia campos de fecha vigencia, emision, sucursal, forma de pago e IVA', async () => {
        renderModal();
        fireEvent.change(screen.getByLabelText(/Vigencia desde/i), { target: { value: '2026-01-01' } });
        fireEvent.change(screen.getByLabelText(/Vigencia hasta/i), { target: { value: '2027-01-01' } });
        fireEvent.change(screen.getByLabelText(/Fecha de emisión/i), { target: { value: '2026-01-01' } });
        fireEvent.change(screen.getByLabelText(/Sucursal/i), { target: { value: 'Quito Centro' } });
        fireEvent.change(screen.getByLabelText(/Forma de pago/i), { target: { value: 'cash' } });
        fireEvent.change(screen.getByLabelText(/IVA \(%\)/i), { target: { value: '15.00' } });

        fireEvent.submit(screen.getByTestId('aprobar-form'));

        await waitFor(() => {
            expect(approveCotizacion).toHaveBeenCalledWith(1, expect.objectContaining({
                valid_from: '2026-01-01',
                valid_until: '2027-01-01',
                issue_date: '2026-01-01',
                branch: 'Quito Centro',
                payment_method: 'cash',
                iva_percentage: '15.00',
            }));
        });
    });

    it('valida prima final invalida (menor a 0.01) y muestra error', async () => {
        renderModal();
        fireEvent.change(screen.getByLabelText(/Prima final/i), { target: { value: '0' } });
        fireEvent.submit(screen.getByTestId('aprobar-form'));

        await waitFor(() => {
            expect(screen.getByText(/prima final debe ser un valor mayor/i)).toBeInTheDocument();
        });
        expect(approveCotizacion).not.toHaveBeenCalled();
    });

    it('muestra errors de campo desde la API (fieldErrors)', async () => {
        (approveCotizacion as any).mockRejectedValue({
            message: 'Invalid data.',
            fieldErrors: { final_premium: 'A valid number is required.' },
        });

        renderModal();
        fireEvent.submit(screen.getByTestId('aprobar-form'));

        await waitFor(() => {
            expect(screen.getByText(/Ingrese un valor numérico válido/i)).toBeInTheDocument();
            expect(screen.getByText(/campos marcados en rojo/i)).toBeInTheDocument();
        });
    });

    it('ignora error global (isGlobal=true)', async () => {
        (approveCotizacion as any).mockRejectedValue({ isGlobal: true, message: 'Session expired' });

        renderModal();
        fireEvent.submit(screen.getByTestId('aprobar-form'));

        await waitFor(() => {
            expect(screen.queryByText(/session expired/i)).not.toBeInTheDocument();
        });
    });

    it('muestra boton Ir a poliza y cierra al hacer click en Cerrar en pantalla de exito', async () => {
        (approveCotizacion as any).mockResolvedValue({ id: 1, status: 'approved', policy_id: 42 });
        const onClose = vi.fn();

        render(<CotizacionAprobarModal isOpen={true} onClose={onClose} onSuccess={vi.fn()} cotizacionId={1} />);
        fireEvent.submit(screen.getByTestId('aprobar-form'));

        await waitFor(() => {
            expect(screen.getByText('Ir a poliza')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Cerrar'));
        expect(onClose).toHaveBeenCalled();
    });

    it('envia cuotas como forma de pago', async () => {
        renderModal();
        fireEvent.change(screen.getByLabelText(/Forma de pago/i), { target: { value: 'installments' } });
        fireEvent.submit(screen.getByTestId('aprobar-form'));

        await waitFor(() => {
            expect(approveCotizacion).toHaveBeenCalledWith(1, expect.objectContaining({
                payment_method: 'installments',
            }));
        });
    });

    it('Cancelar llama onClose', () => {
        const onClose = vi.fn();
        renderModal({ onClose });
        fireEvent.click(screen.getByText('Cancelar'));
        expect(onClose).toHaveBeenCalled();
    });

    it('traduce correctamente fecha invalida del API', async () => {
        (approveCotizacion as any).mockRejectedValue({
            message: 'Invalid data.',
            fieldErrors: { valid_from: 'Enter a valid date.' },
        });

        renderModal();
        fireEvent.submit(screen.getByTestId('aprobar-form'));

        await waitFor(() => {
            expect(screen.getByText(/Ingrese una fecha válida/i)).toBeInTheDocument();
        });
    });
});
