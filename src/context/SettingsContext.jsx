import { createContext, useContext, useState, useEffect } from 'react';
import { mockService } from '../services/mockData';

const SettingsContext = createContext();

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState({
        app_title: 'Offroad Maringá',
        monthly_contribution_value: 50,
        app_theme: 'mud',
        contact_phone: '(44) 3333-4444',
        contact_email: 'contato@offroadmaringa.com.br',
        contact_instagram: 'https://www.instagram.com/offroadmaringa/'
    });
    const [loading, setLoading] = useState(true);

    const fetchSettings = async () => {
        try {
            const props = await mockService.getProperties();
            setSettings(prev => ({
                ...prev,
                ...props
            }));
        } catch (err) {
            console.error('Error fetching settings:', err);
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
