import { useState, useEffect } from 'react';
import { mockService } from '../services/mockData';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';

const AdminMonthlySummary = () => {
    const { user, isAdmin, loading } = useAuth();
    const { t, language } = useLanguage();
    const [members, setMembers] = useState([]);
    const [contributions, setContributions] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format
    const [monthlyContribution, setMonthlyContribution] = useState(50);

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
    }, [loading, isAdmin]);

    const [displayYear, displayMonth] = selectedDate.split('-');
    const dateObj = new Date(parseInt(displayYear), parseInt(displayMonth) - 1);
    const monthName = dateObj.toLocaleString(language === 'en' ? 'en-US' : 'pt-BR', { month: 'long' });

    if (loading) {
        return <div className="container" style={{ paddingTop: '2rem' }}>{t('common.loading')}...</div>;
    }


    return (
        <div className="container admin-summary-page">
            <header className="page-header">
                <h1 className="page-title">{t('monthly.title')}</h1>
                <div className="header-actions">
                    <Link to="/admin/member-contributions" className="btn btn-outline">{t('contributions.title')}</Link>
                </div>
            </header>

            <div className="controls-section card">
                <label>{t('monthly.month')}:</label>
                <input
                    type="month"
                    className="input-field"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                />
            </div>

            <div className="summary-grid">
                <h2 className="summary-title">Status for {monthName} {displayYear}</h2>

                <div className="members-status-list">
                    {members.map(member => {
                        const contribution = contributions.find(c => {
                            const cMemberId = c.member_id || c.memberId;
                            if (cMemberId !== member.id) return false;
                            if (!c.date) return false;
                            const [cYear, cMonth] = c.date.split('-');
                            const [year, month] = selectedDate.split('-');
                            return cYear === year && cMonth === month;
                        });

                        const isPaid = !!contribution;

                        const handleTogglePayment = () => {
                            if (!isAdmin) return;

                            if (isPaid) {
                                if (window.confirm(t('contributions.confirmDelete'))) {
                                    const removePaymentAsync = async () => {
                                        try {
                                            await mockService.deleteContribution(contribution.id);
                                            const updatedContributions = await mockService.getAllContributions();
                                            setContributions(updatedContributions);

                                            // Log operation
                                            await mockService.createLog({
                                                userId: user.id || user.uid,
                                                userName: user.name || user.displayName || user.email,
                                                description: `Unmarked ${member.name} as paid for ${monthName} ${displayYear}`
                                            });
                                        } catch (err) {
                                            console.error('Error removing payment:', err);
                                        }
                                    };
                                    removePaymentAsync();
                                }
                            } else {
                                if (window.confirm(`Mark ${member.name} as PAID for ${monthName}?`)) {
                                    const addPaymentAsync = async () => {
                                        try {
                                            await mockService.addContribution({
                                                member_id: member.id,
                                                date: `${selectedDate}-01`,
                                                amount: monthlyContribution
                                            });
                                            const updatedContributions = await mockService.getAllContributions();
                                            setContributions(updatedContributions);

                                            // Log operation
                                            await mockService.createLog({
                                                userId: user.id || user.uid,
                                                userName: user.name || user.displayName || user.email,
                                                description: `Marked ${member.name} as paid for ${monthName} ${displayYear}`
                                            });
                                        } catch (err) {
                                            console.error('Error adding payment:', err);
                                        }
                                    };
                                    addPaymentAsync();
                                }
                            }
                        };

                        return (
                            <div
                                key={member.id}
                                className={`status-card ${isPaid ? 'paid' : 'unpaid'} ${isAdmin ? 'clickable' : ''}`}
                                onClick={handleTogglePayment}
                                title={isAdmin ? (isPaid ? t('common.delete') : t('contributions.recordPayment')) : (isPaid ? t('monthly.paid') : t('monthly.pending'))}
                            >
                                <div className="member-info">
                                    <img src={member.avatar} alt="avatar" className="mini-avatar" />
                                    <span className="member-name">{member.name}</span>
                                </div>
                                <div className="status-indicator">
                                    {isPaid ? (
                                        <div className="icon-check">✓ {t('monthly.paid')}</div>
                                    ) : (
                                        <div className="icon-cross">✕ {t('monthly.pending')}</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <style>{`
        .controls-section {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 2rem;
            max-width: 400px;
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
      `}</style>
        </div>
    );
};

export default AdminMonthlySummary;
