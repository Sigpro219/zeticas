import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc } from "firebase/firestore";

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

const COLLECTIONS_TO_CLONE = [
    'products', 
    'items', 
    'recipes', 
    'units', 
    'unit_conversions', 
    'providers', 
    'clients',
    'site_content'
];

async function cloneTenantData() {
    console.log("🚀 Iniciando clonado de datos maestros: Zeticas -> Delta");
    
    try {
        for (const colName of COLLECTIONS_TO_CLONE) {
            console.log(`📦 Procesando colección: ${colName}...`);
            const sourceCol = collection(db, 'tenants', 'zeticas', colName);
            const snapshot = await getDocs(sourceCol);
            
            if (snapshot.empty) {
                console.log(`  - La colección ${colName} está vacía.`);
                continue;
            }

            let count = 0;
            for (const sourceDoc of snapshot.docs) {
                const targetRef = doc(db, 'tenants', 'delta', colName, sourceDoc.id);
                const data = sourceDoc.data();
                
                // Limpieza de datos (si fuera necesario, aquí podríamos resetear stocks a 0)
                // Por ahora clonamos exacto según lo solicitado.
                await setDoc(targetRef, data);
                count++;
            }
            console.log(`  ✅ Clonados ${count} documentos en ${colName}.`);
        }
        console.log("\n✨ PROCESO COMPLETADO CON ÉXITO ✨");
        console.log("Ya puedes revisar Delta con la data maestra de Zeticas.");
    } catch (err) {
        console.error("❌ ERROR DURANTE EL CLONADO:", err);
    }
}

cloneTenantData();
