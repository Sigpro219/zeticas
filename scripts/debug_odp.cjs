const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, limit, query } = require('firebase/firestore');

const firebaseConfig = { projectId: 'delta-core-cloud-45ea0' };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debugOutput() {
    console.log("🕵️‍♂️ Realizando autopsia de ODPs...");
    try {
        const snap = await getDocs(query(collection(db, 'production_orders'), limit(3)));
        snap.forEach(d => {
            console.log(`\n📄 Doc ID: ${d.id}`);
            console.log(JSON.stringify(d.data(), null, 2));
        });
    } catch (e) { console.error(e); }
}

debugOutput();
