import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';


const Login = () => {
    const [email, setEmail] = useState('');

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loadingSub, setLoadingSub] = useState(false);

    const { user, loading, sendEmailLink, isSignInWithEmailLink, signInWithEmailLink, loginWithGoogle } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && user) {
            navigate('/');
        }
    }, [user, loading, navigate]);

    useEffect(() => {
        const checkEmailLink = async () => {
            if (isSignInWithEmailLink(window.location.href)) {
                let emailForSignIn = window.localStorage.getItem('emailForSignIn');
                if (!emailForSignIn) {
                    emailForSignIn = window.prompt(t('login.emailPrompt') || 'Please provide your email for confirmation');
                }

                if (emailForSignIn) {
                    setLoadingSub(true);
                    try {
                        await signInWithEmailLink(emailForSignIn, window.location.href);
                        window.localStorage.removeItem('emailForSignIn');
                        navigate('/');
                    } catch (err) {
                        setError(t('login.invalidLink'));
                        console.error(err);
                    } finally {
                        setLoadingSub(false);
                    }
                }
            }
        };

        checkEmailLink();
    }, [isSignInWithEmailLink, signInWithEmailLink, navigate, t]);

    const handleSendEmailLink = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoadingSub(true);

        try {
            await sendEmailLink(email.trim());
            setSuccess(t('login.linkSent'));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingSub(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setLoadingSub(true);
        try {
            await loginWithGoogle();
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingSub(false);
        }
    };

    return (
        <div className="container login-page">
            <div className="card login-card">
                <h1>{t('login.title')}</h1>

                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                <form onSubmit={handleSendEmailLink}>
                    <div className="form-group">
                        <label>{t('login.email')}</label>
                        <input
                            type="email"
                            className="input-field"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="name@example.com"
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loadingSub}>
                        {loadingSub ? t('common.loading') : t('login.sendLink')}
                    </button>
                </form>

                <div className="auth-divider">
                    <span>{t('common.or') || 'OR'}</span>
                </div>

                <button
                    type="button"
                    className="btn btn-google"
                    onClick={handleGoogleLogin}
                    disabled={loadingSub}
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
                    {t('login.google')}
                </button>
            </div>


            <style>{`
                .login-page {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 70vh;
                    padding: 2rem;
                }
                .login-card {
                    width: 100%;
                    max-width: 450px;
                    padding: 2.5rem;
                }
                h1 {
                    text-align: center;
                    margin-bottom: 2rem;
                    color: var(--primary);
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
                .btn-primary {
                    width: 100%;
                    margin-top: 1.5rem;
                }
                .auth-divider {
                    display: flex;
                    align-items: center;
                    text-align: center;
                    margin: 2rem 0;
                    color: var(--text-muted, #666);
                }
                .auth-divider::before,
                .auth-divider::after {
                    content: '';
                    flex: 1;
                    border-bottom: 1px solid var(--border-color, #eee);
                }
                .auth-divider span {
                    padding: 0 1rem;
                    font-size: 0.8rem;
                    text-transform: uppercase;
                }
                .btn-google {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    background: #fff;
                    color: #757575;
                    border: 1px solid #ddd;
                    font-weight: 500;
                    transition: all 0.2s;
                }
                .btn-google:hover {
                    background: #f5f5f5;
                    border-color: #ccc;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .btn-google img {
                    width: 18px;
                    height: 18px;
                }
            `}</style>
        </div>
    );
};

export default Login;
