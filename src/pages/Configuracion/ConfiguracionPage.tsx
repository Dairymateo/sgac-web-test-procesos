/// <summary>
/// Componente ConfiguracionPage.tsx
/// </summary>
import './ConfiguracionPage.css';
import { Navigate } from 'react-router-dom';
import UsersPage from '../Users/UsersPage';
import { useAuth } from '../../context/AuthContext';
import { canManageUsers } from '../../utils/roles';

export default function ConfiguracionPage() {
    const { currentUser } = useAuth();

    if (currentUser && !canManageUsers(currentUser)) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="config-page">
            <div className="config-header">
                <h1 className="config-title">Configuración</h1>
            </div>

            <div className="config-tabs" role="tablist" aria-label="Opciones de configuración">
                <button type="button" className="config-tab config-tab--active" role="tab" aria-selected="true">
                    Usuarios
                </button>
            </div>

            <UsersPage embedded />
        </div>
    );
}