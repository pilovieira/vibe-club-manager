const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing environment variables in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const initialMembers = [
    {
        username: 'admin',
        name: 'Club Admin',
        email: 'admin@offroadmga.com',
        role: 'admin',
        status: 'active',
        gender: 'male'
    },
    {
        username: 'jdoe',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'member',
        status: 'active',
        gender: 'male'
    },
    {
        username: 'mdoe',
        name: 'Mary Doe',
        email: 'mary@example.com',
        role: 'member',
        status: 'active',
        gender: 'female'
    }
];

async function restore() {
    console.log('Restoring members...');

    for (const member of initialMembers) {
        // Check if member already exists by email
        const { data: existing } = await supabase
            .from('members')
            .select('id')
            .eq('email', member.email)
            .single();

        if (existing) {
            console.log(`Member ${member.email} already exists, skipping.`);
            continue;
        }

        const { data, error } = await supabase
            .from('members')
            .insert([member])
            .select();

        if (error) {
            console.error(`Error inserting ${member.email}:`, error.message);
        } else {
            console.log(`Inserted ${member.email}`);
        }
    }

    console.log('Restoration complete!');
}

restore();
