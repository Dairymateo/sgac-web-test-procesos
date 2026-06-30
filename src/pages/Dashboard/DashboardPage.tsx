/// <summary>
/// Componente DashboardPage.tsx
/// </summary>
import './DashboardPage.css';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
    FiActivity,
    FiAlertTriangle,
    FiBarChart2,
    FiCheckCircle,
    FiChevronRight,
    FiClipboard,
    FiClock,
    FiDollarSign,
    FiFileText,
    FiRefreshCw,
    FiTrendingUp,
    FiTruck,
    FiUser,
} from 'react-icons/fi';
import { getDashboardSummary } from '../../services/dashboard.service';
import type {
    DashboardActivity,
    DashboardBusinessIndicators,
    DashboardMetrics,
    DashboardPeriod,
    DashboardResource,
    DashboardSummary,
    DashboardQuickAction,
} from '../../types/dashboard';

const EMPTY_SUMMARY: DashboardSummary = {
    metrics: {
        total_customers: 0,
        active_customers: 0,
        total_vehicles: 0,
        active_vehicles: 0,
        quotes_generated: 0,
        quotes_pending: 0,
        quotes_approved: 0,
        active_policies: 0,
        draft_policies: 0,
        policies_pending_document: 0,
        open_claims: 0,
    },
    business_indicators: {
        period: 'month',
        period_start: '',
        period_end: '',
        quotes_count: 0,
        approved_quotes_count: 0,
        quote_conversion_rate: '0.00',
        policies_count: 0,
        claims_count: 0,
        total_insured_value_active_policies: '0.00',
        total_premium_active_policies: '0.00',
    },
    alerts: [],
    recent_activity: [],
    quick_actions: [],
};

const ACTIVITY_LABELS: Record<string, string> = {
    quote_created: 'Cotización generada',
    policy_updated: 'Póliza actualizada',
    customer_created: 'Cliente registrado',
    claim_created: 'Siniestro registrado',
};

const PERIOD_LABELS: Record<DashboardPeriod, string> = {
    month: 'Mes',
    quarter: 'Trimestre',
    year: 'Año',
};

const QUICK_ACTION_CONFIG: Record<string, { label: string; route: string; icon: React.ReactElement }> = {
    new_quote: { label: 'Nueva cotización', route: '/dashboard/cotizaciones', icon: <FiClipboard /> },
    new_customer: { label: 'Nuevo cliente', route: '/dashboard/clientes', icon: <FiUser /> },
    pending_policies: { label: 'Pólizas pendientes', route: '/dashboard/polizas', icon: <FiFileText /> },
    open_claims: { label: 'Siniestros abiertos', route: '/dashboard/siniestros', icon: <FiAlertTriangle /> },
};

function formatNumber(value: number): string {
    return new Intl.NumberFormat('es-EC').format(value);
}

function formatCurrency(value: string): string {
    const num = Number.parseFloat(value) || 0;
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
}

function formatPercent(value: number | string): string {
    const num = typeof value === 'string' ? Number.parseFloat(value) : value;
    return `${(Number.isFinite(num) ? num : 0).toFixed(1)}%`;
}

