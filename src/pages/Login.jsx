import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../supabaseClient';

const Login = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [fullName, setFullName] = useState('');

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loadingSub, setLoadingSub] = useState(false); // Renamed to avoid conflict with auth loading

    const { login, signUp, user, loading } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && user) {
            console.log('Login: User already authenticated, redirecting home');
            navigate('/');
        }
    }, [user, loading, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoadingSub(true);

        try {
            if (isSignUp) {
                // Registration
                await signUp(email, password, {
                    username: username.toLowerCase().trim(),
                    name: fullName.trim()
                });
                setSuccess(t('login.success'));
                // Reset form or switch to login? 
                // Usually Supabase requires email confirmation, so we stay on page.
            } else {
                // Login
                let loginIdentifier = username.trim();

                // If it's a username (doesn't contain @), lookup the email
                if (!loginIdentifier.includes('@')) {
                    const { data, error: lookupError } = await supabase
                        .from('members')
                        .select('email')
                        .eq('username', loginIdentifier.toLowerCase())
                        .single();

                    if (lookupError || !data) {
                        throw new Error(t('login.error'));
                    }
                    loginIdentifier = data.email;
                }

                const user = await login(loginIdentifier, password);
                if (user) {
                    console.log('Login: Success, redirecting to profile');
                    window.location.replace(`/members/${user.id}`);
                } else {
                    setError(t('login.error'));
                }
            }
        } catch (err) {
            setError(err.message === 'Invalid login credentials' ? t('login.error') : err.message);
        } finally {
            setLoadingSub(false);
        }
    };

    return (
        <div className="container login-page">
            <div className="card login-card">
                <h1>{isSignUp ? t('login.register') : t('login.title')}</h1>

                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                <form onSubmit={handleSubmit}>
                    {isSignUp && (
                        <>
                            <div className="form-group">
                                <label>{t('login.fullName')}</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('login.email')}</label>
                                <input
                                    type="email"
                                    className="input-field"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label>{t('member.username')}</label>
                        <input
                            type="text"
                            className="input-field"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>{t('login.password')}</label>
                        <input
                            type="password"
                            className="input-field"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loadingSub}>
                        {loadingSub
                            ? (isSignUp ? t('login.registering') : t('login.loggingIn'))
                            : (isSignUp ? t('login.register') : t('login.button'))}
                    </button>
                </form>

                <div className="login-toggle">
                    <p>
                        {isSignUp ? t('login.haveAccount') : t('login.noAccount')}
                        <button
                            className="btn-link"
                            onClick={() => {
                                setIsSignUp(!isSignUp);
                                setError('');
                                setSuccess('');
                            }}
                        >
                            {isSignUp ? t('login.button') : t('login.signUp')}
                        </button>
                    </p>
                </div>
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
                .login-toggle {
                    margin-top: 2rem;
                    text-align: center;
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                }
                .btn-link {
                    background: none;
                    border: none;
                    color: var(--primary);
                    font-weight: 600;
                    margin-left: 0.5rem;
                    cursor: pointer;
                    text-decoration: underline;
                }
                .btn-link:hover {
                    color: var(--accent);
                }
            `}</style>
        </div>
    );
};

export default Login;
