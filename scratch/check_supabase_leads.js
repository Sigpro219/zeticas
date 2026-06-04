import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Extract keys from .env
const envSrc = fs.readFileSync('.env', 'utf8');
const supabaseUrl = envSrc.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const supabaseAnonKeyMatch = envSrc.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
const supabaseKey = supabaseAnonKeyMatch ? supabaseAnonKeyMatch[1].split(' ')[0].trim() : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("Consultando leads en Supabase...");
    const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error al consultar:", error);
    } else {
        console.log(`Leads encontrados: ${data.length}`);
        data.forEach(lead => {
            console.log(`- [${lead.created_at}] ${lead.name} | ${lead.email} | ${lead.interest_type} (ID: ${lead.id})`);
        });
    }
}
test();
