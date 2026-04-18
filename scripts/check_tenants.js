import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function check() {
    console.log("🔍 Verificando subcolecciones de tenants...");
    const snapshot = await getDocs(collection(db, 'tenants', 'zeticas', 'products'));
    if (snapshot.empty) {
        console.log("❌ ERROR: No se encontraron productos en 'tenants/zeticas/products'.");
    } else {
        console.log(`✅ EXITO: Se encontraron ${snapshot.size} productos en 'tenants/zeticas/products'.`);
    }
    
    const snapshotDelta = await getDocs(collection(db, 'tenants', 'deltacore', 'products'));
    if (snapshotDelta.empty) {
        console.log("❌ ERROR: No se encontraron productos en 'tenants/deltacore/products'.");
    } else {
        console.log(`✅ EXITO: Se encontraron ${snapshotDelta.size} productos en 'tenants/deltacore/products'.`);
    }
}

check().catch(console.error);
