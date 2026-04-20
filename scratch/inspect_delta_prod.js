import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

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

async function inspectDeltaProduction() {
    console.log("🔍 INSPECCIONANDO ODPs ACTIVAS EN DELTA...");
    
    const q = query(collection(db, 'tenants', 'delta', 'production_orders'), where('status', '!=', 'DONE'));
    const snap = await getDocs(q);
    
    if (snap.empty) {
        console.log("✅ No hay órdenes activas en la base de datos.");
        return;
    }

    const activeOrders = [];
    snap.forEach(doc => {
        const data = doc.data();
        activeOrders.push({
            ID: doc.id,
            SKU: data.sku,
            Estado: data.status,
            ODP: data.odp_number,
            Cantidad: data.custom_qty || data.qty
        });
    });

    console.table(activeOrders);
}

inspectDeltaProduction();
