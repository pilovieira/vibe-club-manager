import { supabase } from '../supabaseClient';

export const authService = {
    login: async (email, password) => {
        console.log('authService: Attempting login for', email);
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    },

    signUp: async (email, password, metadata) => {
        console.log('authService: Attempting signup for', email);
        const { data, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: metadata.username,
                    full_name: metadata.name
                }
            }
        });

        if (authError) throw authError;

        if (data.user) {
            console.log('authService: Auth user created, creating member profile...');
            const { error: profileError } = await supabase
                .from('members')
                .insert([{
                    id: data.user.id,
                    email: email,
                    username: metadata.username.toLowerCase(),
                    name: metadata.name,
                    role: 'member',
                    status: 'active'
                }]);

            if (profileError) {
                console.error('authService: Profile creation failed', profileError);
                throw profileError;
            }
        }
        return data;
    },

    logout: async () => {
        console.log('authService: Calling signOut()...');
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('authService: SignOut error', error);
            throw error;
        }
        console.log('authService: SignOut successful');
    },

    getSession: async () => {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
    },

    onAuthStateChange: (callback) => {
        return supabase.auth.onAuthStateChange(callback);
    },

    getProfile: async (userId) => {
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .eq('id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is 'no rows returned'
            console.error('authService: Error fetching profile', error);
            throw error;
        }
        return data;
    }
};
