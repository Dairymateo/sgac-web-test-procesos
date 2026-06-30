const BASE = 'https://countriesnow.space/api/v0.1';

export interface GeoCountry {
    name: string;
    iso2: string;
}

export interface GeoState {
    name: string;
    state_code: string;
}

export interface GeoCity {
    name: string;
}

/// <summary>
/// Obtiene la lista de todos los países del mundo ordenada alfabéticamente.
/// Sin parámetros. Realiza una petición GET a un servicio externo y no envía nada al backend de la app.
/// </summary>
export async function fetchCountries(): Promise<GeoCountry[]> {
    const res = await fetch(`${BASE}/countries/iso`);
    if (!res.ok) throw new Error('No se pudieron cargar los países');
    const data = await res.json();
    return (data.data as any[]).map(c => ({ name: c.name, iso2: c.Iso2 }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

const ECUADOR_PROVINCES: GeoState[] = [
    { name: 'Azuay', state_code: 'A' }, { name: 'Bolívar', state_code: 'B' }, { name: 'Cañar', state_code: 'F' },
    { name: 'Carchi', state_code: 'C' }, { name: 'Chimborazo', state_code: 'H' }, { name: 'Cotopaxi', state_code: 'X' },
    { name: 'El Oro', state_code: 'O' }, { name: 'Esmeraldas', state_code: 'E' }, { name: 'Galápagos', state_code: 'W' },
    { name: 'Guayas', state_code: 'G' }, { name: 'Imbabura', state_code: 'I' }, { name: 'Loja', state_code: 'L' },
    { name: 'Los Ríos', state_code: 'R' }, { name: 'Manabí', state_code: 'M' }, { name: 'Morona Santiago', state_code: 'S' },
    { name: 'Napo', state_code: 'N' }, { name: 'Orellana', state_code: 'D' }, { name: 'Pastaza', state_code: 'Y' },
    { name: 'Pichincha', state_code: 'P' }, { name: 'Santa Elena', state_code: 'SE' }, { name: 'Santo Domingo de los Tsáchilas', state_code: 'SD' },
    { name: 'Sucumbíos', state_code: 'U' }, { name: 'Tungurahua', state_code: 'T' }, { name: 'Zamora Chinchipe', state_code: 'Z' }
];

const ECUADOR_API_MAP: Record<string, string> = {
    'Azuay': 'Azuay Province', 'Bolívar': 'Bolívar Province', 'Cañar': 'Cañar Province',
    'Carchi': 'Carchi Province', 'Chimborazo': 'Chimborazo Province', 'Cotopaxi': 'Cotopaxi Province',
    'El Oro': 'El Oro Province', 'Esmeraldas': 'Esmeraldas', 'Galápagos': 'Galápagos Province',
    'Guayas': 'Guayas Province', 'Imbabura': 'Imbabura Province', 'Los Ríos': 'Los Ríos Province',
    'Manabí': 'Manabí Province', 'Morona Santiago': 'Morona-Santiago Province', 'Napo': 'Napo Province',
    'Orellana': 'Orellana Province', 'Pastaza': 'Pastaza Province', 'Pichincha': 'Pichincha Province',
    'Santa Elena': 'Santa Elena Province', 'Santo Domingo de los Tsáchilas': 'Santo Domingo de los Tsáchilas Province',
    'Sucumbíos': 'Sucumbíos Province', 'Tungurahua': 'Tungurahua Province', 'Zamora Chinchipe': 'Zamora-Chinchipe Province'
};

/// <summary>
/// Obtiene los estados/provincias de un país dado.
/// Parámetros: countryName (string). Realiza una petición POST a un servicio externo y no envía nada al backend de la app.
/// </summary>
export async function fetchStates(countryName: string): Promise<GeoState[]> {
    if (countryName === 'Ecuador') {
        return ECUADOR_PROVINCES;
    }

    const res = await fetch(`${BASE}/countries/states`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: countryName }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return ((data.data?.states as any[]) ?? []).map(s => ({ name: s.name, state_code: s.state_code }));
}

/// <summary>
/// Obtiene las ciudades de un estado/provincia dentro de un país.
/// Parámetros: countryName (string), stateName (string). Realiza una petición POST a un servicio externo y no envía nada al backend de la app.
/// </summary>
export async function fetchCities(countryName: string, stateName: string): Promise<GeoCity[]> {
    if (countryName === 'Ecuador') {
        if (stateName === 'Loja') {
            return [{ name: 'Loja' }, { name: 'Catamayo' }, { name: 'Macará' }, { name: 'Cariamanga' }, { name: 'Zapotillo' }];
        }
        stateName = ECUADOR_API_MAP[stateName] || stateName;
    }

    const res = await fetch(`${BASE}/countries/state/cities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: countryName, state: stateName }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return ((data.data as string[]) ?? []).map(name => ({ name }));
}
