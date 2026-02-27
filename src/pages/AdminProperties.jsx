import { useState, useEffect } from 'react';
import { mockService } from '../services/mockData';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const AdminProperties = () => {
    const { t } = useLanguage();
    const { user, isAdmin, loading: authLoading } = useAuth();
    const { applyTheme } = useTheme();
    const navigate = useNavigate();
    const [properties, setProperties] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

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
                setProperties(props);
            } catch (err) {
                console.error('Error fetching properties:', err);
                setError('Failed to load settings');
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
            if (key === 'app_theme') {
                applyTheme(value);
            }
            setSuccess(t('common.success') || 'Settings updated successfully!');

            // Log operation
            await mockService.createLog({
                userId: user.id || user.uid,
                userName: user.name || user.displayName || user.email,
                description: `Changed property [${key}] from "${oldValue}" to "${value}"`
            });
        } catch (err) {
            console.error('Error updating property:', err);
            setError('Failed to save setting');
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
                <h1 className="page-title">{t('admin.properties') || 'Club Management Settings'}</h1>
            </header>

            {error && <div className="error-message mb-1">{error}</div>}
            {success && <div className="success-message mb-1">{success}</div>}

            <div className="card settings-card">
                <div className="settings-list">
                    <div className="setting-item">
                        <div className="setting-info">
                            <h3>{t('settings.monthlyContribution') || 'Monthly Contribution Value'}</h3>
                            <p>{t('settings.monthlyContributionDesc') || 'Standard amount charged to members each month.'}</p>
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
                            <h3>{t('settings.appTheme') || 'App Theme'}</h3>
                            <p>{t('settings.appThemeDesc') || 'Choose the visual style for the entire application.'}</p>
                        </div>
                        <div className="setting-action">
                            <div className="input-group">
                                <select
                                    className="input-field"
                                    value={properties.app_theme || 'mud'}
                                    onChange={(e) => setProperties({ ...properties, app_theme: e.target.value })}
                                    style={{ width: '150px' }}
                                >
                                    <option value="mud">Mud (Brown)</option>
                                    <option value="day">Day (Light)</option>
                                    <option value="night">Night (Dark)</option>
                                    <option value="forest">Forest (Green)</option>
                                    <option value="sky">Sky (Blue)</option>
                                    <option value="desert">Desert (Sand)</option>
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
            `}</style>
        </div>
    );
};

export default AdminProperties;
