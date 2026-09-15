import { createContext, useContext, useState, useEffect } from 'react';
import { mockService } from '../services/mockData';

const SettingsContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components -- hook lives alongside its provider by design
export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState({
        app_title: 'App Title',
        app_theme: 'mud',
        app_logo: '',
        home_description: ''
    });
    const [loading, setLoading] = useState(true);
    const [customPages, setCustomPages] = useState([]);

    const fetchSettings = async () => {
        try {
            const [props, pages] = await Promise.all([
                mockService.getProperties(),
                mockService.getCustomPages()
            ]);
            setSettings(prev => ({
                ...prev,
                ...props
            }));
            setCustomPages(pages);
        } catch (err) {
            console.error('Error fetching settings:', err);
            // If property load failed refresh the page
            window.location.reload();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const updateSetting = (key, value) => {
        setSettings(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const value = {
        settings,
        customPages,
        loading,
        refreshSettings: fetchSettings,
        updateSetting
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};
