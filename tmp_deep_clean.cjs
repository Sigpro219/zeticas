
const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'delta-core-cloud-45ea0'
});

const db = admin.firestore();

async function deepCleanODPs() {
  const targets = ['ODP-SYS-3938', 'ODP-SYS-3939'];
  console.log('--- Iniciando Purgado Profundo de Órdenes Zombie ---');

  for (const odpNum of targets) {
    const qSnapshot = await db.collection('production_orders')
      .where('odp_number', '==', odpNum)
      .get();

    if (qSnapshot.empty) {
      console.log(`ℹ️ ODP ${odpNum} no encontrada en producción activa.`);
      continue;
    }

    console.log(`🔍 Encontradas ${qSnapshot.size} ocurrencias para ${odpNum}.`);

    const updatePromises = qSnapshot.docs.map(doc => {
      console.log(`   -> Saneando doc: ${doc.id} (${doc.data().sku})`);
      return doc.ref.update({
        status: 'DONE',
        completed_at: new Date().toISOString(),
        mp_synced: true,
        inventory_synced: true,
        production_status: 'finished'
      });
    });

    await Promise.all(updatePromises);
    console.log(`✅ ODP ${odpNum} purgada.`);
  }
}

deepCleanODPs()
  .then(() => {
    console.log('--- Saneamiento Completado ---');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error fatal en purga:', err);
    process.exit(1);
  });
