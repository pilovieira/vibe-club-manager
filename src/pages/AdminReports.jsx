import { useState, useEffect, useMemo } from 'react';
import { mockService } from '../services/mockData';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { formatDate } from '../utils/dateUtils';
import { formatCurrency } from '../utils/currency';
import { FaPrint, FaFileInvoiceDollar } from 'react-icons/fa';

const toISODate = (d) => d.toISOString().slice(0, 10);

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

const AdminReports = () => {
    const { loading } = useAuth();
    const { t, language } = useLanguage();

    const [members, setMembers] = useState([]);
    const [contributions, setContributions] = useState([]);
    const [globalTxs, setGlobalTxs] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);

    const today = new Date();
    const [startDate, setStartDate] = useState(toISODate(startOfMonth(today)));
    const [endDate, setEndDate] = useState(toISODate(today));

    useEffect(() => {
        const fetchData = async () => {
            setDataLoading(true);
            try {
                const [membersData, contributionsData, globalTxData] = await Promise.all([
                    mockService.getMembers(),
                    mockService.getAllContributions(),
                    mockService.getGlobalTransactions()
                ]);
                setMembers(membersData);
                setContributions(contributionsData);
                setGlobalTxs(globalTxData);
            } catch (err) {
                console.error('Error fetching report data:', err);
            } finally {
                setDataLoading(false);
            }
        };
        fetchData();
    }, []);

    const applyQuickRange = (rangeType) => {
        const now = new Date();
        let start, end;
        switch (rangeType) {
            case 'thisMonth':
                start = startOfMonth(now);
                end = endOfMonth(now);
                break;
            case 'last3':
                start = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 2, 1));
                end = endOfMonth(now);
                break;
            case 'last6':
                start = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 5, 1));
                end = endOfMonth(now);
                break;
            case 'thisYear':
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear(), 11, 31);
                break;
            default:
                return;
        }
        setStartDate(toISODate(start));
        setEndDate(toISODate(end));
    };

    const rangeContributions = useMemo(
        () => contributions.filter(c => c.date && c.date >= startDate && c.date <= endDate),
        [contributions, startDate, endDate]
    );

    const rangeGlobalTxs = useMemo(
        () => globalTxs.filter(tx => tx.date && tx.date >= startDate && tx.date <= endDate),
        [globalTxs, startDate, endDate]
    );

    const totalContributions = rangeContributions.reduce((acc, c) => acc + Number(c.amount || 0), 0);
    const totalRevenue = rangeGlobalTxs.filter(tx => tx.type === 'revenue').reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
    const totalExpenses = rangeGlobalTxs.filter(tx => tx.type === 'expense').reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
    const totalIncome = totalContributions + totalRevenue;
    const netBalance = totalIncome - totalExpenses;

    // Per-member breakdown
    const memberBreakdown = useMemo(() => {
        return members.map(member => {
            const memberContribs = rangeContributions.filter(c => (c.member_id || c.memberId) === member.id);
            const total = memberContribs.reduce((acc, c) => acc + Number(c.amount || 0), 0);
            return {
                id: member.id,
                name: member.name,
                avatar: member.avatar,
                count: memberContribs.length,
                total
            };
        }).sort((a, b) => b.total - a.total);
    }, [members, rangeContributions]);

    // Per-month breakdown within range
    const monthBreakdown = useMemo(() => {
        const map = {};
        rangeContributions.forEach(c => {
            const key = c.date.slice(0, 7);
            if (!map[key]) map[key] = { key, total: 0, count: 0 };
            map[key].total += Number(c.amount || 0);
            map[key].count += 1;
        });
        return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
    }, [rangeContributions]);

    const monthLabel = (yyyymm) => {
        const [y, m] = yyyymm.split('-');
        const d = new Date(parseInt(y), parseInt(m) - 1, 1);
        return d.toLocaleString(language, { month: 'long', year: 'numeric' });
    };

    const handlePrint = () => window.print();

    if (loading || dataLoading) {
        return <div className="container" style={{ paddingTop: '2rem' }}>{t('common.loading')}...</div>;
    }

    return (
        <div className="container admin-reports-page">
            <header className="page-header">
                <h1 className="page-title"><FaFileInvoiceDollar style={{ marginRight: '0.5rem' }} />{t('report.title')}</h1>
                <button className="btn btn-outline" onClick={handlePrint}>
                    <FaPrint style={{ marginRight: '0.5rem' }} />{t('report.print')}
                </button>
            </header>

            <div className="card controls-card no-print">
                <div className="date-inputs">
                    <div className="form-group">
                        <label>{t('report.startDate')}</label>
                        <input
                            type="date"
                            className="input-field"
                            value={startDate}
                            max={endDate}
                            onChange={e => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>{t('report.endDate')}</label>
                        <input
                            type="date"
                            className="input-field"
                            value={endDate}
                            min={startDate}
                            onChange={e => setEndDate(e.target.value)}
                        />
                    </div>
                </div>
                <div className="quick-ranges">
                    <span className="quick-label">{t('report.quickRanges')}:</span>
                    <button className="btn btn-sm" onClick={() => applyQuickRange('thisMonth')}>{t('report.thisMonth')}</button>
                    <button className="btn btn-sm" onClick={() => applyQuickRange('last3')}>{t('report.last3Months')}</button>
                    <button className="btn btn-sm" onClick={() => applyQuickRange('last6')}>{t('report.last6Months')}</button>
                    <button className="btn btn-sm" onClick={() => applyQuickRange('thisYear')}>{t('report.thisYear')}</button>
                </div>
            </div>

            <div className="print-header">
                <h2>{t('report.period')}: {formatDate(startDate, language)} - {formatDate(endDate, language)}</h2>
            </div>

            <div className="summary-cards">
                <div className="summary-card income">
                    <span className="summary-label">{t('report.totalIncome')}</span>
                    <span className="summary-value">{formatCurrency(totalIncome)}</span>
                </div>
                <div className="summary-card expense">
                    <span className="summary-label">{t('report.totalExpenses')}</span>
                    <span className="summary-value">{formatCurrency(totalExpenses)}</span>
                </div>
                <div className={`summary-card net ${netBalance >= 0 ? 'positive' : 'negative'}`}>
                    <span className="summary-label">{t('report.netBalance')}</span>
                    <span className="summary-value">{formatCurrency(netBalance)}</span>
                </div>
                <div className="summary-card contributions">
                    <span className="summary-label">{t('report.contributionsCollected')}</span>
                    <span className="summary-value">{formatCurrency(totalContributions)}</span>
                </div>
            </div>

            <div className="card section">
                <h2 className="section-title">{t('report.monthlyBreakdown')}</h2>
                {monthBreakdown.length === 0 ? (
                    <p className="text-secondary text-center">{t('report.noData')}</p>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>{t('monthly.month')}</th>
                                <th>{t('report.paymentsCount')}</th>
                                <th>{t('report.totalCollected')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {monthBreakdown.map(m => (
                                <tr key={m.key}>
                                    <td style={{ textTransform: 'capitalize' }}>{monthLabel(m.key)}</td>
                                    <td>{m.count}</td>
                                    <td>{formatCurrency(m.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="card section">
                <h2 className="section-title">{t('report.memberBreakdown')}</h2>
                {memberBreakdown.filter(m => m.count > 0).length === 0 ? (
                    <p className="text-secondary text-center">{t('report.noData')}</p>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>{t('monthly.member')}</th>
                                <th>{t('report.paymentsCount')}</th>
                                <th>{t('report.totalCollected')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {memberBreakdown.filter(m => m.count > 0).map(m => (
                                <tr key={m.id}>
                                    <td>{m.name}</td>
                                    <td>{m.count}</td>
                                    <td>{formatCurrency(m.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="card section no-print">
                <h2 className="section-title">{t('report.transactionsInPeriod')}</h2>
                {rangeGlobalTxs.length === 0 ? (
                    <p className="text-secondary text-center">{t('report.noData')}</p>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>{t('balance.date')}</th>
                                <th>{t('balance.description')}</th>
                                <th>{t('balance.type')}</th>
                                <th>{t('balance.amount')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rangeGlobalTxs.map(tx => (
                                <tr key={tx.id}>
                                    <td>{formatDate(tx.date, language)}</td>
                                    <td>{tx.description}</td>
                                    <td>{tx.type === 'expense' ? t('balance.expense') : t('balance.revenue')}</td>
                                    <td style={{ color: tx.type === 'expense' ? 'var(--danger)' : 'var(--success)' }}>
                                        {tx.type === 'expense' ? '-' : ''}{formatCurrency(tx.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <style>{`
                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                }
                .controls-card {
                    margin-bottom: 1.5rem;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 1.5rem;
                    align-items: center;
                    justify-content: space-between;
                }
                .date-inputs {
                    display: flex;
                    gap: 1rem;
                }
                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }
                .form-group label {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                }
                .quick-ranges {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }
                .quick-label {
                    color: var(--text-secondary);
                    font-size: 0.85rem;
                    margin-right: 0.25rem;
                }
                .btn-sm {
                    padding: 0.4rem 0.75rem;
                    font-size: 0.85rem;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid var(--glass-border);
                    color: var(--text-primary);
                    border-radius: 0.375rem;
                    cursor: pointer;
                }
                .btn-sm:hover {
                    background: var(--primary);
                    border-color: var(--primary);
                }
                .print-header {
                    display: none;
                }
                .summary-cards {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1rem;
                    margin-bottom: 2rem;
                }
                .summary-card {
                    background: var(--bg-card);
                    border: 1px solid var(--glass-border);
                    border-radius: 0.75rem;
                    padding: 1.25rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .summary-label {
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    color: var(--text-secondary);
                    letter-spacing: 0.05em;
                }
                .summary-value {
                    font-size: 1.75rem;
                    font-weight: 700;
                }
                .summary-card.income .summary-value { color: var(--success); }
                .summary-card.expense .summary-value { color: var(--danger); }
                .summary-card.net.positive .summary-value { color: var(--success); }
                .summary-card.net.negative .summary-value { color: var(--danger); }
                .section {
                    margin-bottom: 2rem;
                }
                .section-title {
                    font-size: 1.1rem;
                    margin-bottom: 1rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 1px solid var(--glass-border);
                }
                .data-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .data-table th, .data-table td {
                    padding: 0.75rem 1rem;
                    text-align: left;
                    border-bottom: 1px solid var(--glass-border);
                }

                @media print {
                    .no-print { display: none !important; }
                    .print-header { display: block; margin-bottom: 1.5rem; }
                    .navbar, header.page-header { display: none !important; }
                    body { background: white; color: black; }
                    .card, .summary-card { border: 1px solid #ccc; background: white; color: black; }
                }
            `}</style>
        </div>
    );
};

export default AdminReports;
