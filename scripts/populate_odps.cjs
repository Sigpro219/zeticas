const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, addDoc, query, where } = require('firebase/firestore');

const firebaseConfig = { projectId: 'delta-core-cloud-45ea0' };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function populateOdps() {
    console.log("🚀 Iniciando Motor de Carga Industrial (Simulando SQL)...");
    try {
        // 1. Cargar Productos
        const itemsSnap = await getDocs(collection(db, 'products'));
        const items = itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`📦 Productos encontrados: ${items.length}`);

        // 2. Cargar Pedidos Activos
        const ordersSnap = await getDocs(collection(db, 'orders'));
        const orders = ordersSnap.docs.map(doc => doc.data());
        console.log(`🛒 Pedidos analizados: ${orders.length}`);

        // 3. Cargar Recetas para validación
        const recipesSnap = await getDocs(collection(db, 'recipes'));
        const recipes = {};
        recipesSnap.docs.forEach(doc => {
            const r = doc.data();
            if (!recipes[r.finished_good_id]) recipes[r.finished_good_id] = [];
            recipes[r.finished_good_id].push(r);
        });

        // 4. Calcular Demanda
        const skuDemand = {};
        orders.forEach(o => {
            const s = (o.status || '').toLowerCase();
            if (['pendiente', 'en producción', 'en despacho', 'en producción (iniciada)', 'en compras'].includes(s)) {
                (o.items || []).forEach(item => {
                    const name = (item.name || '').toLowerCase().trim();
                    skuDemand[name] = (skuDemand[name] || 0) + (Number(item.quantity) || 0);
                });
            }
        });

        // 5. Cargar ODPs actuales para evitar duplicados
        const prodSnap = await getDocs(collection(db, 'production_orders'));
        const activeSKUs = prodSnap.docs.map(d => (d.data().sku || '').toLowerCase().trim());

        let createdCount = 0;

        // 6. Loop de Reconciliación (El Corazón del SQL)
        for (const p of items) {
            const pName = (p.name || '').toLowerCase().trim();
            const currentStock = (Number(p.initial) || 0) + (Number(p.purchases) || 0) - (Number(p.sales) || 0);
            const safety = Number(p.safety || p.min_stock_level) || 0;
            const demand = skuDemand[pName] || 0;
            const target = demand + safety;

            if (currentStock < target && !activeSKUs.includes(pName)) {
                // Verificar si tiene receta por nombre o ID
                const hasRecipe = recipes[p.name] || recipes[p.id];
                
                if (hasRecipe) {
                    console.log(`🏗️ Creando ODP para: ${p.name} (Faltan: ${target - currentStock})`);
                    await addDoc(collection(db, 'production_orders'), {
                        sku: p.name,
                        qty: Math.max(1, target - currentStock),
                        status: 'PENDING',
                        created_at: new Date().toISOString(),
                        started_at: null,
                        completed_at: null,
                        inventorySynced: false
                    });
                    createdCount++;
                } else if (demand > 0) {
                    console.warn(`⚠️ SKU ${p.name} NECESTA PRODUCCIÓN PERO NO TIENE RECETA.`);
                }
            }
        }

        console.log(`\n✅ PROCESO COMPLETADO EXIOTOSAMENTE.`);
        console.log(`📦 ODPs Creadas: ${createdCount}`);
        console.log(`🚀 Ahora refresca tu Kanban. ¡Las 7 tarjetas deberían estar allí!`);

    } catch (e) {
        console.error("❌ Error fatal en el proceso:", e);
    }
}

populateOdps();
