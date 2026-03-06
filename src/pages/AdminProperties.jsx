import { useState, useEffect } from 'react';
import { mockService } from '../services/mockData';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { storageService } from '../services/storageService';
import { FaSpinner, FaUpload } from 'react-icons/fa';

const AdminProperties = () => {
    const { t } = useLanguage();
    const { user, isAdmin, loading: authLoading } = useAuth();
    const { applyTheme } = useTheme();
    const { updateSetting } = useSettings();
    const navigate = useNavigate();
    const [properties, setProperties] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploadingLogo(true);
        setError('');
        setSuccess('');

        try {
            const downloadURL = await storageService.uploadAppLogo(file);
            await handleUpdate('app_logo', downloadURL);
            setSuccess(t('settings.logoUploaded'));
        } catch (err) {
            console.error('Error uploading logo:', err);
            setError(err.message);
        } finally {
            setIsUploadingLogo(false);
        }
    };

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            navigate('/');
            return;
        }

        const fetchProperties = async () => {
            try {
                const props = await mockService.getProperties();
                // Ensure default values if not present in Firestore
                if (!props.monthly_contribution_value) {
                    props.monthly_contribution_value = 50;
                }
                if (!props.app_title) {
                    props.app_title = 'App Title';
                }
                setProperties(props);
            } catch (err) {
                console.error('Error fetching properties:', err);
                setError(t('settings.loadError'));
            } finally {
                setLoading(false);
            }
        };

        if (isAdmin) {
            fetchProperties();
        }
    }, [isAdmin, authLoading, navigate]);

    const handleUpdate = async (key, value) => {
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            const oldValue = properties[key];
            await mockService.updateProperty(key, value);
            setProperties(prev => ({ ...prev, [key]: value }));
            updateSetting(key, value);
            if (key === 'app_theme') {
                applyTheme(value);
            }
            setSuccess(t('settings.updateSuccess'));

            // Log operation
            await mockService.createLog({
                userId: user.id || user.uid,
                userName: user.name || user.displayName || user.email,
                description: `Changed property [${key}] from "${oldValue}" to "${value}"`
            });
        } catch (err) {
            console.error('Error updating property:', err);
            setError(t('settings.saveError'));
        } finally {
            setSaving(false);
        }
    };

    if (loading || authLoading) {
        return <div className="container">{t('common.loading')}...</div>;
    }

    return (
        <div className="container admin-properties-page">
            <header className="page-header">
                <h1 className="page-title">{t('admin.properties')}</h1>
            </header>

            {error && <div className="error-message mb-1">{error}</div>}
            {success && <div className="success-message mb-1">{success}</div>}

            <div className="card settings-card">
                <div className="settings-list">
                    <div className="setting-item">
                        <div className="setting-info">
                            <h3>{t('settings.appLogo')}</h3>
                            <p>{t('settings.appLogoDesc')}</p>
                        </div>
                        <div className="setting-action">
                            <div className="logo-upload-container">
                                {properties.app_logo ? (
                                    <img src={properties.app_logo} alt="App Logo" className="logo-preview-admin" />
                                ) : (
                                    <div className="logo-placeholder-admin">{t('settings.noLogo')}</div>
                                )}
                                <label className="btn btn-outline logo-upload-btn">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                        style={{ display: 'none' }}
                                        disabled={isUploadingLogo || saving}
                                    />
                                    {isUploadingLogo ? <FaSpinner className="spinner" /> : <FaUpload />}
                                    <span>{t('common.upload')}</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="setting-item">
                        <div className="setting-info">
                            <h3>{t('settings.appTitle')}</h3>
                            <p>{t('settings.appTitleDesc')}</p>
                        </div>
                        <div className="setting-action">
                            <div className="input-group">
                                <input
                                    type="text"
                                    className="input-field"
                                    value={properties.app_title || ''}
                                    onChange={(e) => setProperties({ ...properties, app_title: e.target.value })}
                                    style={{ width: '250px', textAlign: 'left' }}
                                />
                                <button
                                    className="btn btn-primary"
                                    onClick={() => handleUpdate('app_title', properties.app_title)}
                                    disabled={saving}
                                >
                                    {saving ? t('common.saving') : t('common.save')}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="setting-item">
                        <div className="setting-info">
                            <h3>{t('settings.homeDesc')}</h3>
                            <p>{t('settings.homeDescDesc')}</p>
                        </div>
                        <div className="setting-action" style={{ flex: 1, maxWidth: '500px' }}>
                            <div className="input-group" style={{ width: '100%' }}>
                                <textarea
                                    className="input-field"
                                    value={properties.home_description || ''}
                                    onChange={(e) => setProperties({ ...properties, home_description: e.target.value })}
                                    style={{ width: '100%', minHeight: '80px', textAlign: 'left', padding: '0.75rem', borderRadius: '0.5rem' }}
                                />
                                <button
                                    className="btn btn-primary"
                                    onClick={() => handleUpdate('home_description', properties.home_description)}
                                    disabled={saving}
                                >
                                    {saving ? t('common.saving') : t('common.save')}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="setting-item">
                        <div className="setting-info">
                            <h3>{t('settings.monthlyContribution')}</h3>
                            <p>{t('settings.monthlyContributionDesc')}</p>
                        </div>
                        <div className="setting-action">
                            <div className="input-group">
                                <span className="input-prefix">$</span>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={properties.monthly_contribution_value || ''}
                                    onChange={(e) => setProperties({ ...properties, monthly_contribution_value: Number(e.target.value) })}
                                    min="0"
                                    step="1"
                                />
                                <button
                                    className="btn btn-primary"
                                    onClick={() => handleUpdate('monthly_contribution_value', properties.monthly_contribution_value)}
                                    disabled={saving}
                                >
                                    {saving ? t('common.saving') : t('common.save')}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="setting-item">
                        <div className="setting-info">
                            <h3>{t('settings.contactPhone')}</h3>
                            <p>{t('settings.contactPhoneDesc')}</p>
                        </div>
                        <div className="setting-action">
                            <div className="input-group">
                                <input
                                    type="text"
                                    className="input-field"
                                    value={properties.contact_phone || ''}
                                    onChange={(e) => setProperties({ ...properties, contact_phone: e.target.value })}
                                    style={{ width: '250px', textAlign: 'left' }}
                                />
                                <button
                                    className="btn btn-primary"
                                    onClick={() => handleUpdate('contact_phone', properties.contact_phone)}
                                    disabled={saving}
                                >
                                    {saving ? t('common.saving') : t('common.save')}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="setting-item">
                        <div className="setting-info">
                            <h3>{t('settings.contactEmail')}</h3>
                            <p>{t('settings.contactEmailDesc')}</p>
                        </div>
                        <div className="setting-action">
                            <div className="input-group">
                                <input
                                    type="email"
                                    className="input-field"
                                    value={properties.contact_email || ''}
                                    onChange={(e) => setProperties({ ...properties, contact_email: e.target.value })}
                                    style={{ width: '250px', textAlign: 'left' }}
                                />
                                <button
                                    className="btn btn-primary"
                                    onClick={() => handleUpdate('contact_email', properties.contact_email)}
                                    disabled={saving}
                                >
                                    {saving ? t('common.saving') : t('common.save')}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="setting-item">
                        <div className="setting-info">
                            <h3>{t('settings.contactInstagram')}</h3>
                            <p>{t('settings.contactInstagramDesc')}</p>
                        </div>
                        <div className="setting-action">
                            <div className="input-group">
                                <input
                                    type="text"
                                    className="input-field"
                                    value={properties.contact_instagram || ''}
                                    onChange={(e) => setProperties({ ...properties, contact_instagram: e.target.value })}
                                    style={{ width: '250px', textAlign: 'left' }}
                                />
                                <button
                                    className="btn btn-primary"
                                    onClick={() => handleUpdate('contact_instagram', properties.contact_instagram)}
                                    disabled={saving}
                                >
                                    {saving ? t('common.saving') : t('common.save')}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="setting-item">
                        <div className="setting-info">
                            <h3>{t('settings.appTheme')}</h3>
                            <p>{t('settings.appThemeDesc')}</p>
                        </div>
                        <div className="setting-action">
                            <div className="input-group">
                                <select
                                    className="input-field"
                                    value={properties.app_theme || 'mud'}
                                    onChange={(e) => setProperties({ ...properties, app_theme: e.target.value })}
                                    style={{ width: '150px' }}
                                >
                                    <option value="mud">{t('settings.theme.mud')}</option>
                                    <option value="day">{t('settings.theme.day')}</option>
                                    <option value="night">{t('settings.theme.night')}</option>
                                    <option value="forest">{t('settings.theme.forest')}</option>
                                    <option value="sky">{t('settings.theme.sky')}</option>
                                    <option value="desert">{t('settings.theme.desert')}</option>
                                </select>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => {
                                        handleUpdate('app_theme', properties.app_theme);
                                        // The ThemeContext will handle immediate application if we integrate it
                                    }}
                                    disabled={saving}
                                >
                                    {saving ? t('common.saving') : t('common.save')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .admin-properties-page {
                    padding-top: 2rem;
                }
                .settings-card {
                    padding: 2rem;
                    max-width: 800px;
                    margin: 0 auto;
                }
                .settings-list {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }
                .setting-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 2rem;
                    padding-bottom: 2rem;
                    border-bottom: 1px solid var(--glass-border);
                }
                .setting-item:last-child {
                    border-bottom: none;
                    padding-bottom: 0;
                }
                .setting-info h3 {
                    margin-bottom: 0.5rem;
                    color: var(--text-primary);
                }
                .setting-info p {
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                }
                .input-group {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .input-prefix {
                    font-weight: 700;
                    color: var(--text-secondary);
                }
                .input-field {
                    width: 100px;
                    text-align: right;
                }
                .mb-1 { margin-bottom: 1rem; }
                
                @media (max-width: 600px) {
                    .setting-item {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 1rem;
                    }
                }
                .logo-upload-container {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                }
                .logo-preview-admin {
                    width: 60px;
                    height: 60px;
                    border-radius: 12px;
                    object-fit: cover;
                    border: 2px solid var(--accent);
                }
                .logo-placeholder-admin {
                    width: 60px;
                    height: 60px;
                    border-radius: 12px;
                    border: 2px dashed var(--glass-border);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.7rem;
                    color: var(--text-secondary);
                }
                .logo-upload-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                    font-size: 0.9rem;
                    padding: 0.5rem 1rem;
                }
            `}</style>
        </div>
    );
};

export default AdminProperties;
