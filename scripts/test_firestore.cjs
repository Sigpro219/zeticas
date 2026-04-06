const admin = require('firebase-admin');
admin.initializeApp({
  projectId: 'delta-core-cloud-45ea0'
});
const db = admin.firestore();

async function test() {
  console.log("--- INICIANDO AUDITORIA DE PRODUCCION (7 PEDIDOS) ---");
  const snapshot = await db.collection('orders').where('status', 'in', ['En Producción', 'En Producción (Iniciada)', 'En Compras', 'En Compras (OC Generadas)']).get();
  
  if (snapshot.empty) {
    console.log("⚠️ No se encontraron pedidos en producción.");
  } else {
    console.log(`✅ Se encontraron ${snapshot.size} pedidos:`);
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const id = data.order_number || data.id || doc.id;
      console.log(`\n📦 Pedido: ${id} | Cliente: ${data.client || data.customer_name || 'Web User'}`);
      const items = data.items || [];
      items.forEach(i => {
        console.log(`  - ${i.name || i.product_name}: ${i.quantity}`);
      });
    });
  }
}

test().catch(console.error);
