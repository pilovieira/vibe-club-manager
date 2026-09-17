import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components -- hook lives alongside its provider by design
export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

// Language is a personal preference stored in this browser's localStorage,
// not a shared app-wide setting — each user picks their own.
export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        return localStorage.getItem('language') || 'pt';
    });

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
