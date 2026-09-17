import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { FaSlidersH } from 'react-icons/fa';

const THEMES = ['mud', 'day', 'night', 'forest', 'sky', 'desert'];

const Preferences = () => {
    const { t, language, setLanguage } = useLanguage();
    const { theme, setTheme } = useTheme();

    return (
        <div className="container preferences-page">
            <header className="page-header">
                <h1 className="page-title"><FaSlidersH /> {t('preferences.title')}</h1>
                <p className="page-subtitle">{t('preferences.subtitle')}</p>
            </header>

            <div className="card preferences-container">
                <div className="setting-item">
                    <div className="setting-info">
                        <h3>{t('preferences.language')}</h3>
                        <p>{t('preferences.languageDesc')}</p>
                    </div>
                    <div className="setting-action">
                        <select
                            className="input-field"
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                        >
                            <option value="pt">Português (BR)</option>
                            <option value="en">English (US)</option>
                            <option value="es">Español (ES)</option>
                        </select>
                    </div>
                </div>

                <div className="setting-item">
                    <div className="setting-info">
                        <h3>{t('preferences.theme')}</h3>
                        <p>{t('preferences.themeDesc')}</p>
                    </div>
                    <div className="setting-action">
                        <select
                            className="input-field"
                            value={theme}
                            onChange={(e) => setTheme(e.target.value)}
                        >
                            {THEMES.map(themeName => (
                                <option key={themeName} value={themeName}>
                                    {t(`settings.theme.${themeName}`)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <style>{`
                .preferences-page {
                    padding-top: 2rem;
                    padding-bottom: 4rem;
                }
                .page-header {
                    margin-bottom: 2rem;
                }
                .page-title {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                .page-subtitle {
                    color: var(--text-secondary);
                    margin-top: 0.5rem;
                }
                .preferences-container {
                    padding: 2rem;
                    max-width: 700px;
                }
                .setting-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 2rem;
                    margin-bottom: 2rem;
                }
                .setting-item:last-child {
                    margin-bottom: 0;
                }
                .setting-info h3 {
                    margin: 0 0 0.25rem 0;
                    font-size: 1.05rem;
                    color: var(--text-primary);
                }
                .setting-info p {
                    margin: 0;
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    font-style: italic;
                    max-width: 320px;
                }
                .setting-action {
                    flex: 1;
                    max-width: 280px;
                }
                .setting-action .input-field {
                    width: 100%;
                }

                @media (max-width: 600px) {
                    .setting-item {
                        flex-direction: column;
                        gap: 0.75rem;
                    }
                    .setting-info p {
                        max-width: none;
                    }
                    .setting-action {
                        width: 100%;
                        max-width: none;
                    }
                }
            `}</style>
        </div>
    );
};

export default Preferences;
