const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase/firestore');

const firebaseConfig = { projectId: 'delta-core-cloud-45ea0' };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function baptizeOdps() {
    console.log("🛠️ Iniciando bautizo masivo de ODPs...");
    try {
        const snap = await getDocs(collection(db, 'production_orders'));
        let count = 1;
        
        for (const d of snap.docs) {
            const data = d.data();
            if (!data.odp_number) {
                const readableId = `ODP-${String(count).padStart(3, '0')}`;
                console.log(`✅ Asignando ${readableId} a ${data.sku}`);
                await updateDoc(doc(db, 'production_orders', d.id), {
                    odp_number: readableId
                });
                count++;
            }
        }
        console.log("🏁 Bautizo completado.");
    } catch (e) {
        console.error("❌ Error en el bautizo:", e);
    }
}

baptizeOdps();
