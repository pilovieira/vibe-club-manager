import { createContext, useContext, useState, useEffect } from 'react';
import { mockService } from '../services/mockData';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState('mud');
    const [loading, setLoading] = useState(true);

    const applyTheme = (themeName) => {
        const body = document.body;
        // Remove existing theme classes
        const themeClasses = ['theme-mud', 'theme-day', 'theme-night', 'theme-forest', 'theme-sky', 'theme-desert'];
        themeClasses.forEach(c => body.classList.remove(c));

        // Add new theme class
        body.classList.add(`theme-${themeName}`);
        setTheme(themeName);
    };

    useEffect(() => {
        const fetchTheme = async () => {
            try {
                const savedTheme = await mockService.getProperty('app_theme', 'mud');
                applyTheme(savedTheme);
            } catch (error) {
                console.error('Error fetching theme:', error);
                applyTheme('mud');
            } finally {
                setLoading(false);
            }
        };

        fetchTheme();
    }, []);

    const updateTheme = async (newTheme) => {
        try {
            await mockService.updateProperty('app_theme', newTheme);
            applyTheme(newTheme);
        } catch (error) {
            console.error('Error updating theme:', error);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, updateTheme, applyTheme, loading }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
