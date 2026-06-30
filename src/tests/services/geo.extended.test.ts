import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCountries, fetchStates, fetchCities } from '../../services/geo.service';

describe('Geo Service - Extended', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('fetchCountries lanza error cuando la API falla', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
        await expect(fetchCountries()).rejects.toThrow('No se pudieron cargar los países');
    });

    it('fetchCities retorna array vacío cuando la API falla', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
        const result = await fetchCities('Invalid', 'Invalid');
        expect(result).toEqual([]);
    });

    it('fetchStates maneja estados null en la respuesta', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ data: { states: null } })
        });
        const result = await fetchStates('Peru');
        expect(result).toEqual([]);
    });

    it('fetchCities maneja data null en la respuesta', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ data: null })
        });
        const result = await fetchCities('Peru', 'Lima');
        expect(result).toEqual([]);
    });

    it('fetchCountries ordena países correctamente', async () => {
        const data = {
            data: [
                { name: 'Zimbabwe', Iso2: 'ZW' },
                { name: 'Argentina', Iso2: 'AR' },
                { name: 'Peru', Iso2: 'PE' },
            ]
        };
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => data
        });
        const result = await fetchCountries();
        expect(result[0].name).toBe('Argentina');
        expect(result[1].name).toBe('Peru');
        expect(result[2].name).toBe('Zimbabwe');
    });
});
