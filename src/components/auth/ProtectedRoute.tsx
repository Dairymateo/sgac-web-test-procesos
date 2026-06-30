/// <summary>
/// Componente ProtectedRoute.tsx
/// </summary>
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute() {
    const { token, currentUser, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) return null;

    if (!token) return <Navigate to="/" replace />;

    const mustChangePassword = !!currentUser?.must_change_password;
    const onChangePasswordRoute = location.pathname === '/change-password';

    if (mustChangePassword && !onChangePasswordRoute) {
        return <Navigate to="/change-password" replace />;
    }

    return <Outlet />;
}