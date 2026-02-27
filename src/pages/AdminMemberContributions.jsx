import { useState, useEffect } from 'react';
import { mockService } from '../services/mockData';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';
import { FaTrash } from 'react-icons/fa';

const AdminMemberContributions = () => {
    const { user, isAdmin, loading } = useAuth();
    const { t } = useLanguage();
    const [members, setMembers] = useState([]);
    const [selectedMemberId, setSelectedMemberId] = useState('');
    const [contributions, setContributions] = useState([]);

    // New Contribution State
    const [showAddForm, setShowAddForm] = useState(false);
    const [monthlyContribution, setMonthlyContribution] = useState(50);
    const [newContribution, setNewContribution] = useState({ date: '', amount: 50 });

    if (loading) {
        return <div className="container" style={{ paddingTop: '2rem' }}>{t('common.loading')}...</div>;
    }


    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const data = await mockService.getMembers();
                setMembers(data);
                const value = await mockService.getProperty('monthly_contribution_value', 50);
                setMonthlyContribution(value);
                setNewContribution(prev => ({ ...prev, amount: value }));
            } catch (err) {
                console.error('Error fetching members:', err);
            }
        };
        fetchMembers();
    }, []);

    useEffect(() => {
        const fetchContributions = async () => {
            if (selectedMemberId) {
                try {
                    const data = await mockService.getMemberContributions(selectedMemberId);
                    setContributions(data);
                } catch (err) {
                    console.error('Error fetching contributions:', err);
                    setContributions([]);
                }
            } else {
                setContributions([]);
            }
        };
        fetchContributions();
    }, [selectedMemberId]);

    const handleCreateContribution = (e) => {
        e.preventDefault();
        if (!selectedMemberId) return;

        const addContributionAsync = async () => {
            try {
                const added = await mockService.addContribution({
                    member_id: selectedMemberId, // snake_case as per schema
                    ...newContribution
                });

                setContributions([...contributions, added]);
                setShowAddForm(false);
                setNewContribution({ date: '', amount: monthlyContribution });

                // Log operation
                await mockService.createLog({
                    userId: user.id || user.uid,
                    userName: user.name || user.displayName || user.email,
                    description: `Recorded contribution of $${added.amount} for member ${selectedMember.name} on date ${added.date}`
                });
            } catch (err) {
                console.error('Error adding contribution:', err);
            }
        };
        addContributionAsync();
    };

    const handleDeleteContribution = async (id) => {
        if (!window.confirm(t('contributions.confirmDelete'))) return;

        try {
            const contributionToDelete = contributions.find(c => c.id === id);
            await mockService.deleteContribution(id);
            setContributions(contributions.filter(c => c.id !== id));

            // Log operation
            await mockService.createLog({
                userId: user.id || user.uid,
                userName: user.name || user.displayName || user.email,
                description: `Removed contribution of $${contributionToDelete.amount} for member ${selectedMember.name} dated ${contributionToDelete.date}`
            });
        } catch (err) {
            console.error('Error deleting contribution:', err);
        }
    };

    const selectedMember = members.find(m => m.id === selectedMemberId);


    return (
        <div className="container admin-contributions-page">
            <header className="page-header">
                <h1 className="page-title">{t('contributions.title')}</h1>
                <div className="header-actions">
                    {/* Navigation back to dashboard or other admin pages */}
                    <Link to="/admin/summary" className="btn btn-outline">{t('monthly.title')}</Link>
                </div>
            </header>

            <div className="card selection-card">
                <label className="label-block">{t('contributions.selectMember')}</label>
                <select
                    className="input-field"
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                >
                    <option value="">{t('contributions.choose')}</option>
                    {members.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                    ))}
                </select>
            </div>

            {selectedMember && (
                <div className="animate-fade-in">
                    <div className="section-header">
                        <h2>{t('contributions.paymentHistory')} - {selectedMember.name}</h2>
                        {isAdmin && (
                            <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
                                {showAddForm ? t('contributions.cancel') : t('contributions.recordPayment')}
                            </button>
                        )}
                    </div>

                    {showAddForm && (
                        <div className="card add-form">
                            <h3>{t('contributions.newPayment')}</h3>
                            <form onSubmit={handleCreateContribution} className="form-inline">
                                <div className="form-group">
                                    <label>{t('contributions.date')}</label>
                                    <input
                                        type="date"
                                        className="input-field"
                                        value={newContribution.date}
                                        onChange={e => setNewContribution({ ...newContribution, date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>{t('contributions.amount')}</label>
                                    <input
                                        type="number"
                                        className="input-field"
                                        value={newContribution.amount}
                                        onChange={e => setNewContribution({ ...newContribution, amount: Number(e.target.value) })}
                                        required
                                    />
                                </div>
                                <button type="submit" className="btn btn-success" style={{ alignSelf: 'flex-end' }}>{t('contributions.save')}</button>
                            </form>
                        </div>
                    )}

                    <div className="card history-list">
                        {contributions.length === 0 ? (
                            <p className="text-secondary text-center">{t('contributions.noHistory')}</p>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>{t('contributions.date')}</th>
                                        <th>{t('contributions.amount')}</th>
                                        <th>{t('monthly.status')}</th>
                                        {isAdmin && <th>{t('contributions.actions')}</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {contributions.map(c => (
                                        <tr key={c.id}>
                                            <td>{new Date(c.date).toLocaleDateString()}</td>
                                            <td>${c.amount}</td>
                                            <td><span className="badge-paid">{t('monthly.paid')}</span></td>
                                            {isAdmin && (
                                                <td>
                                                    <button
                                                        className="btn-delete-icon"
                                                        onClick={() => handleDeleteContribution(c.id)}
                                                        title={t('common.delete')}
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            <style>{`
        .label-block {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
        }
        .selection-card {
            margin-bottom: 2rem;
            max-width: 500px;
        }
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }
        .form-inline {
            display: flex;
            gap: 1rem;
            align-items: center;
        }
        .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }
        .btn-success {
            background-color: var(--success);
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
        }
        .data-table th, .data-table td {
            padding: 1rem;
            text-align: left;
            border-bottom: 1px solid var(--glass-border);
        }
        .badge-paid {
            background: rgba(34, 197, 94, 0.2);
            color: var(--success);
            padding: 0.25rem 0.75rem;
            border-radius: 1rem;
            font-size: 0.85rem;
            font-weight: 600;
        }
        .animate-fade-in {
            animation: fadeIn 0.3s ease-in;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .add-form {
            margin-bottom: 2rem;
            border-color: var(--primary);
        }
        .btn-delete-icon {
            background: none;
            border: none;
            color: var(--danger);
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 0.25rem;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        .btn-delete-icon:hover {
            background: rgba(239, 68, 68, 0.1);
            transform: scale(1.1);
        }
      `}</style>
        </div>
    );
};

export default AdminMemberContributions;
