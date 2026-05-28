import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

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

async function inspectRecentClient() {
    console.log("--- SEARCHING FOR RECENT QUICK CLIENT ---");
    const q = query(collection(db, "tenants", "zeticas", "clients"), where("name", "==", "Cliente Prueba Sin Documento"));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        console.log("No client found with name 'Cliente Prueba Sin Documento'.");
        
        // Let's list the 5 most recently created clients instead
        console.log("\nListing 5 most recent clients:");
        const qRecent = query(collection(db, "tenants", "zeticas", "clients"));
        const allClientsSnap = await getDocs(qRecent);
        const sorted = allClientsSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
            .slice(0, 5);
            
        sorted.forEach(c => {
            console.log(JSON.stringify(c, null, 2));
            console.log("------------------------");
        });
    } else {
        snapshot.forEach(doc => {
            console.log(`Document ID: ${doc.id}`);
            console.log(JSON.stringify(doc.data(), null, 2));
            console.log("------------------------");
        });
    }
}

inspectRecentClient().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
