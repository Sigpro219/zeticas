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

async function checkAll() {
    const paths = [
        "production_orders",
        "tenants/zeticas/production_orders",
        "tenants/zeticas/orders"
    ];

    for (const path of paths) {
        console.log(`\n=== Path: ${path} ===`);
        try {
            const querySnapshot = await getDocs(collection(db, ...path.split('/')));
            console.log(`Found ${querySnapshot.size} documents.`);
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const id = data.odp_number || data.order_number || data.id || doc.id;
                const status = data.status;
                const sku = data.sku || (data.items ? data.items.map(i => i.name).join(', ') : 'N/A');
                console.log(`- [${id}] SKU: ${sku}, Status: ${JSON.stringify(status)}, CompletedAt: ${data.completed_at}`);
            });
        } catch (e) {
            console.log(`Error: ${e.message}`);
        }
    }
}

checkAll();
