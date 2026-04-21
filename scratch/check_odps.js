import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc } from "firebase/firestore";

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

async function checkProductionOrders() {
    console.log("--- Production Orders (tenants/zeticas/production_orders) ---");
    const querySnapshot = await getDocs(collection(db, "tenants", "zeticas", "production_orders"));
    console.log(`Found ${querySnapshot.size} production orders.`);
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`ID: ${doc.id}`);
        console.log(`ODP: ${data.odp_number}`);
        console.log(`SKU: ${data.sku}`);
        console.log(`Status: ${JSON.stringify(data.status)}`);
        console.log(`Completed At: ${data.completed_at}`);
        console.log(`Hidden: ${data.kanban_hidden}`);
        console.log('------------------');
    });
}

checkProductionOrders();
