import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const tables = ['products', 'clients', 'orders', 'recipes', 'suppliers', 'purchases', 'expenses', 'banks', 'site_content'];

async function checkAll() {
    for (const table of tables) {
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
            if (error) {
                console.log(`Table ${table}: Error or missing (${error.message})`);
            } else {
                console.log(`Table ${table}: ${count} rows`);
            }
        } catch (e) {
            console.log(`Table ${table}: Failed (${e.message})`);
        }
    }
}

checkAll();
