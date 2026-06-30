import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCountries, fetchStates, fetchCities } from '../../services/geo.service';

describe('Geo Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('fetchCountries retorna lista de paises ordenados', async () => {
        const mockData = { data: [{ name: 'Peru', Iso2: 'PE' }, { name: 'Argentina', Iso2: 'AR' }] };
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockData
        });

        const result = await fetchCountries();
        expect(result[0].name).toBe('Argentina');
        expect(result[1].name).toBe('Peru');
    });

    it('fetchStates retorna lista de estados', async () => {
        const mockData = { data: { states: [{ name: 'Lima', state_code: 'LMA' }] } };
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockData
        });

        const result = await fetchStates('Peru');
        expect(result[0].name).toBe('Lima');
    });

    it('fetchCities retorna lista de ciudades', async () => {
        const mockData = { data: ['Miraflores', 'San Isidro'] };
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockData
        });

        const result = await fetchCities('Peru', 'Lima');
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Miraflores');
    });

    it('fetchStates handle error devuelviendo array vacio', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({ ok: false });
        const result = await fetchStates('Invalid');
        expect(result).toEqual([]);
    });
});
