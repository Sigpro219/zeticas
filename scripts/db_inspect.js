import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://foodbazntwgnakdjbwfv.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvb2RiYXpudHdnbmFrZGpid2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MTk0MjksImV4cCI6MjA4OTE5NTQyOX0.1HfwAv132ddqVNFCz7nYneCH2S5N7kX08-KZaJaWKlc";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('suppliers').select('*').limit(1);
  if (error) {
    console.error("Error:", error);
    return;
  }
  if (data && data.length > 0) {
    console.log("Columns:", Object.keys(data[0]));
  } else {
    console.log("No data in suppliers.");
  }
}
run();
