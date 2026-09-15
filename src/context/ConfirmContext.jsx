import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useLanguage } from './LanguageContext';

const ConfirmContext = createContext(null);

export const ConfirmProvider = ({ children }) => {
    const { t } = useLanguage();
    const [dialog, setDialog] = useState(null); // { type: 'confirm' | 'alert', message }
    const resolverRef = useRef(null);

    const confirm = useCallback((msg) => {
        return new Promise((resolve) => {
            resolverRef.current = resolve;
            setDialog({ type: 'confirm', message: msg });
        });
    }, []);

    const notify = useCallback((msg) => {
        return new Promise((resolve) => {
            resolverRef.current = resolve;
            setDialog({ type: 'alert', message: msg });
        });
    }, []);

    const handleResult = (result) => {
        setDialog(null);
        if (resolverRef.current) {
            resolverRef.current(result);
            resolverRef.current = null;
        }
    };

    return (
        <ConfirmContext.Provider value={{ confirm, alert: notify }}>
            {children}
            {dialog && (
                <div className="confirm-overlay" onClick={() => handleResult(dialog.type === 'confirm' ? false : undefined)}>
                    <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <p className="confirm-message">{dialog.message}</p>
                        <div className="confirm-actions">
                            {dialog.type === 'confirm' && (
                                <button className="btn btn-outline" onClick={() => handleResult(false)}>
                                    {t('common.cancel') || 'Cancel'}
                                </button>
                            )}
                            <button
                                className={dialog.type === 'confirm' ? 'btn btn-danger' : 'btn btn-primary-solid'}
                                onClick={() => handleResult(dialog.type === 'confirm' ? true : undefined)}
                                autoFocus
                            >
                                {dialog.type === 'confirm' ? (t('common.confirm') || 'Confirm') : 'OK'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style>{`
                .confirm-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 5000;
                    backdrop-filter: blur(3px);
                    animation: confirmFadeIn 0.15s ease-out;
                }
                .confirm-modal {
                    background: var(--bg-card, #1c1916);
                    border: 1px solid var(--glass-border, rgba(255,255,255,0.1));
                    border-radius: 0.75rem;
                    padding: 1.5rem;
                    max-width: 420px;
                    width: 90%;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                }
                .confirm-message {
                    color: var(--text-primary, #fff);
                    margin-bottom: 1.5rem;
                    line-height: 1.5;
                    white-space: pre-line;
                }
                .confirm-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.75rem;
                }
                .confirm-actions .btn-danger {
                    background: var(--danger, #ef4444);
                    color: white;
                    padding: 0.6rem 1.25rem;
                    border-radius: 0.5rem;
                    border: none;
                    cursor: pointer;
                }
                .confirm-actions .btn-danger:hover {
                    filter: brightness(1.1);
                }
                .confirm-actions .btn-primary-solid {
                    background: var(--primary, #d99a5b);
                    color: white;
                    padding: 0.6rem 1.25rem;
                    border-radius: 0.5rem;
                    border: none;
                    cursor: pointer;
                }
                .confirm-actions .btn-primary-solid:hover {
                    filter: brightness(1.1);
                }
                .confirm-actions .btn-outline {
                    padding: 0.6rem 1.25rem;
                    border-radius: 0.5rem;
                    cursor: pointer;
                }
                @keyframes confirmFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </ConfirmContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components -- hook lives alongside its provider by design
export const useConfirm = () => useContext(ConfirmContext).confirm;
// eslint-disable-next-line react-refresh/only-export-components -- hook lives alongside its provider by design
export const useAlert = () => useContext(ConfirmContext).alert;
