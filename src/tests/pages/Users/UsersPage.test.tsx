/// <summary>
/// Componente UsersPage.test.tsx
/// </summary>
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext';
import UsersPage from '../../../pages/Users/UsersPage';

vi.mock('../../../services/users.service', () => ({
  getUsersPage: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  activateUser: vi.fn(),
  deactivateUser: vi.fn(),
}));

import { getUsersPage, deactivateUser } from '../../../services/users.service';

const pageOf = (results: any[]) => ({ count: results.length, next: null, previous: null, results });

function renderPage(role: string = 'admin', extra: Record<string, unknown> = {}) {
  const payload = btoa(JSON.stringify({ username: 'tester', email: 't@x.com', role, ...extra }));
  localStorage.setItem('token', `h.${payload}.s`);
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 1, username: 'tester', email: 't@x.com', role, ...extra }) }) as any;

  return render(
    <AuthProvider>
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('muestra listado vacio', async () => {
    (getUsersPage as any).mockResolvedValue(pageOf([]));
    renderPage('admin');

    await waitFor(() => expect(screen.getByText(/gesti.n de usuarios/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText(/cargando usuarios/i)).not.toBeInTheDocument());
    expect(screen.getByText(/no hay usuarios registrados/i)).toBeInTheDocument();
  });

  it('renderiza usuarios y rol traducido', async () => {
    (getUsersPage as any).mockResolvedValue(pageOf([
      {
        id: 1,
        username: 'admin1',
        first_name: 'Diego',
        last_name: 'Correa',
        email: 'dc@test.com',
        role: 'admin',
        is_active: true,
        date_joined: '2026-05-26T00:00:00Z',
        created_at: '2026-05-26T00:00:00Z',
        updated_at: '2026-05-26T00:00:00Z',
      },
    ]));

    renderPage('admin');

    await waitFor(() => expect(screen.getByText('admin1')).toBeInTheDocument());
    expect(screen.getByText('Diego Correa')).toBeInTheDocument();
    expect(screen.getAllByText('Administrador').length).toBeGreaterThan(0);
  });

  it('permite activar y desactivar usuario con confirmacion', async () => {
    (getUsersPage as any).mockResolvedValue(pageOf([
      { id: 7, username: 'u7', email: 'u7@test.com', role: 'quote_technician', is_active: true, date_joined: '', created_at: '', updated_at: '' },
    ]));
    (deactivateUser as any).mockResolvedValue({ id: 7, username: 'u7', email: 'u7@test.com', role: 'quote_technician', is_active: false, date_joined: '', created_at: '', updated_at: '' });

    renderPage('admin');
    await waitFor(() => expect(screen.getByText(/desactivar/i)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/desactivar/i));

    const dialog = screen.getByRole('dialog', { name: /desactivar usuario/i });
    fireEvent.click(within(dialog).getByRole('button', { name: /desactivar/i }));

    await waitFor(() => expect(deactivateUser).toHaveBeenCalledWith(7));
  });

  it('bloquea acceso si el rol no es admin aunque is_staff sea true', async () => {
    (getUsersPage as any).mockResolvedValue(pageOf([]));
    renderPage('quote_technician', { is_staff: true });

    await waitFor(() => expect(screen.queryByText(/gesti.n de usuarios/i)).not.toBeInTheDocument());
    expect(getUsersPage).not.toHaveBeenCalled();
  });

  it('abre modal al hacer clic en "Nuevo usuario"', async () => {
    (getUsersPage as any).mockResolvedValue(pageOf([]));
    renderPage('admin');
    await waitFor(() => expect(screen.queryByText(/cargando usuarios/i)).not.toBeInTheDocument());

    const btn = screen.getByRole('button', { name: /^Nuevo$/i });
    fireEvent.click(btn);

    await waitFor(() => expect(screen.getByText('Nuevo usuario')).toBeInTheDocument());
  });

  it('abre modal al hacer clic en "Editar"', async () => {
    (getUsersPage as any).mockResolvedValue(pageOf([
      { id: 1, username: 'admin1', email: 'dc@test.com', role: 'admin', is_active: true }
    ]));
    renderPage('admin');
    await waitFor(() => expect(screen.queryByText(/cargando usuarios/i)).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Editar')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Editar'));
    await waitFor(() => expect(screen.getByText('Editar usuario')).toBeInTheDocument());
  });

  it('permite aplicar filtros', async () => {
    (getUsersPage as any).mockResolvedValue(pageOf([]));
    renderPage('admin');
    await waitFor(() => expect(screen.queryByText(/cargando usuarios/i)).not.toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText(/Buscar por/i);
    fireEvent.change(searchInput, { target: { value: 'admin' } });

    const submitBtn = screen.getByRole('button', { name: /Buscar/i });
    fireEvent.click(submitBtn);

    expect(getUsersPage).toHaveBeenCalled();
  });

  it('permite limpiar filtros y cambiar ordenamiento', async () => {
      (getUsersPage as any).mockResolvedValue(pageOf([]));
      renderPage('admin');
      await waitFor(() => expect(screen.queryByText(/cargando usuarios/i)).not.toBeInTheDocument());

      const searchInput = screen.getByPlaceholderText(/Buscar por/i);
      fireEvent.change(searchInput, { target: { value: 'admin' } });

      const clearBtn = screen.getByRole('button', { name: /Limpiar/i });
      fireEvent.click(clearBtn);

      expect(searchInput).toHaveValue('');
      
      const orderingSelect = document.querySelector('select[id$="ordering"]') || screen.getByLabelText(/Ordenar por/i, { exact: false }) as HTMLSelectElement;
      if (orderingSelect) {
          fireEvent.change(orderingSelect, { target: { value: 'username' } });
          expect((orderingSelect as HTMLSelectElement).value).toBe('username');
      }
  });

  it('maneja error al cambiar estado', async () => {
      (getUsersPage as any).mockResolvedValue(pageOf([
          { id: 7, username: 'u7', email: 'u7@test.com', role: 'quote_technician', is_active: true }
      ]));
      (deactivateUser as any).mockRejectedValue({ message: 'Error de servidor' });

      renderPage('admin');
      await waitFor(() => expect(screen.getByText(/desactivar/i)).toBeInTheDocument());

      fireEvent.click(screen.getByText(/desactivar/i));

      const dialog = screen.getByRole('dialog', { name: /desactivar usuario/i });
      fireEvent.click(within(dialog).getByRole('button', { name: /desactivar/i }));
      
      await waitFor(() => expect(screen.getByText(/Error de servidor/i)).toBeInTheDocument());
      
      const closeErrorBtn = document.querySelector('.login-error button') as HTMLButtonElement;
      fireEvent.click(closeErrorBtn);
      await waitFor(() => expect(screen.queryByText(/Error de servidor/i)).not.toBeInTheDocument());
  });
});