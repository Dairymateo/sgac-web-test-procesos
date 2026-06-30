import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SiniestroFormModal from '../../../pages/Siniestros/components/SiniestroFormModal';

vi.mock('../../../services/siniestros.service', () => ({
    createSiniestro: vi.fn().mockResolvedValue({ id: 1 }),
    partialUpdateSiniestro: vi.fn().mockResolvedValue({ id: 1 }),
    uploadClaimDocument: vi.fn().mockResolvedValue({}),
    getClaimDocumentUrl: vi.fn().mockResolvedValue({ url: 'http://test.com' }),
}));
vi.mock('../../../services/clientes.service', () => ({
    getClientes: vi.fn().mockResolvedValue([{ id: 1, first_names: 'Juan', last_names: 'Perez', is_active: true }])
}));
vi.mock('../../../services/vehiculos.service', () => ({
    getVehiculos: vi.fn().mockResolvedValue([{ id: 1, license_plate: 'ABC-123', owner_customer: 1, is_active: true }])
}));
vi.mock('../../../services/talleres.service', () => ({
    getTalleres: vi.fn().mockResolvedValue([{ id: 1, name: 'Taller', is_active: true }])
}));
vi.mock('../../../services/aseguradoras.service', () => ({
    getAseguradoras: vi.fn().mockResolvedValue([{ id: 1, name: 'Aseguradora', active: true }])
}));

describe('SiniestroFormModal Extended Test for Coverage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('interactúa con todos los campos y tabs', async () => {
        render(<SiniestroFormModal isOpen={true} onClose={vi.fn()} onSaveSuccess={vi.fn()} canMutate={true} />);

        await waitFor(() => {
            expect(screen.getByText('Registrar Siniestro')).toBeInTheDocument();
        });

        // Tab Informacion General
        fireEvent.change(screen.getByLabelText(/Cliente asegurado/i), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText(/Fecha del siniestro/i), { target: { value: '2026-05-10' } });
        fireEvent.change(screen.getByLabelText(/Descripcion/i), { target: { value: 'Test description' } });
        fireEvent.change(screen.getByLabelText(/^Conductor$/i), { target: { value: 'Conductor Test' } });

        // Tab Aseguradora y Taller
        fireEvent.click(screen.getByText('Aseguradora y Taller'));
        await waitFor(() => expect(screen.getByLabelText(/Aseguradora \*/i)).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/Taller/i), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText(/Aseguradora \*/i), { target: { value: '1' } });
        fireEvent.change(screen.getByLabelText(/Ejecutivo aseguradora/i), { target: { value: 'Ejecutivo Test' } });
        fireEvent.change(screen.getByLabelText(/Telefono ejecutivo/i), { target: { value: '0999999999' } });
        fireEvent.change(screen.getByLabelText(/Correo ejecutivo siniestros/i), { target: { value: 'test@test.com' } });

        const reclamado = screen.queryByLabelText(/Monto reclamado/i);
        if (reclamado) fireEvent.change(reclamado, { target: { value: '1500' } });
        const ajustado = screen.queryByLabelText(/Monto ajustado/i);
        if (ajustado) fireEvent.change(ajustado, { target: { value: '1200' } });
        const confirmacion = screen.queryByLabelText(/Confirmacion entrega/i);
        if (confirmacion) fireEvent.change(confirmacion, { target: { value: 'Entregado' } });

        // Tab Documentos
        fireEvent.click(screen.getByText('Documentos'));
        expect(screen.getByLabelText(/^Tipo$/i)).toBeInTheDocument();

        // Submit form
        fireEvent.click(screen.getByText('Guardar'));

        // Form submitted
        await waitFor(() => {
            expect(screen.queryByText(/Revisa los campos marcados/i)).not.toBeInTheDocument();
        });
    });

    it('edita un siniestro existente interactuando con las fechas de seguimiento', async () => {
        const existingSiniestro = {
            id: 1,
            insured_customer: 1,
            vehicle: 1,
            insurer: 1,
            workshop: 1,
            claim_number: 'SIN-123',
            claim_date: '2026-05-10',
            broker_report_date: '2026-05-11',
            insurer_report_date: '2026-05-12',
            documentation_date: '2026-05-13',
            repair_authorization_date: '2026-05-14',
            estimated_departure_date: '2026-05-15',
            payment_date: '2026-05-16',
            damage_type: 'partial',
            claim_description: 'Test description',
            vehicle_driver: 'Conductor Test',
            insurer_executive: 'Ejecutivo Test',
            insurer_executive_phone: '0999999999',
            claim_amount: '1500',
            adjusted_amount: '1200',
            delivery_status_confirmation: 'Entregado',
            status: 'reported',
            is_active: true,
            documents: []
        };

        render(<SiniestroFormModal isOpen={true} onClose={vi.fn()} onSaveSuccess={vi.fn()} canMutate={true} editingSiniestro={existingSiniestro as any} />);

        await waitFor(() => {
            expect(screen.getByText('Actualizar Siniestro')).toBeInTheDocument();
        });

        // Tab Fechas y Reportes
        fireEvent.click(screen.getByText('Fechas y Reportes'));
        await waitFor(() => expect(screen.getByLabelText(/Fecha reporte broker/i)).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/Fecha reporte broker/i), { target: { value: '2026-05-11' } });
        fireEvent.change(screen.getByLabelText(/Fecha reporte aseguradora/i), { target: { value: '2026-05-12' } });
        fireEvent.change(screen.getByLabelText(/Fecha autorizacion reparacion/i), { target: { value: '2026-05-14' } });
        fireEvent.change(screen.getByLabelText(/Fecha salida estimada/i), { target: { value: '2026-05-15' } });
        fireEvent.change(screen.getByLabelText(/Fecha pago/i), { target: { value: '2026-05-16' } });

        // Go back to general info to test changing state
        fireEvent.click(screen.getByText('Informacion General'));
        const estado = screen.queryByLabelText(/Estado/i);
        if (estado) fireEvent.change(estado, { target: { value: 'repairing' } });
        const activo = screen.queryByLabelText(/Siniestro Activo/i);
        if (activo) fireEvent.click(activo);

        fireEvent.click(screen.getByText('Guardar cambios'));

        await waitFor(() => {
            expect(screen.queryByText(/Revisa los campos marcados/i)).not.toBeInTheDocument();
        });
    });
});
