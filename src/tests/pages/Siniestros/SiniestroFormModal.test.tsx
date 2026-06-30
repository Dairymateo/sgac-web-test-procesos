/// <summary>
/// Componente SiniestroFormModal.test.tsx
/// </summary>
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SiniestroFormModal from '../../../pages/Siniestros/components/SiniestroFormModal';
import { getTalleres } from '../../../services/talleres.service';
import { getAseguradoras } from '../../../services/aseguradoras.service';
import { getClientes } from '../../../services/clientes.service';
import { getVehiculos } from '../../../services/vehiculos.service';
import { createSiniestro } from '../../../services/siniestros.service';

vi.mock('../../../services/clientes.service', () => ({
    getClientes: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../../services/vehiculos.service', () => ({
    getVehiculos: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../../services/talleres.service', () => ({
    getTalleres: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../../services/aseguradoras.service', () => ({
    getAseguradoras: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../../services/siniestros.service', () => ({
    createSiniestro: vi.fn().mockResolvedValue({ id: 1 }),
    partialUpdateSiniestro: vi.fn().mockResolvedValue({ id: 1 }),
    getClaimDocumentUrl: vi.fn().mockResolvedValue({ url: 'https://example.com/doc' }),
}));

const DEFAULT_PROPS = {
    isOpen: true,
    onClose: vi.fn(),
    onSaveSuccess: vi.fn(),
    canMutate: true,
};

const EXISTING_SINIESTRO = {
    id: 5,
    insured_customer: 1,
    vehicle: 2,
    insurer: null,
    workshop: null,
    claim_number: 'SIN-005',
    claim_date: '2026-03-01',
    broker_report_date: '2026-03-05',
    insurer_report_date: null,
    repair_authorization_date: null,
    estimated_departure_date: null,
    payment_date: null,
    damage_type: 'partial',
    claim_description: 'Prueba',
    vehicle_driver: '',
    insurer_executive: '',
    insurer_executive_phone: '',
    claim_amount: null,
    adjusted_amount: null,
    delivery_status_confirmation: '',
    status: 'reported',
    is_active: true,
    documents: [],
};

function renderModal(props = {}) {
    return render(<SiniestroFormModal {...DEFAULT_PROPS} {...props} />);
}

