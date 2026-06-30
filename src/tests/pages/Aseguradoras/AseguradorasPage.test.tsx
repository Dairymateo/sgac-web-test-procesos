/// <summary>
/// Componente AseguradorasPage.test.tsx
/// </summary>
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext';
import AseguradorasPage from '../../../pages/Aseguradoras/AseguradorasPage';

vi.mock('../../../services/aseguradoras.service', () => ({
    getAseguradorasPage: vi.fn(),
    activateAseguradora: vi.fn(),
    deactivateAseguradora: vi.fn(),
}));

import { getAseguradorasPage } from '../../../services/aseguradoras.service';

const pageOf = (results: any[]) => ({ count: results.length, next: null, previous: null, results });

function renderPage(role = 'admin') {
    const payload = btoa(JSON.stringify({ username: 'test', role: role }));
    localStorage.setItem('token', `h.${payload}.s`);
    globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false, json: async () => ({})
    }) as typeof fetch;

    return render(
        <AuthProvider>
            <MemoryRouter>
                <AseguradorasPage />
            </MemoryRouter>
        </AuthProvider>
    );
}

describe('AseguradorasPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('muestra mensaje de carga inicial', async () => {
        (getAseguradorasPage as ReturnType<typeof vi.fn>).mockImplementation(
            () => new Promise(() => { })
        );
        renderPage();
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        expect(screen.getByText('Cargando aseguradoras...')).toBeInTheDocument();
    });

    it('renderiza título de la página', async () => {
        (getAseguradorasPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf([]));
        renderPage();
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        await waitFor(() => {
            expect(screen.getByText('Gestión de aseguradoras')).toBeInTheDocument();
        });
    });

    it('muestra botón "Nueva aseguradora" para administrador', async () => {
        (getAseguradorasPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf([]));
        renderPage('admin');
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /^nueva$/i })).toBeInTheDocument();
        });
    });

    it('muestra mensaje cuando no hay aseguradoras', async () => {
        (getAseguradorasPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf([]));
        renderPage();
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        await waitFor(() => {
            expect(screen.getByText('No hay aseguradoras registradas.')).toBeInTheDocument();
        });
    });

    it('renderiza tabla con datos de aseguradoras', async () => {
        const mockData = [{
            id: 1,
            insurer_code: 'INS-001',
            name: 'Seguros ABC',
            document_number: '1234567890',
            city: 'Quito',
            phone: '0991234567',
            is_active: true,
            workshops_summary: [{ id: 1, name: 'Taller Central', is_active: true }]
        }];
        (getAseguradorasPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf(mockData));
        renderPage();
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        await waitFor(() => {
            expect(screen.getByText('Seguros ABC')).toBeInTheDocument();
            expect(screen.getByText('INS-001')).toBeInTheDocument();
            expect(screen.getByText('Taller Central')).toBeInTheDocument();
            expect(screen.getByText('Activo')).toBeInTheDocument();
        });
    });

    it('muestra botones Ver, Editar, Desactivar para admin', async () => {
        const mockData = [{
            id: 1, insurer_code: 'INS-001', name: 'Seguros ABC',
            document_number: '123', city: 'Quito', phone: '099',
            is_active: true, workshops_summary: []
        }];
        (getAseguradorasPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf(mockData));
        renderPage('admin');
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        await waitFor(() => {
            expect(screen.getByText('Ver')).toBeInTheDocument();
            expect(screen.getByText('Editar')).toBeInTheDocument();
            expect(screen.getByText('Desactivar')).toBeInTheDocument();
        });
    });

    it('maneja error al cargar aseguradoras', async () => {
        (getAseguradorasPage as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
        renderPage();
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        await waitFor(() => {
            expect(screen.getByText(/Error al cargar datos/)).toBeInTheDocument();
        });
    });

    it('muestra "—" cuando city o phone son vacíos', async () => {
        const mockData = [{
            id: 1, insurer_code: 'INS-002', name: 'Seguros XYZ',
            document_number: '999', city: '', phone: '',
            active: false, workshops_summary: []
        }];
        (getAseguradorasPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf(mockData));
        renderPage();
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        await waitFor(() => {
            expect(screen.getByText('Inactivo')).toBeInTheDocument();
            const dashes = screen.getAllByText('—');
            expect(dashes.length).toBeGreaterThanOrEqual(2);
        });
    });

    it('abre modal al hacer clic en "Ver"', async () => {
        const mockData = [{
            id: 1, insurer_code: 'INS-001', name: 'Seguros ABC',
            document_number: '123', city: 'Quito', phone: '099',
            active: true, workshops_summary: []
        }];
        (getAseguradorasPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf(mockData));
        renderPage();
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        await waitFor(() => expect(screen.getByText('Ver')).toBeInTheDocument());
        fireEvent.click(screen.getByText('Ver'));
        await waitFor(() => {
            expect(screen.getByText('Detalles de Aseguradora')).toBeInTheDocument();
        });
    });

    it('cierra el error al hacer clic en botón cerrar', async () => {
        (getAseguradorasPage as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Fail'));
        renderPage();
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
        fireEvent.click(screen.getByLabelText('Cerrar'));
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('abre modal al hacer clic en "Editar"', async () => {
        const mockData = [{
            id: 1, insurer_code: 'INS-001', name: 'Seguros ABC',
            document_number: '123', city: 'Quito', phone: '099',
            active: true, workshops_summary: []
        }];
        (getAseguradorasPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf(mockData));
        renderPage('admin');
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        await waitFor(() => expect(screen.getByText('Editar')).toBeInTheDocument());
        fireEvent.click(screen.getByText('Editar'));
        await waitFor(() => {
            expect(screen.getByText('Editar Aseguradora')).toBeInTheDocument();
        });
    });

    it('abre modal al hacer clic en "Nueva aseguradora"', async () => {
        (getAseguradorasPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf([]));
        renderPage('admin');
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        await waitFor(() => expect(screen.getByRole('button', { name: /^nueva$/i })).toBeInTheDocument());
        fireEvent.click(screen.getByRole('button', { name: /^nueva$/i }));
        await waitFor(() => {
            expect(screen.getByText('Registrar Aseguradora')).toBeInTheDocument();
        });
    });

    it('permite aplicar filtros', async () => {
        (getAseguradorasPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf([]));
        renderPage();
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());

        const searchInput = screen.getByPlaceholderText(/Buscar por/i);
        fireEvent.change(searchInput, { target: { value: 'Mapfre' } });

        const submitBtn = screen.getByRole('button', { name: /Buscar/i });
        fireEvent.click(submitBtn);

        expect(getAseguradorasPage).toHaveBeenCalled();
    });
});