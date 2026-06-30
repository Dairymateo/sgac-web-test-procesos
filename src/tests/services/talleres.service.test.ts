import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getTalleres,
    createTaller,
    updateTaller,
    deactivateTaller,
} from '../../services/talleres.service';

describe('WorkshopReades Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('getTalleres retorna lista de talleres', async () => {
        const mockData = [{ id: 1, name: 'Taller Central' }];
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => mockData
        });

        const result = await getTalleres();
        expect(result).toEqual(mockData);
    });

    it('createTaller llama al endpoint con POST', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 201,
            json: async () => ({ id: 1, name: 'Taller 1' })
        });

        const result = await createTaller({ name: 'Taller 1' } as any);
        expect(result.id).toBe(1);
        expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/workshops/management/create/'), expect.objectContaining({ method: 'POST' }));
    });

    it('updateTaller usa PUT', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 1 }) });
        await updateTaller(1, { name: 'New Name' } as any);
        expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/workshops/management/1/update/'), expect.objectContaining({ method: 'PUT' }));
    });

    it('deactivateTaller usa /deactivate/ con PATCH', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 1, is_active: false }) });
        await deactivateTaller(1);
        expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/workshops/management/1/deactivate/'), expect.objectContaining({ method: 'PATCH' }));
    });
});
