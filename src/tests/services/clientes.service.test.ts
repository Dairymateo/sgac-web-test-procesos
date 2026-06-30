import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getClientes, getCliente, createCliente, updateCliente, deactivateCliente } from '../../services/clientes.service';

describe('Clientes Service', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  it('getClientes mapea respuesta backend', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [{ id: 1, first_names: 'Cliente', last_names: 'Uno' }] }) as any;
    const result = await getClientes();
    expect(result[0].id).toBe(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/customers/management/'), expect.any(Object));
  });

  it('maneja errores json', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => JSON.stringify({ email: ['Ya existe'] }) }) as any;
    await expect(getClientes()).rejects.toThrow(/email/i);
  });

  it('createCliente usa FormData', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: 100 }) }) as any;
    const result = await createCliente({ person_type: 'individual', document_type: 'CC', document_number: '1234567890', first_names: 'Juan', last_names: 'Perez', registration_date: '2026-05-31', customer_code: 'CLI-001' } as any);
    expect(result.id).toBe(100);
    const body = (globalThis.fetch as any).mock.calls[0][1].body;
    expect(body).toBeInstanceOf(FormData);
    expect(body.has('registration_date')).toBe(false);
    expect(body.has('customer_code')).toBe(false);
  });

  it('createCliente normaliza pasaporte a mayusculas en FormData', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: 100 }) }) as any;
    await createCliente({ person_type: 'individual', document_type: 'PAS', document_number: ' ab123456 ', first_names: 'Juan', last_names: 'Perez' } as any);

    const body = (globalThis.fetch as any).mock.calls[0][1].body as FormData;
    expect(body.get('document_number')).toBe('AB123456');
  });

  it('updateCliente usa PUT sin archivos', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 1 }) }) as any;
    await updateCliente(1, { person_type: 'legal_entity', document_type: 'RUC', document_number: '1710034065001', registration_date: '2026-05-31', customer_code: 'CLI-001', ruc: '1710034065001' } as any);
    const call = (globalThis.fetch as any).mock.calls[0];
    expect(call[1].method).toBe('PUT');
    expect(call[0]).toContain('/customers/management/1/update/');
    const body = JSON.parse(call[1].body);
    expect(body).not.toHaveProperty('registration_date');
    expect(body).not.toHaveProperty('customer_code');
    expect(body).not.toHaveProperty('ruc');
  });

  it('deactivateCliente usa /deactivate/ con PATCH', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 1, is_active: false }) }) as any;
    await deactivateCliente(1);
    expect((globalThis.fetch as any).mock.calls[0][0]).toContain('/customers/management/1/deactivate/');
    expect((globalThis.fetch as any).mock.calls[0][1].method).toBe('PATCH');
  });

  it('getCliente usa detalle por id', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 9, first_names: 'A' }) }) as any;
    const result = await getCliente(9);
    expect(result.id).toBe(9);
  });
});
