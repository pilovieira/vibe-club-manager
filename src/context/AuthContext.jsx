import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const refreshProfile = useCallback(async (sessionUser) => {
        if (!sessionUser) return null;
        console.log('AuthContext: refreshProfile() for', sessionUser.id);
        try {
            const profile = await authService.getProfile(sessionUser.id);
            console.log('AuthContext: profile fetched:', profile);
            return { ...sessionUser, profile };
        } catch (err) {
            console.error('AuthContext: Profile sync error', err);
            return sessionUser; // Fallback to basic session user
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const initialize = async () => {
            console.log('AuthContext: initialize() started');

            // Safety timeout to prevent permanent loading state
            const timeoutId = setTimeout(() => {
                if (isMounted && loading) {
                    console.warn('AuthContext: Initialization timeout reached, forcing loading=false');
                    setLoading(false);
                }
            }, 5000);

            try {
                const session = await authService.getSession();
                console.log('AuthContext: session fetched:', !!session);
                if (session?.user && isMounted) {
                    const fullUser = await refreshProfile(session.user);
                    if (isMounted) setUser(fullUser);
                }
            } catch (err) {
                console.error('AuthContext: Init error', err);
                if (err.name === 'AbortError') {
                    console.warn('AuthContext: AbortError detected during initialization');
                }
            } finally {
                console.log('AuthContext: initialization finished, loading=false');
                clearTimeout(timeoutId);
                if (isMounted) setLoading(false);
            }
        };

        const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
            console.log('AuthContext: Auth event received:', event);
            if (!isMounted) return;

            try {
                if (session?.user) {
                    // Set basic user immediately so Navbar/UI can react
                    setUser(prev => ({
                        ...session.user,
                        profile: prev?.id === session.user.id ? prev.profile : null
                    }));

                    // If it's a login or initial session, fetch full profile
                    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                        const fullUser = await refreshProfile(session.user);
                        if (isMounted) {
                            setUser(fullUser);
                            setLoading(false);
                        }
                    } else if (event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
                        setUser(prev => ({ ...session.user, profile: prev?.profile }));
                    }
                } else {
                    console.log('AuthContext: Clearing user state due to event:', event);
                    setUser(null);
                    setLoading(false);
                }
            } catch (err) {
                console.error('AuthContext: Error in onAuthStateChange handler', err);
                if (isMounted) setLoading(false);
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
        isAdmin: !!user?.profile?.role && user.profile.role.toLowerCase() === 'admin',
        loading
    };

    console.log('AuthContext: context value updated:', {
        userId: user?.id,
        profileRole: user?.profile?.role,
        isAdmin: value.isAdmin,
        loading
    });

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