function formatDate(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function formatPeriodHeading(period: DashboardPeriod, bi: DashboardBusinessIndicators): string {
    const src = bi.period_start ? new Date(bi.period_start + 'T00:00:00') : new Date();
    if (period === 'month') {
        return `Indicadores de ${src.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })}`;
    }
    if (period === 'year') return `Indicadores de ${src.getFullYear()}`;
    return `Indicadores T${Math.floor(src.getMonth() / 3) + 1} ${src.getFullYear()}`;
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

export default function DashboardPage() {
    const navigate = useNavigate();
    const [summary, setSummary] = useState<DashboardSummary>(EMPTY_SUMMARY);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState<DashboardPeriod>('month');

    const loadSummary = () => {
        setLoading(true);
        setError(null);
        getDashboardSummary(period)
            .then(setSummary)
            .catch((err: Error) => setError(err?.message || 'No se pudo cargar el resumen.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {

        loadSummary();

    }, [period]);

    const metricCards = useMemo(() => {
        const m = summary.metrics;
        return [
            { label: 'Clientes activos', value: m.active_customers, hint: `${formatNumber(m.total_customers)} registrados`, icon: <FiUser />, tone: 'blue' },
            { label: 'Vehículos activos', value: m.active_vehicles, hint: `${formatNumber(m.total_vehicles)} registrados`, icon: <FiTruck />, tone: 'teal' },
            { label: 'Cotizaciones generadas', value: m.quotes_generated, hint: `${formatNumber(m.quotes_pending)} pendientes`, icon: <FiClipboard />, tone: 'indigo' },
            { label: 'Cotizaciones aprobadas', value: m.quotes_approved, hint: 'Listas para póliza', icon: <FiCheckCircle />, tone: 'green' },
            { label: 'Pólizas activas', value: m.active_policies, hint: `${formatNumber(m.draft_policies)} en borrador`, icon: <FiFileText />, tone: 'navy' },
            { label: 'Pendientes de documento', value: m.policies_pending_document, hint: 'Requieren seguimiento', icon: <FiClock />, tone: 'amber' },
            { label: 'Siniestros abiertos', value: m.open_claims, hint: 'En gestión', icon: <FiAlertTriangle />, tone: 'red' },
        ];
    }, [summary.metrics]);

    const businessIndicatorItems = useMemo(() => {
        const bi = summary.business_indicators;
        const sfx = { month: 'del mes', quarter: 'del trimestre', year: 'del año' }[period];
        return [
            { label: `Cotizaciones ${sfx}`, value: formatNumber(bi.quotes_count), icon: <FiBarChart2 /> },
            { label: `Aprobadas ${sfx}`, value: formatNumber(bi.approved_quotes_count), icon: <FiCheckCircle /> },
            { label: 'Tasa de conversión', value: formatPercent(bi.quote_conversion_rate), icon: <FiTrendingUp /> },
            { label: `Pólizas emitidas ${sfx}`, value: formatNumber(bi.policies_count), icon: <FiFileText /> },
            { label: `Siniestros ${sfx}`, value: formatNumber(bi.claims_count), icon: <FiAlertTriangle /> },
            { label: 'Valor asegurado activo', value: formatCurrency(bi.total_insured_value_active_policies), icon: <FiDollarSign /> },
            { label: 'Prima total activa', value: formatCurrency(bi.total_premium_active_policies), icon: <FiDollarSign /> },
        ];
    }, [summary.business_indicators, period]);

    const openResource = (resource: DashboardResource, id: number) => {
        navigate(getResourcePath(resource, id));
    };

    let activityContent;
    if (loading) {
        activityContent = <EmptyState text="Cargando actividad..." />;
    } else if (summary.recent_activity.length === 0) {
        activityContent = <EmptyState text="Sin actividad reciente." />;
    } else {
        activityContent = summary.recent_activity.map((activity) => (
            <ActivityItem
                key={`${activity.type}-${activity.resource}-${activity.resource_id}-${activity.created_at}`}
                activity={activity}
                onOpen={openResource}
            />
        ));
    }

    return (
        <div className="dashboard-page">
            <div className="dashboard-page__header">
                <div>
                    <h1>Resumen General</h1>
                    <p>Indicadores operativos y estado actual de la cartera.</p>
                </div>
                <button type="button" className="dashboard-refresh" onClick={loadSummary} disabled={loading}>
                    <FiRefreshCw aria-hidden="true" />
                    <span>{loading ? 'Actualizando' : 'Actualizar'}</span>
                </button>
            </div>

            {summary.quick_actions.length > 0 && (
                <nav className="dashboard-quick-actions" aria-label="Acciones rápidas">
                    {summary.quick_actions.map((action: DashboardQuickAction) => {
                        const config = QUICK_ACTION_CONFIG[action.key];
                        if (!config) return null;
                        return (
                            <button
                                key={action.key}
                                type="button"
                                className="dashboard-quick-action"
                                onClick={() => navigate(config.route)}
                            >
                                <span aria-hidden="true">{config.icon}</span>
                                {config.label}
                            </button>
                        );
                    })}
                </nav>
            )}

            {error ? <div className="dashboard-error" role="alert">{error}</div> : null}

            <section className="dashboard-metrics" aria-label="Métricas principales">
                {metricCards.map((card) => (
                    <article key={card.label} className={`dashboard-metric dashboard-metric--${card.tone}`}>
                        <div className="dashboard-metric__icon" aria-hidden="true">{card.icon}</div>
                        <div className="dashboard-metric__body">
                            <span>{card.label}</span>
                            <strong>{loading ? '...' : formatNumber(card.value)}</strong>
                            <small>{card.hint}</small>
                        </div>
                    </article>
                ))}
            </section>

            <section className="dashboard-panel" aria-label="Indicadores del período">
                <div className="dashboard-panel__header">
                    <div>
                        <h2>{formatPeriodHeading(period, summary.business_indicators)}</h2>
                        <p>Producción y valores del período seleccionado.</p>
                    </div>
                    <div className="dashboard-period-selector">
                        {(['month', 'quarter', 'year'] as DashboardPeriod[]).map(p => (
                            <button
                                key={p}
                                type="button"
                                className={`dashboard-period-btn${period === p ? ' dashboard-period-btn--active' : ''}`}
                                onClick={() => setPeriod(p)}
                            >
                                {PERIOD_LABELS[p]}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="dashboard-indicators-grid">
                    {businessIndicatorItems.map((item) => (
                        <div key={item.label} className="dashboard-indicator">
                            <span className="dashboard-indicator__icon" aria-hidden="true">{item.icon}</span>
                            <div>
                                <small>{item.label}</small>
                                <strong>{loading ? '...' : item.value}</strong>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <div className="dashboard-content-grid">
                <section className="dashboard-panel">
                    <div className="dashboard-panel__header">
                        <div>
                            <h2>Cotizaciones</h2>
                            <p>Distribución por estado.</p>
                        </div>
                        <FiBarChart2 aria-hidden="true" />
                    </div>
                    <QuoteStatusChart metrics={summary.metrics} loading={loading} />
                </section>

                <section className="dashboard-panel">
                    <div className="dashboard-panel__header">
                        <div>
                            <h2>Actividad reciente</h2>
                            <p>Últimos movimientos registrados.</p>
                        </div>
                        <FiActivity aria-hidden="true" />
                    </div>
                    <div className="dashboard-activity-grid">
                        {activityContent}
                    </div>
                </section>
            </div>
        </div>
    );
}

function EmptyState({ text }: Readonly<{ text: string }>) {
    return <div className="dashboard-empty">{text}</div>;
}

function ActivityItem({ activity, onOpen }: Readonly<{ activity: DashboardActivity; onOpen: (resource: DashboardResource, id: number) => void }>) {
    const title = ACTIVITY_LABELS[activity.type] ?? activity.type.replaceAll('_', ' ');
    return (
        <button
            type="button"
            className="dashboard-activity"
            onClick={() => onOpen(activity.resource, activity.resource_id)}
        >
            <span className="dashboard-activity__icon" aria-hidden="true"><FiActivity /></span>
            <span className="dashboard-activity__body">
                <strong>{title}</strong>
                <small>{activity.message}</small>
                <em>{formatDate(activity.created_at)}</em>
            </span>
            <FiChevronRight aria-hidden="true" />
        </button>
    );
}

const CHART_COLORS = {
    aprobadas: '#15803d',
    pendientes: '#d97706',
    otras: '#94a3b8',
};

function QuoteStatusChart({ metrics, loading }: Readonly<{ metrics: DashboardMetrics; loading: boolean }>) {
    const data = useMemo(() => {
        const otras = Math.max(0, metrics.quotes_generated - metrics.quotes_approved - metrics.quotes_pending);
        return [
            { name: 'Aprobadas', value: metrics.quotes_approved, fill: CHART_COLORS.aprobadas },
            { name: 'Pendientes', value: metrics.quotes_pending, fill: CHART_COLORS.pendientes },
            { name: 'Otras', value: otras, fill: CHART_COLORS.otras },
        ].filter(d => d.value > 0);
    }, [metrics]);

    if (loading) return <EmptyState text="Cargando..." />;
    if (metrics.quotes_generated === 0) return <EmptyState text="Sin cotizaciones registradas." />;

    return (
        <div className="dashboard-chart">
            <div className="dashboard-chart__center">
                <strong>{metrics.quotes_generated}</strong>
                <small>generadas</small>
            </div>
            <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={62}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                    />
                    <Tooltip
                        formatter={(value, name) => [value, name]}
                        contentStyle={{ fontSize: 13, borderRadius: 6, border: '1px solid #e2e8f0' }}
                    />
                    <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 13 }} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}