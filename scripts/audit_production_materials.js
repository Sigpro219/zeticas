
import { db } from '../src/lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function fullAudit() {
    try {
        console.log("🚀 Iniciando Auditoría de Materiales para ODPs activas...");
        
        // 1. Obtener productos e insumos
        const productsSnap = await getDocs(collection(db, 'products'));
        const items = {};
        productsSnap.forEach(doc => items[doc.id] = { id: doc.id, ...doc.data() });

        // 2. Obtener recetas
        const recipesSnap = await getDocs(collection(db, 'recipes'));
        const recipes = {};
        recipesSnap.forEach(doc => {
            const r = doc.data();
            const fgId = r.finished_good_id;
            if (!recipes[fgId]) recipes[fgId] = [];
            recipes[fgId].push({
                ...r,
                qty: r.input_qty !== undefined ? r.input_qty : r.quantity_required
            });
        });

        // 3. Obtener ODPs (production_orders)
        const odpSnap = await getDocs(collection(db, 'production_orders'));
        const activeOdps = odpSnap.docs.filter(doc => !doc.data().completed_at).map(doc => ({ id: doc.id, ...doc.data() }));

        console.log(`\nODPs Activas encontradas: ${activeOdps.length}\n`);

        for (const odp of activeOdps) {
            console.log(`--------------------------------------------------`);
            console.log(`📋 ODP: ${odp.odp_number || odp.id} | PRODUCTO: ${odp.sku} | QTY: ${odp.qty || odp.finalQty}`);
            
            const pt = Object.values(items).find(i => i.name === odp.sku);
            if (!pt) {
                console.log("❌ ERROR: Producto no encontrado en base de datos.");
                continue;
            }

            const recipe = recipes[pt.id] || [];
            if (recipe.length === 0) {
                console.log("⚠️ ADVERTENCIA: No se encontró receta para este producto.");
                continue;
            }

            const yieldQty = Number(recipe[0]?.yield_quantity) || 1;
            const finalQty = Number(odp.qty || odp.finalQty || 0);

            for (const ing of recipe) {
                const mat = items[ing.raw_material_id];
                if (!mat) {
                    console.log(`   - ❌ Insumo Desconocido: ${ing.name}`);
                    continue;
                }

                const req = (Number(ing.qty) / yieldQty) * finalQty;
                const stock = (mat.initial || 0) + (mat.purchases || 0) - (mat.sales || 0);
                const percent = req > 0 ? (Math.min(stock, req) / req) * 100 : 100;
                const unit = mat.unit_measure || mat.unit || 'und';

                console.log(`   - ${mat.name.padEnd(20)} | REQ: ${req.toFixed(2).padStart(8)} ${unit.padEnd(4)} | DISP: ${stock.toFixed(2).padStart(8)} ${unit.padEnd(4)} | [${percent.toFixed(0).padStart(3)}%]`);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error("❌ Error en la auditoría:", err);
        process.exit(1);
    }
}

fullAudit();
