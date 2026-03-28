import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkProducts() {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .limit(1);
    
    if (error) {
        console.error('Error fetching products:', error);
        return;
    }
    
    console.log('Sample product:', JSON.stringify(data[0], null, 2));
}

checkProducts();
