import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit } from 'firebase/firestore';

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

async function inspectPurchases(tenantId) {
    console.log(`Inspecting purchase orders for tenant: ${tenantId}`);
    try {
        const snap = await getDocs(collection(db, 'tenants', tenantId, 'purchase_orders'));
        console.log(`Total purchase orders: ${snap.size}`);
        snap.docs.slice(0, 3).forEach(d => {
            console.log(`ID: ${d.id}`);
            console.log(`Data:`, JSON.stringify(d.data(), null, 2));
            console.log("-----------------------------------------");
        });
    } catch (err) {
        console.error(err);
    }
}

inspectPurchases('zeticas').then(() => process.exit());
