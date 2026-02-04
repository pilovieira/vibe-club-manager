import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const refreshProfile = useCallback(async (sessionUser) => {
        if (!sessionUser) return null;
        try {
            const profile = await authService.getProfile(sessionUser.id);
            return { ...sessionUser, profile };
        } catch (err) {
            console.error('AuthContext: Profile sync error', err);
            return sessionUser; // Fallback to basic session user
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const initialize = async () => {
            try {
                const session = await authService.getSession();
                if (session?.user && isMounted) {
                    const fullUser = await refreshProfile(session.user);
                    if (isMounted) setUser(fullUser);
                }
            } catch (err) {
                console.error('AuthContext: Init error', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
            console.log('AuthContext: Auth event received:', event);
            if (!isMounted) return;

            if (session?.user) {
                // Set basic user immediately so Navbar/UI can react
                if (isMounted) {
                    setUser(prev => ({
                        ...session.user,
                        profile: prev?.id === session.user.id ? prev.profile : null
                    }));
                }

                // If it's a login or initial session, fetch full profile
                if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                    const fullUser = await refreshProfile(session.user);
                    if (isMounted) {
                        setUser(fullUser);
                        setLoading(false);
                    }
                } else if (event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
                    // Just update state with new session info
                    setUser(prev => ({ ...session.user, profile: prev?.profile }));
                }
            } else {
                // SIGNED_OUT or session expired
                console.log('AuthContext: Clearing user state due to event:', event);
                if (isMounted) {
                    setUser(null);
                    setLoading(false);
                }
            }
        });

        initialize();

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [refreshProfile]);

    const login = async (email, password) => {
        const data = await authService.login(email, password);
        return data.user;
    };

    const signUp = async (email, password, metadata) => {
        const data = await authService.signUp(email, password, metadata);
        return !!data.user;
    };

    const logout = async () => {
        console.log('AuthContext: logout() initiated via service...');
        try {
            await authService.logout();
            console.log('AuthContext: logout() service call finished');
            // Explicitly clear local state to ensure fast UI response
            setUser(null);
        } catch (err) {
            console.error('AuthContext: Logout service fail', err);
            setUser(null); // Clear anyway
            throw err;
        }
    };

    const value = {
        user,
        login,
        signUp,
        logout,
        isAdmin: user?.profile?.role === 'admin' || user?.email === 'admin@offroadmga.com',
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
