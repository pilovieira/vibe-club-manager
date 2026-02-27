import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';

const Contact = () => {
    const { t } = useLanguage();
    const { settings } = useSettings();

    const instagramHandle = settings.contact_instagram?.split('/').filter(Boolean).pop() || 'offroadmaringa';

    return (
        <div className="container contact-page">
            <header className="page-header">
                <h1 className="page-title">{t('contact.title')}</h1>
                <p className="page-subtitle">{t('contact.subtitle')}</p>
            </header>

            <div className="contact-content">
                <div className="contact-info card">
                    <p className="contact-message">{t('contact.message')}</p>

                    <div className="contact-details">
                        <div className="contact-item">
                            <div className="contact-icon">📞</div>
                            <div className="contact-text">
                                <h3>{t('contact.phone')}</h3>
                                <a href={`tel:${settings.contact_phone?.replace(/[^\d+]/g, '')}`}>
                                    {settings.contact_phone}
                                </a>
                            </div>
                        </div>

                        <div className="contact-item">
                            <div className="contact-icon">✉️</div>
                            <div className="contact-text">
                                <h3>{t('contact.email')}</h3>
                                <a href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a>
                            </div>
                        </div>

                        <div className="contact-item">
                            <div className="contact-icon">📸</div>
                            <div className="contact-text">
                                <h3>{t('contact.social')}</h3>
                                <a
                                    href={settings.contact_instagram}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="instagram-link"
                                >
                                    @{instagramHandle}
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="contact-cta">
                        <a
                            href={settings.contact_instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                        >
                            📸 {t('contact.instagram')}
                        </a>
                    </div>
                </div>
            </div>

            <style>{`
                .contact-page {
                    padding: 2rem 0;
                }
                .page-subtitle {
                    font-size: 1.25rem;
                    color: var(--text-secondary);
                    text-align: center;
                    margin-top: 0.5rem;
                }
                .contact-content {
                    margin-top: 3rem;
                    max-width: 800px;
                    margin-left: auto;
                    margin-right: auto;
                }
                .contact-info {
                    padding: 3rem;
                }
                .contact-message {
                    font-size: 1.2rem;
                    text-align: center;
                    color: var(--text-secondary);
                    margin-bottom: 3rem;
                }
                .contact-details {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                    margin-bottom: 3rem;
                }
                .contact-item {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                    padding: 1.5rem;
                    background: rgba(59, 130, 246, 0.05);
                    border-radius: 0.75rem;
                    border: 1px solid var(--glass-border);
                    transition: all 0.3s;
                }
                .contact-item:hover {
                    background: rgba(59, 130, 246, 0.1);
                    border-color: var(--primary);
                    transform: translateX(5px);
                }
                .contact-icon {
                    font-size: 2.5rem;
                    width: 60px;
                    height: 60px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--bg-card);
                    border-radius: 50%;
                    border: 2px solid var(--primary);
                }
                .contact-text h3 {
                    color: var(--primary);
                    margin: 0 0 0.5rem 0;
                    font-size: 1.1rem;
                }
                .contact-text a {
                    color: var(--text-primary);
                    text-decoration: none;
                    font-size: 1.1rem;
                    transition: color 0.2s;
                }
                .contact-text a:hover {
                    color: var(--primary);
                }
                .instagram-link {
                    font-weight: 600;
                }
                .contact-cta {
                    text-align: center;
                    padding-top: 2rem;
                    border-top: 1px solid var(--glass-border);
                }
                @media (max-width: 768px) {
                    .contact-info {
                        padding: 2rem 1.5rem;
                    }
                    .contact-item {
                        flex-direction: column;
                        text-align: center;
                    }
                }
            `}</style>
        </div>
    );
};

export default Contact;
