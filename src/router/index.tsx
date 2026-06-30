/// <summary>
/// Componente index.tsx
/// </summary>
import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from '../pages/Login/LoginPage';
import DashboardLayout from '../components/layout/DashboardLayout';
import DashboardPage from '../pages/Dashboard/DashboardPage';
import ConfiguracionPage from '../pages/Configuracion/ConfiguracionPage';
import ClientesPage from '../pages/Clientes/ClientesPage';
import SiniestrosPage from '../pages/Siniestros/SiniestrosPage';
import VehiculosPage from '../pages/Vehiculos/VehiculosPage';
import TalleresPage from '../pages/Talleres/TalleresPage';
import CotizacionesPage from '../pages/Cotizaciones/CotizacionesPage';
import AseguradorasPage from '../pages/Aseguradoras/AseguradorasPage';
import PoliciesPage from '../pages/Policies/PoliciesPage';
import ChangePasswordPage from '../pages/ChangePassword/ChangePasswordPage';
import ProfilePage from '../pages/Profile/ProfilePage';
import ProtectedRoute from '../components/auth/ProtectedRoute';

const router = createBrowserRouter([
    {
        path: '/',
        element: <LoginPage />,
    },
    {
        element: <ProtectedRoute />,
        children: [
            {
                path: '/change-password',
                element: <ChangePasswordPage />,
            },
            {
                path: '/dashboard',
                element: <DashboardLayout />,
                children: [
                    {
                        index: true,
                        element: <DashboardPage />,
                    },
                    {
                        path: 'perfil',
                        element: <ProfilePage />,
                    },
                    {
                        path: 'usuarios',
                        element: <Navigate to="/dashboard/configuracion" replace />,
                    },
                    {
                        path: 'configuracion',
                        element: <ConfiguracionPage />,
                    },
                    {
                        path: 'clientes',
                        element: <ClientesPage />,
                    },
                    {
                        path: 'vehiculos',
                        element: <VehiculosPage />,
                    },
                    {
                        path: 'siniestros',
                        element: <SiniestrosPage />,
                    },
                    {
                        path: 'talleres',
                        element: <TalleresPage />,
                    },
                    {
                        path: 'aseguradoras',
                        element: <AseguradorasPage />,
                    },
                    {
                        path: 'cotizaciones',
                        element: <CotizacionesPage />,
                    },
                    {
                        path: 'polizas',
                        element: <PoliciesPage />,
                    },
                ],
            },
        ],
    },
    {
        path: '*',
        element: <Navigate to="/" replace />,
    },
]);

export default router;