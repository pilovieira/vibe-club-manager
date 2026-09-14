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
            console.log('AuthContext: initialize() started (monitoring initial session)');

            // Safety timeout to prevent permanent loading state
            const timeoutId = setTimeout(() => {
                if (isMounted && loading) {
                    console.warn('AuthContext: Initialization timeout reached, forcing loading=false');
                    setLoading(false);
                }
            }, 5000);

            // We no longer call getSession() here to avoid race conditions with onAuthStateChange.
            // onAuthStateChange will emit INITIAL_SESSION which we handle below.
            return () => clearTimeout(timeoutId);
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

        const cleanupInit = initialize();

        return () => {
            isMounted = false;
            subscription.unsubscribe();
            if (typeof cleanupInit === 'function') cleanupInit();
        };
    }, [refreshProfile]);


    const logout = async () => {
        console.log('AuthContext: logout() initiated...');
        // Set loading to true to prevent UI flickers or navigation during logout
        setLoading(true);
        // Explicitly clear local state immediately
        setUser(null);

        try {
            await authService.logout();
            console.log('AuthContext: logout() successful');
        } catch (err) {
            console.error('AuthContext: Logout failed', err);
        } finally {
            setLoading(false);
        }
    };

    const role = user?.profile?.role || 'visitor';
    const isSuperuser = role === 'superuser';
    // Superuser has every admin permission plus the superuser-only ones.
    const isAdmin = role === 'admin' || isSuperuser;
    // Finance role has access to the financial admin pages, same as admin/superuser.
    const isFinance = role === 'financeiro' || isAdmin;

    const value = {
        user,
        logout,
        sendEmailLink: authService.sendEmailLink,
        isSignInWithEmailLink: authService.isSignInWithEmailLink,
        signInWithEmailLink: authService.signInWithEmailLink,
        loginWithGoogle: authService.loginWithGoogle,
        isAdmin,
        isSuperuser,
        isFinance,
        userRole: role,
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
