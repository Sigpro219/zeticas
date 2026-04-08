
const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'delta-core-cloud-45ea0'
});

const db = admin.firestore();

async function finalizeODPs() {
  const odpsToFinalize = ['ODP-SYS-3938', 'ODP-SYS-3939'];
  console.log('--- Iniciando Limpieza Técnica de Tablero ---');

  for (const odpNum of odpsToFinalize) {
    const qSnapshot = await db.collection('production_orders')
      .where('odp_number', '==', odpNum)
      .get();

    if (qSnapshot.empty) {
      console.log(`⚠️ Advertencia: No se encontró la orden: ${odpNum}`);
      continue;
    }

    const doc = qSnapshot.docs[0];
    await doc.ref.update({
      status: 'DONE',
      completed_at: new Date().toISOString(),
      inventory_synced: true 
    });
    console.log(`✅ Orden ${odpNum} finalizada y retirada del tablero.`);
  }
}

finalizeODPs()
  .then(() => {
    console.log('--- Limpieza Completada ---');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
  });
