import type { RoleEnum, User } from '../types/user';

const ROLE_LABELS: Record<RoleEnum, string> = {
    admin: 'Administrador',
    quote_technician: 'Técnico de Cotizaciones',
    sales_representative: 'Vendedor Comercial',
    administrative_staff: 'Personal Administrativo',
};

export function getRoleLabel(role?: string): string {
    if (!role) return 'No definido';
    return ROLE_LABELS[role as RoleEnum] || role;
}

function hasRole(role: string | undefined, allowedRoles: RoleEnum[]): boolean {
    return !!role && allowedRoles.includes(role as RoleEnum);
}

export function canManageUsers(user?: Pick<User, 'role'> | null): boolean {
    return user?.role === 'admin';
}

export function canManageClients(role?: string): boolean {
    return hasRole(role, ['admin', 'sales_representative']);
}

export function canDeactivateClients(role?: string): boolean {
    return canManageClients(role);
}

export function canManageVehicles(role?: string): boolean {
    return hasRole(role, ['admin', 'sales_representative']);
}

export function canDeleteVehicles(role?: string): boolean {
    return role === 'admin';
}

export function canAccessClaims(role?: string): boolean {
    return hasRole(role, ['admin', 'quote_technician', 'administrative_staff']);
}

export function canManageClaims(role?: string): boolean {
    return hasRole(role, ['admin', 'quote_technician']);
}

export function canDeleteClaims(role?: string): boolean {
    return role === 'admin';
}

export function canManageQuotes(role?: string): boolean {
    return hasRole(role, ['admin', 'quote_technician']);
}

export function canManagePolicies(role?: string): boolean {
    return hasRole(role, ['admin', 'administrative_staff']);
}

export function canDeactivatePolicies(role?: string): boolean {
    return role === 'admin';
}

export function canManageInsurers(role?: string): boolean {
    return hasRole(role, ['admin', 'administrative_staff']);
}

export function canDeleteInsurers(role?: string): boolean {
    return role === 'admin';
}

export function canManageWorkshops(role?: string): boolean {
    return hasRole(role, ['admin', 'administrative_staff']);
}

export function canDeleteWorkshops(role?: string): boolean {
    return role === 'admin';
}

export function canMutateBusinessData(role?: string): boolean {
    return canManageClients(role);
}
