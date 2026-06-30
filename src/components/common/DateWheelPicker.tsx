/// <summary>
/// Componente DateWheelPicker.tsx
/// </summary>
import './DateWheelPicker.css';
import { useState, useRef, useEffect, useCallback } from 'react';

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const ITEM_H = 40;
const PADDING = 2;

function daysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

function WheelCol({
    items,
    selectedIndex,
    onSettle,
    colRef,
}: Readonly<{
    items: string[];
    selectedIndex: number;
    onSettle: (index: number) => void;
    colRef: React.RefObject<HTMLUListElement | null>;
}>) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const userScrolling = useRef(false);

    useEffect(() => {
        const el = colRef.current;
        if (!el || userScrolling.current) return;
        const target = selectedIndex * ITEM_H;
        if (Math.abs(el.scrollTop - target) > 4) {
            el.scrollTo({ top: target, behavior: 'smooth' });
        }
    }, [selectedIndex, colRef]);

    const handleScroll = useCallback(() => {
        userScrolling.current = true;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            userScrolling.current = false;
            const el = colRef.current;
            if (!el) return;
            const idx = Math.round(el.scrollTop / ITEM_H);
            const clamped = Math.max(0, Math.min(idx, items.length - 1));
            el.scrollTo({ top: clamped * ITEM_H, behavior: 'smooth' });
            onSettle(clamped);
        }, 120);
    }, [colRef, items.length, onSettle]);

    return (
        <ul ref={colRef} className="dwp-col" onScroll={handleScroll}>
            {Array.from({ length: PADDING }).map((_, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <li key={`pt${i}`} className="dwp-item dwp-item--pad" />
            ))}
            {items.map((label, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <li
                    key={label + i}
                    className={`dwp-item${i === selectedIndex ? ' dwp-item--sel' : ''}`}
                >
                    <button
                        type="button"
                        onClick={() => {
                            colRef.current?.scrollTo({ top: i * ITEM_H, behavior: 'smooth' });
                        }}
                        style={{
                            all: 'unset',
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        {label}
                    </button>
                </li>
            ))}
            {Array.from({ length: PADDING }).map((_, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <li key={`pb${i}`} className="dwp-item dwp-item--pad" />
            ))}
        </ul>
    );
}

interface DateWheelPickerProps {
    value: string | null | undefined;
    onChange: (value: string | null) => void;
    id?: string;
    placeholder?: string;
    minYear?: number;
    maxYear?: number;
    disabled?: boolean;
    clearable?: boolean;
}

export default function DateWheelPicker({
    value,
    onChange,
    id,
    placeholder = 'Seleccionar fecha',
    minYear = 2000,
    maxYear = new Date().getFullYear() + 5,
    disabled = false,
    clearable = false,
}: Readonly<DateWheelPickerProps>) {
    const [open, setOpen] = useState(false);
    const [day, setDay] = useState(1);
    const [month, setMonth] = useState(1);
    const [year, setYear] = useState(new Date().getFullYear());

    const dayRef = useRef<HTMLUListElement>(null);
    const monthRef = useRef<HTMLUListElement>(null);
    const yearRef = useRef<HTMLUListElement>(null);

    const initFromValue = useCallback((v: string | null | undefined) => {
        const today = new Date();
        if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
            const [y, m, d] = v.split('-').map(Number);
            setYear(Math.max(minYear, Math.min(maxYear, y)));
            setMonth(Math.max(1, Math.min(12, m)));
            setDay(Math.max(1, Math.min(31, d)));
        } else {
            setYear(today.getFullYear());
            setMonth(today.getMonth() + 1);
            setDay(today.getDate());
        }
    }, [minYear, maxYear]);

    const handleOpen = () => {
        if (disabled) return;
        initFromValue(value);
        setOpen(true);
    };

    useEffect(() => {
        if (!open) return;
        const t = setTimeout(() => {
            dayRef.current?.scrollTo({ top: (day - 1) * ITEM_H });
            monthRef.current?.scrollTo({ top: (month - 1) * ITEM_H });
            yearRef.current?.scrollTo({ top: (year - minYear) * ITEM_H });
        }, 40);
        return () => clearTimeout(t);
    }, [open]);

    const maxDay = daysInMonth(year, month);
    useEffect(() => {
        if (day > maxDay) setDay(maxDay);
    }, [month, year, maxDay, day]);

    const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => String(minYear + i));
    const days = Array.from({ length: maxDay }, (_, i) => String(i + 1).padStart(2, '0'));

    const handleConfirm = () => {
        const mm = String(month).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        onChange(`${year}-${mm}-${dd}`);
        setOpen(false);
    };

    const parsedDisplay = (() => {
        if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
        const [y, m, d] = value.split('-').map(Number);
        return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]?.slice(0, 3) ?? ''} ${y}`;
    })();

    return (
        <div className="dwp-root">
            {id && (
                <input
                    type="text"
                    id={id}
                    className="dwp-hidden-input"
                    value={value ?? ''}
                    onChange={e => onChange(e.target.value || null)}
                    tabIndex={-1}
                    readOnly={disabled}
                />
            )}
            <button type="button" className="dwp-trigger" onClick={handleOpen} disabled={disabled}>
                <span className={parsedDisplay ? 'dwp-trigger__text' : 'dwp-trigger__placeholder'}>
                    {parsedDisplay ?? placeholder}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {clearable && parsedDisplay && !disabled && (
                        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
                        <div
                            className="dwp-trigger__clear"
                            aria-label="Limpiar fecha"
                            onClick={e => { e.stopPropagation(); onChange(null); }}
                        >
                            ×
                        </div>
                    )}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" aria-hidden="true">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                </span>
            </button>

            {open && (
                // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
                <div className="dwp-overlay" onClick={() => setOpen(false)}>
                    {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
                    <div className="dwp-popup" onClick={e => e.stopPropagation()}>
                        <div className="dwp-popup-header">Seleccionar fecha</div>

                        <div className="dwp-col-labels">
                            <span>Día</span>
                            <span>Mes</span>
                            <span>Año</span>
                        </div>

                        <div className="dwp-wheels">
                            <div className="dwp-band" />
                            <WheelCol
                                colRef={dayRef}
                                items={days}
                                selectedIndex={day - 1}
                                onSettle={i => setDay(i + 1)}
                            />
                            <WheelCol
                                colRef={monthRef}
                                items={MONTHS}
                                selectedIndex={month - 1}
                                onSettle={i => setMonth(i + 1)}
                            />
                            <WheelCol
                                colRef={yearRef}
                                items={years}
                                selectedIndex={year - minYear}
                                onSettle={i => setYear(minYear + i)}
                            />
                        </div>

                        <div className="dwp-actions">
                            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
                                Cancelar
                            </button>
                            <button type="button" className="btn-primary" onClick={handleConfirm}>
                                Aceptar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}