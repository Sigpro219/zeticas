import { createClient } from '@supabase/supabase-js';
import xlsx from 'xlsx';

const supabaseUrl = 'https://obsvdzlsbbqmhpsxksnd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ic3ZkemxzYmJxbWhwc3hrc25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMTIzMTMsImV4cCI6MjA4NTg4ODMxM30.AWOz6pf-yiOm_-ZlCvhMDfyA2pp9QOOrpQEiIdl_2SI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const paths = {
    clients: "/Users/andreslopez/Desktop/XL Ideas/IIRS SAS/1. Zeticas/Cargue_Masivo_Clientes.xls.xlsx",
    suppliers: "/Users/andreslopez/Desktop/XL Ideas/IIRS SAS/1. Zeticas/Proveedores.xlsx",
    banks: "/Users/andreslopez/Desktop/XL Ideas/IIRS SAS/1. Zeticas/Bancos.xlsx",
    orders: "/Users/andreslopez/Desktop/XL Ideas/IIRS SAS/1. Zeticas/1. Control de facturación Z.xlsm"
};

async function updateClients() {
    console.log("Updating Clients...");
    try {
        const wb = xlsx.readFile(paths.clients);
        const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

        const { data: current } = await supabase.from('clients').select('nit');
        const existingNits = new Set(current?.map(c => c.nit) || []);

        const mapped = data.map(row => {
            const nit = String(row['Identificación'] || '');
            if (existingNits.has(nit)) return null;
            return {
                name: row['Nombre tercero'] || 'Sin Nombre',
                nit: nit,
                address: row['Dirección'] || '',
                city: row['Ciudad'] || '',
                phone: String(row['Teléfono.'] || ''),
                email: row['Correo Electrónico'] || '',
                contact_name: row['Nombres contacto'] || '',
                type: String(row['Tipo de Cliente'] || 'Jurídica').includes('B2C') ? 'Natural' : 'Jurídica',
                status: 'ACTIVE'
            };
        }).filter(c => c !== null && c.name !== 'Sin Nombre');

        if (mapped.length > 0) {
            const { error } = await supabase.from('clients').insert(mapped);
            if (error) console.error("Error updating clients:", error.message);
            else console.log(`Successfully added ${mapped.length} new clients.`);
        } else {
            console.log("No new clients to add.");
        }
    } catch (e) {
        console.error("Error reading clients file:", e.message);
    }
}

async function updateSuppliers() {
    console.log("Updating Suppliers...");
    try {
        const wb = xlsx.readFile(paths.suppliers);
        const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

        const { data: current } = await supabase.from('suppliers').select('name');
        const existingNames = new Set(current?.map(s => s.name) || []);

        const mapped = data.map(row => {
            const name = row['Proveedor '] || 'Sin Nombre';
            if (existingNames.has(name)) return null;
            return {
                name: name,
                status: 'ACTIVE'
            };
        }).filter(s => s !== null && s.name !== 'Sin Nombre');

        if (mapped.length > 0) {
            const { error } = await supabase.from('suppliers').insert(mapped);
            if (error) console.error("Error updating suppliers:", error.message);
            else console.log(`Successfully added ${mapped.length} new suppliers.`);
        } else {
            console.log("No new suppliers to add.");
        }
    } catch (e) {
        console.error("Error reading suppliers file:", e.message);
    }
}

async function updateBanks() {
    console.log("Updating Banks...");
    try {
        const wb = xlsx.readFile(paths.banks);
        const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

        const { data: current } = await supabase.from('banks').select('name');
        const existingNames = new Set(current?.map(b => b.name) || []);

        const mapped = data.map(row => {
            const name = row['Banco '] || 'Sin Nombre';
            if (existingNames.has(name)) return null;
            return {
                name: name,
                account_number: String(row['No. Cuenta Ahorros'] || ''),
                type: 'Ahorros',
                balance: 0
            };
        }).filter(b => b !== null && b.name !== 'Sin Nombre');

        if (mapped.length > 0) {
            const { error } = await supabase.from('banks').insert(mapped);
            if (error) console.error("Error updating banks:", error.message);
            else console.log(`Successfully added ${mapped.length} new banks.`);
        } else {
            console.log("No new banks to add.");
        }
    } catch (e) {
        console.error("Error reading banks file:", e.message);
    }
}

async function updateOrders() {
    console.log("Updating Orders from control sheet...");
    try {
        const wb = xlsx.readFile(paths.orders);
        const ws = wb.Sheets['DB'];
        const data = xlsx.utils.sheet_to_json(ws, { header: 1 });

        // Headers are row 0, data starts at row 1
        // Mapping from our inspection:
        // Index 0: Invoice Number (order_number)
        // Index 6: Client Name
        // Index 13: Total Amount
        // Index 4: Date

        const { data: clients } = await supabase.from('clients').select('id, name');
        const clientMap = new Map(clients.map(c => [c.name.trim().toLowerCase(), c.id]));

        const { data: existingOrders } = await supabase.from('orders').select('order_number');
        const existingOrderNums = new Set(existingOrders?.map(o => o.order_number) || []);

        const mapped = data.slice(1).map(row => {
            const orderNum = String(row[0] || '');
            const clientName = String(row[6] || '').trim().toLowerCase();
            const clientId = clientMap.get(clientName);
            const amount = Number(row[13] || 0);

            if (!orderNum || !clientId || existingOrderNums.has(orderNum)) return null;

            return {
                order_number: orderNum,
                client_id: clientId,
                total_amount: amount,
                source: 'Excel Import',
                status: 'FINALIZADO'
            };
        }).filter(o => o !== null);

        if (mapped.length > 0) {
            const { error } = await supabase.from('orders').insert(mapped);
            if (error) console.error("Error updating orders:", error.message);
            else console.log(`Successfully added ${mapped.length} new orders.`);
        } else {
            console.log("No new orders to add.");
        }
    } catch (e) {
        console.error("Error reading orders file:", e.message);
    }
}

async function main() {
    await updateClients();
    await updateBanks();
    await updateSuppliers();
    await updateOrders();
    console.log("All updates finished!");
}

main();
