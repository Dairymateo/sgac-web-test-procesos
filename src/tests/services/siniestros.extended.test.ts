import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getSiniestros,
    getSiniestro,
    createSiniestro,
    partialUpdateSiniestro,
    getClaimDocumentUrl,
} from '../../services/siniestros.service';

describe('ClaimReads Service - Extended', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('getSiniestro retorna detalle de un siniestro', async () => {
        const mockData = { id: 5, claim_number: 'SN-005' };
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true, status: 200,
            json: async () => mockData,
        });

        const result = await getSiniestro(5);
        expect(result).toEqual(mockData);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/claims/management/5/'),
            expect.any(Object),
        );
    });

    it('partialUpdateSiniestro usa PATCH', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ id: 1 }),
        });

        await partialUpdateSiniestro(1, { status: 'authorized' } as any);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/claims/management/1/partial-update/'),
            expect.objectContaining({ method: 'PATCH' }),
        );
    });

    it('createSiniestro con archivos usa payload multipart', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true, status: 201,
            json: async () => ({ id: 2, claim_number: 'SN-002' }),
        });

        const result = await createSiniestro({
            insured_customer: 10,
            vehicle: 5,
            insurer: 3,
            claim_date: '2026-03-28',
            claim_description: 'Impacto',
            documents: [{ document_type: 'id_card', delivered: true, file: new File(['x'], 'id.pdf', { type: 'application/pdf' }) }],
        });
        expect(result.id).toBe(2);
        const body = (globalThis.fetch as any).mock.calls[0][1].body as FormData;
        expect(body.get('payload')).toBeTruthy();
        expect(body.get('documents.0.file')).toBeInstanceOf(File);
    });

    it('obtiene URL temporal de documento', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true, status: 200,
            json: async () => ({ url: 'https://storage/doc?sas=1' }),
        });
        const result = await getClaimDocumentUrl(10, 55);
        expect(result.url).toContain('https://storage');
    });

    it('incluye token en headers cuando hay sesion activa', async () => {
        localStorage.setItem('token', 'siniestro-token');
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true, status: 200,
            json: async () => [],
        });
        await getSiniestros();
        const headers = (globalThis.fetch as any).mock.calls[0][1].headers;
        expect(headers.Authorization).toBe('Bearer siniestro-token');
    });
});
