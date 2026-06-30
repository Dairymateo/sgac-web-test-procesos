/// <summary>
/// VehiculoFormModal.extended.test.tsx — additional coverage tests
/// </summary>
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VehiculoFormModal from '../../../pages/Vehiculos/components/VehiculoFormModal';
import { AuthProvider } from '../../../context/AuthContext';
import * as vehiculosService from '../../../services/vehiculos.service';
import * as clientesService from '../../../services/clientes.service';

vi.mock('../../../services/vehiculos.service');
vi.mock('../../../services/clientes.service');
vi.mock('../../../services/geo.service', () => ({
    fetchStates: vi.fn().mockResolvedValue([{ name: 'Pichincha', state_code: 'P' }]),
    fetchCities: vi.fn().mockResolvedValue([{ name: 'Quito' }]),
}));

const MOCK_CLIENTE = { id: 10, first_names: 'Carlos', last_names: 'Gomez', document_number: '0102030405', is_active: true };

const MOCK_VEHICULO = {
    id: 1,
    owner_customer: 10,
    brand: 'FORD',
    model: 'F150',
    vehicle_type: 'pickup' as const,
    vehicle_use: 'work' as const,
    engine: 'J05ETC19049',
    chassis: '9F3FC9JKSEXX11235',
    license_plate: 'PBC-1234',
    year: 2024,
    commercial_value: '27205.88',
    color: 'BLANCO',
    province: 'PICHINCHA',
    city: 'QUITO',
    is_active: true,
};

const renderComponent = (props: any = {}) =>
    render(
        <AuthProvider>
            <VehiculoFormModal
                isOpen={true}
                onClose={vi.fn()}
                onSaveSuccess={vi.fn()}
                canMutate={true}
                {...props}
            />
        </AuthProvider>
    );

