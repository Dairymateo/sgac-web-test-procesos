import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch } from '../../services/api';

describe('API Utility', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        vi.stubGlobal('location', { href: '' });
    });

    it('apiFetch retorna la respuesta original si no es 401', async () => {
        const mockRes = { status: 200, ok: true };
        globalThis.fetch = vi.fn().mockResolvedValue(mockRes);

        const res = await apiFetch('/test');
        expect(res).toBe(mockRes);
    });

    it('apiFetch maneja 401 sin token de refresco', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({ status: 401, ok: false });
        const dispatchEventSpy = vi.spyOn(globalThis as any, 'dispatchEvent');

        const res = await apiFetch('/test');
        expect(res.status).toBe(401);

        const event = dispatchEventSpy.mock.calls.find(call => (call[0] as Event).type === 'auth:session-expired');
        expect(event).toBeDefined();

        dispatchEventSpy.mockRestore();
    });

    it('apiFetch refresca el token y reintenta en 401', async () => {
        localStorage.setItem('refresh_token', 'refresh');

        globalThis.fetch = vi.fn()
            .mockResolvedValueOnce({ status: 401, ok: false }) 
            .mockResolvedValueOnce({ ok: true, json: async () => ({ access: 'new-token' }) }) 
            .mockResolvedValueOnce({ status: 201, ok: true }); 

        const res = await apiFetch('/test');
        expect(res.status).toBe(201);
        expect(localStorage.getItem('token')).toBe('new-token');
    });

    it('apiFetch encola peticiones paralelas durante el refresco', async () => {
        localStorage.setItem('refresh_token', 'refresh');

        globalThis.fetch = vi.fn()
            .mockResolvedValueOnce({ status: 401, ok: false }) 
            .mockResolvedValueOnce({ status: 401, ok: false }) 
            .mockResolvedValueOnce({ ok: true, json: async () => ({ access: 'new-token' }) }) 
            .mockResolvedValueOnce({ status: 200, ok: true, id: 1 }) 
            .mockResolvedValueOnce({ status: 200, ok: true, id: 2 }); 

        const p1 = apiFetch('/test1');
        const p2 = apiFetch('/test2');

        const [r1, r2] = await Promise.all([p1, p2]);

        expect(r1.status).toBe(200);
        expect(r2.status).toBe(200);
        expect(globalThis.fetch).toHaveBeenCalledTimes(5);
    });

    it('apiFetch maneja error catastrófico en el refresco', async () => {
        localStorage.setItem('refresh_token', 'refresh');

        globalThis.fetch = vi.fn()
            .mockResolvedValueOnce({ status: 401, ok: false })
            .mockRejectedValueOnce(new Error('Network error during refresh'));

        await expect(apiFetch('/test')).rejects.toThrow('Network error during refresh');
        expect(localStorage.getItem('token')).toBeNull();
    });
});
