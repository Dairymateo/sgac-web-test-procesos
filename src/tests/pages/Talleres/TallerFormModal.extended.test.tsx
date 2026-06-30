/// <summary>
/// TallerFormModal.extended.test.tsx — additional coverage tests
/// </summary>
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TallerFormModal from '../../../pages/Talleres/components/TallerFormModal';
import { AuthProvider } from '../../../context/AuthContext';
import * as talleresService from '../../../services/talleres.service';
import * as aseguradorasService from '../../../services/aseguradoras.service';

vi.mock('../../../services/talleres.service');
vi.mock('../../../services/aseguradoras.service');

const MOCK_ASEGURADORA = {
    id: 5,
    name: 'Seguros del Sur',
    insurer_code: 'SDS',
    is_active: true,
    created_at: '',
    updated_at: '',
};

const MOCK_TALLER = {
    id: 1,
    name: 'TALLER NORTE',
    ruc: '1792146739001',
    address: 'AV. PRINCIPAL 123',
    phone: '022345678',
    contact_executive: 'MARIA TALLER',
    executive_phone: '0991234567',
    is_active: true,
    created_at: '',
    updated_at: '',
    insurer_ids: [],
    insurers_summary: [],
};

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

describe('TallerFormModal — cobertura extendida', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        (aseguradorasService.getAseguradoras as any).mockResolvedValue([MOCK_ASEGURADORA]);
        (talleresService.createTaller as any).mockResolvedValue({ id: 1 });
        (talleresService.updateTaller as any).mockResolvedValue({ id: 1 });
    });

    it('tab Aseguradoras muestra mensaje vacío cuando no hay aseguradoras vinculadas', async () => {
        renderModal();
        fireEvent.click(screen.getByRole('button', { name: /aseguradoras/i }));
        await waitFor(() => expect(screen.getByText(/no hay aseguradoras vinculadas/i)).toBeInTheDocument());
    });

    it('puede agregar una aseguradora desde el tab Aseguradoras', async () => {
        renderModal();
        fireEvent.click(screen.getByRole('button', { name: /aseguradoras/i }));

        await waitFor(() => expect(screen.getByRole('option', { name: /Seguros del Sur/i })).toBeInTheDocument());

        fireEvent.change(screen.getByRole('combobox'), { target: { value: '5' } });
        fireEvent.click(screen.getByText('+ Agregar'));

        await waitFor(() => expect(screen.getByText(/Seguros del Sur/i)).toBeInTheDocument());
    });

    it('puede eliminar una aseguradora vinculada', async () => {
        renderModal({
            editingTaller: {
                ...MOCK_TALLER,
                insurer_ids: [5],
                insurers_summary: [{ id: 5, name: 'Seguros del Sur', insurer_code: 'SDS', is_active: true }],
            },
        });
        fireEvent.click(screen.getByRole('button', { name: /aseguradoras/i }));

        await waitFor(() => expect(screen.getByText(/Seguros del Sur/i)).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: /quitar seguros del sur/i }));
        await waitFor(() => expect(screen.getByText(/no hay aseguradoras vinculadas/i)).toBeInTheDocument());
    });

    it('cambia el estado is_active en el tab Contacto', async () => {
        renderModal({ editingTaller: MOCK_TALLER });
        fireEvent.click(screen.getByRole('button', { name: /contacto y estado/i }));

        const estadoSelect = screen.getByLabelText(/estado del registro/i);
        expect(estadoSelect).toHaveValue('true');

        fireEvent.change(estadoSelect, { target: { name: 'is_active', value: 'false' } });
        expect(estadoSelect).toHaveValue('false');
    });

    it('modo canMutate=false muestra Cerrar y no muestra Guardar', () => {
        renderModal({ viewingTaller: MOCK_TALLER, canMutate: false });
        expect(screen.getByText('Cerrar')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /guardar/i })).not.toBeInTheDocument();
    });

    it('modo vista oculta el botón Agregar en tab Aseguradoras', async () => {
        renderModal({ viewingTaller: MOCK_TALLER });
        fireEvent.click(screen.getByRole('button', { name: /aseguradoras/i }));
        await waitFor(() => expect(screen.queryByText('+ Agregar')).not.toBeInTheDocument());
    });

    it('no agrega aseguradora duplicada', async () => {
        renderModal({
            editingTaller: {
                ...MOCK_TALLER,
                insurer_ids: [5],
                insurers_summary: [{ id: 5, name: 'Seguros del Sur', insurer_code: 'SDS', is_active: true }],
            },
        });
        fireEvent.click(screen.getByRole('button', { name: /aseguradoras/i }));

        // La aseguradora ya vinculada no debería aparecer en el selector de disponibles
        await waitFor(() => expect(screen.queryByRole('option', { name: /Seguros del Sur/i })).not.toBeInTheDocument());
    });

    it('valida nombre con menos de 3 caracteres', async () => {
        renderModal();
        const nameInput = screen.getByLabelText(/nombre de taller/i);
        fireEvent.change(nameInput, { target: { name: 'name', value: 'AB' } });
        fireEvent.blur(nameInput);
        await waitFor(() => expect(screen.getByText('Minimo 3 caracteres.')).toBeInTheDocument());
    });

    it('muestra error de campo si name supera 100 caracteres', async () => {
        renderModal();
        const nameInput = screen.getByLabelText(/nombre de taller/i);
        fireEvent.change(nameInput, { target: { name: 'name', value: 'A'.repeat(101) } });
        fireEvent.blur(nameInput);
        await waitFor(() => expect(screen.getByText('Maximo 100 caracteres.')).toBeInTheDocument());
    });

    it('ignora caracteres no numericos en campo RUC', async () => {
        renderModal();
        const rucInput = screen.getByLabelText(/^ruc \*/i);
        fireEvent.change(rucInput, { target: { name: 'ruc', value: 'ABC123' } });
        // Should remain empty since non-numeric is rejected
        expect(rucInput).toHaveValue('');
    });

    it('cambia al tab Aseguradoras si el error de API proviene de insurer_ids', async () => {
        const apiError = Object.assign(new Error('Invalid data.'), {
            fieldErrors: { insurer_ids: 'Insurer not found.' },
        });
        (talleresService.createTaller as any).mockRejectedValue(apiError);

        renderModal();
        fireEvent.change(screen.getByLabelText(/nombre de taller/i), { target: { name: 'name', value: 'Taller ABC' } });
        fireEvent.change(screen.getByLabelText(/^ruc \*/i), { target: { name: 'ruc', value: '1792146739001' } });
        fireEvent.change(screen.getByLabelText(/direccion/i), { target: { name: 'address', value: 'Av. Test 123' } });
        fireEvent.change(screen.getByLabelText(/telefono oficina/i), { target: { name: 'phone', value: '022345678' } });
        fireEvent.click(screen.getByRole('button', { name: /contacto y estado/i }));
        fireEvent.change(screen.getByLabelText(/ejecutivo de contacto/i), { target: { name: 'contact_executive', value: 'Juan' } });
        fireEvent.change(screen.getByLabelText(/telefono del ejecutivo/i), { target: { name: 'executive_phone', value: '0991234567' } });
        fireEvent.click(screen.getByRole('button', { name: /informacion principal/i }));

        fireEvent.submit((screen.getByRole('button', { name: /guardar/i }).closest('form') ?? document.createElement('form')));

        await waitFor(() => {
            const aseguradorasTab = screen.getByRole('button', { name: /aseguradoras/i });
            expect(aseguradorasTab).toHaveClass('active');
        });
    });

    it('ignora error global (isGlobal=true) sin mostrar mensaje', async () => {
        const globalError = Object.assign(new Error('Session expired'), { isGlobal: true });
        (talleresService.createTaller as any).mockRejectedValue(globalError);

        renderModal();
        fireEvent.change(screen.getByLabelText(/nombre de taller/i), { target: { name: 'name', value: 'Taller ABC' } });
        fireEvent.change(screen.getByLabelText(/^ruc \*/i), { target: { name: 'ruc', value: '1792146739001' } });
        fireEvent.change(screen.getByLabelText(/direccion/i), { target: { name: 'address', value: 'Av. Test' } });
        fireEvent.change(screen.getByLabelText(/telefono oficina/i), { target: { name: 'phone', value: '022345678' } });
        fireEvent.click(screen.getByRole('button', { name: /contacto y estado/i }));
        fireEvent.change(screen.getByLabelText(/ejecutivo de contacto/i), { target: { name: 'contact_executive', value: 'Juan' } });
        fireEvent.change(screen.getByLabelText(/telefono del ejecutivo/i), { target: { name: 'executive_phone', value: '0991234567' } });
        fireEvent.click(screen.getByRole('button', { name: /informacion principal/i }));

        fireEvent.submit((screen.getByRole('button', { name: /guardar/i }).closest('form') ?? document.createElement('form')));

        await waitFor(() => {
            expect(screen.queryByText(/ocurrio un error al guardar/i)).not.toBeInTheDocument();
        });
    });

    it('limpia el error de campo al modificar un input con error previo', async () => {
        renderModal();
        const rucInput = screen.getByLabelText(/^ruc \*/i);
        fireEvent.change(rucInput, { target: { name: 'ruc', value: '123' } });
        fireEvent.blur(rucInput);

        await waitFor(() => expect(screen.getByText('El RUC debe tener exactamente 13 digitos numericos.')).toBeInTheDocument());

        fireEvent.change(rucInput, { target: { name: 'ruc', value: '1792146739001' } });
        await waitFor(() => expect(screen.queryByText('El RUC debe tener exactamente 13 digitos numericos.')).not.toBeInTheDocument());
    });

    it('parsea errores de la API en formato "campo: mensaje;" cuando fieldErrors esta ausente', async () => {
        const apiError = Object.assign(new Error('ruc: RUC must be a valid Ecuadorian RUC.'), {
            fieldErrors: undefined,
        });
        (talleresService.createTaller as any).mockRejectedValue(apiError);

        renderModal();
        fireEvent.change(screen.getByLabelText(/nombre de taller/i), { target: { name: 'name', value: 'Taller ABC' } });
        fireEvent.change(screen.getByLabelText(/^ruc \*/i), { target: { name: 'ruc', value: '1792146739001' } });
        fireEvent.change(screen.getByLabelText(/direccion/i), { target: { name: 'address', value: 'Av. Test' } });
        fireEvent.change(screen.getByLabelText(/telefono oficina/i), { target: { name: 'phone', value: '022345678' } });
        fireEvent.click(screen.getByRole('button', { name: /contacto y estado/i }));
        fireEvent.change(screen.getByLabelText(/ejecutivo de contacto/i), { target: { name: 'contact_executive', value: 'Juan' } });
        fireEvent.change(screen.getByLabelText(/telefono del ejecutivo/i), { target: { name: 'executive_phone', value: '0991234567' } });
        fireEvent.click(screen.getByRole('button', { name: /informacion principal/i }));
        fireEvent.submit((screen.getByRole('button', { name: /guardar/i }).closest('form') ?? document.createElement('form')));

        await waitFor(() => {
            expect(screen.getByText('Debe ser un RUC ecuatoriano válido.')).toBeInTheDocument();
        });
    });

    it('renderiza titulo Editar Taller cuando editingTaller esta definido', () => {
        renderModal({ editingTaller: MOCK_TALLER });
        expect(screen.getByText('Editar Taller')).toBeInTheDocument();
    });

    it('Cancelar llama onClose', () => {
        const onClose = vi.fn();
        renderModal({ onClose });
        fireEvent.click(screen.getByText('Cancelar'));
        expect(onClose).toHaveBeenCalled();
    });
});
