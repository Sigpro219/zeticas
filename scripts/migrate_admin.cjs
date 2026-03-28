const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');

// Supabase Config
const SUPABASE_URL = "https://foodbazntwgnakdjbwfv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvb2RiYXpudHdnbmFrZGpid2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MTk0MjksImV4cCI6MjA4OTE5NTQyOX0.1HfwAv1NDI5fQ.2urePtV03yK8vcGqDIVosC3VAy6iV6C5arE4D65tNp0";
const FIREBASE_PROJECT_ID = "delta-core-cloud-45ea0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

admin.initializeApp({
  projectId: FIREBASE_PROJECT_ID,
});
const db = admin.firestore();

async function migrate() {
    console.log("🚀 Starting migration (Admin SDK)...");
    
    // 1. Products
    const { data: prods } = await supabase.from('products').select('*');
    if (prods) {
        let count = 0;
        for (const p of prods) {
            await db.collection('products').doc(p.id.toString()).set({
                sku: p.sku || '',
                name: p.name || '',
                type: p.type || 'PT',
                category: p.category || 'General',
                unit_measure: p.unit_measure || 'un',
                price: p.price || 0,
                cost: p.cost || 0,
                stock: p.stock || 0,
                min_stock_level: p.min_stock_level || 0,
                created_at: p.created_at || new Date().toISOString()
            });
            count++;
        }
        console.log(`✅ ${count} products migrated.`);
    }

    // 2. Clients
    const { data: clients } = await supabase.from('clients').select('*');
    if (clients) {
        for (const c of clients) {
            await db.collection('clients').doc(c.id.toString()).set({
                ...c,
                created_at: c.created_at || new Date().toISOString()
            });
        }
        console.log(`✅ ${clients.length} clients migrated.`);
    }

    // 3. Orders
    const { data: orders } = await supabase.from('orders').select('*, order_items(*)');
    if (orders) {
        for (const o of orders) {
            await db.collection('orders').doc(o.id.toString()).set({
                order_number: o.order_number || '',
                total_amount: o.total_amount || 0,
                status: o.status || 'Nuevo',
                client_id: o.client_id || '',
                source: o.source || 'Manual',
                items: o.order_items || [],
                created_at: o.created_at || new Date().toISOString()
            });
        }
        console.log(`✅ ${orders.length} orders migrated.`);
    }

    console.log("🔥 Migration (Admin SDK) completed successfully!");
}

migrate().catch(err => {
    console.error("Migration failed:", err.message);
    process.exit(1);
});
