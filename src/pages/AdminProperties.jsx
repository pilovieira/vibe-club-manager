import { useState, useEffect, useRef } from 'react';
import { mockService } from '../services/mockData';
import { storageService } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useAlert } from '../context/ConfirmContext';
import { useSettings } from '../context/SettingsContext';
import { FaSave, FaHistory, FaUpload, FaTrash } from 'react-icons/fa';
import GenericLogo from '../components/GenericLogo';

const AdminProperties = () => {
    const { user, isAdmin, loading } = useAuth();
    const { t } = useLanguage();
    const alert = useAlert();
    const { settings, refreshSettings } = useSettings();
    const [properties, setProperties] = useState({});
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState('');
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (settings) {
            setProperties({ ...settings });
        }
    }, [settings]);

    const handleSaveAll = async () => {
        setSaving(true);
        setSuccess('');

        try {
            // Figure out which settings actually changed, for a useful log entry.
            const fieldLabels = {
                app_logo: t('settings.appLogo'),
                event_types: t('settings.eventTypes'),
                monthly_contribution_value: t('settings.monthlyContribution')
            };
            const changedFields = Object.keys(fieldLabels).filter(key => {
                const before = JSON.stringify(settings?.[key] ?? '');
                const after = JSON.stringify(properties?.[key] ?? '');
                return before !== after;
            }).map(key => fieldLabels[key]);

            await mockService.updateProperties(properties);
            await refreshSettings();
            setSuccess(t('settings.updateSuccess') || 'All settings updated successfully!');

            // Log operation
            await mockService.createLog({
                userId: user.id || user.uid,
                userName: user.profile?.name || user.email,
                userEmail: user.email,
                description: changedFields.length > 0
                    ? `Updated application properties: ${changedFields.join(', ')}`
                    : 'Saved application properties (no changes detected)'
            });

            setTimeout(() => setSuccess(''), 5000);
        } catch (err) {
            console.error('Error updating settings:', err);
            await alert(t('common.error'));
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const url = await storageService.uploadAppLogo(file);
            setProperties({ ...properties, app_logo: url });
            setSuccess(t('settings.logoUploaded') || 'Logo uploaded! Click Save All to apply.');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Error uploading logo:', err);
            await alert(t('pageEditor.errorUpload'));
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveLogo = () => {
        setProperties({ ...properties, app_logo: '' });
    };

    if (loading) {
        return <div className="container" style={{ paddingTop: '2rem' }}>{t('common.loading')}...</div>;
    }

    if (!isAdmin) {
        return <div className="container" style={{ paddingTop: '2rem' }}>{t('common.unauthorized')}</div>;
    }

    return (
        <div className="container admin-properties-page">
            <header className="page-header">
                <div className="header-left">
                    <h1 className="page-title">{t('admin.properties')}</h1>
                </div>
                <div className="header-actions">
                    <button
                        className="btn btn-success btn-save-all"
                        onClick={handleSaveAll}
                        disabled={saving}
                    >
                        <FaSave /> {saving ? t('common.saving') : t('common.saveAll') || 'Save All Changes'}
                    </button>
                </div>
            </header>

            {success && (
                <div className="alert alert-success animate-fade-in">
                    {success}
                </div>
            )}

            <div className="properties-container card animate-fade-in">
                <div className="settings-section">
                    <h2 className="section-subtitle">{t('settings.general')}</h2>

                    <div className="setting-item">
                        <div className="setting-info">
                            <h3>{t('settings.appLogo')}</h3>
                            <p>{t('settings.appLogoDesc')}</p>
                        </div>
                        <div className="setting-action" style={{ flex: 1, maxWidth: '500px' }}>
                            <div className="logo-preview-wrapper">
                                {properties.app_logo ? (
                                    <div className="logo-preview-container">
                                        <img src={properties.app_logo} alt="App Logo" className="logo-preview-img" />
                                        <button className="btn-remove-logo" onClick={handleRemoveLogo} title={t('common.delete')}>
                                            <FaTrash />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="logo-placeholder">
                                        <GenericLogo />
                                        <span>{t('settings.noLogo')}</span>
                                    </div>
                                )}
                                <div className="logo-upload-controls">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleLogoUpload}
                                        style={{ display: 'none' }}
                                        accept="image/*"
                                    />
                                    <button
                                        className="btn btn-outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                    >
                                        <FaUpload /> {uploading ? t('pageEditor.uploading') : t('common.upload') || 'Upload'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>


                </div>

                <div className="settings-section divider-top">
                    <h2 className="section-subtitle">{t('settings.eventsTitle') || 'Events Configuration'}</h2>
                    <div className="setting-item">
                        <div className="setting-info">
                            <h3>{t('settings.eventTypes') || 'Event Types'}</h3>
                            <p>{t('settings.eventTypesDesc') || 'Define categories for your events (one per line).'}</p>
                        </div>
                        <div className="setting-action" style={{ flex: 1, maxWidth: '500px' }}>
                            <textarea
                                className="input-field"
                                value={Array.isArray(properties.event_types) ? properties.event_types.join('\n') : (properties.event_types || '')}
                                onChange={(e) => setProperties({ ...properties, event_types: e.target.value.split('\n') })}
                                style={{ width: '100%', minHeight: '100px', textAlign: 'left', padding: '0.75rem', borderRadius: '0.5rem', fontFamily: 'monospace' }}
                                placeholder="e.g.\nsoft trail\nhard trail\nmembers meetup"
                            />
                        </div>
                    </div>
                </div>

                <div className="settings-section divider-top">
                    <h2 className="section-subtitle">{t('settings.financial')}</h2>
                    <div className="setting-item">
                        <div className="setting-info">
                            <h3>{t('settings.monthlyContribution')}</h3>
                            <p>{t('settings.monthlyContributionDesc')}</p>
                        </div>
                        <div className="setting-action" style={{ flex: 1, maxWidth: '500px' }}>
                            <div className="input-group" style={{ width: '100%' }}>
                                <span className="input-prefix">R$</span>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={properties.monthly_contribution_value || 0}
                                    onChange={(e) => setProperties({ ...properties, monthly_contribution_value: Number(e.target.value) })}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        .admin-properties-page {
            padding-top: 2rem;
            padding-bottom: 4rem;
        }
        
        .page-header {
            margin-bottom: 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .btn-save-all {
            padding: 0.75rem 1.5rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .btn-save-all:hover:not(:disabled) {
            transform: translateY(-2px);
            scale: 1.05;
            box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4);
        }

        .alert-success {
            background: rgba(34, 197, 94, 0.1);
            color: var(--success);
            border: 1px solid var(--success);
            padding: 1rem;
            border-radius: 0.5rem;
            margin-bottom: 1.5rem;
            font-weight: 600;
        }
        
        .divider-top {
            border-top: 1px solid var(--glass-border);
            padding-top: 2rem;
            margin-top: 2rem;
        }

        .section-subtitle {
            font-size: 1.25rem;
            color: var(--accent);
            margin-bottom: 1.5rem;
            font-weight: 700;
        }

        .properties-container {
            padding: 2rem;
        }
        
        .setting-item {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 2rem;
            margin-bottom: 2.5rem;
        }
        
        .setting-item:last-child {
            margin-bottom: 0;
        }
        
        .setting-info h3 {
            margin: 0 0 0.25rem 0;
            font-size: 1.1rem;
            color: var(--text-primary);
        }
        
        .setting-info p {
            margin: 0;
            font-size: 0.9rem;
            color: var(--text-secondary);
            font-style: italic;
            max-width: 400px;
        }
        
        .setting-action {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        /* Logo Preview Styles */
        .logo-preview-wrapper {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        
        .logo-preview-container {
            position: relative;
            width: fit-content;
        }
        
        .logo-preview-img {
            height: 100px;
            width: 100px;
            object-fit: contain;
            border-radius: 1rem;
            border: 2px solid var(--glass-border);
            background: rgba(0,0,0,0.2);
            padding: 0.5rem;
        }
        
        .btn-remove-logo {
            position: absolute;
            top: -10px;
            right: -10px;
            background: #ef4444;
            color: white;
            border: none;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 0.75rem;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }

        .logo-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
            padding: 1.5rem;
            border: 2px dashed var(--glass-border);
            border-radius: 1rem;
            color: var(--text-secondary);
            width: 120px;
        }

        .logo-placeholder span {
            font-size: 0.8rem;
            font-weight: 600;
        }
        
        .input-group {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .input-prefix {
            font-weight: 700;
            color: var(--text-secondary);
            font-size: 1.1rem;
        }
        
        .animate-fade-in {
            animation: fadeIn 0.4s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
            .page-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 1.5rem;
            }
            .btn-save-all {
                width: 100%;
                justify-content: center;
            }
            .setting-item {
                flex-direction: column;
                gap: 1rem;
            }
            .setting-info p {
                max-width: none;
            }
            .setting-action {
                width: 100%;
                max-width: none !important;
            }
        }
      `}</style>
        </div>
    );
};

export default AdminProperties;
