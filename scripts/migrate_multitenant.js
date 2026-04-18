import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, setDoc, doc, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAeHMdtEt04RtYarEx_h19gcCUzsIUUpSc",
  authDomain: "delta-core-cloud-45ea0.firebaseapp.com",
  projectId: "delta-core-cloud-45ea0",
  storageBucket: "delta-core-cloud-45ea0.firebasestorage.app",
  messagingSenderId: "378250949856",
  appId: "1:378250949856:web:7a0ce44de64bc9a5becc85"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const collectionsToMigrate = [
    'products', 'clients', 'orders', 'recipes', 'suppliers', 
    'purchase_orders', 'expenses', 'banks', 'bank_transactions', 
    'site_content', 'production_orders', 'metadata', 'units', 
    'users', 'leads', 'subscriptions', 'quotations', 'analytics', 
    'production_analytics', 'rejected_products', 'unit_conversions', 
    'web_checkouts', 'admin_logs'
];

async function migrate() {
    console.log("🚀 Iniciando Gran Migración Multitenant...");

    for (const colName of collectionsToMigrate) {
        console.log(`📦 Procesando colección: ${colName}...`);
        const snapshot = await getDocs(collection(db, colName));
        
        if (snapshot.empty) {
            console.log(`  - Colección ${colName} vacía. Saltando.`);
            continue;
        }

        for (const d of snapshot.docs) {
            const data = d.data();
            
            // 1. Mudar a zeticas
            await setDoc(doc(db, 'tenants', 'zeticas', colName, d.id), data);
            
            // 2. Clonar a deltacore
            await setDoc(doc(db, 'tenants', 'deltacore', colName, d.id), data);
            
            // OPCIONAL: Eliminar de la raíz (comentado por seguridad inicial)
            // await deleteDoc(doc(db, colName, d.id));
        }
        console.log(`  ✅ ${snapshot.size} documentos migrados y clonados.`);
    }

    console.log("✨ MIGRACIÓN COMPLETADA CON ÉXITO.");
}

migrate().catch(console.error);
