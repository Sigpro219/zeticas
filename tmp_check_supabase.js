import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkClients() {
    const { data, count, error } = await supabase
        .from('clients')
        .select('*', { count: 'exact' });
    
    if (error) {
        console.error('Error fetching from Supabase:', error);
        return;
    }
    
    console.log(`Found ${count} clients in Supabase.`);
    if (data && data.length > 0) {
        console.log('Sample client names:', data.slice(0, 5).map(c => c.name).join(', '));
    }
}

checkClients();
