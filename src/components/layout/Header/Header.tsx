/// <summary>
/// Componente Header.tsx
/// </summary>
import './Header.css';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiChevronRight, FiClipboard, FiLock, FiLogOut, FiShield, FiUser } from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';
import type { RoleEnum } from '../../../types/user';
import type { DashboardAlert, DashboardResource } from '../../../types/dashboard';

interface HeaderProps {
    readonly alerts?: DashboardAlert[];
}

const ROLE_LABELS: Record<RoleEnum, string> = {
    admin: 'Administrador',
    quote_technician: 'Técnico de Cotizaciones',
    sales_representative: 'Vendedor Comercial',
    administrative_staff: 'Personal Administrativo',
};

const ALERT_LABELS: Record<string, string> = {
    policy_expired: 'Póliza vencida',
    policy_expiring: 'Póliza próxima a vencer',
    policy_pending_document: 'Póliza pendiente de documento',
    claim_pending_insurer_report: 'Siniestro pendiente de informe',
    claim_open_too_long: 'Siniestro con tiempo excedido',
    quote_pending_approval: 'Cotización pendiente de aprobación',
};

function formatAlertDate(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function getResourcePath(resource: DashboardResource, id: number): string {
    const routes: Record<string, string> = {
        customer: `/dashboard/clientes?customer=${id}`,
        vehicle: `/dashboard/vehiculos?vehicle=${id}`,
        quote: `/dashboard/cotizaciones?quote=${id}`,
        policy: `/dashboard/polizas?policy=${id}`,
        claim: `/dashboard/siniestros?claim=${id}`,
        insurer: `/dashboard/aseguradoras?insurer=${id}`,
        workshop: `/dashboard/talleres?workshop=${id}`,
    };
    return routes[resource] ?? '/dashboard';
}

export default function Header({ alerts = [] }: HeaderProps) {
    const navigate = useNavigate();
    const { token, currentUser, logout } = useAuth();
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const accountMenuRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);
    const notificationCount = alerts.length;

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            if (!accountMenuRef.current?.contains(event.target as Node)) {
                setIsAccountMenuOpen(false);
            }
            if (!notifRef.current?.contains(event.target as Node)) {
                setIsNotifOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, []);

    const getTokenPayload = (): Record<string, string> => {
        if (!token) return {};
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch {
            return {};
        }
    };

    const getUsername = (): string => {
        if (currentUser?.username) return currentUser.username;
        const payload = getTokenPayload();
        return payload.username ?? payload.email ?? payload.sub ?? 'Usuario';
    };

    const getDisplayName = (): string => {
        const fullName = [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(' ').trim();
        return fullName || getUsername();
    };

    const getEmail = (): string => {
        if (currentUser?.email) return currentUser.email;
        return getTokenPayload().email ?? 'Sin email registrado';
    };

    const getRoleLabel = (): string => {
        return currentUser?.role ? ROLE_LABELS[currentUser.role] : 'Usuario';
    };

    const goToProfile = () => {
        setIsAccountMenuOpen(false);
        navigate('/dashboard/perfil');
    };

    const goToChangePassword = () => {
        setIsAccountMenuOpen(false);
        navigate('/change-password');
    };

    const handleLogout = async () => {
        setIsAccountMenuOpen(false);
        await logout();
        navigate('/');
    };

    const handleAlertClick = (resource: DashboardResource, id: number) => {
        setIsNotifOpen(false);
        navigate(getResourcePath(resource, id));
    };

    return (
        <header className="header">
            <div className="header-right">
                <span className="header-greeting">
                    Bienvenido, <strong>{getUsername()}</strong>
                </span>

                <div className="header-notif" ref={notifRef}>
                    <button
                        id="header-notif-btn"
                        className="header-icon-btn"
                        aria-label="Notificaciones"
                        aria-haspopup="menu"
                        aria-expanded={isNotifOpen}
                        onClick={() => setIsNotifOpen(open => !open)}
                    >
                        <FiBell aria-hidden="true" />
                        {notificationCount > 0 && (
                            <span className="header-badge">{notificationCount}</span>
                        )}
                    </button>

                    {isNotifOpen && (
                        <div className="notif-menu" role="menu" aria-label="Panel de alertas">
                            <div className="notif-menu__header">
                                <strong>Alertas activas</strong>
                                {notificationCount > 0 && (
                                    <span className="notif-menu__count">{notificationCount}</span>
                                )}
                            </div>
                            <div className="notif-menu__body">
                                {alerts.length === 0 ? (
                                    <p className="notif-menu__empty">No hay alertas pendientes.</p>
                                ) : (
                                    alerts.map(alert => {
                                        const title = ALERT_LABELS[alert.type] ?? alert.title;
                                        return (
                                            <button
                                                key={`${alert.type}-${alert.resource}-${alert.resource_id}`}
                                                type="button"
                                                role="menuitem"
                                                className={`notif-item notif-item--${alert.severity}`}
                                                onClick={() => handleAlertClick(alert.resource, alert.resource_id)}
                                            >
                                                <span className="notif-item__marker" aria-hidden="true" />
                                                <span className="notif-item__body">
                                                    <strong>{title}</strong>
                                                    <small>{alert.message}</small>
                                                    {alert.due_date ? (
                                                        <em>Vence: {formatAlertDate(alert.due_date)}</em>
                                                    ) : null}
                                                </span>
                                                <FiChevronRight aria-hidden="true" className="notif-item__arrow" />
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="header-account" ref={accountMenuRef}>
                    <button
                        className="header-avatar"
                        aria-label="Abrir menú de usuario"
                        aria-haspopup="menu"
                        aria-expanded={isAccountMenuOpen}
                        title="Cuenta"
                        onClick={() => setIsAccountMenuOpen((open) => !open)}
                    >
                        <FiUser aria-hidden="true" />
                    </button>

                    {isAccountMenuOpen && (
                        <div className="account-menu" role="menu" aria-label="Menú de usuario">
                            <div className="account-menu-profile">
                                <div className="account-menu-avatar" aria-hidden="true">
                                    <FiUser />
                                </div>
                                <div>
                                    <strong>{getDisplayName()}</strong>
                                    <span>{getEmail()}</span>
                                </div>
                            </div>

                            <div className="account-menu-role">
                                <FiShield aria-hidden="true" />
                                <span>{getRoleLabel()}</span>
                            </div>

                            <button type="button" role="menuitem" className="account-menu-item" onClick={goToProfile}>
                                <FiClipboard aria-hidden="true" />
                                <span>Mi perfil</span>
                            </button>
                            <button type="button" role="menuitem" className="account-menu-item" onClick={goToChangePassword}>
                                <FiLock aria-hidden="true" />
                                <span>Cambiar contraseña</span>
                            </button>
                            <button type="button" role="menuitem" className="account-menu-item account-menu-item--danger" onClick={handleLogout}>
                                <FiLogOut aria-hidden="true" />
                                <span>Cerrar sesión</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}