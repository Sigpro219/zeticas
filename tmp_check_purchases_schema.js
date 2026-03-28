import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkPurchases() {
    const { data: pur } = await supabase.from('purchases').select('*').limit(1);
    const { data: items } = await supabase.from('purchase_items').select('*').limit(1);
    
    console.log('Sample purchase:', JSON.stringify(pur[0], null, 2));
    console.log('Sample purchase item:', JSON.stringify(items[0], null, 2));
}

checkPurchases();
