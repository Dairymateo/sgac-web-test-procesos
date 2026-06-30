/// <summary>
/// Componente VehiculoFormModal.test.tsx
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

describe('VehicleReadFormModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (clientesService.getClientes as any).mockResolvedValue([
            { id: 10, first_names: 'Carlos', last_names: 'Gomez', document_number: '0102030405' },
        ]);
        (vehiculosService.createVehiculo as any).mockResolvedValue({ id: 1 });
        (vehiculosService.updateVehiculo as any).mockResolvedValue({ id: 1 });
    });

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

    it('renderiza y cambia tabs', async () => {
        renderComponent();
        await waitFor(() => expect(screen.getAllByText('Registrar Vehiculo').length).toBeGreaterThan(0));

        fireEvent.click(screen.getByText('Ficha Tecnica'));
        expect(screen.getByText('Datos Tecnicos')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Ubicacion'));
        expect(screen.getByLabelText(/Provincia/i)).toBeInTheDocument();
    });

    it('envia create para nuevo vehiculo', async () => {
        renderComponent();
        await waitFor(() => expect(screen.getByLabelText(/Placa/i)).toBeInTheDocument());

        fireEvent.change(screen.getByLabelText(/Propietario \(cliente\)/i), { target: { value: '10' } });
        fireEvent.change(screen.getByLabelText(/Placa/i), { target: { value: 'pbc-1234' } });
        fireEvent.change(screen.getByLabelText(/A.o/i), { target: { value: '2024' } });
        fireEvent.change(screen.getByLabelText(/Marca/i), { target: { value: 'FORD' } });
        fireEvent.change(screen.getByLabelText(/Modelo/i), { target: { value: 'FC9JKSZ' } });

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
            expect(vehiculosService.createVehiculo).toHaveBeenCalledWith(
                expect.objectContaining({
                    owner_customer: 10,
                    license_plate: 'PBC-1234',
                    brand: 'FORD',
                    model: 'FC9JKSZ',
                    vehicle_type: 'jeep',
                    vehicle_use: 'tourism',
                    engine: 'J05ETC19049',
                    chassis: '9F3FC9JKSEXX11235',
                    year: 2024,
                    commercial_value: '27205.88',
                    color: 'BLANCO',
                    province: 'PICHINCHA',
                    city: 'QUITO',
                }),
            );
            expect(vehiculosService.createVehiculo).not.toHaveBeenCalledWith(
                expect.objectContaining({ is_active: expect.anything() }),
            );
            expect(vehiculosService.createVehiculo).not.toHaveBeenCalledWith(
                expect.objectContaining({ current_value: expect.anything() }),
            );
        });
    });

    it('envia update para edicion', async () => {
        renderComponent({
            editingVehiculo: {
                id: 1,
                owner_customer: 10,
                brand: 'FORD',
                model: 'FC9JKSZ',
                vehicle_type: 'jeep',
                vehicle_use: 'tourism',
                engine: 'J05ETC19049',
                chassis: '9F3FC9JKSEXX11235',
                license_plate: 'PBC-1234',
                year: 2024,
                commercial_value: '27205.88',
                color: 'BLANCO',
                province: 'PICHINCHA',
                city: 'QUITO',
                is_active: true,
            },
        });
        await waitFor(() => expect(screen.getByLabelText(/Placa/i)).toBeInTheDocument());

        const saveButton = screen.getByRole('button', { name: 'Guardar cambios' });
        expect(saveButton).toBeDisabled();

        fireEvent.change(screen.getByLabelText(/Marca/i), { target: { value: 'CHEVROLET' } });
        expect(saveButton).toBeEnabled();
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(vehiculosService.updateVehiculo).toHaveBeenCalledWith(
                1,
                expect.objectContaining({ license_plate: 'PBC-1234', brand: 'CHEVROLET' }),
            );
            expect(vehiculosService.updateVehiculo).not.toHaveBeenCalledWith(
                1,
                expect.objectContaining({ is_active: expect.anything() }),
            );
            expect(vehiculosService.updateVehiculo).not.toHaveBeenCalledWith(
                1,
                expect.objectContaining({ current_value: expect.anything() }),
            );
        });
    });

    it('cierra al hacer click en Cancelar', async () => {
        const onClose = vi.fn();
        renderComponent({ onClose });
        await waitFor(() => expect(screen.getByText('Cancelar')).toBeInTheDocument());
        fireEvent.click(screen.getByText('Cancelar'));
        expect(onClose).toHaveBeenCalled();
    });
});