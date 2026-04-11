
import { db } from '../src/lib/firebase.js';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

async function verifyWithRecentOrders() {
    try {
        console.log("🚀 Validando lógica con las 10 órdenes más recientes...");
        
        const productsSnap = await getDocs(collection(db, 'products'));
        const products = {};
        productsSnap.forEach(doc => products[doc.id] = { id: doc.id, ...doc.data() });

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

        const ordersSnap = await getDocs(query(collection(db, 'orders'), orderBy('created_at', 'desc'), limit(10)));
        
        console.log(`Encontradas ${ordersSnap.size} órdenes recientes.\n`);

        for (const orderDoc of ordersSnap.docs) {
            const order = orderDoc.data();
            console.log(`📦 Orden: ${order.order_number} | Status: ${order.status}`);
            
            for (const item of order.items) {
                const pt = Object.values(products).find(p => p.name === item.name);
                if (!pt) continue;

                const ex = (pt.initial !== undefined ? pt.initial : pt.stock) || 0;
                const ns = pt.min_stock_level || pt.safety || 0;
                const tb = pt.batch_size || 1;
                const pe = item.quantity;

                const n = Math.ceil(((pe - ex) + ns) / tb);
                
                if (n > 0) {
                    console.log(`   - PT: ${item.name} | PE:${pe} EX:${ex} NS:${ns} TB:${tb} => n:${n} batches`);
                    const recipe = recipes[pt.id] || [];
                    for (const ing of recipe) {
                        const mat = products[ing.raw_material_id];
                        if (mat) {
                            const sm = n * ing.qty;
                            const s_m = (mat.initial !== undefined ? mat.initial : mat.stock) || 0;
                            const n_s = mat.min_stock_level || mat.safety || 0;
                            const qm = Math.max(0, sm - s_m + n_s);
                            console.log(`       -> MP: ${mat.name} | Req: ${sm} | Stock: ${s_m} | Meta: ${n_s} => COMPRA: ${qm}`);
                        }
                    }
                }
            }
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
verifyWithRecentOrders();
