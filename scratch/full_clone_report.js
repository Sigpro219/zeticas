import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAeHMdtEt04RtYarEx_h19gcCUzsIUUpSc",
  authDomain: "delta-core-cloud-45ea0.firebaseapp.com",
  projectId: "delta-core-cloud-45ea0",
  storageBucket: "delta-core-cloud-45ea0.firebasestorage.app",
  messagingSenderId: "378250949856",
  appId: "1:378250949856:web:7a0ce44de64bc9a5becc85",
  measurementId: "G-Q1BXE4WVZP"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const FULL_COLLECTION_LIST = [
    'products', 'recipes', 'suppliers', 'clients', 'units', 'unit_conversions', 
    'site_content', 'orders', 'purchase_orders', 'production_orders', 
    'production_analytics', 'bank_transactions', 'banks', 'leads', 'users', 
    'web_checkouts', 'rejected_products', 'admin_logs', 'analytics', 'metadata', 'mail'
];

async function runUniversalClone() {
    console.log("🚀 INICIANDO CLONADO UNIVERSAL SEGURO...");
    
    // 1. Limpieza de remanentes (Opcional: borrar el identificador antiguo 'deltacore' si existe)
    try {
        console.log("🧹 Eliminando identificador antiguo 'deltacore'...");
        await deleteDoc(doc(db, 'tenants', 'deltacore'));
    } catch (e) {
        // Ignorar si no existe
    }

    const report = {};

    try {
        for (const colName of FULL_COLLECTION_LIST) {
            console.log(`📡 Leyendo datos de: ${colName}...`);
            const sourceCol = collection(db, colName); // LEYENDO DE LA RAÍZ
            const snapshot = await getDocs(sourceCol);
            
            if (snapshot.empty) {
                console.log(`  - La colección ${colName} está vacía. Saltando.`);
                continue;
            }

            let copiedCount = 0;
            for (const sourceDoc of snapshot.docs) {
                const data = sourceDoc.data();
                
                // REPLICAR EN ZETICAS
                const zeticasRef = doc(db, 'tenants', 'zeticas', colName, sourceDoc.id);
                await setDoc(zeticasRef, data);
                
                // REPLICAR EN DELTA
                const deltaRef = doc(db, 'tenants', 'delta', colName, sourceDoc.id);
                await setDoc(deltaRef, data);
                
                copiedCount++;
            }
            
            report[colName] = copiedCount;
            console.log(`  ✅ ${copiedCount} elementos replicados bajo 'tenants/zeticas' y 'tenants/delta'.`);
        }

        console.log("\n" + "=".repeat(40));
        console.log("✨ REPORTE DE CLONADO EXITOSO ✨");
        console.table(report);
        console.log("=".repeat(40));
        console.log("\nTodo está en su sitio. Los datos originales en la RAÍZ permanecen intactos.");
        console.log("Ya puedes entrar a Zeticas o Delta y verás tus datos.");
    } catch (err) {
        console.error("❌ ERROR CRÍTICO DURANTE EL CLONADO:", err);
    }
}

runUniversalClone();
