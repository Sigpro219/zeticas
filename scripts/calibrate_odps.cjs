const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc, query, where } = require('firebase/firestore');

const firebaseConfig = { projectId: 'delta-core-cloud-45ea0' };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function calibrateOdps() {
    console.log("⚖️ Calibrando cantidades de ODPs...");
    const targets = {
        "Vinagreta": 8,
        "Antipasto Veggie": 14,
        "Papayuela & limonaria": 16
    };

    try {
        const snap = await getDocs(collection(db, 'production_orders'));
        for (const d of snap.docs) {
            const data = d.data();
            if (targets[data.sku]) {
                console.log(`🎯 Calibrando ${data.sku} a ${targets[data.sku]} uds`);
                await updateDoc(doc(db, 'production_orders', d.id), {
                    qty: targets[data.sku]
                });
            }
        }
        console.log("✅ Calibración completada.");
    } catch (e) { console.error(e); }
}

calibrateOdps();
