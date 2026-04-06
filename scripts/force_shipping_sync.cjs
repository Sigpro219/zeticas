
const admin = require('firebase-admin');

// Use current context project
admin.initializeApp({
  projectId: 'delta-core-cloud-45ea0'
});
const db = admin.firestore();

async function forceShippingSync() {
  console.log("--- INICIANDO FUERZA DE DESPACHO MASIVO ZETICAS ---");
  
  // Status to find
  const pendingStatuses = ['En Producción', 'En Producción (Iniciada)', 'En Compras', 'En Compras (OC Generadas)'];
  const snapshot = await db.collection('orders').where('status', 'in', pendingStatuses).get();

  if (snapshot.empty) {
    console.log("⚠️ No se encontraron pedidos pendientes para sincronizar.");
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach(orderDoc => {
    const data = orderDoc.data();
    const id = data.order_number || data.id || orderDoc.id;
    
    console.log(`📦 Forzando Pedido: ${id} (${data.client || 'Web User'}) -> [EN DESPACHO]`);
    
    // Update reference
    const orderRef = db.collection('orders').doc(orderDoc.id);
    batch.update(orderRef, {
      status: 'En Despacho',
      last_status_at: new Date().toISOString()
    });
  });

  await batch.commit();
  console.log("\n🚀 ¡ÉXITO! Todos los pedidos están ahora en estado: EN DESPACHO.");
  console.log("✅ Verifica tu tablero de Logística en la aplicación.");
}

forceShippingSync().catch(console.error);
