import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { mockService } from '../services/mockData';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

const generateUniqueUsername = (email, existingMembers) => {
    const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'membro';
    const taken = new Set(existingMembers.map(m => (m.username || '').toLowerCase()));

    if (!taken.has(base)) return base;

    let suffix = 2;
    while (taken.has(`${base}${suffix}`)) suffix++;
    return `${base}${suffix}`;
};

const AdminCreateMember = () => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({ email: '', name: '' });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const email = formData.email.trim().toLowerCase();
            const name = formData.name.trim();

            // 1. Create the Firebase Auth account. Members never use a password to log in
            // (the app is passwordless: magic email link or Google), so a random one is fine here.
            const randomPassword = crypto.randomUUID();
            const newAuthUser = await authService.createUser(email, randomPassword);

            // 2. Auto-generate a unique username so the admin only has to type an email and a name.
            const existingMembers = await mockService.getMembers();
            const username = generateUniqueUsername(email, existingMembers);

            // 3. Create the member document in Firestore, linked to the Auth user's UID.
            await mockService.createMember({
                id: newAuthUser.uid,
                email,
                name,
                username,
                status: 'active',
                role: 'member'
            });

            // 4. Immediately send the new member their passwordless sign-in link.
            let linkSent = true;
            try {
                await authService.sendEmailLink(email);
            } catch (linkErr) {
                console.error('Error sending sign-in link to new member:', linkErr);
                linkSent = false;
            }

            setSuccess(linkSent ? t('members.memberCreatedWithLink') : t('members.memberCreatedNoLink'));
            setFormData({ email: '', name: '' });

            // Log operation
            await mockService.createLog({
                userId: user.id || user.uid,
                userName: user.profile?.name || user.email,
                userEmail: user.email,
                description: `Created new member and auth user: ${email}`
            });

            setTimeout(() => navigate('/admin'), 3000);
        } catch (err) {
            console.error('Error creating user:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container create-member-page">
            <div className="card form-card">
                <h1>{t('admin.createUser')}</h1>
                <p className="form-hint">{t('members.createHint')}</p>

                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                <form onSubmit={handleSubmit} className="form-vertical">
                    <div className="form-group">
                        <label>{t('member.name')}</label>
                        <input
                            type="text"
                            className="input-field"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>{t('login.email')}</label>
                        <input
                            type="email"
                            className="input-field"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="name@example.com"
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
                    margin-bottom: 0.5rem;
                    color: var(--primary);
                }
                .form-hint {
                    text-align: center;
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                    margin-bottom: 2rem;
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
