/// <summary>
/// Componente AseguradoraFormModal.test.tsx
/// </summary>
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AseguradoraFormModal from '../../../pages/Aseguradoras/components/AseguradoraFormModal';
import { AuthProvider } from '../../../context/AuthContext';
import * as aseguradorasService from '../../../services/aseguradoras.service';
import * as talleresService from '../../../services/talleres.service';

vi.mock('../../../services/aseguradoras.service');
vi.mock('../../../services/talleres.service');
vi.mock('../../../services/geo.service', () => ({
    fetchCountries: vi.fn().mockResolvedValue([{ name: 'Ecuador', iso2: 'EC' }]),
    fetchStates: vi.fn().mockResolvedValue([{ name: 'Pichincha', state_code: 'P' }]),
    fetchCities: vi.fn().mockResolvedValue([{ name: 'Quito' }]),
}));

const renderModal = (props: Partial<React.ComponentProps<typeof AseguradoraFormModal>> = {}) =>
    render(
        <AuthProvider>
            <AseguradoraFormModal
                isOpen={true}
                onClose={vi.fn()}
                onSaveSuccess={vi.fn()}
                canMutate={true}
                {...props}
            />
        </AuthProvider>
    );

const completeItem = {
    id: 1, insurer_code: 'INS-001', registration_date: '2024-01-01',
    name: 'SEGUROS ABC', document_type: 'RUC', document_number: '1234567890001',
    country: 'Ecuador', province: 'Pichincha', city: 'Quito',
    address: 'Av. Amazonas 123', phone: '022345678',
    account_executive_name: 'Juan Perez', account_executive_phone: '0991234567', account_executive_email: 'juan@test.com',
    claims_executive_name: 'Maria Lopez', claims_executive_phone: '0981234567', claims_executive_email: 'maria@test.com',
    portfolio_executive_name: 'Carlos Ruiz', portfolio_executive_phone: '0971234567', portfolio_executive_email: 'carlos@test.com',
    is_active: true, created_at: '', updated_at: '', workshop_ids: [], workshops_summary: [],
};

