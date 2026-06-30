import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAseguradoras,
  createAseguradora,
  updateAseguradora,
  partialUpdateAseguradora,
  deactivateAseguradora,
} from '../../services/aseguradoras.service';

describe('aseguradoras.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('usa endpoints management actuales', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] }) as any;
    await getAseguradoras();
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/insurers/management/'), expect.any(Object));
  });

  it('create envia POST con Authorization', async () => {
    localStorage.setItem('token', 'tok');
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: 1 }) }) as any;

    await createAseguradora({
      registration_date: '2026-05-26',
      name: 'Aseg 1',
      document_type: 'RUC',
      document_number: '1234567890123',
      country: '', province: '', city: '', address: '', phone: '',
      account_executive_name: '', account_executive_phone: '', account_executive_email: '',
      claims_executive_name: '', claims_executive_phone: '', claims_executive_email: '',
      portfolio_executive_name: '', portfolio_executive_phone: '', portfolio_executive_email: '',
      is_active: true,
      workshop_ids: [],
    });

    const [, config] = (globalThis.fetch as any).mock.calls[0];
    expect(config.method).toBe('POST');
    expect(config.headers.Authorization).toBe('Bearer tok');
  });

  it('update y partial-update usan rutas correctas', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 2 }) }) as any;

    await updateAseguradora(2, {
      id: 2,
      registration_date: '2026-05-26',
      name: 'Aseg 2',
      document_type: 'RUC',
      document_number: '1234567890123',
      country: '', province: '', city: '', address: '', phone: '',
      account_executive_name: '', account_executive_phone: '', account_executive_email: '',
      claims_executive_name: '', claims_executive_phone: '', claims_executive_email: '',
      portfolio_executive_name: '', portfolio_executive_phone: '', portfolio_executive_email: '',
      is_active: true,
      workshop_ids: [],
    });
    await partialUpdateAseguradora(2, { is_active: false });

    expect((globalThis.fetch as any).mock.calls[0][0]).toContain('/insurers/management/2/update/');
    expect((globalThis.fetch as any).mock.calls[1][0]).toContain('/insurers/management/2/partial-update/');
  });

  it('deactivateAseguradora usa /deactivate/ con PATCH', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 7, active: false }) }) as any;
    await deactivateAseguradora(7);
    expect((globalThis.fetch as any).mock.calls[0][0]).toContain('/insurers/management/7/deactivate/');
    expect((globalThis.fetch as any).mock.calls[0][1].method).toBe('PATCH');
  });
});
