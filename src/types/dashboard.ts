export type DashboardAlertSeverity = 'info' | 'warning' | 'critical' | 'success';

export type DashboardResource =
    | 'customer'
    | 'vehicle'
    | 'quote'
    | 'policy'
    | 'claim'
    | 'insurer'
    | 'workshop'
    | (string & {});

export type DashboardQuickActionKey =
    | 'new_quote'
    | 'new_customer'
    | 'pending_policies'
    | 'open_claims'
    | (string & {});

export interface DashboardQuickAction {
    key: DashboardQuickActionKey;
    label: string;
    resource: string;
    target: string;
}

export interface DashboardMetrics {
    total_customers: number;
    active_customers: number;
    total_vehicles: number;
    active_vehicles: number;
    quotes_generated: number;
    quotes_pending: number;
    quotes_approved: number;
    active_policies: number;
    draft_policies: number;
    policies_pending_document: number;
    open_claims: number;
}

export type DashboardPeriod = 'month' | 'quarter' | 'year';

export interface DashboardBusinessIndicators {
    period: DashboardPeriod;
    period_start: string;
    period_end: string;
    quotes_count: number;
    approved_quotes_count: number;
    quote_conversion_rate: string;
    policies_count: number;
    claims_count: number;
    total_insured_value_active_policies: string;
    total_premium_active_policies: string;
}

export interface DashboardAlert {
    type: string;
    title: string;
    message: string;
    resource: DashboardResource;
    resource_id: number;
    due_date: string | null;
    severity: DashboardAlertSeverity;
}

export interface DashboardActivity {
    type: string;
    message: string;
    resource: DashboardResource;
    resource_id: number;
    created_at: string;
}

export interface DashboardSummary {
    metrics: DashboardMetrics;
    business_indicators: DashboardBusinessIndicators;
    alerts: DashboardAlert[];
    recent_activity: DashboardActivity[];
    quick_actions: DashboardQuickAction[];
}
