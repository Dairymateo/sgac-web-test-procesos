import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCliente, partialUpdateCliente, updateCliente } from '../../services/clientes.service';

describe('clientes.service extended', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('partialUpdate envia payload con campos backend', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 1, first_names: 'Ana' }) }) as any;

    await partialUpdateCliente(1, { first_names: 'Ana', document_type: 'CC', document_number: '1234567890', registration_date: '2026-05-31' } as any);

    const [, config] = (globalThis.fetch as any).mock.calls[0];
    const body = JSON.parse(config.body);
    expect(config.method).toBe('PATCH');
    expect(body.first_names).toBe('ANA');
    expect(body.document_type).toBe('CC');
    expect(body).not.toHaveProperty('registration_date');
  });

  it('update usa PATCH multipart cuando hay archivos', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 1 }) }) as any;

    await updateCliente(
      1,
      { first_names: 'Ana', person_type: 'legal_entity', document_type: 'RUC', document_number: '1710034065001', registration_date: '2026-05-31', ruc: '1710034065001' } as any,
      { doc_cedula_asegurado: new File(['x'], 'id.pdf') }
    );

    const [, config] = (globalThis.fetch as any).mock.calls[0];
    expect(config.method).toBe('PATCH');
    expect(config.body).toBeInstanceOf(FormData);
    expect((config.body as FormData).has('registration_date')).toBe(false);
    expect((config.body as FormData).has('ruc')).toBe(false);
  });

  it('create hace remap doc_* a campos backend en FormData', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: 10 }) }) as any;

    await createCliente(
      { first_names: 'Luis', person_type: 'individual', document_type: 'CC', document_number: '1234567890', registration_date: '2026-05-31' } as any,
      { doc_planilla_servicio_basico: new File(['x'], 'bill.pdf') }
    );

    const [, config] = (globalThis.fetch as any).mock.calls[0];
    const body = config.body as FormData;
    expect(body.has('basic_service_bill_document')).toBe(true);
    expect(body.has('doc_planilla_servicio_basico')).toBe(false);
    expect(body.has('registration_date')).toBe(false);
  });
});