describe('SiniestroFormModal — fechas de seguimiento', () => {
    beforeEach(() => vi.clearAllMocks());

    it('no muestra Fechas y Reportes al registrar un siniestro', async () => {
        renderModal();

        expect(screen.queryByText('Fechas y Reportes')).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/fecha reporte broker/i)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/^estado$/i)).not.toBeInTheDocument();
    });

    it('no envia fechas de seguimiento ni is_active al crear', async () => {
        (getClientes as ReturnType<typeof vi.fn>).mockResolvedValue([
            { id: 1, customer_code: '00000001', first_names: 'Juan', last_names: 'Perez', document_number: '1105316663', is_active: true },
        ]);
        (getVehiculos as ReturnType<typeof vi.fn>).mockResolvedValue([
            { id: 2, owner_customer: 1, license_plate: 'PBC-1234', brand: 'Ford', model: 'F150', year: 2024, is_active: true },
        ]);
        (getTalleres as ReturnType<typeof vi.fn>).mockResolvedValue([
            {
                id: 8,
                name: 'Taller Norte',
                ruc: '1792146739001',
                address: 'Av. Principal',
                phone: '022222222',
                contact_executive: '',
                executive_phone: '',
                is_active: true,
                created_at: '',
                updated_at: '',
                insurer_ids: [4],
                insurers_summary: [{ id: 4, insurer_code: 'SEG-001', name: 'Seguros ABC', active: true }],
            },
        ]);
        (getAseguradoras as ReturnType<typeof vi.fn>).mockResolvedValue([
            {
                id: 4,
                registration_date: '2026-06-02',
                insurer_code: 'SEG-001',
                name: 'Seguros ABC',
                document_type: 'RUC',
                document_number: '1792146739001',
                country: 'ECUADOR',
                province: 'PICHINCHA',
                city: 'QUITO',
                address: 'Av. Aseguradora',
                phone: '022222222',
                account_executive_name: '',
                account_executive_phone: '',
                account_executive_email: '',
                claims_executive_name: 'Diego Siniestros',
                claims_executive_phone: '0999999999',
                claims_executive_email: 'siniestros@example.com',
                portfolio_executive_name: '',
                portfolio_executive_phone: '',
                portfolio_executive_email: '',
                active: true,
                created_at: '',
                updated_at: '',
                workshop_ids: [8],
                workshops_summary: [],
            },
        ]);

        renderModal();

        const clientSelect = await screen.findByLabelText(/cliente asegurado/i);
        await screen.findByRole('option', { name: /Juan Perez/i }); // Esperar a que carguen los clientes
        fireEvent.change(clientSelect, { target: { value: '1' } });
        
        await waitFor(() => {
            expect(screen.getByLabelText(/vehiculo \*/i)).not.toBeDisabled();
        });
        
        expect(await screen.findByText((content) => content.includes('PBC-1234') && content.includes('Ford') && content.includes('F150'), {}, { timeout: 3000 })).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText(/vehiculo \*/i), { target: { value: '2' } });
        fireEvent.change(screen.getByLabelText(/fecha del siniestro/i), { target: { value: '2026-06-02' } });
        fireEvent.change(screen.getByLabelText(/descripcion/i), { target: { value: 'Golpe lateral' } });
        fireEvent.click(screen.getByText('Aseguradora y Taller'));
        const tallerSelect = await screen.findByLabelText(/taller/i);
        await screen.findByRole('option', { name: 'Taller Norte' });
        fireEvent.change(tallerSelect, { target: { value: '8' } });
        
        const aseguradoraSelect = await screen.findByLabelText(/^aseguradora \*/i);
        await screen.findByRole('option', { name: /Seguros ABC/i });
        fireEvent.change(aseguradoraSelect, { target: { value: '4' } });

        fireEvent.click(screen.getByText('Guardar'));

        await waitFor(() => expect(createSiniestro).toHaveBeenCalled());
        const payload = (createSiniestro as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(payload).not.toHaveProperty('broker_report_date');
        expect(payload).not.toHaveProperty('insurer_report_date');
        expect(payload).not.toHaveProperty('repair_authorization_date');
        expect(payload).not.toHaveProperty('estimated_departure_date');
        expect(payload).not.toHaveProperty('payment_date');
        expect(payload).not.toHaveProperty('documentation_date');
        expect(payload).not.toHaveProperty('is_active');
        expect(payload).not.toHaveProperty('status');
        expect(payload.delivery_status_confirmation).toBe('');
        expect(payload).not.toHaveProperty('insurer_executive');
        expect(payload).not.toHaveProperty('insurer_executive_phone');
        expect(payload).toMatchObject({ workshop: 8, insurer: 4 });
    });

    it('bloquea claim_date futura en frontend y muestra error por campo', async () => {
        renderModal();

        fireEvent.change(await screen.findByLabelText(/fecha del siniestro/i), { target: { value: '2999-01-01' } });
        fireEvent.click(screen.getByText('Guardar'));

        expect(await screen.findByText(/fecha del siniestro no puede ser futura/i)).toBeInTheDocument();
        expect(createSiniestro).not.toHaveBeenCalled();
    });

    it('mapea field_errors.claim_date del backend debajo del campo', async () => {
        (getClientes as ReturnType<typeof vi.fn>).mockResolvedValue([
            { id: 1, customer_code: '00000001', first_names: 'Juan', last_names: 'Perez', document_number: '1105316663', is_active: true },
        ]);
        (getVehiculos as ReturnType<typeof vi.fn>).mockResolvedValue([
            { id: 2, owner_customer: 1, license_plate: 'PBC-1234', brand: 'Ford', model: 'F150', year: 2024, is_active: true },
        ]);
        (getTalleres as ReturnType<typeof vi.fn>).mockResolvedValue([
            {
                id: 8,
                name: 'Taller Norte',
                ruc: '1792146739001',
                address: 'Av. Principal',
                phone: '022222222',
                contact_executive: '',
                executive_phone: '',
                is_active: true,
                created_at: '',
                updated_at: '',
                insurer_ids: [4],
                insurers_summary: [{ id: 4, insurer_code: 'SEG-001', name: 'Seguros ABC', active: true }],
            },
        ]);
        (getAseguradoras as ReturnType<typeof vi.fn>).mockResolvedValue([
            {
                id: 4,
                registration_date: '2026-06-02',
                insurer_code: 'SEG-001',
                name: 'Seguros ABC',
                document_type: 'RUC',
                document_number: '1792146739001',
                country: 'ECUADOR',
                province: 'PICHINCHA',
                city: 'QUITO',
                address: 'Av. Aseguradora',
                phone: '022222222',
                account_executive_name: '',
                account_executive_phone: '',
                account_executive_email: '',
                claims_executive_name: 'Diego Siniestros',
                claims_executive_phone: '0999999999',
                claims_executive_email: 'siniestros@example.com',
                portfolio_executive_name: '',
                portfolio_executive_phone: '',
                portfolio_executive_email: '',
                active: true,
                created_at: '',
                updated_at: '',
                workshop_ids: [8],
                workshops_summary: [],
            },
        ]);
        (createSiniestro as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
            fieldErrors: { claim_date: 'Date cannot be in the future.' },
            message: 'Invalid data.',
        });

        renderModal();

        fireEvent.change(await screen.findByLabelText(/cliente asegurado/i), { target: { value: '1' } });
        expect(await screen.findByText(/PBC-1234 - Ford F150/i, {}, { timeout: 3000 })).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText(/vehiculo/i), { target: { value: '2' } });
        fireEvent.change(screen.getByLabelText(/fecha del siniestro/i), { target: { value: '2026-06-02' } });
        fireEvent.change(screen.getByLabelText(/descripcion/i), { target: { value: 'Golpe lateral' } });
        fireEvent.click(screen.getByText('Aseguradora y Taller'));
        fireEvent.change(await screen.findByLabelText(/taller/i), { target: { value: '8' } });
        fireEvent.change(await screen.findByLabelText(/^aseguradora \*/i), { target: { value: '4' } });

        fireEvent.click(screen.getByText('Guardar'));

        expect(await screen.findByText(/la fecha no puede ser futura/i)).toBeInTheDocument();
    });

    it('muestra Fechas y Reportes como datos controlados al editar un siniestro', async () => {
        renderModal({ editingSiniestro: EXISTING_SINIESTRO });
        fireEvent.click(screen.getByText('Fechas y Reportes'));

        const input = await screen.findByLabelText(/fecha reporte broker/i);
        expect(input).toHaveValue('2026-03-05');
        expect(input).toBeDisabled();
    });
});

