import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getVehiculos,
    createVehiculo,
    updateVehiculo,
    deactivateVehiculo,
} from '../../services/vehiculos.service';

describe('VehicleReads Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('getVehiculos retorna lista de vehiculos', async () => {
        const mockData = [{ id: 1, license_plate: 'ABC-1234' }];
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => mockData,
        });

        const result = await getVehiculos();
        expect(result).toEqual(mockData);
    });

    it('createVehiculo llama al endpoint correcto con POST', async () => {
        const payload = {
            owner_customer: 10,
            brand: 'FORD',
            model: 'FC9JKSZ',
            vehicle_type: 'jeep',
            vehicle_use: 'tourism',
            engine: 'J05ETC19049',
            chassis: '9F3FC9JKSEXX11235',
            license_plate: 'PBC-1234',
            year: 2024,
            color: 'BLANCO',
            province: 'PICHINCHA',
            city: 'QUITO',
            is_active: true,
        };

        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 201,
            json: async () => ({ ...payload, id: 1 }),
        });

        const result = await createVehiculo(payload as any);
        expect(result.id).toBe(1);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/vehicles/management/create/'),
            expect.objectContaining({ method: 'POST' }),
        );
    });

    it('updateVehiculo usa PUT', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 1 }) });
        await updateVehiculo(1, {
            owner_customer: 10,
            brand: 'FORD',
            model: 'FC9JKSZ',
            vehicle_type: 'jeep',
            vehicle_use: 'tourism',
            engine: 'J05ETC19049',
            chassis: '9F3FC9JKSEXX11235',
            license_plate: 'PBC-1234',
            year: 2024,
            color: 'BLANCO',
            province: 'PICHINCHA',
            city: 'QUITO',
            is_active: true,
        } as any);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/vehicles/management/1/update/'),
            expect.objectContaining({ method: 'PUT' }),
        );
    });

    it('deactivateVehiculo usa /deactivate/ con PATCH', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 1, is_active: false }) });
        await deactivateVehiculo(1);
        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/vehicles/management/1/deactivate/'),
            expect.objectContaining({ method: 'PATCH' }),
        );
    });
});
