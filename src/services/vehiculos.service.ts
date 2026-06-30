import { apiFetch, authHeaders, handleResponse } from './api';
import type { Vehiculo, VehicleWritePayload } from '../types/vehiculo';
import type { ListQueryParams, PaginatedResponse } from '../types/pagination';
import { buildQueryString, normalizePaginatedResponse } from '../utils/pagination';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/// <summary>
/// Obtiene una página de vehículos.
/// Parámetros: params (ListQueryParams). Envía parámetros de consulta al backend y retorna una respuesta paginada de vehículos.
/// </summary>
export async function getVehiculosPage(params: ListQueryParams = {}): Promise<PaginatedResponse<Vehiculo>> {
    const res = await apiFetch(`${API_URL}/vehicles/management/${buildQueryString(params)}`, {
        headers: authHeaders(),
    });
    const data = await handleResponse<Vehiculo[] | PaginatedResponse<Vehiculo>>(res, 'Error al cargar vehiculos');
    return normalizePaginatedResponse(data);
}

/// <summary>
/// Obtiene una lista de vehículos.
/// Parámetros: params (ListQueryParams). Envía parámetros de consulta al backend y retorna la lista de resultados.
/// </summary>
export async function getVehiculos(params: ListQueryParams = {}): Promise<Vehiculo[]> {
    const page = await getVehiculosPage(params);
    return page.results;
}

/// <summary>
/// Obtiene los detalles de un vehículo por su ID.
/// Parámetros: vehicleId (number). Envía el ID en la URL al backend y retorna los detalles del vehículo.
/// </summary>
export async function getVehiculo(vehicleId: number): Promise<Vehiculo> {
    const res = await apiFetch(`${API_URL}/vehicles/management/${vehicleId}/`, {
        headers: authHeaders(),
    });
    return handleResponse<Vehiculo>(res, 'Error al obtener vehiculo');
}

/// <summary>
/// Crea un nuevo vehículo.
/// Parámetros: data (VehicleWritePayload). Envía los datos del vehículo en el cuerpo de la petición POST al backend.
/// </summary>
export async function createVehiculo(data: VehicleWritePayload): Promise<Vehiculo> {
    const res = await apiFetch(`${API_URL}/vehicles/management/create/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<Vehiculo>(res, 'Error al crear vehiculo');
}

/// <summary>
/// Actualiza completamente un vehículo existente.
/// Parámetros: vehicleId (number), data (VehicleWritePayload). Envía los datos completos del vehículo en el cuerpo de la petición PUT al backend.
/// </summary>
export async function updateVehiculo(vehicleId: number, data: VehicleWritePayload): Promise<Vehiculo> {
    const res = await apiFetch(`${API_URL}/vehicles/management/${vehicleId}/update/`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<Vehiculo>(res, 'Error al actualizar vehiculo');
}

/// <summary>
/// Actualiza parcialmente un vehículo existente.
/// Parámetros: vehicleId (number), data (Partial<VehicleWritePayload>). Envía los campos a modificar en el cuerpo de la petición PATCH al backend.
/// </summary>
export async function partialUpdateVehiculo(vehicleId: number, data: Partial<VehicleWritePayload>): Promise<Vehiculo> {
    const res = await apiFetch(`${API_URL}/vehicles/management/${vehicleId}/partial-update/`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<Vehiculo>(res, 'Error al actualizar vehiculo');
}

/// <summary>
/// Activa un vehículo inactivo.
/// Parámetros: vehicleId (number). Envía el ID en la URL en una petición PATCH al backend.
/// </summary>
export async function activateVehiculo(vehicleId: number): Promise<Vehiculo> {
    const res = await apiFetch(`${API_URL}/vehicles/management/${vehicleId}/activate/`, {
        method: 'PATCH',
        headers: authHeaders(),
    });
    return handleResponse<Vehiculo>(res, 'Error al activar vehiculo');
}

/// <summary>
/// Desactiva un vehículo activo.
/// Parámetros: vehicleId (number). Envía el ID en la URL en una petición PATCH al backend.
/// </summary>
export async function deactivateVehiculo(vehicleId: number): Promise<Vehiculo> {
    const res = await apiFetch(`${API_URL}/vehicles/management/${vehicleId}/deactivate/`, {
        method: 'PATCH',
        headers: authHeaders(),
    });
    return handleResponse<Vehiculo>(res, 'Error al desactivar vehiculo');
}
