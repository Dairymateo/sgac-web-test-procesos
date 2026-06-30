export type RoleEnum = 'admin' | 'quote_technician' | 'sales_representative' | 'administrative_staff';

export interface User {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
    email: string;
    role?: RoleEnum;
    is_staff?: boolean;
    is_superuser?: boolean;
    is_active?: boolean;
    must_change_password?: boolean;
    date_joined: string;
    created_at: string;
    updated_at: string;
}

export interface UserCreateRequest {
    username?: string;
    first_name?: string;
    last_name?: string;
    email: string;
    password: string;
    role?: RoleEnum;
    is_active?: boolean;
}

export interface UserUpdateRequest {
    username: string;
    first_name?: string;
    last_name?: string;
    email: string;
    role?: RoleEnum;
    is_active?: boolean;
}

export interface PatchedUserUpdateRequest {
    username?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    role?: RoleEnum;
    is_active?: boolean;
}

export interface AdminResetPasswordRequest {
    new_password: string;
}


export type Usuario = User;
export type UsuarioCreateRequest = UserCreateRequest;
export type UsuarioUpdateRequest = UserUpdateRequest;
export type PatchedUsuarioUpdateRequest = PatchedUserUpdateRequest;