describe('VehiculoFormModal — cobertura extendida', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        (clientesService.getClientes as any).mockResolvedValue([MOCK_CLIENTE]);
        (vehiculosService.createVehiculo as any).mockResolvedValue({ id: 1 });
        (vehiculosService.updateVehiculo as any).mockResolvedValue({ id: 1 });
    });

    it('no renderiza nada cuando isOpen es false', () => {
        renderComponent({ isOpen: false });
        expect(screen.queryByText(/registrar vehiculo/i)).not.toBeInTheDocument();
    });

    it('renderiza titulo Detalles del Vehiculo en modo vista', async () => {
        renderComponent({ viewingVehiculo: MOCK_VEHICULO });
        await waitFor(() => expect(screen.getByText('Detalles del Vehiculo')).toBeInTheDocument());
        expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument();
    });

    it('renderiza titulo Editar Vehiculo en modo edicion', async () => {
        renderComponent({ editingVehiculo: MOCK_VEHICULO });
        await waitFor(() => expect(screen.getByText('Editar Vehiculo')).toBeInTheDocument());
    });

    it('muestra errores de validacion al guardar sin campos requeridos', async () => {
        renderComponent();
        await waitFor(() => expect(screen.getByLabelText(/Placa/i)).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await waitFor(() => {
            expect(screen.getByText('Debe seleccionar un cliente.')).toBeInTheDocument();
        });
    });

    it('muestra error de placa invalida', async () => {
        renderComponent();
        await waitFor(() => expect(screen.getByLabelText(/Placa/i)).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/Propietario \(cliente\)/i), { target: { value: '10' } });
        fireEvent.change(screen.getByLabelText(/Placa/i), { target: { value: 'A' } }); // too short
        fireEvent.change(screen.getByLabelText(/A.o/i), { target: { value: '2024' } });
        fireEvent.change(screen.getByLabelText(/Marca/i), { target: { value: 'FORD' } });
        fireEvent.change(screen.getByLabelText(/Modelo/i), { target: { value: 'F150' } });

        fireEvent.click(screen.getByText('Ficha Tecnica'));
        fireEvent.change(screen.getByLabelText(/Motor/i), { target: { value: 'J05ETC19049' } });
        fireEvent.change(screen.getByLabelText(/Chasis/i), { target: { value: '9F3FC9JKSEXX' } });
        fireEvent.change(screen.getByLabelText(/Color/i), { target: { value: 'BLANCO' } });

        fireEvent.click(screen.getByText('Valores'));
        fireEvent.change(screen.getByLabelText(/Valor comercial/i), { target: { value: '15000' } });

        fireEvent.click(screen.getByText('Ubicacion'));
        await waitFor(() => expect(screen.getByRole('option', { name: 'Pichincha' })).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/Provincia/i), { target: { value: 'Pichincha' } });
        await waitFor(() => expect(screen.getByRole('option', { name: 'Quito' })).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/Ciudad/i), { target: { value: 'Quito' } });

        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await waitFor(() => {
            expect(screen.getByText('Placa invalida: use 6 a 10 caracteres alfanumericos o guion.')).toBeInTheDocument();
        });
    });

    it('muestra error cuando engine es menor a 5 caracteres', async () => {
        renderComponent();
        await waitFor(() => expect(screen.getByLabelText(/Placa/i)).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/Propietario \(cliente\)/i), { target: { value: '10' } });
        fireEvent.change(screen.getByLabelText(/Placa/i), { target: { value: 'PBC-1234' } });
        fireEvent.change(screen.getByLabelText(/A.o/i), { target: { value: '2024' } });
        fireEvent.change(screen.getByLabelText(/Marca/i), { target: { value: 'FORD' } });
        fireEvent.change(screen.getByLabelText(/Modelo/i), { target: { value: 'F150' } });

        fireEvent.click(screen.getByText('Ficha Tecnica'));
        fireEvent.change(screen.getByLabelText(/Motor/i), { target: { value: 'AB' } }); // too short
        fireEvent.change(screen.getByLabelText(/Chasis/i), { target: { value: '9F3FC9JKSEXX' } });
        fireEvent.change(screen.getByLabelText(/Color/i), { target: { value: 'BLANCO' } });

        fireEvent.click(screen.getByText('Valores'));
        fireEvent.change(screen.getByLabelText(/Valor comercial/i), { target: { value: '15000' } });

        fireEvent.click(screen.getByText('Ubicacion'));
        await waitFor(() => expect(screen.getByRole('option', { name: 'Pichincha' })).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/Provincia/i), { target: { value: 'Pichincha' } });
        await waitFor(() => expect(screen.getByRole('option', { name: 'Quito' })).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/Ciudad/i), { target: { value: 'Quito' } });

        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await waitFor(() => {
            expect(screen.getByText('Debe tener minimo 5 caracteres.')).toBeInTheDocument();
        });
    });

    it('muestra error de valor comercial negativo', async () => {
        renderComponent();
        await waitFor(() => expect(screen.getByLabelText(/Placa/i)).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/Propietario \(cliente\)/i), { target: { value: '10' } });
        fireEvent.change(screen.getByLabelText(/Placa/i), { target: { value: 'PBC-1234' } });
        fireEvent.change(screen.getByLabelText(/A.o/i), { target: { value: '2024' } });
        fireEvent.change(screen.getByLabelText(/Marca/i), { target: { value: 'FORD' } });
        fireEvent.change(screen.getByLabelText(/Modelo/i), { target: { value: 'F150' } });

        fireEvent.click(screen.getByText('Ficha Tecnica'));
        fireEvent.change(screen.getByLabelText(/Motor/i), { target: { value: 'J05ETC19049' } });
        fireEvent.change(screen.getByLabelText(/Chasis/i), { target: { value: '9F3FC9JKSEXX' } });
        fireEvent.change(screen.getByLabelText(/Color/i), { target: { value: 'BLANCO' } });

        fireEvent.click(screen.getByText('Valores'));
        fireEvent.change(screen.getByLabelText(/Valor comercial/i), { target: { value: '-500' } });

        fireEvent.click(screen.getByText('Ubicacion'));
        await waitFor(() => expect(screen.getByRole('option', { name: 'Pichincha' })).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/Provincia/i), { target: { value: 'Pichincha' } });
        await waitFor(() => expect(screen.getByRole('option', { name: 'Quito' })).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/Ciudad/i), { target: { value: 'Quito' } });

        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await waitFor(() => {
            expect(screen.getByText('Debe ser mayor a 0.')).toBeInTheDocument();
        });
    });

    it('muestra errores de campo desde la API', async () => {
        const apiError = Object.assign(new Error('license_plate: Plate already exists; brand: Brand required.'), {
            fieldErrors: { license_plate: 'Plate already exists.', brand: 'Brand required.' },
        });
        (vehiculosService.createVehiculo as any).mockRejectedValue(apiError);

        renderComponent({
            clientesProps: [MOCK_CLIENTE],
        });
        await waitFor(() => expect(screen.getByLabelText(/Placa/i)).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/Propietario \(cliente\)/i), { target: { value: '10' } });
        fireEvent.change(screen.getByLabelText(/Placa/i), { target: { value: 'PBC-1234' } });
        fireEvent.change(screen.getByLabelText(/A.o/i), { target: { value: '2024' } });
        fireEvent.change(screen.getByLabelText(/Marca/i), { target: { value: 'FORD' } });
        fireEvent.change(screen.getByLabelText(/Modelo/i), { target: { value: 'F150' } });

        fireEvent.click(screen.getByText('Ficha Tecnica'));
        fireEvent.change(screen.getByLabelText(/Motor/i), { target: { value: 'J05ETC19049' } });
        fireEvent.change(screen.getByLabelText(/Chasis/i), { target: { value: '9F3FC9JKSEXX11235' } });
        fireEvent.change(screen.getByLabelText(/Color/i), { target: { value: 'BLANCO' } });

        fireEvent.click(screen.getByText('Valores'));
        fireEvent.change(screen.getByLabelText(/Valor comercial/i), { target: { value: '27205.88' } });

        fireEvent.click(screen.getByText('Ubicacion'));
        await waitFor(() => expect(screen.getByRole('option', { name: 'Pichincha' })).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/Provincia/i), { target: { value: 'Pichincha' } });
        await waitFor(() => expect(screen.getByRole('option', { name: 'Quito' })).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/Ciudad/i), { target: { value: 'Quito' } });

        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

        await waitFor(() => {
            // Errors surface either as field messages or in a generic error banner
            expect(vehiculosService.createVehiculo).toHaveBeenCalled();
            expect(screen.queryByText(/por favor/i)).toBeInTheDocument();
        });
    });

    it('canMutate=false muestra Cerrar en lugar de Cancelar', async () => {
        renderComponent({ viewingVehiculo: MOCK_VEHICULO, canMutate: false });
        await waitFor(() => expect(screen.getByText('Cerrar')).toBeInTheDocument());
        expect(screen.queryByText('Cancelar')).not.toBeInTheDocument();
    });

    it('clientesProps evita la llamada al servicio getClientes', async () => {
        renderComponent({ clientesProps: [MOCK_CLIENTE] });
        await waitFor(() => expect(screen.getByLabelText(/Propietario/i)).toBeInTheDocument());
        expect(clientesService.getClientes).not.toHaveBeenCalled();
    });
});
