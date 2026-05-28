import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAeHMdtEt04RtYarEx_h19gcCUzsIUUpSc",
    authDomain: "delta-core-cloud-45ea0.firebaseapp.com",
    projectId: "delta-core-cloud-45ea0",
    storageBucket: "delta-core-cloud-45ea0.firebasestorage.app",
    messagingSenderId: "378250949856",
    appId: "1:378250949856:web:7a0ce44de64bc9a5becc85",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function auditClients() {
  console.log("--- AUDITANDO CLIENTES EN BD (Firestore: tenants/zeticas/clients) ---");
  const clientsRef = collection(db, "tenants", "zeticas", "clients");
  const q = query(clientsRef, limit(10));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    console.log("No se encontraron clientes en tenants/zeticas/clients.");
    return;
  }

  snapshot.forEach(doc => {
    console.log(`Document ID: ${doc.id}`);
    console.log("Data:", JSON.stringify(doc.data(), null, 2));
    console.log("----------------------------------------");
  });

  process.exit(0);
}

auditClients().catch(err => {
    console.error(err);
    process.exit(1);
});