describe('AseguradoraFormModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        (talleresService.getTalleres as any).mockResolvedValue([]);
        (aseguradorasService.createAseguradora as any).mockResolvedValue(completeItem);
        (aseguradorasService.updateAseguradora as any).mockResolvedValue(completeItem);
    });

    const submitForm = () =>
        fireEvent.submit((screen.getByRole('button', { name: /guardar/i }).closest('form') ?? document.createElement('form')));

    const fillAllRequiredFields = async () => {

        await waitFor(() => expect(screen.getByRole('option', { name: 'Ecuador' })).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/nombre \*/i), { target: { name: 'name', value: 'Seguros Test SA' } });
        fireEvent.change(screen.getByLabelText(/numero de documento/i), { target: { name: 'document_number', value: '1234567890001' } });
        fireEvent.change(screen.getByLabelText(/pais/i), { target: { name: 'country', value: 'Ecuador' } });

        await waitFor(() => expect(screen.getByRole('option', { name: 'Pichincha' })).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/provincia/i), { target: { name: 'province', value: 'Pichincha' } });

        await waitFor(() => expect(screen.getByRole('option', { name: 'Quito' })).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/ciudad/i), { target: { name: 'city', value: 'Quito' } });

        fireEvent.change(screen.getByLabelText(/direccion/i), { target: { name: 'address', value: 'Av. Amazonas 123' } });
        fireEvent.change(screen.getByLabelText(/telefono \*/i), { target: { name: 'phone', value: '022345678' } });

        fireEvent.click(screen.getByRole('button', { name: /ejecutivos/i }));

        const nombres = screen.getAllByLabelText(/^nombre \*$/i);
        fireEvent.change(nombres[0], { target: { name: 'account_executive_name', value: 'Juan Perez' } });
        fireEvent.change(nombres[1], { target: { name: 'claims_executive_name', value: 'Maria Lopez' } });
        fireEvent.change(nombres[2], { target: { name: 'portfolio_executive_name', value: 'Carlos Ruiz' } });

        const telefonos = screen.getAllByLabelText(/^telefono \*$/i);
        fireEvent.change(telefonos[0], { target: { name: 'account_executive_phone', value: '0991234567' } });
        fireEvent.change(telefonos[1], { target: { name: 'claims_executive_phone', value: '0981234567' } });
        fireEvent.change(telefonos[2], { target: { name: 'portfolio_executive_phone', value: '0971234567' } });

        const emails = screen.getAllByLabelText(/^email \*$/i);
        fireEvent.change(emails[0], { target: { name: 'account_executive_email', value: 'juan@test.com' } });
        fireEvent.change(emails[1], { target: { name: 'claims_executive_email', value: 'maria@test.com' } });
        fireEvent.change(emails[2], { target: { name: 'portfolio_executive_email', value: 'carlos@test.com' } });
    };

    it('renderiza el modal con titulo Registrar Aseguradora', () => {
        renderModal();
        expect(screen.getByText('Registrar Aseguradora')).toBeInTheDocument();
    });

    it('no renderiza nada cuando isOpen es false', () => {
        renderModal({ isOpen: false });
        expect(screen.queryByText('Registrar Aseguradora')).not.toBeInTheDocument();
    });

    it('muestra error si nombre esta vacio al guardar', async () => {
        renderModal();
        submitForm();
        await waitFor(() => {
            expect(screen.getByText('El nombre es requerido.')).toBeInTheDocument();
        });
    });

    it('muestra error si nombre tiene menos de 3 caracteres', async () => {
        renderModal();
        fireEvent.change(screen.getByLabelText(/nombre \*/i), { target: { name: 'name', value: 'AB' } });
        fireEvent.blur(screen.getByLabelText(/nombre \*/i));
        await waitFor(() => {
            expect(screen.getByText('Minimo 3 caracteres.')).toBeInTheDocument();
        });
    });

    it('muestra error si nombre supera 50 caracteres', async () => {
        renderModal();
        const longName = 'A'.repeat(51);
        fireEvent.change(screen.getByLabelText(/nombre \*/i), { target: { name: 'name', value: longName } });
        fireEvent.blur(screen.getByLabelText(/nombre \*/i));
        await waitFor(() => {
            expect(screen.getByText('Maximo 50 caracteres.')).toBeInTheDocument();
        });
    });

    it('muestra error si document_number no tiene 13 digitos', async () => {
        renderModal();
        const input = screen.getByLabelText(/numero de documento/i);
        fireEvent.change(input, { target: { name: 'document_number', value: '123' } });
        fireEvent.blur(input);
        await waitFor(() => {
            expect(screen.getByText('El RUC debe tener exactamente 13 digitos numericos.')).toBeInTheDocument();
        });
    });



    it('llama createAseguradora con datos correctos al guardar', async () => {
        renderModal();
        await fillAllRequiredFields();
        submitForm();
        await waitFor(() => {
            expect(aseguradorasService.createAseguradora).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'SEGUROS TEST SA', document_number: '1234567890001' })
            );
        });
    }, 15000);

    it('muestra errores por campo desde err.fieldErrors de la API (traducidos al español)', async () => {
        const apiError = Object.assign(new Error('Invalid data.'), {
            fieldErrors: { name: 'Insurer name must have at least 3 characters.' },
        });
        (aseguradorasService.createAseguradora as any).mockRejectedValue(apiError);

        renderModal();
        await fillAllRequiredFields();

        fireEvent.click(screen.getByRole('button', { name: /informacion general/i }));
        submitForm();
        await waitFor(() => {
            expect(screen.getByText('El nombre debe tener al menos 3 caracteres.')).toBeInTheDocument();
        });
    }, 15000);

    it('traduce error de RUC invalido desde la API', async () => {
        const apiError = Object.assign(new Error('Invalid data.'), {
            fieldErrors: { document_number: 'Document number must be a valid Ecuadorian RUC.' },
        });
        (aseguradorasService.createAseguradora as any).mockRejectedValue(apiError);

        renderModal();
        await fillAllRequiredFields();
        fireEvent.click(screen.getByRole('button', { name: /informacion general/i }));
        submitForm();
        await waitFor(() => {
            expect(screen.getByText('Debe ser un RUC ecuatoriano válido.')).toBeInTheDocument();
        });
    }, 15000);

    it('muestra mensaje generico cuando err.message no tiene campos', async () => {
        const apiError = Object.assign(new Error('No tienes permisos para realizar esta acción.'), {
            fieldErrors: {},
        });
        (aseguradorasService.createAseguradora as any).mockRejectedValue(apiError);

        renderModal();
        await fillAllRequiredFields();
        submitForm();
        await waitFor(() => {
            expect(screen.getByText('No tienes permisos para realizar esta acción.')).toBeInTheDocument();
        });
    }, 15000);

    it('cambia al tab de Ejecutivos cuando el error de API es en campo ejecutivo', async () => {
        const apiError = Object.assign(new Error('Invalid data.'), {
            fieldErrors: { account_executive_phone: 'Phone must be a valid Ecuadorian number.' },
        });
        (aseguradorasService.createAseguradora as any).mockRejectedValue(apiError);

        renderModal();
        await fillAllRequiredFields();

        fireEvent.click(screen.getByRole('button', { name: /informacion general/i }));
        submitForm();
        await waitFor(() => {
            expect(screen.getByText('Ejecutivos')).toHaveClass('active');
        });
    }, 15000);

    it('renderiza en modo vista con titulo Detalles de Aseguradora', () => {
        renderModal({ viewingItem: completeItem });
        expect(screen.getByText('Detalles de Aseguradora')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /guardar/i })).not.toBeInTheDocument();
    });

    it('llama updateAseguradora en modo edicion', async () => {
        const editItem = { ...completeItem, id: 5, insurer_code: 'INS-005', name: 'SEGUROS XYZ', document_number: '9876543210001' };
        renderModal({ editingItem: editItem });
        fireEvent.change(screen.getByLabelText(/nombre \*/i), { target: { name: 'name', value: 'Seguros Nuevo' } });
        fireEvent.submit((screen.getByRole('button', { name: /guardar cambios/i }).closest('form') ?? document.createElement('form')));
        await waitFor(() => {
            expect(aseguradorasService.updateAseguradora).toHaveBeenCalledWith(5, expect.any(Object));
        });
    });
});