import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDashboardSummary } from '../../services/dashboard.service';
import { apiFetch, authHeaders } from '../../services/api';

vi.mock('../../services/api', () => ({
    apiFetch: vi.fn(),
    authHeaders: vi.fn(),
    handleResponse: vi.fn((res) => {
        if (!res.ok) throw new Error('Error al cargar dashboard');
        return res.json();
    }),
}));

describe('dashboard.service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('getDashboardSummary llama a la API y retorna los datos correctamente', async () => {
        const mockSummary = {
            total_clientes: 10,
            total_polizas_activas: 5,
            ingresos_mes: 1500,
            siniestros_pendientes: 2,
        };

        (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            json: async () => mockSummary,
        });

        (authHeaders as ReturnType<typeof vi.fn>).mockReturnValue({ Authorization: 'Bearer token' });

        const result = await getDashboardSummary();

        expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('/dashboard/summary/'), {
            headers: { Authorization: 'Bearer token' },
        });
        expect(result).toEqual(mockSummary);
    });

    it('getDashboardSummary lanza error si la API falla', async () => {
        (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: false,
        });

        await expect(getDashboardSummary()).rejects.toThrow('Error al cargar dashboard');
    });
});
