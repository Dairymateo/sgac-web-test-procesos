/// <summary>
/// Componente ClientesPage.test.tsx
/// </summary>
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/AuthContext';
import ClientesPage from '../../../pages/Clientes/ClientesPage';

vi.mock('../../../services/clientes.service', () => ({
  getClientesPage: vi.fn(),
  deactivateCliente: vi.fn(),
  activateCliente: vi.fn(),
}));

import { getClientesPage, deactivateCliente, activateCliente } from '../../../services/clientes.service';

const pageOf = (results: any[]) => ({ count: results.length, next: null, previous: null, results });

function renderPage(role = 'admin') {
  const payload = btoa(JSON.stringify({ username: 'test', role }));
  localStorage.setItem('token', `h.${payload}.s`);
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ id: 1, username: 'test', email: 'test@test.com', role }),
  }) as any;

  return render(
    <AuthProvider>
      <MemoryRouter>
        <ClientesPage />
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('ClientesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('muestra estado de carga inicial', async () => {
    (getClientesPage as any).mockImplementation(() => new Promise(() => { }));
    renderPage();
    await waitFor(() => expect(screen.queryByText(/cargando sesi.n/i)).not.toBeInTheDocument());
    expect(screen.getByText(/cargando clientes/i)).toBeInTheDocument();
  });

  it('renderiza titulo y estado vacio', async () => {
    (getClientesPage as any).mockResolvedValue(pageOf([]));
    renderPage();

    await waitFor(() => expect(screen.getByText(/gesti.n de clientes/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText(/cargando clientes/i)).not.toBeInTheDocument());
    expect(screen.getByText(/no hay clientes registrados/i)).toBeInTheDocument();
  });

  it('renderiza clientes en la tabla', async () => {
    (getClientesPage as any).mockResolvedValue(pageOf([
      {
        id: 1,
        registration_date: '2026-05-26',
        person_type: 'individual',
        first_names: 'Juan',
        last_names: 'Perez',
        document_type: 'CC',
        document_number: '1234567890',
        birth_date: '',
        sex: 'male',
        marital_status: 'single',
        occupation: 'private',
        birth_country: '',
        birth_province: '',
        birth_city: '',
        residence_country: '',
        residence_province: '',
        residence_city: '',
        address: '',
        phone_1: '0999999999',
        email: 'juan@test.com',
      },
    ]));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Juan Perez')).toBeInTheDocument();
      expect(screen.getByText('1234567890')).toBeInTheDocument();
      expect(screen.getByText('0999999999')).toBeInTheDocument();
    });
  });

  it('abre modal nuevo cliente', async () => {
    (getClientesPage as any).mockResolvedValue(pageOf([]));
    renderPage('admin');

    const btn = await screen.findByRole('button', { name: /^nuevo$/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 2, name: /nuevo cliente/i })).toBeInTheDocument()
    );
  });

  it('permite desactivar cliente cuando tiene permisos de mutacion', async () => {
    (getClientesPage as any).mockResolvedValue(pageOf([
      {
        id: 1,
        registration_date: '2026-05-26',
        person_type: 'individual',
        first_names: 'A',
        last_names: 'B',
        document_type: 'CC',
        document_number: '1234567890',
        birth_date: '',
        sex: 'male',
        marital_status: 'single',
        occupation: 'private',
        birth_country: '',
        birth_province: '',
        birth_city: '',
        residence_country: '',
        residence_province: '',
        residence_city: '',
        address: '',
        phone_1: '0999999999',
        email: 'a@b.com',
      },
    ]));

    (deactivateCliente as any).mockResolvedValue({ id: 1, is_active: false });
    renderPage('sales_representative');
    await waitFor(() => expect(screen.getByText(/desactivar/i)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/desactivar/i));
    const dialog = screen.getByRole('dialog', { name: /desactivar cliente/i });
    fireEvent.click(within(dialog).getByRole('button', { name: /desactivar/i }));
    await waitFor(() => expect(deactivateCliente).toHaveBeenCalledWith(1));
  });

  it('muestra mensaje amigable cuando backend responde 409 al desactivar', async () => {
    (getClientesPage as any).mockResolvedValue(pageOf([
      {
        id: 1,
        registration_date: '2026-05-26',
        person_type: 'individual',
        first_names: 'A',
        last_names: 'B',
        document_type: 'CC',
        document_number: '1234567890',
        birth_date: '',
        sex: 'male',
        marital_status: 'single',
        occupation: 'private',
        birth_country: '',
        birth_province: '',
        birth_city: '',
        residence_country: '',
        residence_province: '',
        residence_city: '',
        address: '',
        phone_1: '0999999999',
        email: 'a@b.com',
      },
    ]));
    (deactivateCliente as any).mockRejectedValue({
      status: 409,
      code: 'conflict',
      message: 'Customer cannot be deleted because it has related records.',
    });

    renderPage('sales_representative');
    await waitFor(() => expect(screen.getByText(/desactivar/i)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/desactivar/i));
    const dialog = screen.getByRole('dialog', { name: /desactivar cliente/i });
    fireEvent.click(within(dialog).getByRole('button', { name: /desactivar/i }));

    await waitFor(() => {
      expect(screen.getByText(/No se puede desactivar este cliente porque tiene vehiculos, cotizaciones o siniestros relacionados/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Customer cannot be deleted/i)).not.toBeInTheDocument();
  });

  it('permite activar cliente inactivo', async () => {
    (getClientesPage as any).mockResolvedValue(pageOf([
      {
        id: 1,
        registration_date: '2026-05-26',
        person_type: 'individual',
        first_names: 'A',
        last_names: 'B',
        document_type: 'CC',
        document_number: '1234567890',
        birth_date: '',
        sex: 'male',
        marital_status: 'single',
        occupation: 'private',
        birth_country: '',
        birth_province: '',
        birth_city: '',
        residence_country: '',
        residence_province: '',
        residence_city: '',
        address: '',
        phone_1: '0999999999',
        email: 'a@b.com',
        is_active: false,
      },
    ]));
    (activateCliente as any).mockResolvedValue({ id: 1, is_active: true });

    renderPage('sales_representative');
    await waitFor(() => expect(screen.getByText('A B')).toBeInTheDocument());
    expect(screen.getByText(/^Inactivo$/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^activar$/i }));
    const dialog = screen.getByRole('dialog', { name: /activar cliente/i });
    fireEvent.click(within(dialog).getByRole('button', { name: /^activar$/i }));

    await waitFor(() => expect(activateCliente).toHaveBeenCalledWith(1));
    expect(deactivateCliente).not.toHaveBeenCalled();
  });

  it('abre modal al hacer clic en "Ver"', async () => {
    (getClientesPage as any).mockResolvedValue(pageOf([{
      id: 1, person_type: 'individual', first_names: 'Juan', last_names: 'Perez', document_number: '123'
    }]));
    renderPage();
    await waitFor(() => expect(screen.getByText('Ver')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Ver'));
    await waitFor(() => expect(screen.getByText('Detalles del Cliente')).toBeInTheDocument());
  });

  it('abre modal al hacer clic en "Editar"', async () => {
    (getClientesPage as any).mockResolvedValue(pageOf([{
      id: 1, person_type: 'individual', first_names: 'Juan', last_names: 'Perez', document_number: '123'
    }]));
    renderPage('admin');
    await waitFor(() => expect(screen.getByText('Editar')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Editar'));
    await waitFor(() => expect(screen.getByText('Editar Cliente')).toBeInTheDocument());
  });

  it('permite aplicar filtros', async () => {
    (getClientesPage as any).mockResolvedValue(pageOf([]));
    renderPage();
    await waitFor(() => expect(screen.queryByText(/cargando clientes/i)).not.toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText(/Buscar por/i);
    fireEvent.change(searchInput, { target: { value: 'Juan' } });

    const submitBtn = screen.getByRole('button', { name: /Buscar/i });
    fireEvent.click(submitBtn);

    expect(getClientesPage).toHaveBeenCalled();
  });

  it('permite limpiar filtros y cambiar ordenamiento', async () => {
      (getClientesPage as any).mockResolvedValue(pageOf([]));
      renderPage();
      await waitFor(() => expect(screen.queryByText(/cargando sesi.n/i)).not.toBeInTheDocument());
      await waitFor(() => expect(screen.queryByText(/cargando clientes/i)).not.toBeInTheDocument());

      const searchInput = screen.getByPlaceholderText(/Buscar por/i);
      fireEvent.change(searchInput, { target: { value: 'Juan' } });

      const clearBtn = screen.getByRole('button', { name: /Limpiar/i });
      fireEvent.click(clearBtn);

      expect(searchInput).toHaveValue('');
      
      const orderingSelect = document.querySelector('select[id$="ordering"]') || screen.getByLabelText(/Ordenar por/i, { exact: false }) as HTMLSelectElement;
      if (orderingSelect) {
          fireEvent.change(orderingSelect, { target: { value: 'document_number' } });
          expect((orderingSelect as HTMLSelectElement).value).toBe('document_number');
      }
  });

  it('maneja error genérico al cambiar estado', async () => {
      (getClientesPage as any).mockResolvedValue(pageOf([{
          id: 1, person_type: 'individual', first_names: 'Juan', last_names: 'Perez', document_number: '123'
      }]));
      (deactivateCliente as any).mockRejectedValue({ message: 'Error de servidor' });

      renderPage('sales_representative');
      await waitFor(() => expect(screen.getByText('Desactivar')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Desactivar'));
      const dialog = screen.getByRole('dialog', { name: /desactivar cliente/i });
      fireEvent.click(within(dialog).getByRole('button', { name: /desactivar/i }));
      
      await waitFor(() => expect(screen.getByText(/Error de servidor/i)).toBeInTheDocument());
      
      const closeErrorBtn = document.querySelector('.login-error button') || document.querySelector('.btn-close-error') as HTMLButtonElement;
      if(closeErrorBtn) fireEvent.click(closeErrorBtn);
      await waitFor(() => expect(screen.queryByText(/Error de servidor/i)).not.toBeInTheDocument());
  });
});