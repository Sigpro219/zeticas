import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

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

async function inspectSchema() {
    console.log("--- INSPECTING CLIENT DOCUMENTS ---");
    const q = query(collection(db, "tenants", "zeticas", "clients"), limit(3));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        console.log("No clients found in tenants/zeticas/clients.");
    } else {
        snapshot.forEach(doc => {
            console.log(`Document ID: ${doc.id}`);
            console.log(JSON.stringify(doc.data(), null, 2));
            console.log("------------------------");
        });
    }
}

inspectSchema().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
