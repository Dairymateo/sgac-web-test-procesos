import type { ListQueryParams, PaginatedResponse, QueryValue } from '../types/pagination';

export const DEFAULT_PAGE_SIZE = 20;

export function buildQueryString(params: ListQueryParams = {}): string {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(params) as [string, QueryValue][]) {
        if (value === undefined || value === null || value === '') continue;
        query.set(key, String(value));
    }

    const serialized = query.toString();
    return serialized ? `?${serialized}` : '';
}

export function normalizePaginatedResponse<T>(data: T[] | PaginatedResponse<T>): PaginatedResponse<T> {
    if (Array.isArray(data)) {
        return {
            count: data.length,
            next: null,
            previous: null,
            results: data,
        };
    }

    return {
        count: data.count ?? (Array.isArray(data.results) ? data.results.length : 0),
        next: data.next ?? null,
        previous: data.previous ?? null,
        results: Array.isArray(data.results) ? data.results : [],
    };
}

export function getTotalPages(count: number, pageSize: number): number {
    return Math.max(1, Math.ceil(count / pageSize));
}