describe('SiniestroFormModal — autollenado de aseguradora', () => {
    beforeEach(() => vi.clearAllMocks());

    it('rellena ejecutivo, telefono y correo al seleccionar una aseguradora', async () => {
        (getTalleres as ReturnType<typeof vi.fn>).mockResolvedValue([
            {
                id: 8,
                name: 'Taller Norte',
                ruc: '1792146739001',
                address: 'Av. Principal',
                phone: '022222222',
                contact_executive: 'Maria Taller',
                executive_phone: '0999999999',
                is_active: true,
                created_at: '',
                updated_at: '',
                insurer_ids: [4],
                insurers_summary: [{ id: 4, insurer_code: 'SEG-001', name: 'Seguros ABC', active: true }],
            },
        ]);
        (getAseguradoras as ReturnType<typeof vi.fn>).mockResolvedValue([
            {
                id: 4,
                registration_date: '2026-06-02',
                insurer_code: 'SEG-001',
                name: 'Seguros ABC',
                document_type: 'RUC',
                document_number: '1792146739001',
                country: 'ECUADOR',
                province: 'PICHINCHA',
                city: 'QUITO',
                address: 'Av. Aseguradora',
                phone: '022222222',
                account_executive_name: 'Cuenta',
                account_executive_phone: '0991111111',
                account_executive_email: 'cuenta@example.com',
                claims_executive_name: 'Diego Siniestros',
                claims_executive_phone: '0999999999',
                claims_executive_email: 'siniestros@example.com',
                portfolio_executive_name: 'Cartera',
                portfolio_executive_phone: '0992222222',
                portfolio_executive_email: 'cartera@example.com',
                active: true,
                created_at: '',
                updated_at: '',
                workshop_ids: [8],
                workshops_summary: [],
            },
        ]);

        renderModal();
        fireEvent.click(screen.getByText('Aseguradora y Taller'));

        const workshopSelect = await screen.findByLabelText(/taller/i);
        await screen.findByRole('option', { name: 'Taller Norte' }); // Esperar a que carguen los talleres
        fireEvent.change(workshopSelect, { target: { value: '8' } });
        
        const insurerSelect = await screen.findByLabelText(/^aseguradora \*/i);
        await screen.findByRole('option', { name: /Seguros ABC/i }); // Esperar aseguradoras
        fireEvent.change(insurerSelect, { target: { value: '4' } });

        const executiveInput = screen.getByLabelText(/ejecutivo aseguradora/i) as HTMLInputElement;
        const phoneInput = screen.getByLabelText(/telefono ejecutivo/i) as HTMLInputElement;
        const emailInput = screen.getByLabelText(/correo ejecutivo siniestros/i) as HTMLInputElement;

        await waitFor(() => {
            expect(executiveInput.value).toBe('Diego Siniestros');
        });
        expect(executiveInput).toHaveAttribute('readonly');
        expect(executiveInput).toBeDisabled();
        expect(phoneInput.value).toBe('0999999999');
        expect(phoneInput).toHaveAttribute('readonly');
        expect(phoneInput).toBeDisabled();
        expect(emailInput.value).toBe('siniestros@example.com');
        expect(emailInput).toBeDisabled();
        expect(await screen.findByText(/direccion: av. principal/i)).toBeInTheDocument();
        expect(screen.getByText(/telefono: 022222222/i)).toBeInTheDocument();
    });

    it('bloquea taller y aseguradora cuando el siniestro ya fue reportado a la aseguradora', async () => {
        renderModal({
            editingSiniestro: {
                ...EXISTING_SINIESTRO,
                workshop: 8,
                insurer: 4,
                insurer_report_date: '2026-06-04',
            },
        });

        fireEvent.click(screen.getByText('Aseguradora y Taller'));

        expect(await screen.findByLabelText(/taller/i)).toBeDisabled();
        expect(await screen.findByLabelText(/^aseguradora \*/i)).toBeDisabled();
    });
});

