import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';

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

async function checkOrders(tenantId) {
    console.log(`Checking orders for tenant: ${tenantId}`);
    try {
        const q = query(
            collection(db, 'tenants', tenantId, 'orders'),
            orderBy('created_at', 'desc'),
            limit(10)
        );
        const snapshot = await getDocs(q);
        console.log(`Found ${snapshot.size} orders in tenants/${tenantId}/orders`);
        snapshot.docs.forEach(d => {
            const data = d.data();
            console.log(`Order ID: ${d.id}`);
            console.log(`  Client: ${data.client_name || data.client}`);
            console.log(`  Date: ${data.date}`);
            console.log(`  Status: ${data.status}`);
            console.log(`  Source: ${data.source}`);
            console.log(`  Payment Status: ${data.payment_status || data.paymentStatus}`);
            console.log(`  Amount: ${data.amount || data.total_amount}`);
            console.log("-----------------------------------------");
        });
    } catch (err) {
        console.error(err);
    }
}

async function run() {
    await checkOrders('delta');
    await checkOrders('zeticas');
}

run().then(() => process.exit());
