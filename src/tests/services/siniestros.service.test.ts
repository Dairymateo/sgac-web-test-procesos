import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getSiniestros,
    createSiniestro,
    updateSiniestro,
    deactivateSiniestro,
    reportSiniestroToInsurer,
} from '../../services/siniestros.service';

describe('ClaimReads Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('getSiniestros retorna lista de siniestros', async () => {
        const mockData = [{ id: 1, claim_number: 'SN-001' }];
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => mockData,
        });

        const result = await getSiniestros();
        expect(result).toEqual(mockData);
    });

    it('createSiniestro envia JSON si no hay archivos', async () => {
        const data = {
            insured_customer: 10,
            vehicle: 5,
            claim_date: '2026-03-28',
            claim_description: 'Impacto lateral',
        };
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 201,
            json: async () => ({ ...data, id: 1 }),
        });

        const result = await createSiniestro(data as any);
        expect(result.id).toBe(1);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/claims/management/create/'),
            expect.objectContaining({ method: 'POST' }),
        );
    });

    it('updateSiniestro usa PUT', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 1 }) });
        await updateSiniestro(1, {
            insured_customer: 10,
            vehicle: 5,
            claim_date: '2026-03-28',
            claim_description: 'Impacto lateral',
        } as any);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/claims/management/1/update/'),
            expect.objectContaining({ method: 'PUT' }),
        );
    });

    it('deactivateSiniestro usa /deactivate/ con PATCH', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 1, is_active: false }) });
        await deactivateSiniestro(1);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/claims/management/1/deactivate/'),
            expect.objectContaining({ method: 'PATCH' }),
        );
    });

    it('reportSiniestroToInsurer usa /report-to-insurer/ con POST', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 1, insurer_report_date: '2026-06-03' }) });
        await reportSiniestroToInsurer(1);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/claims/management/1/report-to-insurer/'),
            expect.objectContaining({ method: 'POST' }),
        );
    });
});
