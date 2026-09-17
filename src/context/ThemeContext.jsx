import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const THEME_CLASSES = ['theme-mud', 'theme-day', 'theme-night', 'theme-forest', 'theme-sky', 'theme-desert'];

const applyTheme = (themeName) => {
    const body = document.body;
    THEME_CLASSES.forEach(c => body.classList.remove(c));
    body.classList.add(`theme-${themeName}`);
};

// Theme is a personal preference stored in this browser's localStorage,
// not a shared app-wide setting — each user picks their own.
export const ThemeProvider = ({ children }) => {
    const [theme, setThemeState] = useState(() => localStorage.getItem('theme') || 'mud');

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    const setTheme = (newTheme) => {
        localStorage.setItem('theme', newTheme);
        setThemeState(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, loading: false }}>
            {children}
        </ThemeContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components -- hook lives alongside its provider by design
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
