/// <summary>
/// Componente VehiculosPage.test.tsx
/// </summary>
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext';
import VehiculosPage from '../../../pages/Vehiculos/VehiculosPage';

vi.mock('../../../services/vehiculos.service', () => ({
    getVehiculosPage: vi.fn(),
    activateVehiculo: vi.fn(),
    deactivateVehiculo: vi.fn(),
}));
vi.mock('../../../services/clientes.service', () => ({
    getClientes: vi.fn(),
}));

import { getVehiculosPage, deactivateVehiculo } from '../../../services/vehiculos.service';
import { getClientes } from '../../../services/clientes.service';

const pageOf = (results: any[]) => ({ count: results.length, next: null, previous: null, results });

function renderPage(role = 'admin') {
    const payload = btoa(JSON.stringify({ username: 'test', role }));
    localStorage.setItem('token', `h.${payload}.s`);
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as typeof fetch;

    (getClientes as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 10, first_names: 'Carlos', last_names: 'Gomez', document_number: '0102030405' },
    ]);

    return render(
        <AuthProvider>
            <MemoryRouter>
                <VehiculosPage />
            </MemoryRouter>
        </AuthProvider>
    );
}

describe('VehiculosPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('muestra estado de carga inicial', async () => {
        (getVehiculosPage as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => { }));
        renderPage();
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        expect(screen.getByText(/Cargando veh.culos/i)).toBeInTheDocument();
    });

    it('renderiza titulo y no muestra datos si esta vacio', async () => {
        (getVehiculosPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf([]));
        renderPage();
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        expect(screen.getByText(/Gesti.n de veh.culos/i)).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByText(/No hay veh.culos registrados/i)).toBeInTheDocument();
        });
    });

    it('renderiza vehiculos en la tabla', async () => {
        const mockData = [{
            id: 1,
            owner_customer: 10,
            brand: 'Toyota',
            model: 'Corolla',
            vehicle_type: 'sedan',
            vehicle_use: 'personal',
            engine: 'ENG12345',
            chassis: 'CHASSIS12345',
            license_plate: 'AAA-1234',
            year: 2020,
            color: 'BLANCO',
            province: 'PICHINCHA',
            city: 'QUITO',
            is_active: true,
        }];
        (getVehiculosPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf(mockData));
        renderPage();
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        await waitFor(() => {
            expect(screen.getByText('AAA-1234')).toBeInTheDocument();
            expect(screen.getByText('Toyota')).toBeInTheDocument();
            expect(screen.getByText('Corolla')).toBeInTheDocument();
            expect(screen.getByText('Carlos Gomez')).toBeInTheDocument();
        });
    });

    it('muestra boton Nuevo y permite abrir el modal', async () => {
        (getVehiculosPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf([]));
        renderPage('admin');
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());

        const btn = screen.getByRole('button', { name: /^nuevo$/i });
        expect(btn).toBeInTheDocument();

        fireEvent.click(btn);
        await waitFor(() => {
            expect(screen.getAllByText('Registrar Vehiculo').length).toBeGreaterThan(0);
        });
    });

    it('permite desactivar un vehiculo', async () => {
        const mockData = [{
            id: 1,
            owner_customer: 10,
            brand: 'Toyota',
            model: 'Corolla',
            vehicle_type: 'sedan',
            vehicle_use: 'personal',
            engine: 'ENG12345',
            chassis: 'CHASSIS12345',
            license_plate: 'AAA-1234',
            year: 2020,
            color: 'BLANCO',
            province: 'PICHINCHA',
            city: 'QUITO',
            is_active: true,
        }];
        (getVehiculosPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf(mockData));
        renderPage('admin');
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());

        await waitFor(() => expect(screen.getByText('Desactivar')).toBeInTheDocument());

        (deactivateVehiculo as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, is_active: false });

        fireEvent.click(screen.getByText('Desactivar'));
        const dialog = screen.getByRole('dialog', { name: /desactivar vehículo/i });
        fireEvent.click(within(dialog).getByRole('button', { name: /desactivar/i }));
        await waitFor(() => {
            expect(deactivateVehiculo).toHaveBeenCalledWith(1);
        });
    });

    it('abre modal al hacer clic en "Ver"', async () => {
        const mockData = [{ id: 1, brand: 'Toyota', model: 'Corolla', is_active: true }];
        (getVehiculosPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf(mockData));
        renderPage();
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        await waitFor(() => expect(screen.getByText('Ver')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Ver'));
        await waitFor(() => expect(screen.getByText('Detalles del Vehiculo')).toBeInTheDocument());
    });

    it('abre modal al hacer clic en "Editar"', async () => {
        const mockData = [{ id: 1, brand: 'Toyota', model: 'Corolla', is_active: true }];
        (getVehiculosPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf(mockData));
        renderPage('admin');
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        await waitFor(() => expect(screen.getByText('Editar')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Editar'));
        await waitFor(() => expect(screen.getByText('Editar Vehiculo')).toBeInTheDocument());
    });

    it('permite aplicar filtros', async () => {
        (getVehiculosPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf([]));
        renderPage();
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());

        const searchInput = screen.getByPlaceholderText(/Buscar por/i);
        fireEvent.change(searchInput, { target: { value: 'Toyota' } });

        const submitBtn = screen.getByRole('button', { name: /Buscar/i });
        fireEvent.click(submitBtn);

        expect(getVehiculosPage).toHaveBeenCalled();
    });

    it('permite limpiar filtros y cambiar ordenamiento', async () => {
        (getVehiculosPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf([]));
        renderPage();
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());

        const searchInput = screen.getByPlaceholderText(/Buscar por/i);
        fireEvent.change(searchInput, { target: { value: 'Toyota' } });

        const clearBtn = screen.getByRole('button', { name: /Limpiar/i });
        fireEvent.click(clearBtn);

        expect(searchInput).toHaveValue('');
        
        const orderingSelect = document.querySelector('select[id$="ordering"]') || screen.getByLabelText(/Ordenar por/i, { exact: false }) as HTMLSelectElement;
        if (orderingSelect) {
            fireEvent.change(orderingSelect, { target: { value: 'license_plate' } });
            expect((orderingSelect as HTMLSelectElement).value).toBe('license_plate');
        }
    });

    it('maneja error al cambiar estado', async () => {
        const mockData = [{
            id: 1, owner_customer: 10, brand: 'Toyota', model: 'Corolla', is_active: true, license_plate: '123'
        }];
        (getVehiculosPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf(mockData));
        (deactivateVehiculo as ReturnType<typeof vi.fn>).mockRejectedValue({ message: 'Error de servidor' });

        renderPage('admin');
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        await waitFor(() => expect(screen.getByText('Desactivar')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Desactivar'));
        const dialog = screen.getByRole('dialog', { name: /desactivar/i });
        fireEvent.click(within(dialog).getByRole('button', { name: /desactivar/i }));
        
        await waitFor(() => expect(screen.getByText(/Error de servidor/i)).toBeInTheDocument());
        
        const closeErrorBtn = document.querySelector('.btn-close-error') as HTMLButtonElement;
        fireEvent.click(closeErrorBtn);
        await waitFor(() => expect(screen.queryByText(/Error de servidor/i)).not.toBeInTheDocument());
    });
});