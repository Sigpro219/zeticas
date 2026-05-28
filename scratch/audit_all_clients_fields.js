import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function auditAllClientsFields() {
  console.log("--- ANALIZANDO CAMPOS DE CLIENTES CON FALTANTES ---");
  const clientsRef = collection(db, "tenants", "zeticas", "clients");
  const snapshot = await getDocs(clientsRef);
  
  if (snapshot.empty) {
    console.log("No se encontraron clientes.");
    return;
  }

  snapshot.forEach(doc => {
    const data = doc.data();
    const missing = [];
    const fieldsToCheck = [
      "name", "nit", "phone", "address", "city", "email", 
      "type", "sub_type", "subType", "id_type", "idType",
      "status", "balance", "audit_status", "source"
    ];

    fieldsToCheck.forEach(field => {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        missing.push(field);
      }
    });

    if (missing.length > 0) {
      console.log(`Document ID: ${doc.id} | Name: ${data.name}`);
      console.log(`- Faltantes: ${missing.join(", ")}`);
      console.log(`- Datos actuales:`, JSON.stringify(data, null, 2));
      console.log("------------------------------------------------");
    }
  });

  process.exit(0);
}

auditAllClientsFields().catch(err => {
    console.error(err);
    process.exit(1);
});
