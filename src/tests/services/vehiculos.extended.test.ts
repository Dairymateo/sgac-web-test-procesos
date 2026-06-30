import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getVehiculos,
    getVehiculo,
    partialUpdateVehiculo,
} from '../../services/vehiculos.service';

describe('VehicleReads Service - Extended', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('getVehiculo retorna detalle de un vehiculo por ID', async () => {
        const mockData = { id: 5, license_plate: 'ABC-1234' };
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => mockData,
        });

        const result = await getVehiculo(5);
        expect(result).toEqual(mockData);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/vehicles/management/5/'),
            expect.any(Object),
        );
    });

    it('partialUpdateVehiculo usa PATCH', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ id: 1, color: 'NEGRO' }),
        });

        await partialUpdateVehiculo(1, { color: 'NEGRO' });
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/vehicles/management/1/partial-update/'),
            expect.objectContaining({ method: 'PATCH' }),
        );
    });

    it('maneja error HTTP en getVehiculos', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
            text: async () => '<html><title>Server Error</title></html>',
        });

        await expect(getVehiculos()).rejects.toThrow('Servicio no disponible, intentelo de nuevo mas tarde.');
    });

    it('incluye token en headers', async () => {
        localStorage.setItem('token', 'my-jwt');
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => [],
        });

        await getVehiculos();
        const headers = (globalThis.fetch as any).mock.calls[0][1].headers;
        expect(headers.Authorization).toBe('Bearer my-jwt');
    });
});
