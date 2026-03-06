import { useState, useEffect } from 'react';
import { mockService } from '../services/mockData';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatDateTime } from '../utils/dateUtils';

const AdminLogBook = () => {
    const { isAdmin, loading } = useAuth();
    const { t, language } = useLanguage();
    const [logs, setLogs] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

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

            <div className="card filter-card">
                <div className="filter-group">
                    <div className="filter-item">
                        <label>{t('log.startDate')}</label>
                        <input
                            type="date"
                            className="input-field"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="filter-item">
                        <label>{t('log.endDate')}</label>
                        <input
                            type="date"
                            className="input-field"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <button
                        className="btn btn-outline"
                        onClick={() => { setStartDate(''); setEndDate(''); }}
                    >
                        {t('common.clear')}
                    </button>
                </div>
            </div>

            <div className="card log-list-card">
                <div className="log-table-container">
                    <table className="log-table">
                        <thead>
                            <tr>
                                <th>{t('log.date')}</th>
                                <th>{t('log.user')}</th>
                                <th>{t('log.description')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const filtered = logs.filter(log => {
                                    if (!startDate && !endDate) return true;
                                    const logDate = new Date(log.timestamp);
                                    if (startDate && logDate < new Date(startDate + 'T00:00:00')) return false;
                                    if (endDate && logDate > new Date(endDate + 'T23:59:59')) return false;
                                    return true;
                                });

                                if (filtered.length === 0) {
                                    return (
                                        <tr>
                                            <td colSpan="3" className="text-center">{t('contributions.noHistory')}</td>
                                        </tr>
                                    );
                                }

                                return filtered.map(log => (
                                    <tr key={log.id}>
                                        <td className="log-date">
                                            {formatDateTime(log.timestamp, language)}
                                        </td>
                                        <td className="log-user">
                                            <span className="user-badge">{log.userName}</span>
                                        </td>
                                        <td className="log-desc">{log.description}</td>
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
                .filter-card {
                    margin-bottom: 1rem;
                    padding: 1rem 1.5rem;
                }
                .filter-group {
                    display: flex;
                    align-items: flex-end;
                    gap: 1.5rem;
                    flex-wrap: wrap;
                }
                .filter-item {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .filter-item label {
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                }
                .filter-item .input-field {
                    padding: 0.5rem;
                    border-radius: 0.5rem;
                    border: 1px solid var(--glass-border);
                    background: rgba(255, 255, 255, 0.05);
                    color: var(--text-primary);
                }
                .log-list-card {
                    margin-top: 1rem;
                    padding: 0;
                    overflow: hidden;
                }
                .log-table-container {
                    max-height: 600px;
                    overflow-y: auto;
                }
                .log-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                }
                .log-table thead {
                    position: sticky;
                    top: 0;
                    z-index: 10;
                    background: var(--bg-card);
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
