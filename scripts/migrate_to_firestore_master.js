import { createClient } from '@supabase/supabase-js';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// --- Configuration ---
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const firebaseConfig = {
  apiKey: "AIzaSyAeHMdtEt04RtYarEx_h19gcCUzsIUUpSc",
  authDomain: "delta-core-cloud-45ea0.firebaseapp.com",
  projectId: "delta-core-cloud-45ea0",
  storageBucket: "delta-core-cloud-45ea0.firebasestorage.app",
  messagingSenderId: "378250949856",
  appId: "1:378250949856:web:7a0ce44de64bc9a5becc85"
};

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrate() {
    console.log("🚀 Iniciando MIGRACIÓN MAESTRA (Supabase -> Firestore)...");

    // 1. MIGRAR PRODUCTOS (y crear lookup)
    console.log("📦 Migrando PRODUCTOS...");
    const { data: products } = await supabase.from('products').select('*');
    const productsMap = {};
    if (products) {
        for (const p of products) {
            productsMap[p.id] = p;
            await setDoc(doc(db, 'products', p.id.toString()), {
                ...p,
                created_at: p.created_at || new Date().toISOString()
            });
        }
        console.log(`✅ ${products.length} productos migrados.`);
    }

    // 2. MIGRAR CLIENTES
    console.log("👥 Migrando CLIENTES...");
    const { data: clients } = await supabase.from('clients').select('*');
    if (clients) {
        for (const c of clients) {
            await setDoc(doc(db, 'clients', c.id.toString()), {
                ...c,
                created_at: c.created_at || new Date().toISOString()
            });
        }
        console.log(`✅ ${clients.length} clientes migrados.`);
    }

    // 3. MIGRAR PROVEEDORES
    console.log("🏭 Migrando PROVEEDORES...");
    const { data: suppliers } = await supabase.from('suppliers').select('*');
    if (suppliers) {
        for (const s of suppliers) {
            await setDoc(doc(db, 'suppliers', s.id.toString()), {
                ...s,
                created_at: s.created_at || new Date().toISOString()
            });
        }
        console.log(`✅ ${suppliers.length} proveedores migrados.`);
    }

    // 4. MIGRAR BANCOS
    console.log("🏦 Migrando BANCOS...");
    const { data: banks } = await supabase.from('banks').select('*');
    if (banks) {
        for (const b of banks) {
            await setDoc(doc(db, 'banks', b.id.toString()), {
                ...b,
                created_at: b.created_at || new Date().toISOString()
            });
        }
        console.log(`✅ ${banks.length} bancos migrados.`);
    }

    // 5. MIGRAR ÓRDENES (con items anidados)
    console.log("🛒 Migrando ÓRDENES...");
    const { data: orders } = await supabase.from('orders').select('*, order_items(*)');
    if (orders) {
        for (const o of orders) {
            const rawItems = o.order_items || [];
            const items = rawItems.map(ri => ({
                ...ri,
                product_name: productsMap[ri.product_id]?.name || 'Producto Desconocido',
                sku: productsMap[ri.product_id]?.sku || ''
            }));
            const { order_items, ...orderData } = o;
            await setDoc(doc(db, 'orders', o.id.toString()), {
                ...orderData,
                items,
                created_at: o.created_at || new Date().toISOString()
            });
        }
        console.log(`✅ ${orders.length} órdenes migradas.`);
    }

    // 6. MIGRAR COMPRAS (con items anidados)
    console.log("💳 Migrando COMPRAS...");
    const { data: purchases } = await supabase.from('purchases').select('*, purchase_items(*)');
    if (purchases) {
        for (const p of purchases) {
            const rawItems = p.purchase_items || [];
            const items = rawItems.map(ri => ({
                ...ri,
                name: productsMap[ri.raw_material_id]?.name || 'Material Desconocido',
                sku: productsMap[ri.raw_material_id]?.sku || ''
            }));
            const { purchase_items, ...purData } = p;
            await setDoc(doc(db, 'purchases', p.id.toString()), {
                ...purData,
                items,
                created_at: p.created_at || new Date().toISOString()
            });
        }
        console.log(`✅ ${purchases.length} compras migradas.`);
    }

    // 7. MIGRAR RECETAS (Denormalizadas)
    console.log("🧪 Migrando RECETAS...");
    const { data: recipes } = await supabase.from('recipes').select('*');
    if (recipes) {
        for (const r of recipes) {
            const fg = productsMap[r.finished_good_id];
            const mat = productsMap[r.raw_material_id];
            await setDoc(doc(db, 'recipes', r.id.toString()), {
                ...r,
                finished_good_name: fg?.name || r.finished_good_id,
                raw_material_name: mat?.name || '?',
                raw_material_sku: mat?.sku || '?',
                created_at: r.created_at || new Date().toISOString()
            });
        }
        console.log(`✅ ${recipes.length} recetas migradas.`);
    }

    // 8. MIGRAR CONTENIDO CMS
    console.log("📄 Migrando CONTENIDO CMS...");
    const { data: cms } = await supabase.from('site_content').select('*');
    if (cms) {
        for (const c of cms) {
            await setDoc(doc(db, 'site_content', c.id.toString()), {
                ...c,
                created_at: c.created_at || new Date().toISOString()
            });
        }
        console.log(`✅ ${cms.length} entradas de contenido migradas.`);
    }

    console.log("🔥 ¡MIGRACIÓN COMPLETADA CON ÉXITO! 🔥");
}

migrate().catch(e => {
    console.error("❌ ERROR EN MIGRACIÓN:", e);
});
