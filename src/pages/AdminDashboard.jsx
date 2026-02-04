import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const AdminDashboard = () => {
    const { isAdmin, loading } = useAuth();
    const { t } = useLanguage();

    if (loading) {
        return <div className="container" style={{ paddingTop: '2rem' }}>{t('common.loading')}...</div>;
    }

    if (!isAdmin) {
        return (
            <div className="container" style={{ paddingTop: '2rem' }}>
                <div className="card error-card">
                    <h1>{t('admin.accessDenied')}</h1>
                    <p>{t('admin.accessDeniedMsg')}</p>
                    <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>{t('admin.goHome')}</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container admin-dashboard">
            <h1 className="page-title">{t('admin.title')}</h1>

            <div className="dashboard-grid">
                <Link to="/admin/summary" className="dashboard-card">
                    <div className="icon">📊</div>
                    <h2>{t('admin.monthlySummary')}</h2>
                    <p>{t('admin.monthlySummaryDesc')}</p>
                </Link>

                <Link to="/admin/global-balance" className="dashboard-card">
                    <div className="icon">💰</div>
                    <h2>{t('admin.globalBalance')}</h2>
                    <p>{t('admin.globalBalanceDesc')}</p>
                </Link>

                <Link to="/admin/member-contributions" className="dashboard-card">
                    <div className="icon">🧾</div>
                    <h2>{t('admin.memberContributions')}</h2>
                    <p>{t('admin.memberContributionsDesc')}</p>
                </Link>

                <Link to="/events" className="dashboard-card">
                    <div className="icon">📅</div>
                    <h2>{t('admin.manageEvents')}</h2>
                    <p>{t('admin.manageEventsDesc')}</p>
                </Link>

                <Link to="/members" className="dashboard-card">
                    <div className="icon">👥</div>
                    <h2>{t('admin.manageMembers')}</h2>
                    <p>{t('admin.manageMembersDesc')}</p>
                </Link>
            </div>

            <style>{`
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
            margin-top: 2rem;
        }
        .dashboard-card {
            background: var(--bg-card);
            padding: 2rem;
            border-radius: 1rem;
            border: 1px solid var(--glass-border);
            text-align: center;
            transition: all 0.3s;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: var(--text-primary);
        }
        .dashboard-card:hover {
            transform: translateY(-5px);
            border-color: var(--primary);
            background: rgba(30, 41, 59, 0.9);
        }
        .icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        .dashboard-card h2 {
            font-size: 1.25rem;
            margin-bottom: 0.5rem;
        }
        .dashboard-card p {
            color: var(--text-secondary);
            font-size: 0.9rem;
        }
        .error-card {
            text-align: center;
            border-color: var(--danger);
            padding: 2rem;
        }
      `}</style>
        </div>
    );
};

export default AdminDashboard;
