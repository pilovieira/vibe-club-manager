import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';
import { useSettings } from './SettingsContext';

const LanguageContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components -- hook lives alongside its provider by design
export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

export const LanguageProvider = ({ children }) => {
    const { settings } = useSettings();
    const [language, setLanguage] = useState(() => {
        // Load from localStorage or default to settings or 'pt'
        return localStorage.getItem('language') || settings.app_language || 'pt';
    });

    // Update language state when the app property changes (e.g. once settings finish loading).
    useEffect(() => {
        if (settings.app_language && settings.app_language !== language) {
            setLanguage(settings.app_language);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-sync when the external setting itself changes
    }, [settings.app_language]);

    useEffect(() => {
        // Save to localStorage whenever language changes
        localStorage.setItem('language', language);
    }, [language]);

    const t = (key) => {
        return translations[language]?.[key] || key;
    };

    const toggleLanguage = () => {
        // No longer actively used in navbar but kept here for stability
        setLanguage(prev => {
            if (prev === 'en') return 'pt';
            if (prev === 'pt') return 'es';
            return 'en';
        });
    };

    const value = {
        language,
        setLanguage,
        toggleLanguage,
        t
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};
