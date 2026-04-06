const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs } = require('firebase/firestore');

const firebaseConfig = { projectId: 'delta-core-cloud-45ea0' };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function forceCreateOdp() {
    console.log("🚀 Intentando forzar el nacimiento de la colección 'production_orders'...");
    try {
        const docRef = await addDoc(collection(db, 'production_orders'), {
            sku: "SISTEMA-TEST",
            qty: 1,
            status: "PENDING",
            created_at: new Date().toISOString(),
            test: true
        });
        console.log("✅ ¡Éxito! Documento creado con ID:", docRef.id);
        console.log("🔍 Ahora revisa tu consola de Firestore. Debería aparecer 'production_orders'.");
    } catch (e) {
        console.error("❌ Error al crear documento:", e);
    }
}

forceCreateOdp();
