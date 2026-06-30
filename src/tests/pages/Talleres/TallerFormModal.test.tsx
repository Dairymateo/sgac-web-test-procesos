/// <summary>
/// Componente TallerFormModal.test.tsx
/// </summary>
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TallerFormModal from '../../../pages/Talleres/components/TallerFormModal';
import { AuthProvider } from '../../../context/AuthContext';
import * as talleresService from '../../../services/talleres.service';
import * as aseguradorasService from '../../../services/aseguradoras.service';

vi.mock('../../../services/talleres.service');
vi.mock('../../../services/aseguradoras.service');

const renderModal = (props: Partial<React.ComponentProps<typeof TallerFormModal>> = {}) =>
    render(
        <AuthProvider>
            <TallerFormModal
                isOpen={true}
                onClose={vi.fn()}
                onSaveSuccess={vi.fn()}
                canMutate={true}
                {...props}
            />
        </AuthProvider>
    );

const fillRequiredFields = () => {
    fireEvent.change(screen.getByLabelText(/nombre de taller/i), { target: { name: 'name', value: 'Taller Test' } });
    fireEvent.change(screen.getByLabelText(/^ruc \*/i), { target: { name: 'ruc', value: '1792146739001' } });
    fireEvent.change(screen.getByLabelText(/direccion/i), { target: { name: 'address', value: 'Av. Amazonas 123' } });
    fireEvent.change(screen.getByLabelText(/telefono oficina/i), { target: { name: 'phone', value: '022345678' } });
};

const fillContactTab = () => {
    fireEvent.click(screen.getByRole('button', { name: /contacto y estado/i }));
    fireEvent.change(screen.getByLabelText(/ejecutivo de contacto/i), { target: { name: 'contact_executive', value: 'Juan Perez' } });
    fireEvent.change(screen.getByLabelText(/telefono del ejecutivo/i), { target: { name: 'executive_phone', value: '0991234567' } });
    fireEvent.click(screen.getByRole('button', { name: /informacion principal/i }));
};

const submitForm = () =>
    fireEvent.submit((screen.getByRole('button', { name: /guardar/i }).closest('form') ?? document.createElement('form')));

