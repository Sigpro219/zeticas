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

async function checkInternalOrders() {
    const tenant = "delta";
    const snapshot = await getDocs(collection(db, "tenants", tenant, "orders"));
    console.log(`Checking ${snapshot.size} orders for tenant ${tenant}...`);
    
    snapshot.forEach(doc => {
        const data = doc.data();
        const client = data.client;
        const clientId = data.client_id;
        const status = data.status;
        const items = data.items || [];
        
        const hasMermelada = items.some(it => it.name?.toLowerCase().includes("mermelada ruibarbo"));
        const isInternal = client === 'Stock Interno' || clientId === 'INTERNAL_STOCK';
        
        if (hasMermelada || isInternal) {
            console.log(`Order: ${data.order_number || doc.id}`);
            console.log(`Client: ${client} (${clientId})`);
            console.log(`Status: ${status}`);
            console.log(`Items: ${items.map(it => it.name).join(', ')}`);
            console.log('---');
        }
    });
}

checkInternalOrders();
