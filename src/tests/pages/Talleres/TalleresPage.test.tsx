/// <summary>
/// Componente TalleresPage.test.tsx
/// </summary>
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext';
import TalleresPage from '../../../pages/Talleres/TalleresPage';

vi.mock('../../../services/talleres.service', () => ({
    getTalleresPage: vi.fn(),
    activateTaller: vi.fn(),
    deactivateTaller: vi.fn(),
}));

import { getTalleresPage, deactivateTaller } from '../../../services/talleres.service';

const pageOf = (results: any[]) => ({ count: results.length, next: null, previous: null, results });

function renderPage(role = 'admin') {
    const payload = btoa(JSON.stringify({ username: 'test', role: role }));
    localStorage.setItem('token', `h.${payload}.s`);
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as typeof fetch;

    return render(
        <AuthProvider>
            <MemoryRouter>
                <TalleresPage />
            </MemoryRouter>
        </AuthProvider>
    );
}

describe('TalleresPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('muestra estado de carga inicial', async () => {
        (getTalleresPage as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => { }));
        renderPage();
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        expect(screen.getByText('Cargando talleres...')).toBeInTheDocument();
    });

    it('renderiza título y no muestra datos si está vacío', async () => {
        (getTalleresPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf([]));
        renderPage();
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        expect(screen.getByText('Gestión de talleres')).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByText('No hay talleres registrados.')).toBeInTheDocument();
        });
    });

    it('renderiza talleres en la tabla', async () => {
        const mockData = [{
            id: 1,
            name: 'Taller Central',
            ruc: '1234567890001',
            phone: '0991234567',
            is_active: true
        }];
        (getTalleresPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf(mockData));
        renderPage();
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        await waitFor(() => {
            expect(screen.getByText('1')).toBeInTheDocument();
            expect(screen.getByText('Taller Central')).toBeInTheDocument();
            expect(screen.getByText('1234567890001')).toBeInTheDocument();
            expect(screen.getByText('0991234567')).toBeInTheDocument();
            expect(screen.getByText('Activo')).toBeInTheDocument();
        });
    });

    it('muestra botón Nuevo y permite abrir el modal', async () => {
        (getTalleresPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf([]));
        renderPage('admin');
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());

        const btn = screen.getByRole('button', { name: /^nuevo$/i });
        expect(btn).toBeInTheDocument();

        fireEvent.click(btn);
        await waitFor(() => {
            expect(screen.getAllByText('Registrar Taller').length).toBeGreaterThan(0);
        });
    });

    it('permite desactivar un taller', async () => {
        const mockData = [{
            id: 1, name: 'Taller', is_active: true, insurer_ids: [], insurers_summary: []
        }];
        (getTalleresPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf(mockData));
        renderPage('admin');
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());

        await waitFor(() => expect(screen.getByText('Desactivar')).toBeInTheDocument());

        (deactivateTaller as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, is_active: false });

        fireEvent.click(screen.getByText('Desactivar'));
        const dialog = screen.getByRole('dialog', { name: /desactivar taller/i });
        fireEvent.click(within(dialog).getByRole('button', { name: /desactivar/i }));
        await waitFor(() => {
            expect(deactivateTaller).toHaveBeenCalledWith(1);
        });
    });

    it('abre modal al hacer clic en "Ver"', async () => {
        const mockData = [{ id: 1, name: 'Taller', is_active: true }];
        (getTalleresPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf(mockData));
        renderPage();
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        await waitFor(() => expect(screen.getByText('Ver')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Ver'));
        await waitFor(() => expect(screen.getByText('Detalles del Taller')).toBeInTheDocument());
    });

    it('abre modal al hacer clic en "Editar"', async () => {
        const mockData = [{ id: 1, name: 'Taller', is_active: true }];
        (getTalleresPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf(mockData));
        renderPage('admin');
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());
        await waitFor(() => expect(screen.getByText('Editar')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Editar'));
        await waitFor(() => expect(screen.getByText('Editar Taller')).toBeInTheDocument());
    });

    it('permite aplicar filtros', async () => {
        (getTalleresPage as ReturnType<typeof vi.fn>).mockResolvedValue(pageOf([]));
        renderPage();
        await waitFor(() => expect(screen.queryByText('Cargando sesión...')).not.toBeInTheDocument());

        const searchInput = screen.getByPlaceholderText(/Buscar por/i);
        fireEvent.change(searchInput, { target: { value: 'Central' } });

        const submitBtn = screen.getByRole('button', { name: /Buscar/i });
        fireEvent.click(submitBtn);

        expect(getTalleresPage).toHaveBeenCalled();
    });
});