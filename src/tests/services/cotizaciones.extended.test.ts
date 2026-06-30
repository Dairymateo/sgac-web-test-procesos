import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCotizaciones } from '../../services/cotizaciones.service';

describe('Cotizaciones Service - Extended', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('getCotizaciones retorna array vacío cuando el status es 404', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: false, status: 404,
            text: async () => 'Not Found'
        });

        const result = await getCotizaciones();
        expect(result).toEqual([]);
    });

    it('getCotizaciones lanza error para status != 404 y != ok', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: false, status: 500,
            text: async () => JSON.stringify({ detail: 'Internal error' })
        });

        await expect(getCotizaciones()).rejects.toThrow('Servicio no disponible, intentelo de nuevo mas tarde.');
    });

    it('incluye token en headers', async () => {
        localStorage.setItem('token', 'cot-token');
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true, status: 200,
            json: async () => []
        });
        await getCotizaciones();
        const headers = (globalThis.fetch as any).mock.calls[0][1].headers;
        expect(headers.Authorization).toBe('Bearer cot-token');
    });
});