describe('SiniestroFormModal — distribucion de campos', () => {
    beforeEach(() => vi.clearAllMocks());

    it('muestra Conductor en Informacion General y no en Aseguradora y Taller', async () => {
        renderModal();

        expect(await screen.findByLabelText(/conductor/i)).toBeInTheDocument();

        fireEvent.click(screen.getByText('Aseguradora y Taller'));

        expect(screen.queryByLabelText(/conductor/i)).not.toBeInTheDocument();
    });
});

describe('SiniestroFormModal — documentation_date per documento', () => {
    beforeEach(() => vi.clearAllMocks());

    it('muestra "Fecha Documentacion" como fecha operativa en edicion', async () => {
        renderModal({ editingSiniestro: EXISTING_SINIESTRO });
        fireEvent.click(screen.getByText('Fechas y Reportes'));

        await screen.findByLabelText(/fecha reporte broker/i); 
        expect(screen.getByLabelText(/^fecha documentacion$/i)).toBeInTheDocument();
    });
});

describe('SiniestroFormModal — interacciones y manejo de datos', () => {
    beforeEach(() => vi.clearAllMocks());

    it('permite cambiar entre pestañas y mantiene el estado', async () => {
        renderModal({ editingSiniestro: EXISTING_SINIESTRO });
        
        expect(screen.getByLabelText(/fecha del siniestro/i)).toBeInTheDocument();
        
        fireEvent.click(screen.getByText('Aseguradora y Taller'));
        expect(screen.queryByLabelText(/fecha del siniestro/i)).not.toBeInTheDocument();
        expect(screen.getByLabelText(/taller/i)).toBeInTheDocument();
        
        fireEvent.click(screen.getByText('Documentos'));
        expect(screen.getByText(/Agregar documento/i)).toBeInTheDocument();
    });

    it('llama a partialUpdateSiniestro al editar', async () => {
        const { partialUpdateSiniestro } = await import('../../../services/siniestros.service');
        (partialUpdateSiniestro as any).mockResolvedValue({ id: 5 });

        renderModal({ editingSiniestro: { ...EXISTING_SINIESTRO, insurer: 4, workshop: 8 } });
        
        fireEvent.change(await screen.findByLabelText(/descripcion/i), { target: { value: 'Nuevo detalle' } });
        fireEvent.click(screen.getByText('Guardar cambios'));
        
        await waitFor(() => {
            expect(partialUpdateSiniestro).toHaveBeenCalled();
        });
    });

    it('obtiene url del documento al hacer clic en ver', async () => {
        const { getClaimDocumentUrl } = await import('../../../services/siniestros.service');
        (getClaimDocumentUrl as any).mockResolvedValue({ url: 'https://test.com/doc.pdf' });
        
        const openSpy = vi.spyOn(globalThis as any, 'open').mockImplementation(() => null);

        renderModal({ editingSiniestro: { ...EXISTING_SINIESTRO, documents: [{ id: 10, file_name: 'test.pdf' }] } });
        
        fireEvent.click(screen.getByText('Documentos'));
        
        const downloadBtn = await screen.findByText('Ver');
        fireEvent.click(downloadBtn);
        
        await waitFor(() => {
            expect(getClaimDocumentUrl).toHaveBeenCalledWith(5, 10);
            expect(openSpy).toHaveBeenCalledWith('https://test.com/doc.pdf', '_blank', 'noopener,noreferrer');
        });
    });
});

