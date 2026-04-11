
import { db } from '../src/lib/firebase.js';
import { collection, getDocs, query, where } from 'firebase/firestore';

async function inspectRecipeData() {
    try {
        console.log("🧐 Inspeccionando datos técnicos de recetas...");
        
        const recipesSnap = await getDocs(collection(db, 'recipes'));
        let found = false;
        
        recipesSnap.forEach(doc => {
            const r = doc.data();
            if ((r.finished_good_name || '').toLowerCase().includes('papayuela')) {
                console.log(`\n--- Receta: ${r.finished_good_name} ---`);
                console.log(`ID: ${doc.id}`);
                console.log(`Rendimiento (yield_quantity): [${r.yield_quantity}] Type: ${typeof r.yield_quantity}`);
                console.log(`Cantidad Insumo (qty): [${r.qty}] Type: ${typeof r.qty}`);
                console.log(`Unidad: [${r.unit}]`);
                found = true;
            }
        });

        if (!found) console.log("No se encontró la receta de Papayuela para inspeccionar.");
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspectRecipeData();
