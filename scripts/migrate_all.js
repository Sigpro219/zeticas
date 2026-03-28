import { createClient } from '@supabase/supabase-js';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, addDoc } from "firebase/firestore";
import dotenv from 'dotenv';
dotenv.config();

// Supabase Config
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://foodbazntwgnakdjbwfv.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvb2RiYXpudHdnbmFrZGpid2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MTk0MjksImV4cCI6MjA4OTE5NTQyOX0.1HfwAv1NDI5fQ.2urePtV03yK8vcGqDIVosC3VAy6iV6C5arE4D65tNp0";

// Firebase Config
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
  console.log("🚀 Starting migration (Web SDK)...");

  // 1. Products
  console.log("📦 Migrating products...");
  const { data: prods } = await supabase.from('products').select('*');
  if (prods) {
    for (const p of prods) {
      await setDoc(doc(db, 'products', p.id.toString()), {
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
    }
    console.log(`✅ ${prods.length} products migrated.`);
  }

  // 2. Clients
  console.log("👥 Migrating clients...");
  const { data: clients } = await supabase.from('clients').select('*');
  if (clients) {
    for (const c of clients) {
        await setDoc(doc(db, 'clients', c.id.toString()), {
            ...c,
            created_at: c.created_at || new Date().toISOString()
        });
    }
    console.log(`✅ ${clients.length} clients migrated.`);
  }

  // 3. Orders
  console.log("🛒 Migrating orders...");
  const { data: orders } = await supabase.from('orders').select('*, order_items(*)');
  if (orders) {
    for (const o of orders) {
      await setDoc(doc(db, 'orders', o.id.toString()), {
        order_number: o.order_number || '',
        total_amount: o.total_amount || 0,
        status: o.status || 'Nuevo',
        client_id: o.client_id || '',
        source: o.source || 'Manual',
        items: o.order_items || [],
        created_at: o.created_at || new Date().toISOString()
      });
    }
  }

  console.log("🔥 Migration (Web SDK) completed successfully!");
}

migrate().catch(console.error);
