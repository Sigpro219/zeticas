import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkOrdersAndItems() {
    const { data: orders } = await supabase.from('orders').select('*').limit(1);
    const { data: items } = await supabase.from('order_items').select('*').limit(1);
    
    console.log('Sample order:', JSON.stringify(orders[0], null, 2));
    console.log('Sample item:', JSON.stringify(items[0], null, 2));
}

checkOrdersAndItems();
