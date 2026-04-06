const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'delta-core-cloud-45ea0'
    });
}

const db = admin.firestore();

async function checkProductionOrders() {
    try {
        const ordersSnap = await db.collection('orders').where('status', 'in', ['En Producción', 'En Producción (Iniciada)', 'En Compras', 'En Compras (OC Generadas)']).get();
        
        console.log('--- AUDITORÍA DE PEDIDOS EN PRODUCCIÓN ---');
        console.log(`Total pedidos detectados: ${ordersSnap.size}`);

        ordersSnap.docs.forEach(doc => {
            const o = doc.data();
            const id = o.order_number || o.id || doc.id;
            const items = o.items || [];
            console.log(`\n📦 Pedido: ${id} | Cliente: ${o.client || o.customer_name || 'Web User'}`);
            items.forEach(i => {
                console.log(`  - ${i.name || i.product_name}: ${i.quantity}`);
            });
        });
    } catch (err) {
        console.error("Error in audit:", err);
    }
}

checkProductionOrders();
