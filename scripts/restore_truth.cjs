const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc, addDoc } = require('firebase/firestore');

const firebaseConfig = { projectId: 'delta-core-cloud-45ea0' };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function syncToTruthTable() {
    console.log("🧹 Limpiando el 'mierdero' industrial...");
    try {
        // 1. Borrar todo lo actual
        const snap = await getDocs(collection(db, 'production_orders'));
        const deletePromises = snap.docs.map(d => deleteDoc(doc(db, 'production_orders', d.id)));
        await Promise.all(deletePromises);
        console.log(`✅ ${snap.docs.length} órdenes borradas.`);

        // 2. Inyectar las 7 ODPs de la 'Tabla de la Verdad'
        const truthOdps = [
            { id: "ODP-001", sku: "Zetas Griegas", qty: 4 },
            { id: "ODP-002", sku: "Vinagreta", qty: 8 },
            { id: "ODP-003", sku: "Antipasto Veggie", qty: 14 },
            { id: "ODP-004", sku: "Dulce Guayaba & Albahaca", qty: 2 },
            { id: "ODP-005", sku: "Papayuela & limonaria", qty: 16 },
            { id: "ODP-006", sku: "Antipasto tuna", qty: 5 },
            { id: "ODP-007", sku: "Hummus de Garbanzo", qty: 12 }
        ];

        console.log("🏗️ Inyectando los 7 Magníficos...");
        for (const odp of truthOdps) {
            await addDoc(collection(db, 'production_orders'), {
                odp_number: odp.id,
                sku: odp.sku,
                qty: odp.qty,
                status: 'PENDING',
                created_at: new Date().toISOString(),
                started_at: null,
                completed_at: null,
                inventorySynced: false
            });
            console.log(`✅ Creada ${odp.id}: ${odp.sku} x ${odp.qty}`);
        }

        console.log("\n🏁 SINCROIZACIÓN COMPLETADA. 100% FIEL A LA TABLA ORIGINAL.");
    } catch (e) {
        console.error("❌ Error en la sincronización:", e);
    }
}

syncToTruthTable();
