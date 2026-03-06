import { useState, useEffect } from 'react';
import { mockService } from '../services/mockData';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { FaTrash, FaSpinner } from 'react-icons/fa';
import { formatDate } from '../utils/dateUtils';

const AdminGlobalBalance = () => {
    const { user, isAdmin, loading } = useAuth();
    const { t, language } = useLanguage();
    const [transactions, setTransactions] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [totalBalance, setTotalBalance] = useState(0);
    const [selectedMonth, setSelectedMonth] = useState('');
    const [newTransaction, setNewTransaction] = useState({ description: '', amount: '', date: '', type: 'expense' });
    const [isSavingTransaction, setIsSavingTransaction] = useState(false);

    if (loading) {
        return <div className="container" style={{ paddingTop: '2rem' }}>{t('common.loading')}...</div>;
    }


    useEffect(() => {
        loadTransactions();
    }, []);

    useEffect(() => {
        filterTransactions();
    }, [selectedMonth, transactions]);

    const loadTransactions = async () => {
        try {
            // 1. Member Contributions
            const contributionsRaw = await mockService.getAllContributions();
            const memberContributions = await Promise.all(contributionsRaw.filter(c => c.member_id || c.memberId).map(async (c) => {
                const memberId = c.member_id || c.memberId;
                const member = await mockService.getMemberById(memberId);
                return {
                    ...c,
                    type: 'income',
                    source: 'member',
                    memberName: member?.name || 'Unknown Member'
                };
            }));

            // 2. Global Transactions (Revenues & Expenses)
            const globalTxsRaw = await mockService.getGlobalTransactions();
            const globalTxs = globalTxsRaw.map(tx => ({
                ...tx,
                source: 'global',
                // Keep the type from DB (expected 'revenue' or 'expense')
            }));

            const all = [...memberContributions, ...globalTxs].sort((a, b) => new Date(b.date) - new Date(a.date));
            setTransactions(all);
        } catch (err) {
            console.error('Error loading transactions:', err);
        }
    };

    const filterTransactions = () => {
        let filtered = transactions;
        if (selectedMonth) {
            filtered = transactions.filter(t => t.date && t.date.startsWith(selectedMonth));
        }
        setFilteredTransactions(filtered);

        const incomeSum = filtered
            .filter(t => t.type === 'income' || t.type === 'revenue')
            .reduce((acc, curr) => acc + Number(curr.amount), 0);
        const expenseSum = filtered
            .filter(t => t.type === 'expense')
            .reduce((acc, curr) => acc + Number(curr.amount), 0);
        setTotalBalance(incomeSum - expenseSum);
    };

    const handleCreateTransaction = (e) => {
        e.preventDefault();
        if (!newTransaction.description || !newTransaction.amount || !newTransaction.date) return;

        const addTransactionAsync = async () => {
            setIsSavingTransaction(true);
            try {
                // Both expenses and revenues (non-member contributions) go to globalTransactions
                await mockService.addGlobalTransaction({
                    description: newTransaction.description,
                    amount: Number(newTransaction.amount),
                    date: newTransaction.date,
                    type: newTransaction.type // 'expense' or 'revenue'
                });

                setNewTransaction({ description: '', amount: '', date: '', type: 'expense' });
                await loadTransactions();

                // Log operation
                await mockService.createLog({
                    userId: user.id || user.uid,
                    userName: user.name || user.displayName || user.email,
                    description: `Recorded ${newTransaction.type}: ${newTransaction.description} of $${newTransaction.amount}`
                });
            } catch (err) {
                console.error('Error adding transaction:', err);
            } finally {
                setIsSavingTransaction(false);
            }
        };
        addTransactionAsync();
    };

    const handleDeleteTransaction = async (item) => {
        if (!window.confirm(t('contributions.confirmDelete'))) return;

        try {
            if (item.source === 'global') { // Check source to distinguish global transactions from contributions
                await mockService.deleteGlobalTransaction(item.id);
            } else { // Must be a member contribution
                await mockService.deleteContribution(item.id);
            }
            loadTransactions();

            // Log operation
            await mockService.createLog({
                userId: user.id || user.uid,
                userName: user.name || user.displayName || user.email,
                description: `Deleted ${item.type}: ${item.type === 'income' ? 'Contribution from ' + item.memberName : item.description} of $${item.amount}`
            });
        } catch (err) {
            console.error('Error deleting transaction:', err);
        }
    };


    return (
        <div className="container global-balance-page">
            <header className="page-header">
                <div className="header-left">
                    <h1 className="page-title">{t('balance.title')}</h1>
                    <div className="filter-control">
                        <label>{t('balance.filterByMonth')}</label>
                        <input
                            type="month"
                            className="input-field-sm"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        />
                        {selectedMonth && (
                            <button className="btn-text" onClick={() => setSelectedMonth('')}>{t('common.clear')}</button>
                        )}
                    </div>
                </div>
                <div className={`balance-display ${totalBalance >= 0 ? 'positive' : 'negative'}`}>
                    <span className="balance-label">{selectedMonth ? t('balance.netBalance') : t('balance.totalBalance')}:</span>
                    <span className="balance-amount">${totalBalance.toFixed(2)}</span>
                </div>
            </header>

            <div className="balance-main-grid">
                <div className="transactions-section">
                    <h2 className="section-title">{t('balance.history')}</h2>
                    <div className="transactions-list">
                        {filteredTransactions.map(item => (
                            <div key={item.id} className={`transaction-card ${item.type}`}>
                                <div className="transaction-info">
                                    <span className="transaction-date">{formatDate(item.date, language)}</span>
                                    <div className="transaction-details">
                                        <span className="transaction-desc">
                                            {item.type === 'income'
                                                ? `${t('balance.contribution')}: ${item.memberName}`
                                                : item.description}
                                        </span>
                                    </div>
                                </div>
                                <span className="transaction-amount">
                                    {(item.type === 'income' || item.type === 'revenue') ? '+' : '-'}${Number(item.amount).toFixed(2)}
                                </span>
                                {isAdmin && (
                                    <button
                                        className="btn-delete-icon"
                                        onClick={() => handleDeleteTransaction(item)}
                                        title={t('common.delete')}
                                    >
                                        <FaTrash />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="add-expense-section">
                    {isAdmin ? (
                        <div className="card expense-form-card">
                            <h3>{t('balance.addTransaction') || 'Add Transaction'}</h3>
                            <form onSubmit={handleCreateTransaction}>
                                <div className="form-group">
                                    <label>{t('balance.type')}</label>
                                    <select
                                        className="input-field"
                                        value={newTransaction.type}
                                        onChange={e => setNewTransaction({ ...newTransaction, type: e.target.value })}
                                    >
                                        <option value="expense">{t('balance.expense')}</option>
                                        <option value="revenue">{t('balance.revenue')}</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>{t('balance.description')}</label>
                                    <input
                                        className="input-field"
                                        value={newTransaction.description}
                                        onChange={e => setNewTransaction({ ...newTransaction, description: e.target.value })}
                                        placeholder={newTransaction.type === 'expense' ? (t('balance.expense') + '...') : (t('balance.revenue') + '...')}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>{t('balance.amount')}</label>
                                    <input
                                        type="number"
                                        className="input-field"
                                        value={newTransaction.amount}
                                        onChange={e => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>{t('balance.date')}</label>
                                    <input
                                        type="date"
                                        className="input-field"
                                        value={newTransaction.date}
                                        onChange={e => setNewTransaction({ ...newTransaction, date: e.target.value })}
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className={`btn full-width ${newTransaction.type === 'expense' ? 'btn-danger-outline' : 'btn-success-outline'}`}
                                    disabled={isSavingTransaction}
                                >
                                    {isSavingTransaction ? (
                                        <>
                                            <FaSpinner className="icon-spin" /> {t('common.saving')}
                                        </>
                                    ) : (
                                        newTransaction.type === 'expense' ? t('balance.recordExpense') : t('balance.recordRevenue')
                                    )}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="card text-center text-secondary">
                            <p>{t('balance.loginToRecord')}</p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                }
                .header-left {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                .filter-control {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .input-field-sm {
                    padding: 0.4rem;
                    background: var(--bg-dark);
                    border: 1px solid var(--glass-border);
                    color: var(--text-primary);
                    border-radius: 0.375rem;
                }
                .btn-text {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    text-decoration: underline;
                    cursor: pointer;
                    font-size: 0.85rem;
                }
                .balance-display {
                    background: var(--bg-card);
                    padding: 1rem 2rem;
                    border-radius: 0.5rem;
                    border: 1px solid var(--glass-border);
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                }
                .balance-display.positive .balance-amount { color: var(--success); }
                .balance-display.negative .balance-amount { color: var(--danger); }
                .balance-label {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                }
                .balance-amount {
                    font-size: 2rem;
                    font-weight: 700;
                }

                .balance-main-grid {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 2rem;
                }
                @media (max-width: 768px) {
                    .balance-main-grid {
                        grid-template-columns: 1fr;
                    }
                }

                .section-title {
                    font-size: 1.25rem;
                    margin-bottom: 1rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 1px solid var(--glass-border);
                }

                .transactions-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                .transaction-card {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem;
                    background: var(--bg-card);
                    border-radius: 0.5rem;
                    border-left: 4px solid transparent;
                }
                .transaction-card.income {
                    border-left-color: var(--success);
                    background: rgba(16, 185, 129, 0.05); /* Slight green tint */
                }
                .transaction-card.expense {
                    border-left-color: var(--danger);
                    background: rgba(239, 68, 68, 0.05); /* Slight red tint */
                }
                
                .transaction-info {
                    display: flex;
                    flex-direction: column;
                }
                .transaction-date {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                }
                .transaction-desc {
                    font-weight: 500;
                    font-size: 1rem;
                }
                .transaction-amount {
                    font-weight: 700;
                    font-size: 1.1rem;
                }
                .transaction-card.income .transaction-amount { color: var(--success); }
                .transaction-card.expense .transaction-amount { color: var(--danger); }
                
                .expense-form-card h3 {
                    margin-bottom: 1.5rem;
                }
                .full-width {
                    width: 100%;
                    margin-top: 1rem;
                }
                
                form .form-group {
                    margin-bottom: 1rem;
                }
                form label {
                    display: block;
                    margin-bottom: 0.5rem;
                    color: var(--text-secondary);
                }
                form .input-field {
                    width: 100%;
                    padding: 0.75rem;
                    background: var(--bg-dark);
                    border: 1px solid var(--glass-border);
                    color: var(--text-primary);
                    border-radius: 0.5rem;
                }

                .btn-danger-outline {
                    border: 1px solid var(--danger);
                    color: var(--danger);
                    background: transparent;
                }
                .btn-danger-outline:hover {
                    background: var(--danger);
                    color: white;
                }
                .btn-delete-icon {
                    background: none;
                    border: none;
                    color: var(--danger);
                    cursor: pointer;
                    padding: 0.5rem;
                    margin-left: 1rem;
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

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .icon-spin {
                    animation: spin 1s linear infinite;
                }
            `}</style>
        </div >
    );
};

export default AdminGlobalBalance;
