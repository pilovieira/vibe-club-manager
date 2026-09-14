import { useState, useEffect, useMemo } from 'react';
import { mockService } from '../services/mockData';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useConfirm } from '../context/ConfirmContext';
import { getLocale } from '../utils/dateUtils';
import { formatCurrency } from '../utils/currency';
import { Link } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa';

const AdminMonthlySummary = () => {
    const { user, isFinance, loading } = useAuth();
    const { t, language } = useLanguage();
    const confirm = useConfirm();
    const [members, setMembers] = useState([]);
    const [contributions, setContributions] = useState([]);
    const now = new Date();
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12
    const [monthlyContribution, setMonthlyContribution] = useState(50);
    const [search, setSearch] = useState('');

    const selectedDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const fetchedMembers = await mockService.getMembers();
                setMembers(fetchedMembers);
                const fetchedContributions = await mockService.getAllContributions();
                setContributions(fetchedContributions);
                const value = await mockService.getProperty('monthly_contribution_value', 50);
                setMonthlyContribution(value);
            } catch (err) {
                console.error('Error fetching summary data:', err);
            }
        };
        fetchData();
    }, [loading, isFinance]);

    const locale = getLocale(language);
    const monthOptions = useMemo(() => (
        Array.from({ length: 12 }, (_, i) => {
            const label = new Date(2000, i, 1).toLocaleString(locale, { month: 'long' });
            return { value: i + 1, label: label.charAt(0).toUpperCase() + label.slice(1) };
        })
    ), [locale]);

    const yearOptions = useMemo(() => {
        const current = new Date().getFullYear();
        return Array.from({ length: 6 }, (_, i) => current - 4 + i);
    }, []);

    const monthName = monthOptions.find(m => m.value === selectedMonth)?.label || '';

    const refreshContributions = async () => {
        const updated = await mockService.getAllContributions();
        setContributions(updated);
    };

    const eligibleMembers = members.filter(member => {
        if (member.isExempt) return false;
        if (!member.joinDate) return true;
        const joinYYYYMM = member.joinDate.slice(0, 7);
        return joinYYYYMM <= selectedDate;
    });

    const allRows = eligibleMembers.map(member => {
        const contribution = contributions.find(c => {
            const cMemberId = c.member_id || c.memberId;
            if (cMemberId !== member.id) return false;
            if (!c.date) return false;
            const [cYear, cMonth] = c.date.split('-');
            return cYear === String(selectedYear) && cMonth === String(selectedMonth).padStart(2, '0');
        });
        return { member, contribution, isPaid: !!contribution };
    });

    const rows = allRows
        .filter(row => row.member.name?.toLowerCase().includes(search.toLowerCase().trim()))
        // Pending members first so the person collecting dues can act on them right away.
        .sort((a, b) => Number(a.isPaid) - Number(b.isPaid));

    // Stats always reflect every eligible member, regardless of the search filter.
    const paidCount = allRows.filter(r => r.isPaid).length;
    const totalCollected = allRows.reduce((sum, r) => sum + (r.isPaid ? Number(r.contribution.amount) || 0 : 0), 0);
    const totalExpected = eligibleMembers.length * monthlyContribution;

    if (loading) {
        return <div className="container" style={{ paddingTop: '2rem' }}>{t('common.loading')}...</div>;
    }

    const handleTogglePayment = async (row) => {
        if (!isFinance) return;
        const { member, contribution, isPaid } = row;

        if (isPaid) {
            if (await confirm(t('contributions.confirmDelete'))) {
                try {
                    await mockService.deleteContribution(contribution.id);
                    await refreshContributions();
                    await mockService.createLog({
                        userId: user.id || user.uid,
                        userName: user.name || user.displayName || user.email,
                        description: `Unmarked ${member.name} as paid for ${monthName} ${selectedYear}`
                    });
                } catch (err) {
                    console.error('Error removing payment:', err);
                }
            }
        } else {
            if (await confirm(t('monthly.confirmMarkPaid').replace('{name}', member.name).replace('{month}', monthName))) {
                try {
                    await mockService.addContribution({
                        member_id: member.id,
                        date: `${selectedDate}-10`,
                        amount: monthlyContribution,
                        description: t('monthly.defaultDescription')
                    });
                    await refreshContributions();
                    await mockService.createLog({
                        userId: user.id || user.uid,
                        userName: user.name || user.displayName || user.email,
                        description: `Marked ${member.name} as paid for ${monthName} ${selectedYear}`
                    });
                } catch (err) {
                    console.error('Error adding payment:', err);
                }
            }
        }
    };

    return (
        <div className="container admin-summary-page">
            <header className="page-header">
                <h1 className="page-title">{t('monthly.title')}</h1>
                <div className="header-actions">
                    <Link to="/admin/member-contributions" className="btn btn-outline">{t('contributions.title')}</Link>
                    <Link to="/admin/annual-dues" className="btn btn-outline">{t('admin.annualDues')}</Link>
                </div>
            </header>

            <div className="controls-section card">
                <div className="month-picker">
                    <label>{t('monthly.month')}:</label>
                    <select className="input-field" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
                        {monthOptions.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                    <select className="input-field year-select" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                        {yearOptions.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
                <div className="search-box">
                    <FaSearch className="search-icon" />
                    <input
                        type="text"
                        className="input-field"
                        placeholder={t('monthly.searchMember')}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="stats-row">
                <div className="stat-card">
                    <span className="stat-value">{paidCount}/{eligibleMembers.length}</span>
                    <span className="stat-label">{t('monthly.paidCount')}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value success">{formatCurrency(totalCollected)}</span>
                    <span className="stat-label">{t('monthly.totalCollected')}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">{formatCurrency(totalExpected)}</span>
                    <span className="stat-label">{t('monthly.totalExpected')}</span>
                </div>
            </div>

            <div className="summary-grid">
                <h2 className="summary-title">{t('monthly.statusFor')} {monthName} {selectedYear}</h2>

                <div className="members-status-list">
                    {rows.length === 0 && (
                        <p className="no-results">{t('monthly.noMembersFound')}</p>
                    )}
                    {rows.map(row => (
                        <div
                            key={row.member.id}
                            className={`status-card ${row.isPaid ? 'paid' : 'unpaid'} ${isFinance ? 'clickable' : ''}`}
                            onClick={() => handleTogglePayment(row)}
                            title={isFinance ? (row.isPaid ? t('common.delete') : t('contributions.recordPayment')) : (row.isPaid ? t('monthly.paid') : t('monthly.pending'))}
                        >
                            <div className="member-info">
                                <img src={row.member.avatar} alt="avatar" className="mini-avatar" />
                                <span className="member-name">{row.member.name}</span>
                            </div>
                            <div className="status-indicator">
                                {row.isPaid ? (
                                    <div className="icon-check">✓ {t('monthly.paid')}</div>
                                ) : (
                                    <div className="icon-cross">✕ {t('monthly.pending')}</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
        .controls-section {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 1.5rem;
            margin-bottom: 1.5rem;
        }
        .month-picker {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        .month-picker .input-field {
            width: auto;
        }
        .year-select {
            width: 90px !important;
        }
        .search-box {
            position: relative;
            min-width: 220px;
        }
        .search-icon {
            position: absolute;
            left: 0.9rem;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-secondary);
            font-size: 0.85rem;
        }
        .search-box .input-field {
            padding-left: 2.25rem;
            width: 100%;
        }
        .stats-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .stat-card {
            background: var(--bg-card);
            border: 1px solid var(--glass-border);
            border-radius: 0.75rem;
            padding: 1rem 1.25rem;
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }
        .stat-value {
            font-size: 1.5rem;
            font-weight: 800;
            color: var(--text-primary);
        }
        .stat-value.success {
            color: var(--success);
        }
        .stat-label {
            font-size: 0.8rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }
        .summary-title {
            margin-bottom: 1.5rem;
            border-bottom: 1px solid var(--glass-border);
            padding-bottom: 0.5rem;
        }
        .members-status-list {
            display: grid;
            gap: 1rem;
        }
        .no-results {
            color: var(--text-secondary);
            font-style: italic;
            padding: 1rem 0;
        }
        .status-card {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 1.5rem;
            background: var(--bg-card);
            border: 1px solid var(--glass-border);
            border-radius: 0.5rem;
            transition: all 0.3s;
        }
        .status-card.clickable {
            cursor: pointer;
        }
        .status-card.clickable:hover {
            transform: scale(1.02);
            filter: brightness(1.1);
        }
        .status-card.paid {
            border-left: 4px solid var(--success);
        }
        .status-card.unpaid {
            border-left: 4px solid var(--danger);
            opacity: 0.9;
        }
        .member-info {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .mini-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
        }
        .member-name {
            font-weight: 500;
            font-size: 1.1rem;
        }
        .icon-check {
            color: var(--success);
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .icon-cross {
            color: var(--danger);
            font-weight: 700;
             display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        @media (max-width: 640px) {
            .controls-section {
                flex-direction: column;
                align-items: stretch;
            }
            .search-box {
                min-width: 0;
            }
        }
      `}</style>
        </div>
    );
};

export default AdminMonthlySummary;
