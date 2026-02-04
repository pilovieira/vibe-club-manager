import { useState, useEffect } from 'react';
import { mockService } from '../services/mockData';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const AdminGlobalBalance = () => {
    const { isAdmin, loading } = useAuth();
    const { t } = useLanguage();
    const [transactions, setTransactions] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [totalBalance, setTotalBalance] = useState(0);
    const [selectedMonth, setSelectedMonth] = useState('');
    const [newExpense, setNewExpense] = useState({ description: '', amount: '', date: '' });

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
                <style>{`
                    .error-card { text-align: center; border-color: var(--danger); padding: 2rem; }
                `}</style>
            </div>
        );
    }

    useEffect(() => {
        if (!isAdmin) return;
        loadTransactions();
    }, [isAdmin]);

    useEffect(() => {
        filterTransactions();
    }, [selectedMonth, transactions]);

    const loadTransactions = async () => {
        try {
            const contributionsRaw = await mockService.getAllContributions();
            const contributions = await Promise.all(contributionsRaw.map(async (c) => {
                const member = await mockService.getMemberById(c.memberId);
                return {
                    ...c,
                    type: 'income',
                    memberName: member?.name || 'Unknown Member'
                };
            }));

            const expensesRaw = await mockService.getExpenses();
            const expenses = expensesRaw.map(e => ({
                ...e,
                type: 'expense'
            }));

            const all = [...contributions, ...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
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

        const incomeSum = filtered.filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0);
        const expenseSum = filtered.filter(t => t.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0);
        setTotalBalance(incomeSum - expenseSum);
    };

    const handleAddExpense = (e) => {
        e.preventDefault();
        if (!newExpense.description || !newExpense.amount || !newExpense.date) return;

        const addExpenseAsync = async () => {
            try {
                await mockService.addExpense({
                    description: newExpense.description,
                    amount: Number(newExpense.amount),
                    date: newExpense.date
                });

                setNewExpense({ description: '', amount: '', date: '' });
                loadTransactions();
            } catch (err) {
                console.error('Error adding expense:', err);
            }
        };
        addExpenseAsync();
    };

    if (!isAdmin) return <div className="container">Access Denied</div>;

    return (
        <div className="container global-balance-page">
            <header className="page-header">
                <div className="header-left">
                    <h1 className="page-title">Global Balance</h1>
                    <div className="filter-control">
                        <label>Filter by Month:</label>
                        <input
                            type="month"
                            className="input-field-sm"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        />
                        {selectedMonth && (
                            <button className="btn-text" onClick={() => setSelectedMonth('')}>Clear</button>
                        )}
                    </div>
                </div>
                <div className={`balance-display ${totalBalance >= 0 ? 'positive' : 'negative'}`}>
                    <span className="balance-label">{selectedMonth ? 'Net Balance' : 'Total Balance'}:</span>
                    <span className="balance-amount">${totalBalance.toFixed(2)}</span>
                </div>
            </header>

            <div className="balance-main-grid">
                <div className="transactions-section">
                    <h2 className="section-title">History</h2>
                    <div className="transactions-list">
                        {filteredTransactions.map(item => (
                            <div key={item.id} className={`transaction-card ${item.type}`}>
                                <div className="transaction-info">
                                    <span className="transaction-date">{new Date(item.date).toLocaleDateString()}</span>
                                    <div className="transaction-details">
                                        <span className="transaction-desc">
                                            {item.type === 'income' ? `Contribution: ${item.memberName}` : item.description}
                                        </span>
                                    </div>
                                </div>
                                <span className="transaction-amount">
                                    {item.type === 'income' ? '+' : '-'}${Number(item.amount).toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="add-expense-section">
                    <div className="card expense-form-card">
                        <h3>Add Consumption / Expense</h3>
                        <form onSubmit={handleAddExpense}>
                            <div className="form-group">
                                <label>Description</label>
                                <input
                                    className="input-field"
                                    value={newExpense.description}
                                    onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                                    placeholder="e.g. Event Snacks"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Amount ($)</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={newExpense.amount}
                                    onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Date</label>
                                <input
                                    type="date"
                                    className="input-field"
                                    value={newExpense.date}
                                    onChange={e => setNewExpense({ ...newExpense, date: e.target.value })}
                                    required
                                />
                            </div>
                            <button type="submit" className="btn btn-danger-outline full-width">Record Expense</button>
                        </form>
                    </div>
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
            `}</style>
        </div>
    );
};

export default AdminGlobalBalance;
