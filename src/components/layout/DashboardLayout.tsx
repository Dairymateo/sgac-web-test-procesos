/// <summary>
/// Componente DashboardLayout.tsx
/// </summary>
import './DashboardLayout.css';
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar/Sidebar';
import Header from './Header/Header';
import { getDashboardSummary } from '../../services/dashboard.service';
import type { DashboardAlert } from '../../types/dashboard';

export default function DashboardLayout() {
    const [alerts, setAlerts] = useState<DashboardAlert[]>([]);

    useEffect(() => {
        getDashboardSummary()
            .then(data => setAlerts(data.alerts ?? []))
            .catch(() => setAlerts([]));
    }, []);

    return (
        <div className="dashboard-shell">
            <Sidebar />
            <div className="dashboard-main">
                <Header alerts={alerts} />
                <main className="dashboard-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}