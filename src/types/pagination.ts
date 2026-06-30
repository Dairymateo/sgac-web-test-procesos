export type QueryValue = string | number | boolean | null | undefined;

export interface ListQueryParams {
    search?: string;
    page?: number;
    page_size?: number;
    ordering?: string;
    [key: string]: QueryValue;
}

export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}
