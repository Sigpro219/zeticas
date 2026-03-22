import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const filePath = "C:\\Users\\Usuario\\OneDrive\\Documentos\\Proyectos Delta CoreTech\\2026\\Zeticas\\Proveedores.xlsx";
const supabaseUrl = "https://foodbazntwgnakdjbwfv.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvb2RiYXpudHdnbmFrZGpid2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MTk0MjksImV4cCI6MjA4OTE5NTQyOX0.1HfwAv132ddqVNFCz7nYneCH2S5N7kX08-KZaJaWKlc";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function loadSuppliers() {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Found ${jsonData.length} suppliers in Excel.`);

    const suppliersToInsert = jsonData.map(item => ({
      name: (item["Proveedor "] || item["Proveedor"] || "").trim(),
      nit: '901.000.000-0',
      status: 'ACTIVE',
      lead_time_days: 3,
      contact_name: 'N/A',
      phone: '0000000',
      email: 'N/A'
    })).filter(s => s.name !== "");

    console.log(`Attempting to insert ${suppliersToInsert.length} records...`);

    const { data, error } = await supabase.from('suppliers').insert(suppliersToInsert);

    if (error) {
      throw error;
    }

    console.log("Success! Suppliers loaded into Supabase.");
  } catch (err) {
    console.error("Critical Error loading suppliers:", err.message);
  }
}

loadSuppliers();
