import { describe, it, expect } from 'vitest';
import { getProvinces, getCities, GEO_DATA } from '../../data/geo-data';

describe('Geo Data', () => {
    it('GEO_DATA contiene Ecuador', () => {
        expect(GEO_DATA.find(c => c.name === 'Ecuador')).toBeDefined();
    });

    it('getProvinces retorna provincias de un pais existente', () => {
        const provinces = getProvinces('Ecuador');
        expect(provinces.length).toBeGreaterThan(0);
        expect(provinces.find(p => p.name === 'Azuay')).toBeDefined();
    });

    it('getProvinces retorna vacio para pais inexistente', () => {
        expect(getProvinces('Inexistente')).toEqual([]);
    });

    it('getCities retorna ciudades de una provincia', () => {
        const cities = getCities('Ecuador', 'Azuay');
        expect(cities).toContainEqual({ name: 'Cuenca' });
    });

    it('getCities retorna vacio para provincia o pais inexistente', () => {
        expect(getCities('Inexistente', 'Azuay')).toEqual([]);
        expect(getCities('Ecuador', 'Inexistente')).toEqual([]);
    });
});
