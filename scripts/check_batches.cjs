const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

const firebaseConfig = { projectId: 'delta-core-cloud-45ea0' };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkBatchSizes() {
    console.log("🕵️‍♂️ Revisando consistencia de lotes (Batch Sizes)...");
    const targets = ["Antipasto tuna", "Dulce Guayaba & Albahaca", "Zetas Griegas"];
    
    try {
        const snap = await getDocs(collection(db, 'products'));
        const products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // También ver recetas por si el yield está allí
        const recipeSnap = await getDocs(collection(db, 'recipes'));
        const recipes = {};
        recipeSnap.docs.forEach(doc => {
            const r = doc.data();
            if (!recipes[r.finished_good_id]) recipes[r.finished_good_id] = [];
            recipes[r.finished_good_id].push(r);
        });

        targets.forEach(name => {
            const p = products.find(prod => (prod.name || '').toLowerCase().trim() === name.toLowerCase().trim());
            const r = recipes[p?.id] || recipes[p?.name] || [];
            const yieldQty = r.length > 0 ? (r[0].yield_quantity || 1) : 1;
            
            console.log(`\n📦 SKU: ${name}`);
            console.log(`   - Batch Size (Doc): ${p?.batch_size || 'N/A'}`);
            console.log(`   - Yield (Receta): ${yieldQty}`);
        });

    } catch (e) {
        console.error("❌ Error de chequeo:", e);
    }
}

checkBatchSizes();
