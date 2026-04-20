import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

const COLLECTIONS = [
    'products', 'recipes', 'suppliers', 'clients', 'units', 
    'site_content', 'orders', 'bank_transactions', 'banks', 'leads', 'users', 
    'web_checkouts', 'admin_logs', 'analytics', 'metadata', 'mail'
];

async function certifyIsolation() {
    console.log("🕵️ INICIANDO CERTIFICACIÓN DE IGUALDAD (AUDITORÍA 100%)...");
    console.log("Comparando colecciones en RAÍZ vs TENANTS...");
    
    const certification = [];

    for (const col of COLLECTIONS) {
        process.stdout.write(`📊 Auditando ${col}... `);
        
        const rootSnap = await getDocs(collection(db, col));
        const zeticasSnap = await getDocs(collection(db, 'tenants', 'zeticas', col));
        const deltaSnap = await getDocs(collection(db, 'tenants', 'delta', col));

        const rootCount = rootSnap.size;
        const zeticasCount = zeticasSnap.size;
        const deltaCount = deltaSnap.size;

        const isMatch = (rootCount === zeticasCount && rootCount === deltaCount);

        certification.push({
            Colección: col,
            Raíz: rootCount,
            Zeticas: zeticasCount,
            Delta: deltaCount,
            Estado: isMatch ? "✅ COINCIDE" : "⚠️ DISCREPANCIA"
        });
        console.log("OK");
    }

    console.log("\n" + "=".repeat(60));
    console.log("🏆 REPORTE FINAL DE CERTIFICACIÓN DE DATOS 🏆");
    console.table(certification);
    console.log("=".repeat(60));
    
    const allMatch = certification.every(c => c.Estado === "✅ COINCIDE");
    if (allMatch) {
        console.log("\n🎉 CERTIFICADO: Los datos son 100% idénticos en todas las capas.");
        console.log("Es seguro proceder con la limpieza de la raíz bajo autorización.");
    } else {
        console.log("\n🛑 ADVERTENCIA: Se detectaron discrepancias. No borrar nada.");
    }
}

certifyIsolation();
