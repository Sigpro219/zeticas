import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://obsvdzlsbbqmhpsxksnd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ic3ZkemxzYmJxbWhwc3hrc25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMTIzMTMsImV4cCI6MjA4NTg4ODMxM30.AWOz6pf-yiOm_-ZlCvhMDfyA2pp9QOOrpQEiIdl_2SI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAssets() {
    console.log("Listing assets in 'assets' bucket...");
    const { data, error } = await supabase.storage.from('assets').list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
    });

    if (error) {
        console.error("Error listing assets:", error);
    } else {
        console.log("Found assets:");
        data.forEach(item => {
            console.log(`- ${item.name}`);
        });
    }
}

listAssets().catch(console.error);
