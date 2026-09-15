import { useState, useEffect, useMemo } from 'react';
import { mockService } from '../services/mockData';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatDateTime } from '../utils/dateUtils';

// Classifies a log entry by the leading verb in its description, for a quick-scan color badge.
const classifyLog = (description = '') => {
    const text = description.toLowerCase();
    if (/^(deleted|removed|unmarked|left)\b/.test(text)) return 'delete';
    if (/^(created|added|recorded|joined|issued)\b/.test(text)) return 'create';
    if (/^(updated|marked|activated|deactivated|saved)\b/.test(text)) return 'update';
    return 'other';
};

const AdminLogBook = () => {
    const { isAdmin, loading } = useAuth();
    const { t, language } = useLanguage();
    const [logs, setLogs] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [userEmailFilter, setUserEmailFilter] = useState('');

    const filteredLogs = useMemo(() => logs.filter(log => {
        const matchesDate = (() => {
            if (!startDate && !endDate) return true;
            const logDate = new Date(log.timestamp);
            if (startDate && logDate < new Date(startDate + 'T00:00:00')) return false;
            if (endDate && logDate > new Date(endDate + 'T23:59:59')) return false;
            return true;
        })();

        const matchesEmail = (() => {
            if (!userEmailFilter) return true;
            const search = userEmailFilter.toLowerCase();
            const name = (log.userName || '').toLowerCase();
            const email = (log.userEmail || '').toLowerCase();
            return name.includes(search) || email.includes(search);
        })();

        return matchesDate && matchesEmail;
    }), [logs, startDate, endDate, userEmailFilter]);

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
                    <div className="filter-item">
                        <label>{t('log.userEmail') || 'User Email'}</label>
                        <input
                            type="text"
                            className="input-field"
                            value={userEmailFilter}
                            onChange={(e) => setUserEmailFilter(e.target.value)}
                            placeholder="user@example.com"
                        />
                    </div>
                    <button
                        className="btn btn-outline"
                        onClick={() => { setStartDate(''); setEndDate(''); setUserEmailFilter(''); }}
                    >
                        {t('common.clear')}
                    </button>
                </div>
            </div>

            <p className="log-count">{t('log.resultsCount').replace('{count}', filteredLogs.length)}</p>

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
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="text-center">{t('contributions.noHistory')}</td>
                                </tr>
                            ) : (
                                filteredLogs.map(log => (
                                    <tr key={log.id}>
                                        <td className="log-date">
                                            {formatDateTime(log.timestamp, language)}
                                        </td>
                                        <td className="log-user">
                                            <span className="user-badge">{log.userName}</span>
                                        </td>
                                        <td className="log-desc">
                                            <span className={`action-dot ${classifyLog(log.description)}`}></span>
                                            {log.description}
                                        </td>
                                    </tr>
                                ))
                            )}
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
                .log-count {
                    color: var(--text-secondary);
                    font-size: 0.85rem;
                    margin: 0 0 0.75rem 0.25rem;
                }
                .action-dot {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    margin-right: 0.6rem;
                    flex-shrink: 0;
                }
                .action-dot.create {
                    background: var(--success, #22c55e);
                }
                .action-dot.update {
                    background: #f59e0b;
                }
                .action-dot.delete {
                    background: var(--danger, #ef4444);
                }
                .action-dot.other {
                    background: var(--text-secondary);
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
