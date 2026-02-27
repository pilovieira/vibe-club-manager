import { useState, useEffect } from 'react';
import { mockService } from '../services/mockData';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const AdminLogBook = () => {
    const { isAdmin, loading } = useAuth();
    const { t } = useLanguage();
    const [logs, setLogs] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const data = await mockService.getLogs();
                setLogs(data);
            } catch (err) {
                console.error('Error fetching logs:', err);
            } finally {
                setDataLoading(false);
            }
        };
        fetchLogs();
    }, []);

    if (loading || dataLoading) {
        return <div className="container" style={{ paddingTop: '2rem' }}>{t('common.loading')}...</div>;
    }

    if (!isAdmin) {
        return (
            <div className="container" style={{ paddingTop: '2rem' }}>
                <h2>{t('admin.accessDenied')}</h2>
                <p>{t('admin.accessDeniedMsg')}</p>
            </div>
        );
    }

    return (
        <div className="container logbook-page">
            <header className="page-header">
                <h1 className="page-title">{t('admin.logBook')}</h1>
            </header>

            <div className="card log-list-card">
                <table className="log-table">
                    <thead>
                        <tr>
                            <th>{t('log.date')}</th>
                            <th>{t('log.user')}</th>
                            <th>{t('log.description')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan="3" className="text-center">{t('contributions.noHistory')}</td>
                            </tr>
                        ) : (
                            logs.map(log => (
                                <tr key={log.id}>
                                    <td className="log-date">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td className="log-user">
                                        <span className="user-badge">{log.userName}</span>
                                    </td>
                                    <td className="log-desc">{log.description}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <style>{`
                .log-list-card {
                    margin-top: 1rem;
                    padding: 0;
                    overflow: hidden;
                }
                .log-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .log-table th, .log-table td {
                    padding: 1rem;
                    text-align: left;
                    border-bottom: 1px solid var(--glass-border);
                }
                .log-table th {
                    background: rgba(255, 255, 255, 0.03);
                    font-weight: 600;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    font-size: 0.8rem;
                    letter-spacing: 0.05em;
                }
                .log-date {
                    font-size: 0.9rem;
                    white-space: nowrap;
                    color: var(--text-secondary);
                }
                .user-badge {
                    background: var(--primary-glow);
                    color: var(--primary);
                    padding: 0.25rem 0.5rem;
                    border-radius: 0.25rem;
                    font-size: 0.85rem;
                    font-weight: 500;
                }
                .log-desc {
                    color: var(--text-primary);
                }
                .text-center {
                    text-align: center;
                }
                @media (max-width: 768px) {
                    .log-table th, .log-table td {
                        padding: 0.75rem;
                    }
                    .log-date {
                        font-size: 0.8rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default AdminLogBook;
