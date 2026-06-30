import type { User } from '../types/user';
import { apiFetch, authHeaders, handleResponse } from './api';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface LoginResponse {
    access: string;
    refresh: string;
    user: User;
    must_change_password: boolean;
}

/// <summary>
/// Autentica al usuario con sus credenciales y retorna los tokens JWT.
/// Parámetros: email (string), password (string). Envía estos campos en el cuerpo de la petición POST al backend.
/// </summary>
export async function loginRequest(
    email: string,
    password: string
): Promise<LoginResponse> {
    const res = await fetch(`${API_URL}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
        throw new Error('Credenciales inválidas');
    }

    return res.json();
}

/// <summary>
/// Renueva el token de acceso usando el token de refresco.
/// Parámetros: refresh (string). Envía el token en el cuerpo de la petición POST al backend.
/// </summary>
export async function refreshTokenRequest(
    refresh: string
): Promise<{ access: string, refresh?: string }> {
    const res = await fetch(`${API_URL}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
    });

    if (!res.ok) {
        throw new Error('Sesión expirada');
    }

    return res.json();
}

/// <summary>
/// Cierra la sesión del usuario invalidando el token de refresco en el servidor.
/// Sin parámetros. Lee el token local y lo envía en el cuerpo de la petición POST al backend.
/// </summary>
export async function logoutRequest(): Promise<void> {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) return;

    await apiFetch(`${API_URL}/auth/logout/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ refresh }),
    }).catch(() => { });
}

/// <summary>
/// Obtiene los datos del usuario actualmente autenticado mediante el token activo.
/// Sin parámetros. Realiza una petición GET al backend usando las credenciales.
/// </summary>
export async function getMeRequest(): Promise<User> {
    const res = await apiFetch(`${API_URL}/auth/me/`, {
        method: 'GET',
        headers: authHeaders(),
    });

    if (!res.ok) {
        throw new Error('No se pudo obtener la información del usuario');
    }

    return res.json();
}

/// <summary>
/// Cambia la contraseña del usuario autenticado.
/// Parámetros: data (any). Envía la contraseña actual y la nueva en el cuerpo de la petición POST al backend.
/// </summary>
export async function changePasswordRequest(data: any): Promise<void> {
    const res = await apiFetch(`${API_URL}/auth/change-password/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data),
    });

    await handleResponse<void>(res, 'No se pudo cambiar la contraseña');
}

/// <summary>
/// Verifica que el servidor backend esté operativo.
/// Sin parámetros. Realiza una petición GET al backend.
/// </summary>
export async function healthCheckRequest(): Promise<void> {
    const res = await apiFetch(`${API_URL}/health/`, {
        method: 'GET',
        headers: authHeaders(),
    });

    if (!res.ok) {
        throw new Error('Health check failed');
    }
}