describe('SiniestroFormModal — validacion de documentos', () => {
    beforeEach(() => vi.clearAllMocks());

    it('valida campos obligatorios al agregar documento entregado', async () => {
        renderModal();
        fireEvent.click(screen.getByText('Documentos'));

        const deliveredSelect = screen.getByLabelText(/entregado/i);
        fireEvent.change(deliveredSelect, { target: { value: 'true' } });

        const addBtn = screen.getByRole('button', { name: /agregar documento/i });
        fireEvent.click(addBtn);

        expect(await screen.findByText(/si marca "entregado", debe adjuntar un archivo/i)).toBeInTheDocument();
    });

    it('permite adjuntar un archivo y agregarlo a la lista', async () => {
        renderModal();
        fireEvent.click(screen.getByText('Documentos'));

        const deliveredSelect = screen.getByLabelText(/entregado/i);
        fireEvent.change(deliveredSelect, { target: { value: 'true' } });

        const fileInput = screen.getByLabelText(/archivo/i);
        const file = new File(['hello'], 'hello.pdf', { type: 'application/pdf' });
        fireEvent.change(fileInput, { target: { files: [file] } });

        fireEvent.change(screen.getByLabelText(/fecha entrega/i), { target: { value: '2026-06-01' } });

        const addBtn = screen.getByRole('button', { name: /agregar documento/i });
        fireEvent.click(addBtn);

        expect(await screen.findByText(/\(entregado\)/i)).toBeInTheDocument();
        expect(screen.getByText(/entrega: 2026-06-01/i)).toBeInTheDocument();
    });

    it('permite quitar un documento agregado', async () => {
        renderModal();
        fireEvent.click(screen.getByText('Documentos'));

        const addBtn = screen.getByRole('button', { name: /agregar documento/i });
        fireEvent.click(addBtn);

        expect(await screen.findByText(/\(pendiente\)/i)).toBeInTheDocument();

        const removeBtn = screen.getByRole('button', { name: /quitar/i });
        fireEvent.click(removeBtn);

        expect(screen.queryByText(/\(pendiente\)/i)).not.toBeInTheDocument();
    });

    it('muestra error si el tipo de documento es duplicado', async () => {
        renderModal();
        fireEvent.click(screen.getByText('Documentos'));

        const addBtn = screen.getByRole('button', { name: /agregar documento/i });
        fireEvent.click(addBtn);

        fireEvent.click(addBtn); // Agregar el mismo tipo de nuevo

        expect(await screen.findByText(/ya existe un documento de este tipo/i)).toBeInTheDocument();
    });
});
