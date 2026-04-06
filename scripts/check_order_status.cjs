const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, limit, query } = require('firebase/firestore');

const firebaseConfig = { projectId: 'delta-core-cloud-45ea0' };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkOrderStatus() {
    console.log("🕵️‍♂️ Revisando estado real de Pedidos en Firestore...");
    try {
        const snap = await getDocs(collection(db, 'orders'));
        const statuses = {};
        snap.docs.forEach(d => {
            const s = d.data().status || 'SIN ESTADO';
            statuses[s] = (statuses[s] || 0) + 1;
            if (s.toLowerCase().includes('despacho')) {
                console.log(`📍 Pedido ${d.id}: "${s}"`);
            }
        });
        console.log("\n📊 Resumen de Estados:");
        console.log(JSON.stringify(statuses, null, 2));
    } catch (e) { console.error(e); }
}

checkOrderStatus();
