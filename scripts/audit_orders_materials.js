
import { db } from '../src/lib/firebase.js';
import { collection, getDocs, query, where } from 'firebase/firestore';

async function auditOrdersFlow() {
    try {
        console.log("🔍 Iniciando auditoría profunda de flujo de órdenes...");
        
        // 1. Obtener los productos (Inventario)
        const productsSnap = await getDocs(collection(db, 'products'));
        const inventory = {};
        productsSnap.forEach(doc => {
            const d = doc.data();
            const stock = (Number(d.initial) || 0) + (Number(d.purchases) || 0) - (Number(d.sales) || 0);
            inventory[doc.id] = { name: d.name, stock, sku: d.sku };
            inventory[d.name] = { id: doc.id, stock, sku: d.sku };
        });

        // 2. Obtener Recetas
        const recipesSnap = await getDocs(collection(db, 'recipes'));
        const recipes = {};
        recipesSnap.forEach(doc => {
            const r = doc.data();
            const fgId = r.finished_good_id;
            if (!recipes[fgId]) recipes[fgId] = [];
            recipes[fgId].push(r);
        });

        // 3. Auditar Órdenes específicas de la captura
        const orderIds = ['WEB-0006', 'WEB-0002', 'WEB-0004'];
        for (const id of orderIds) {
            console.log(`\n--- Analizando Pedido #${id} ---`);
            const q = query(collection(db, 'orders'), where('id', '==', id));
            const snap = await getDocs(q);
            
            if (snap.empty) {
                console.log(`❌ Pedido ${id} no encontrado.`);
                continue;
            }

            const order = snap.docs[0].data();
            console.log(`Cliente: ${order.client} | Status: ${order.status}`);
            
            for (const item of (order.items || [])) {
                const pt = inventory[item.id] || inventory[item.name];
                console.log(`  > Item: ${item.name} | Cant: ${item.quantity} | Stock PT: ${pt?.stock || 0}`);
                
                const rec = recipes[item.id] || recipes[item.name];
                if (rec) {
                    console.log(`    📜 Receta encontrada (${rec.length} insumos)`);
                    for (const ing of rec) {
                        const mp = inventory[ing.rm_id] || inventory[ing.name];
                        const yieldQty = Number(ing.yield_quantity) || 1;
                        const needed = (Number(ing.qty) / yieldQty) * item.quantity;
                        console.log(`      - MP: ${ing.raw_material_name} | Necesario: ${needed} | Stock MP: ${mp?.stock || 0} | Status: ${mp?.stock >= needed ? '✅ OK' : '⚠️ Faltante'}`);
                    }
                } else {
                    console.log(`    ❌ No tiene receta vinculada.`);
                }
            }
        }

        // 4. Buscar ODPs activas
        console.log("\n--- ODPs Activas (Sin finalizar) ---");
        const odpSnap = await getDocs(collection(db, 'production_orders'));
        odpSnap.forEach(doc => {
            const d = doc.data();
            if (!d.completed_at && d.status?.text !== 'Finalizada') {
                console.log(`- ODP: ${d.odp_number} | SKU: ${d.sku} | Cant: ${d.qty} | Status: ${d.status?.text}`);
            }
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

auditOrdersFlow();
