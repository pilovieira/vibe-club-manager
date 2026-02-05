import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase configuration missing! Check your .env file.', {
        url: !!supabaseUrl,
        key: !!supabaseAnonKey
    });
}

// Singleton instance
let supabaseInstance = null;

export const getSupabase = () => {
    console.log('supabaseClient: getSupabase() requested');
    if (!supabaseInstance) {
        console.log('supabaseClient: Initializing new client instance...', { url: !!supabaseUrl, key: !!supabaseAnonKey });
        supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
        console.log('supabaseClient: Client instance created');
    }
    return supabaseInstance;
};

export const supabase = getSupabase();
