const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, where, doc, getDoc } = require("firebase/firestore");

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

async function run() {
  const tenantId = 'delta';
  console.log(`Inspecting Firestore for tenant: ${tenantId}...`);
  
  const colPath = `tenants/${tenantId}/production_orders`;
  console.log(`Collection: ${colPath}`);
  
  const q = query(collection(db, colPath));
  const querySnapshot = await getDocs(q);
  
  console.log(`Found ${querySnapshot.size} production orders.`);
  
  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const isCompleted = !!data.completed_at || data.status === 'DONE' || data.status === 'finalizada';
    console.log(`ID: ${docSnap.id} | SKU: ${data.sku} | Num: ${data.odp_number} | Status: ${data.status} | Completed: ${isCompleted} | Hidden: ${data.kanban_hidden || false}`);
  });
}

run().catch(console.error);
