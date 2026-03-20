import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://obsvdzlsbbqmhpsxksnd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ic3ZkemxzYmJxbWhwc3hrc25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMTIzMTMsImV4cCI6MjA4NTg4ODMxM30.AWOz6pf-yiOm_-ZlCvhMDfyA2pp9QOOrpQEiIdl_2SI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
    const { data, error } = await supabase.from('suppliers').select('*').limit(1);
    if (error) console.error(error);
    else if (data.length > 0) console.log(Object.keys(data[0]));
    else console.log("Table is empty");
}

checkColumns();
