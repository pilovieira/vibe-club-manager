import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { mockService } from '../services/mockData';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

const AdminCreateMember = () => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await authService.createUser(formData.email, formData.password);

            setSuccess(t('members.memberCreated') || 'User created successfully!');
            setFormData({
                email: '',
                password: '',
            });

            // Log operation
            await mockService.createLog({
                userId: user.id || user.uid,
                userName: user.name || user.displayName || user.email,
                description: `Created new user: ${formData.email}`
            });

            // Optional: redirect after some time
            setTimeout(() => navigate('/admin'), 2000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container create-member-page">
            <div className="card form-card">
                <h1>{t('members.registerNew') || 'Create New User'}</h1>

                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                <form onSubmit={handleSubmit} className="form-vertical">
                    <div className="form-group">
                        <label>{t('login.email')}</label>
                        <input
                            type="email"
                            className="input-field"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>{t('login.password')}</label>
                        <input
                            type="password"
                            className="input-field"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn btn-outline" onClick={() => navigate('/admin')}>
                            {t('common.cancel')}
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? t('common.saving') : t('common.save')}
                        </button>
                    </div>
                </form>
            </div>


            <style>{`
                .create-member-page {
                    display: flex;
                    justify-content: center;
                    padding: 2rem;
                }
                .form-card {
                    width: 100%;
                    max-width: 600px;
                    padding: 2.5rem;
                }
                h1 {
                    text-align: center;
                    margin-bottom: 2rem;
                    color: var(--primary);
                }
                .form-vertical {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 1rem;
                    margin-top: 1rem;
                }
                .error-message {
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                    padding: 0.75rem;
                    border-radius: 0.5rem;
                    margin-bottom: 1.5rem;
                    text-align: center;
                    font-size: 0.9rem;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                }
                .success-message {
                    background: rgba(34, 197, 94, 0.1);
                    color: #22c55e;
                    padding: 0.75rem;
                    border-radius: 0.5rem;
                    margin-bottom: 1.5rem;
                    text-align: center;
                    font-size: 0.9rem;
                    border: 1px solid rgba(34, 197, 94, 0.2);
                }
            `}</style>
        </div>
    );
};

export default AdminCreateMember;
