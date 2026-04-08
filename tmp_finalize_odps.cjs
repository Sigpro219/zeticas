
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccount.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function finalizeODPs() {
  const odpsToFinalize = ['ODP-SYS-3938', 'ODP-SYS-3939'];
  console.log('--- Iniciando Limpieza de Tablero ---');

  for (const odpNum of odpsToFinalize) {
    const qSnapshot = await db.collection('production_orders')
      .where('odp_number', '==', odpNum)
      .get();

    if (qSnapshot.empty) {
      console.log(`⚠️ No se encontró la orden: ${odpNum}`);
      continue;
    }

    const doc = qSnapshot.docs[0];
    await doc.ref.update({
      status: 'DONE',
      completed_at: new Date().toISOString(),
      inventory_synced: true
    });
    console.log(`✅ Orden ${odpNum} finalizada exitosamente.`);
  }
}

finalizeODPs().then(() => process.exit(0)).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