describe('TallerFormModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        (aseguradorasService.getAseguradoras as any).mockResolvedValue([]);
        (talleresService.createTaller as any).mockResolvedValue({ id: 1, name: 'TALLER TEST' });
        (talleresService.updateTaller as any).mockResolvedValue({ id: 1, name: 'TALLER TEST' });
    });

    it('renderiza el modal con titulo Registrar Taller', () => {
        renderModal();
        expect(screen.getAllByText('Registrar Taller').length).toBeGreaterThan(0);
    });

    it('no renderiza nada cuando isOpen es false', () => {
        renderModal({ isOpen: false });
        expect(screen.queryByText('Registrar Taller')).not.toBeInTheDocument();
    });

    it('muestra error si nombre esta vacio al guardar', async () => {
        renderModal();
        submitForm();
        await waitFor(() => {
            expect(screen.getByText('El nombre es requerido.')).toBeInTheDocument();
        });
    });

    it('muestra error si ruc esta vacio al guardar', async () => {
        renderModal();
        fireEvent.change(screen.getByLabelText(/nombre de taller/i), { target: { name: 'name', value: 'Taller ABC' } });
        submitForm();
        await waitFor(() => {
            expect(screen.getByText('El RUC es requerido.')).toBeInTheDocument();
        });
    });

    it('muestra error si ruc no tiene 13 digitos', async () => {
        renderModal();
        const rucInput = screen.getByLabelText(/^ruc \*/i);
        fireEvent.change(rucInput, { target: { name: 'ruc', value: '123' } });
        fireEvent.blur(rucInput);
        await waitFor(() => {
            expect(screen.getByText('El RUC debe tener exactamente 13 digitos numericos.')).toBeInTheDocument();
        });
    });

    it('muestra error si address esta vacia al guardar', async () => {
        renderModal();
        fireEvent.change(screen.getByLabelText(/nombre de taller/i), { target: { name: 'name', value: 'Taller ABC' } });
        fireEvent.change(screen.getByLabelText(/^ruc \*/i), { target: { name: 'ruc', value: '1792146739001' } });
        submitForm();
        await waitFor(() => {
            expect(screen.getByText('La direccion es requerida.')).toBeInTheDocument();
        });
    });

    it('muestra error si phone esta vacio al guardar', async () => {
        renderModal();
        fireEvent.change(screen.getByLabelText(/nombre de taller/i), { target: { name: 'name', value: 'Taller ABC' } });
        fireEvent.change(screen.getByLabelText(/^ruc \*/i), { target: { name: 'ruc', value: '1792146739001' } });
        fireEvent.change(screen.getByLabelText(/direccion/i), { target: { name: 'address', value: 'Av. Test 123' } });
        submitForm();
        await waitFor(() => {
            expect(screen.getByText('El telefono es requerido.')).toBeInTheDocument();
        });
    });

    it('muestra error si phone no tiene formato ecuatoriano', async () => {
        renderModal();
        const phoneInput = screen.getByLabelText(/telefono oficina/i);
        fireEvent.change(phoneInput, { target: { name: 'phone', value: '123456789' } });
        fireEvent.blur(phoneInput);
        await waitFor(() => {
            expect(screen.getByText(/ecuatoriano invalido/i)).toBeInTheDocument();
        });
    });

    it('acepta telefono movil ecuatoriano valido (09XXXXXXXX)', async () => {
        renderModal();
        const phoneInput = screen.getByLabelText(/telefono oficina/i);
        fireEvent.change(phoneInput, { target: { name: 'phone', value: '0991234567' } });
        fireEvent.blur(phoneInput);
        await waitFor(() => {
            expect(screen.queryByText(/ecuatoriano invalido/i)).not.toBeInTheDocument();
        });
    });

    it('acepta telefono fijo ecuatoriano valido (0[2-8]XXXXXXX)', async () => {
        renderModal();
        const phoneInput = screen.getByLabelText(/telefono oficina/i);
        fireEvent.change(phoneInput, { target: { name: 'phone', value: '022345678' } });
        fireEvent.blur(phoneInput);
        await waitFor(() => {
            expect(screen.queryByText(/ecuatoriano invalido/i)).not.toBeInTheDocument();
        });
    });

    it('llama createTaller con todos los campos requeridos al guardar', async () => {
        renderModal();
        fillRequiredFields();
        fillContactTab();
        submitForm();
        await waitFor(() => {
            expect(talleresService.createTaller).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'TALLER TEST',
                    ruc: '1792146739001',
                    address: 'AV. AMAZONAS 123',
                    phone: '022345678',
                    contact_executive: 'JUAN PEREZ',
                    executive_phone: '0991234567',
                })
            );
        });
    });

    it('muestra errores por campo desde err.fieldErrors de la API (traducidos al español)', async () => {
        const apiError = Object.assign(new Error('Invalid data.'), {
            fieldErrors: {
                ruc: 'RUC must be a valid Ecuadorian RUC.',
                name: 'Workshop name must have at least 3 characters.',
                phone: 'Phone must be a valid Ecuadorian number.',
            },
        });
        (talleresService.createTaller as any).mockRejectedValue(apiError);

        renderModal();
        fillRequiredFields();
        fillContactTab();
        submitForm();
        await waitFor(() => {
            expect(screen.getByText('Debe ser un RUC ecuatoriano válido.')).toBeInTheDocument();
            expect(screen.getByText('El nombre debe tener al menos 3 caracteres.')).toBeInTheDocument();
            expect(screen.getByText(/ecuatoriano invalido/i)).toBeInTheDocument();
        });
    });

    it('cambia al tab Contacto y Estado si el error de API es en executive_phone', async () => {
        const apiError = Object.assign(new Error('Invalid data.'), {
            fieldErrors: { executive_phone: 'Phone must be a valid Ecuadorian number.' },
        });
        (talleresService.createTaller as any).mockRejectedValue(apiError);

        renderModal();
        fillRequiredFields();
        fillContactTab();
        submitForm();
        await waitFor(() => {
            const contactTab = screen.getByRole('button', { name: /contacto y estado/i });
            expect(contactTab).toHaveClass('active');
        });
    });

    it('muestra error generico cuando fieldErrors esta vacio', async () => {
        const apiError = Object.assign(new Error('No tienes permisos para realizar esta acción.'), {
            fieldErrors: {},
        });
        (talleresService.createTaller as any).mockRejectedValue(apiError);

        renderModal();
        fillRequiredFields();
        fillContactTab();
        submitForm();
        await waitFor(() => {
            expect(screen.getByText('No tienes permisos para realizar esta acción.')).toBeInTheDocument();
        });
    });

    it('renderiza en modo vista con titulo Detalles del Taller', () => {
        const taller = {
            id: 1, name: 'TALLER ABC', ruc: '1792146739001',
            address: 'Av. Test', phone: '022345678',
            contact_executive: 'Juan', executive_phone: '0991234567',
            is_active: true, created_at: '', updated_at: '',
            insurer_ids: [], insurers_summary: [],
        };
        renderModal({ viewingTaller: taller });
        expect(screen.getByText('Detalles del Taller')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /guardar/i })).not.toBeInTheDocument();
    });

    it('llama updateTaller en modo edicion', async () => {
        const taller = {
            id: 3, name: 'TALLER XYZ', ruc: '1792146739001',
            address: 'Av. Test', phone: '022345678',
            contact_executive: 'Pedro', executive_phone: '0991234567',
            is_active: true, created_at: '', updated_at: '',
            insurer_ids: [], insurers_summary: [],
        };
        renderModal({ editingTaller: taller });
        fireEvent.change(screen.getByLabelText(/nombre de taller/i), { target: { name: 'name', value: 'Taller Nuevo' } });
        fireEvent.submit((screen.getByRole('button', { name: /guardar cambios/i }).closest('form') ?? document.createElement('form')));
        await waitFor(() => {
            expect(talleresService.updateTaller).toHaveBeenCalledWith(3, expect.any(Object));
        });
    });
});