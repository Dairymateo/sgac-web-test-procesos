import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getTalleres,
    getTaller,
    partialUpdateTaller
} from '../../services/talleres.service';

describe('WorkshopReades Service - Extended', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('getTaller retorna detalle de un taller', async () => {
        const mockData = { id: 3, name: 'Taller Centro' };
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true, status: 200,
            json: async () => mockData
        });

        const result = await getTaller(3);
        expect(result).toEqual(mockData);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/workshops/management/3/'),
            expect.any(Object)
        );
    });

    it('partialUpdateTaller usa PATCH', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ id: 1, name: 'Actualizado' })
        });

        await partialUpdateTaller(1, { name: 'Actualizado' });
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/workshops/management/1/partial-update/'),
            expect.objectContaining({ method: 'PATCH' })
        );
    });

    it('maneja error HTTP en getTalleres', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: false, status: 403,
            text: async () => JSON.stringify({ detail: 'Forbidden' })
        });
        await expect(getTalleres()).rejects.toThrow('No tienes permisos para realizar esta acción.');
    });

    it('incluye token en headers cuando existe', async () => {
        localStorage.setItem('token', 'jwt-token');
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true, status: 200,
            json: async () => []
        });
        await getTalleres();
        const headers = (globalThis.fetch as any).mock.calls[0][1].headers;
        expect(headers.Authorization).toBe('Bearer jwt-token');
    });
});
