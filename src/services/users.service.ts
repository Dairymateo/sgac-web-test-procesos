import type {
    User,
    UserCreateRequest,
    UserUpdateRequest,
    PatchedUserUpdateRequest,
    AdminResetPasswordRequest
} from '../types/user';
import { apiFetch, authHeaders, handleResponse } from './api';
import type { ListQueryParams, PaginatedResponse } from '../types/pagination';
import { buildQueryString, normalizePaginatedResponse } from '../utils/pagination';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/// <summary>
/// Obtiene la lista de todos los usuarios del sistema.
/// Parámetros: params (ListQueryParams). Envía parámetros de consulta al backend y retorna una respuesta paginada de usuarios.
/// </summary>
export async function getUsersPage(params: ListQueryParams = {}): Promise<PaginatedResponse<User>> {
    const res = await apiFetch(`${API_URL}/users/management/${buildQueryString(params)}`, {
        headers: authHeaders(),
    });
    const data = await handleResponse<User[] | PaginatedResponse<User>>(res, 'Error al cargar usuarios');
    return normalizePaginatedResponse(data);
}

/// <summary>
/// Obtiene una lista de usuarios.
/// Parámetros: params (ListQueryParams). Envía parámetros de consulta al backend y retorna la lista de resultados.
/// </summary>
export async function getUsers(params: ListQueryParams = {}): Promise<User[]> {
    const page = await getUsersPage(params);
    return page.results;
}

/// <summary>
/// Crea un nuevo usuario en el sistema.
/// Parámetros: data (UserCreateRequest). Envía los datos del nuevo usuario en el cuerpo de la petición POST al backend.
/// </summary>
export async function createUser(data: UserCreateRequest): Promise<User> {
    const res = await apiFetch(`${API_URL}/users/management/create/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse(res, 'Error al crear usuario') as Promise<User>;
}

/// <summary>
/// Obtiene el detalle de un usuario por su ID.
/// Parámetros: id (number). Envía el ID en la URL al backend y retorna los datos del usuario.
/// </summary>
export async function getUser(id: number): Promise<User> {
    const res = await apiFetch(`${API_URL}/users/management/${id}/`, {
        headers: authHeaders(),
    });
    return handleResponse(res, 'Error al obtener usuario') as Promise<User>;
}

/// <summary>
/// Actualiza completamente los datos de un usuario existente.
/// Parámetros: id (number), data (UserUpdateRequest). Envía los datos completos del usuario en el cuerpo de la petición PUT al backend.
/// </summary>
export async function updateUser(id: number, data: UserUpdateRequest): Promise<User> {
    const res = await apiFetch(`${API_URL}/users/management/${id}/update/`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse(res, 'Error al actualizar usuario') as Promise<User>;
}

/// <summary>
/// Actualiza parcialmente los datos de un usuario existente.
/// Parámetros: id (number), data (PatchedUserUpdateRequest). Envía los campos a modificar en el cuerpo de la petición PATCH al backend.
/// </summary>
export async function partialUpdateUser(id: number, data: PatchedUserUpdateRequest): Promise<User> {
    const res = await apiFetch(`${API_URL}/users/management/${id}/partial-update/`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse(res, 'Error al actualizar parcialmente usuario') as Promise<User>;
}

/// <summary>
/// Activa un usuario inactivo.
/// Parámetros: id (number). Envía el ID en la URL en una petición PATCH al backend.
/// </summary>
export async function activateUser(id: number): Promise<User> {
    const res = await apiFetch(`${API_URL}/users/management/${id}/activate/`, {
        method: 'PATCH',
        headers: authHeaders(),
    });
    return handleResponse(res, 'Error al activar usuario') as Promise<User>;
}

/// <summary>
/// Desactiva un usuario activo.
/// Parámetros: id (number). Envía el ID en la URL en una petición PATCH al backend.
/// </summary>
export async function deactivateUser(id: number): Promise<User> {
    const res = await apiFetch(`${API_URL}/users/management/${id}/deactivate/`, {
        method: 'PATCH',
        headers: authHeaders(),
    });
    return handleResponse(res, 'Error al desactivar usuario') as Promise<User>;
}

/// <summary>
/// Reinicia la contraseña de un usuario por parte de un administrador.
/// Parámetros: id (number), data (AdminResetPasswordRequest). Envía la nueva contraseña en una petición POST al backend.
/// </summary>
export async function adminResetPassword(id: number, data: AdminResetPasswordRequest): Promise<void> {
    const res = await apiFetch(`${API_URL}/users/management/${id}/reset-password/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data),
    });
    await handleResponse(res, 'Error al reiniciar contraseña');
}

/// <summary>
/// Registra un nuevo usuario en el sistema (endpoint público sin autenticación requerida).
/// Parámetros: data (UserCreateRequest). Envía los datos del nuevo usuario en una petición POST al backend.
/// </summary>
export async function registerUser(data: UserCreateRequest): Promise<void> {
    const res = await apiFetch(`${API_URL}/users/management/create/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data),
    });
    await handleResponse(res, 'Error al registrar usuario');
}
