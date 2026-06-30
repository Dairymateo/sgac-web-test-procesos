/// <summary>
/// Componente ListControls.tsx
/// </summary>
import './ListControls.css';
import type { ReactNode } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import { DEFAULT_PAGE_SIZE, getTotalPages } from '../../utils/pagination';

interface OrderingOption {
    value: string;
    label: string;
}

interface ListControlsProps {
    search: string;
    onSearchChange: (value: string) => void;
    onSubmit: () => void;
    onClear: () => void;
    searchPlaceholder?: string;
    filters?: ReactNode;
    ordering?: string;
    orderingOptions?: OrderingOption[];
    onOrderingChange?: (value: string) => void;
    hasActiveFilters?: boolean;

    page?: number;
    pageSize?: number;
    count?: number;
    onPageChange?: (page: number) => void;
}

interface ListPaginationProps {
    page: number;
    count: number;
    pageSize?: number;
    onPageChange: (page: number) => void;
}

export function ListPagination({ page, count, pageSize = DEFAULT_PAGE_SIZE, onPageChange }: Readonly<ListPaginationProps>) {
    const totalPages = getTotalPages(count, pageSize);
    return (
        <div className="list-controls__pagination list-controls__pagination--bottom">
            <span>Página {page} de {totalPages} · {count} registros</span>
            <button
                type="button"
                className="list-controls__page-btn"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
            >
                Anterior
            </button>
            <button
                type="button"
                className="list-controls__page-btn"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
            >
                Siguiente
            </button>
        </div>
    );
}

export default function ListControls({
    search,
    onSearchChange,
    onSubmit,
    onClear,
    searchPlaceholder = 'Buscar...',
    filters,
    ordering,
    orderingOptions = [],
    onOrderingChange,
    hasActiveFilters,
    page,
    pageSize = DEFAULT_PAGE_SIZE,
    count,
    onPageChange,
}: Readonly<ListControlsProps>) {
    const showLegacyPagination = page !== undefined && count !== undefined && onPageChange !== undefined;

    return (
        <div className="list-controls">
            <form
                className="list-controls__form"
                onSubmit={(event) => {
                    event.preventDefault();
                    onSubmit();
                }}
            >
                <div className="list-controls__field list-controls__field--search">
                    <label htmlFor="list-search">Buscar</label>
                    <input
                        id="list-search"
                        type="search"
                        value={search}
                        onChange={(event) => onSearchChange(event.target.value)}
                        placeholder={searchPlaceholder}
                    />
                </div>

                {filters}

                {orderingOptions.length > 0 && onOrderingChange && (
                    <div className="list-controls__field">
                        <label htmlFor="list-ordering">Ordenar por</label>
                        <select
                            id="list-ordering"
                            value={ordering}
                            onChange={(event) => onOrderingChange(event.target.value)}
                        >
                            {orderingOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="list-controls__actions">
                    <button type="submit" className="btn-primary">
                        <FiSearch aria-hidden="true" />
                        <span>Buscar</span>
                    </button>
                    {(hasActiveFilters === undefined || hasActiveFilters) && (
                        <button type="button" className="btn-secondary" onClick={onClear}>
                            <FiX aria-hidden="true" />
                            <span>Limpiar</span>
                        </button>
                    )}
                </div>
            </form>

            {showLegacyPagination && (
                <ListPagination
                    page={page}
                    count={count}
                    pageSize={pageSize}
                    onPageChange={onPageChange}
                />
            )}
        </div>
    );
}