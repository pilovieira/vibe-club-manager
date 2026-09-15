import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { mockService } from '../services/mockData';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { useConfirm } from '../context/ConfirmContext';
import { getLocale } from '../utils/dateUtils';
import { formatCurrency } from '../utils/currency';
import { FaPrint, FaCertificate, FaFileInvoiceDollar } from 'react-icons/fa';
import { APP_NAME } from '../constants';
import { translations } from '../i18n/translations';

const monthKey = (year, month) => `${year}-${String(month).padStart(2, '0')}`;

// A contribution only counts as a monthly-dues payment when its description is blank
// or matches the default dues description text (in any app language, since existing
// records may have been created under a different locale). Anything else is a
// contribution made for another purpose and must not fill a dues month on this screen.
const DUES_DESCRIPTIONS = new Set(
    Object.values(translations).map(block => block['monthly.defaultDescription'])
);
const isDuesContribution = (c) => !c.description || DUES_DESCRIPTIONS.has(c.description);

const AdminAnnualDues = () => {
    const { user, isFinance, loading } = useAuth();
    const { t, language } = useLanguage();
    const { settings } = useSettings();
    const confirm = useConfirm();

    const [members, setMembers] = useState([]);
    const [contributions, setContributions] = useState([]);
    const [monthlyContribution, setMonthlyContribution] = useState(50);
    const [dataLoading, setDataLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMemberId, setSelectedMemberId] = useState('');
    const [showCertificate, setShowCertificate] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setDataLoading(true);
            try {
                const [membersData, contributionsData, value] = await Promise.all([
                    mockService.getMembers(),
                    mockService.getAllContributions(),
                    mockService.getProperty('monthly_contribution_value', 50)
                ]);
                setMembers(membersData);
                setContributions(contributionsData);
                setMonthlyContribution(value);
            } catch (err) {
                console.error('Error fetching annual dues data:', err);
            } finally {
                setDataLoading(false);
            }
        };
        fetchData();
    }, []);

    const locale = getLocale(language);
    const currentMonthKey = monthKey(new Date().getFullYear(), new Date().getMonth() + 1);

    const monthShortLabels = useMemo(() => (
        Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleString(locale, { month: 'short' }).replace('.', ''))
    ), [locale]);

    const monthLongLabel = (m) => {
        const label = new Date(2000, m - 1, 1).toLocaleString(locale, { month: 'long' });
        return label.charAt(0).toUpperCase() + label.slice(1);
    };

    const yearOptions = useMemo(() => {
        const current = new Date().getFullYear();
        return Array.from({ length: 6 }, (_, i) => current - 4 + i);
    }, []);

    const findContribution = (memberId, year, month) => contributions.find(c => {
        const cMemberId = c.member_id || c.memberId;
        if (cMemberId !== memberId || !c.date || !isDuesContribution(c)) return false;
        return c.date.slice(0, 7) === monthKey(year, month);
    });

    // Builds the 12-month payment status for one member in the selected year.
    // "payable" months are any month from when they joined onward, including months still
    // in the future — members are allowed to pay ahead. "eligible" months are the subset
    // that's actually due as of today, used for compliance/certificate checks so a future
    // prepayment never masks a still-outstanding past month.
    const buildMemberYear = (member) => {
        const joinYYYYMM = member.joinDate ? member.joinDate.slice(0, 7) : null;
        const months = Array.from({ length: 12 }, (_, i) => {
            const m = i + 1;
            const key = monthKey(selectedYear, m);
            const payable = !joinYYYYMM || joinYYYYMM <= key;
            const eligible = payable && key <= currentMonthKey;
            const contribution = payable ? findContribution(member.id, selectedYear, m) : null;
            return { month: m, key, payable, eligible, isFuture: payable && !eligible, isPaid: !!contribution, contribution };
        });
        const eligibleMonths = months.filter(m => m.eligible);
        const paidEligibleMonths = eligibleMonths.filter(m => m.isPaid);
        const allPaidMonths = months.filter(m => m.isPaid);
        const totalPaid = allPaidMonths.reduce((sum, m) => sum + (Number(m.contribution.amount) || 0), 0);
        return { member, months, eligibleCount: eligibleMonths.length, paidCount: paidEligibleMonths.length, totalPaid };
    };

    const nonExemptMembers = useMemo(() => members.filter(m => !m.isExempt), [members]);

    const yearData = useMemo(
        () => nonExemptMembers
            .map(buildMemberYear)
            // Members still missing payments first, so they're easy to spot and follow up with.
            .sort((a, b) => (a.paidCount - a.eligibleCount) - (b.paidCount - b.eligibleCount) || a.member.name.localeCompare(b.member.name)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [nonExemptMembers, contributions, selectedYear]
    );

    const totalEligible = yearData.reduce((sum, r) => sum + r.eligibleCount, 0);
    const totalPaidMonths = yearData.reduce((sum, r) => sum + r.paidCount, 0);
    const totalCollectedYear = yearData.reduce((sum, r) => sum + r.totalPaid, 0);
    const totalExpectedYear = totalEligible * monthlyContribution;
    const compliancePct = totalEligible > 0 ? Math.round((totalPaidMonths / totalEligible) * 100) : 0;

    const selectedMemberData = selectedMemberId
        ? yearData.find(r => r.member.id === selectedMemberId)
        : null;

    const canIssueCertificate = !!selectedMemberData
        && selectedMemberData.eligibleCount > 0
        && selectedMemberData.paidCount === selectedMemberData.eligibleCount;

    const handleToggle = async (row, monthInfo) => {
        if (!isFinance || !monthInfo.payable) return;
        const { member } = row;

        if (monthInfo.isPaid) {
            if (await confirm(t('contributions.confirmDelete'))) {
                try {
                    await mockService.deleteContribution(monthInfo.contribution.id);
                    setContributions(await mockService.getAllContributions());
                    await mockService.createLog({
                        userId: user.id || user.uid,
                        userName: user.profile?.name || user.displayName || user.email,
                        description: `Unmarked ${member.name} as paid for ${monthLongLabel(monthInfo.month)} ${selectedYear}`
                    });
                } catch (err) {
                    console.error('Error removing payment:', err);
                }
            }
        } else {
            if (await confirm(t('monthly.confirmMarkPaid').replace('{name}', member.name).replace('{month}', monthLongLabel(monthInfo.month)))) {
                try {
                    await mockService.addContribution({
                        member_id: member.id,
                        date: `${monthInfo.key}-10`,
                        amount: monthlyContribution,
                        description: t('monthly.defaultDescription')
                    });
                    setContributions(await mockService.getAllContributions());
                    await mockService.createLog({
                        userId: user.id || user.uid,
                        userName: user.profile?.name || user.displayName || user.email,
                        description: `Marked ${member.name} as paid for ${monthLongLabel(monthInfo.month)} ${selectedYear}`
                    });
                } catch (err) {
                    console.error('Error adding payment:', err);
                }
            }
        }
    };

    const handlePrint = () => window.print();

    const handleIssueCertificate = async () => {
        setShowCertificate(true);
        try {
            await mockService.createLog({
                userId: user.id || user.uid,
                userName: user.profile?.name || user.displayName || user.email,
                description: `Issued annual dues clearance certificate for ${selectedMemberData.member.name} (${selectedYear})`
            });
        } catch (err) {
            console.error('Error logging certificate issuance:', err);
        }
    };

    if (loading || dataLoading) {
        return <div className="container" style={{ paddingTop: '2rem' }}>{t('common.loading')}...</div>;
    }

    return (
        <div className="container admin-annual-dues-page">
            <header className="page-header no-print">
                <h1 className="page-title"><FaFileInvoiceDollar style={{ marginRight: '0.5rem' }} />{t('annual.title')}</h1>
                <div className="header-actions">
                    <Link to="/admin/member-contributions" className="btn btn-outline">{t('contributions.title')}</Link>
                </div>
            </header>

            <div className="card controls-card no-print">
                <div className="form-group">
                    <label>{t('annual.year')}</label>
                    <select className="input-field" value={selectedYear} onChange={e => { setSelectedYear(Number(e.target.value)); setShowCertificate(false); }}>
                        {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div className="form-group grow">
                    <label>{t('annual.viewMember')}</label>
                    <select className="input-field" value={selectedMemberId} onChange={e => { setSelectedMemberId(e.target.value); setShowCertificate(false); }}>
                        <option value="">{t('annual.allMembers')}</option>
                        {nonExemptMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                </div>
                <button className="btn btn-outline" onClick={handlePrint}>
                    <FaPrint style={{ marginRight: '0.5rem' }} />{t('report.print')}
                </button>
            </div>

            {!selectedMemberId && (
                <>
                    <div className="stats-row no-print">
                        <div className="stat-card">
                            <span className="stat-value">{totalPaidMonths}/{totalEligible}</span>
                            <span className="stat-label">{t('annual.monthsPaid')}</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-value success">{formatCurrency(totalCollectedYear)}</span>
                            <span className="stat-label">{t('monthly.totalCollected')}</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-value">{formatCurrency(totalExpectedYear)}</span>
                            <span className="stat-label">{t('monthly.totalExpected')}</span>
                        </div>
                        <div className="stat-card">
                            <span className={`stat-value ${compliancePct === 100 ? 'success' : ''}`}>{compliancePct}%</span>
                            <span className="stat-label">{t('annual.compliance')}</span>
                        </div>
                    </div>

                    <div className="card section">
                        <h2 className="section-title">{t('annual.gridTitle')} {selectedYear}</h2>
                        <div className="table-scroll">
                            <table className="data-table dues-grid">
                                <thead>
                                    <tr>
                                        <th className="member-col">{t('monthly.member')}</th>
                                        {monthShortLabels.map((label, i) => <th key={i} className="month-col">{label}</th>)}
                                        <th>{t('annual.total')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {yearData.map(row => (
                                        <tr key={row.member.id}>
                                            <td className="member-cell">
                                                <img src={row.member.avatar} alt="" className="mini-avatar" />
                                                {row.member.name}
                                            </td>
                                            {row.months.map(m => {
                                                const cellClass = !m.payable ? 'na' : m.isPaid ? 'paid' : m.isFuture ? 'future' : 'unpaid';
                                                const cellLabel = !m.payable
                                                    ? t('annual.notApplicable')
                                                    : m.isPaid
                                                        ? t('monthly.paid')
                                                        : m.isFuture
                                                            ? t('annual.notDueYet')
                                                            : t('monthly.pending');
                                                return (
                                                    <td
                                                        key={m.key}
                                                        className={`month-cell ${cellClass} ${isFinance && m.payable ? 'clickable' : ''}`}
                                                        onClick={() => handleToggle(row, m)}
                                                        title={cellLabel}
                                                    >
                                                        {!m.payable ? '–' : m.isPaid ? '✓' : m.isFuture ? '○' : '✕'}
                                                    </td>
                                                );
                                            })}
                                            <td className="total-cell">{row.paidCount}/{row.eligibleCount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {selectedMemberData && !showCertificate && (
                <div className="card section member-detail">
                    <div className="member-detail-header">
                        <img src={selectedMemberData.member.avatar} alt="" className="detail-avatar" />
                        <div>
                            <h2>{selectedMemberData.member.name}</h2>
                            <p className="text-secondary">{selectedMemberData.paidCount}/{selectedMemberData.eligibleCount} {t('annual.monthsPaidLower')} · {formatCurrency(selectedMemberData.totalPaid)}</p>
                        </div>
                        {canIssueCertificate && (
                            <button className="btn btn-primary certificate-btn no-print" onClick={handleIssueCertificate}>
                                <FaCertificate style={{ marginRight: '0.5rem' }} />{t('annual.issueCertificate')}
                            </button>
                        )}
                    </div>

                    <div className="table-scroll"><table className="data-table">
                        <thead>
                            <tr>
                                <th>{t('monthly.month')}</th>
                                <th>{t('monthly.status')}</th>
                                <th>{t('balance.date')}</th>
                                <th>{t('balance.amount')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedMemberData.months.map(m => (
                                <tr key={m.key}>
                                    <td>{monthLongLabel(m.month)}</td>
                                    <td>
                                        {!m.payable ? (
                                            <span className="text-secondary">{t('annual.notApplicable')}</span>
                                        ) : m.isPaid ? (
                                            <span className="badge-paid">{t('monthly.paid')}</span>
                                        ) : m.isFuture ? (
                                            <span className="badge-future">{t('annual.notDueYet')}</span>
                                        ) : (
                                            <span className="badge-pending">{t('monthly.pending')}</span>
                                        )}
                                    </td>
                                    <td>{m.isPaid ? m.contribution.date : '—'}</td>
                                    <td>{m.isPaid ? formatCurrency(m.contribution.amount) : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table></div>
                </div>
            )}

            {selectedMemberData && showCertificate && (
                <div className="certificate-wrapper">
                    <button className="btn btn-outline no-print back-btn" onClick={() => setShowCertificate(false)}>← {t('common.cancel')}</button>
                    <div className="certificate card">
                        {settings.app_logo && <img src={settings.app_logo} alt="" className="certificate-logo" />}
                        <h1 className="certificate-club">{APP_NAME}</h1>
                        <h2 className="certificate-title">{t('annual.certificateTitle')}</h2>
                        <p className="certificate-body">
                            {t('annual.certificateBody')
                                .replace('{name}', selectedMemberData.member.name)
                                .replace('{year}', selectedYear)
                                .replace('{amount}', formatCurrency(selectedMemberData.totalPaid))
                                .replace('{months}', selectedMemberData.eligibleCount)}
                        </p>
                        <p className="certificate-date">
                            {t('annual.issuedOn')} {new Date().toLocaleDateString(locale)}
                        </p>
                        <div className="certificate-signature">
                            <div className="signature-line"></div>
                            <span>{user.profile?.name || user.displayName || user.email}</span>
                            <span className="text-secondary">{APP_NAME}</span>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                }
                .header-actions {
                    display: flex;
                    gap: 0.75rem;
                    flex-wrap: wrap;
                }
                .controls-card {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: flex-end;
                    gap: 1.25rem;
                    margin-bottom: 1.5rem;
                }
                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.35rem;
                }
                .form-group.grow {
                    flex: 1;
                    min-width: 200px;
                }
                .form-group label {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                }
                .stats-row {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 1rem;
                    margin-bottom: 1.5rem;
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
                }
                .stat-value.success { color: var(--success); }
                .stat-label {
                    font-size: 0.75rem;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.03em;
                }
                .section {
                    margin-bottom: 2rem;
                }
                .section-title {
                    font-size: 1.1rem;
                    margin-bottom: 1rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 1px solid var(--glass-border);
                    text-transform: capitalize;
                }
                .table-scroll {
                    overflow-x: auto;
                }
                .data-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .data-table th, .data-table td {
                    padding: 0.6rem 0.75rem;
                    text-align: left;
                    border-bottom: 1px solid var(--glass-border);
                    white-space: nowrap;
                }
                .dues-grid .month-col, .dues-grid .month-cell {
                    text-align: center;
                }
                .member-cell {
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                }
                .mini-avatar {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                }
                .month-cell {
                    font-weight: 700;
                }
                .month-cell.paid { color: var(--success); }
                .month-cell.unpaid { color: var(--danger); }
                .month-cell.future { color: var(--accent); opacity: 0.6; }
                .month-cell.na { color: var(--text-secondary); opacity: 0.4; }
                .month-cell.clickable { cursor: pointer; }
                .month-cell.clickable:hover { filter: brightness(1.3); }
                .total-cell { font-weight: 700; }
                .member-detail-header {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                    flex-wrap: wrap;
                }
                .detail-avatar {
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                }
                .certificate-btn {
                    margin-left: auto;
                }
                .badge-paid {
                    color: var(--success);
                    font-weight: 700;
                }
                .badge-pending {
                    color: var(--danger);
                    font-weight: 700;
                }
                .badge-future {
                    color: var(--accent);
                    font-weight: 700;
                }
                .certificate-wrapper {
                    max-width: 700px;
                    margin: 0 auto;
                }
                .back-btn {
                    margin-bottom: 1rem;
                }
                .certificate {
                    padding: 3rem 2.5rem;
                    text-align: center;
                    border: 2px solid var(--accent);
                }
                .certificate-logo {
                    width: 64px;
                    height: 64px;
                    border-radius: 0.75rem;
                    margin-bottom: 1rem;
                }
                .certificate-club {
                    font-size: 1.1rem;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    color: var(--accent);
                    margin-bottom: 1.5rem;
                }
                .certificate-title {
                    font-size: 1.6rem;
                    margin-bottom: 2rem;
                }
                .certificate-body {
                    font-size: 1.05rem;
                    line-height: 1.9;
                    margin-bottom: 2rem;
                    text-align: justify;
                }
                .certificate-date {
                    color: var(--text-secondary);
                    margin-bottom: 3rem;
                }
                .certificate-signature {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.25rem;
                }
                .signature-line {
                    width: 250px;
                    border-top: 1px solid var(--text-secondary);
                    margin-bottom: 0.5rem;
                }

                @media print {
                    .no-print { display: none !important; }
                    .navbar { display: none !important; }
                    body { background: white; color: black; }
                    .card { border: 1px solid #ccc; background: white; color: black; }
                    .certificate { border: 2px solid #333; }
                    .month-cell.paid, .badge-paid { color: #166534 !important; }
                    .month-cell.unpaid, .badge-pending { color: #991b1b !important; }
                }
            `}</style>
        </div>
    );
};

export default AdminAnnualDues;
