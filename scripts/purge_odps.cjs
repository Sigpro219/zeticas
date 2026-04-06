const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc, query, where } = require('firebase/firestore');

const firebaseConfig = { projectId: 'delta-core-cloud-45ea0' };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function purgeDuplicates() {
    console.log("🧹 Purgando duplicados del 'mierdero' sistémico...");
    try {
        const snap = await getDocs(collection(db, 'production_orders'));
        const seen = new Set();
        
        for (const d of snap.docs) {
            const data = d.data();
            const key = `${data.sku}-${data.qty}`;
            
            // Mantener las ODP-00X originales, borrar las SYS duplicadas
            if (data.odp_number && data.odp_number.startsWith('ODP-SYS')) {
                if (seen.has(key)) {
                    console.log(`🗑️ Borrando duplicado: ${data.sku} (${data.odp_number})`);
                    await deleteDoc(doc(db, 'production_orders', d.id));
                } else {
                    seen.add(key);
                }
            }
        }
        console.log("✅ Limpieza completada.");
    } catch (e) { console.error(e); }
}

purgeDuplicates();
