import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCotizaciones, getCotizacionById, adjustCotizacion, approveCotizacion, generateScoring, rejectCotizacion, createCotizacionML, createCotizacionDraft } from '../../services/cotizaciones.service';

describe('Cotizaciones Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('getCotizaciones retorna lista de cotizaciones', async () => {
        const mockData = [{ id: 1, status: 'draft', suggested_premium: '100.0' }];
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => mockData
        });

        const result = await getCotizaciones();
        expect(result).toEqual(mockData);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/quotes/management/'),
            expect.objectContaining({ method: 'GET' })
        );
    });

    it('getCotizacionById retorna detalle de una cotización', async () => {
        const mockData = { id: 1, status: 'draft', suggested_premium: '100.0' };
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => mockData
        });

        const result = await getCotizacionById(1);
        expect(result).toEqual(mockData);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/quotes/management/1/'),
            expect.objectContaining({ method: 'GET' })
        );
    });

    it('adjustCotizacion llama a PATCH con el payload correcto', async () => {
        const mockData = { id: 1, final_premium: '150.0', status: 'draft' };
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => mockData
        });

        const payload = { final_premium: '150.0', manual_override_reason: 'Descuento especial' };
        const result = await adjustCotizacion(1, payload);

        expect(result).toEqual(mockData);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/quotes/management/1/adjust/'),
            expect.objectContaining({
                method: 'PATCH',
                body: JSON.stringify(payload)
            })
        );
    });

    it('approveCotizacion llama a PATCH con el payload vacio por defecto', async () => {
        const mockData = { id: 1, final_premium: '150.0', status: 'approved' };
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => mockData
        });

        const result = await approveCotizacion(1);

        expect(result).toEqual(mockData);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/quotes/management/1/approve/'),
            expect.objectContaining({
                method: 'PATCH',
                body: JSON.stringify({})
            })
        );
    });

    it('approveCotizacion envia final_premium cuando se proporciona', async () => {
        const mockData = { id: 1, final_premium: '151.0', status: 'approved' };
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => mockData
        });

        const result = await approveCotizacion(1, { final_premium: '151.0' });

        expect(result).toEqual(mockData);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/quotes/management/1/approve/'),
            expect.objectContaining({
                method: 'PATCH',
                body: JSON.stringify({ final_premium: '151.0' })
            })
        );
    });

    it('createCotizacionML llama a POST con el payload correcto', async () => {
        const mockData = { id: 1, status: 'scoring_generated' };
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => mockData
        });

        const payload = { insured_client: 1, insurer: 2, vehicles: [{ vehicle: 1, vehicle_value: '18500' }] };
        const result = await createCotizacionML(payload);

        expect(result).toEqual(mockData);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/quotes/management/create/'),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify(payload)
            })
        );
    });

    it('createCotizacionDraft llama a POST con el payload correcto', async () => {
        const mockData = { id: 1, status: 'draft' };
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => mockData
        });

        const payload = { insured_client: 1, insurer: 2, vehicles: [{ vehicle: 1, vehicle_value: '18500' }] };
        const result = await createCotizacionDraft(payload);

        expect(result).toEqual(mockData);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/quotes/management/draft/'),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify(payload)
            })
        );
    });

    it('generateScoring llama a POST correctamente', async () => {
        const mockData = { id: 1, risk_score: '95', risk_band: 'LOW', suggested_premium: '120.0', status: 'draft' };
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => mockData
        });

        const result = await generateScoring(1);

        expect(result).toEqual(mockData);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/quotes/management/1/generate-scoring/'),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({})
            })
        );
    });

    it('rejectCotizacion llama a PATCH con el payload correcto', async () => {
        const mockData = { id: 1, status: 'rejected' };
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => mockData
        });

        const payload = { rejection_reason: 'Motivo de rechazo válido' };
        const result = await rejectCotizacion(1, payload);

        expect(result).toEqual(mockData);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/quotes/management/1/reject/'),
            expect.objectContaining({
                method: 'PATCH',
                body: JSON.stringify(payload)
            })
        );
    });
});
