/// <summary>
/// Componente Sidebar.tsx
/// </summary>
import './Sidebar.css';
import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
    FiAlertTriangle,
    FiBarChart2,
    FiChevronLeft,
    FiChevronRight,
    FiClipboard,
    FiFileText,
    FiSettings,
    FiShield,
    FiTool,
    FiTruck,
    FiUser,
} from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';
import logo from '../../../assets/logo-removebg-preview.png';
import { canAccessClaims, canManageUsers, getRoleLabel } from '../../../utils/roles';

const SIDEBAR_COLLAPSED_KEY = 'sgac_sidebar_collapsed';

export default function Sidebar() {
    const { currentUser } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true');

    useEffect(() => {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
    }, [isCollapsed]);

    const navItems = [
        { label: 'Dashboard', icon: <FiBarChart2 />, to: '/dashboard' },
        { label: 'Clientes', icon: <FiUser />, to: '/dashboard/clientes' },
        { label: 'Vehículos', icon: <FiTruck />, to: '/dashboard/vehiculos' },
        { label: 'Cotizaciones', icon: <FiClipboard />, to: '/dashboard/cotizaciones' },
        { label: 'Pólizas', icon: <FiFileText />, to: '/dashboard/polizas' },
        ...(canAccessClaims(currentUser?.role) ? [{ label: 'Siniestros', icon: <FiAlertTriangle />, to: '/dashboard/siniestros' }] : []),
        { label: 'Talleres', icon: <FiTool />, to: '/dashboard/talleres' },
        { label: 'Aseguradoras', icon: <FiShield />, to: '/dashboard/aseguradoras' },
        ...(canManageUsers(currentUser) ? [{ label: 'Configuración', icon: <FiSettings />, to: '/dashboard/configuracion' }] : []),
    ];

    return (
        <aside className={`sidebar${isCollapsed ? ' sidebar--collapsed' : ''}`}>
            <div className="sidebar-brand">
                <img src={logo} alt="SGAC Logo" className="sidebar-brand-logo" />
                <span className="sidebar-brand-role">Rol: {getRoleLabel(currentUser?.role)}</span>
                <button
                    type="button"
                    className="sidebar-toggle"
                    onClick={() => setIsCollapsed(value => !value)}
                    aria-label={isCollapsed ? 'Expandir menú' : 'Ocultar menú'}
                    title={isCollapsed ? 'Expandir menú' : 'Ocultar menú'}
                >
                    {isCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
                </button>
            </div>

            <nav className="sidebar-nav" aria-label="Navegación principal">
                {navItems.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/dashboard'}
                        title={item.label}
                        aria-label={item.label}
                        className={({ isActive }) =>
                            `sidebar-item${isActive ? ' sidebar-item--active' : ''}`
                        }
                    >
                        <span className="sidebar-item-icon" aria-hidden="true">{item.icon}</span>
                        <span className="sidebar-item-label">{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
}