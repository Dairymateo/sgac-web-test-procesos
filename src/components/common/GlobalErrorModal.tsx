/// <summary>
/// Componente GlobalErrorModal.tsx
/// </summary>
import { useEffect, useState } from 'react';
import { FiWifiOff, FiServer, FiXCircle } from 'react-icons/fi';
import './GlobalErrorModal.css';

export default function GlobalErrorModal() {
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        const handler = (e: Event) => {
            const customEvent = e as CustomEvent;
            setErrorMsg(customEvent.detail || 'Ocurrió un error de conexión.');
        };
        globalThis.addEventListener('global_api_error', handler);
        return () => globalThis.removeEventListener('global_api_error', handler);
    }, []);

    if (!errorMsg) return null;

    const isNetwork = errorMsg.toLowerCase().includes('conexión');

    return (
        <div className="global-error-overlay">
            <dialog open className="global-error-dialog" aria-modal="true">
                <button className="global-error-close" onClick={() => setErrorMsg(null)} aria-label="Cerrar">
                    <FiXCircle />
                </button>
                <div className="global-error-icon" aria-hidden="true">
                    {isNetwork ? <FiWifiOff /> : <FiServer />}
                </div>
                <h2 className="global-error-title">Problema de conexión</h2>
                <p className="global-error-desc">{errorMsg}</p>
                <button className="global-error-btn" onClick={() => setErrorMsg(null)}>
                    Entendido
                </button>
            </dialog>
        </div>
    );
}