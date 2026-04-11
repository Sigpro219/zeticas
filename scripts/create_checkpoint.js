
import { db } from '../src/lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

async function createFullCheckpoint() {
    try {
        const collections = ['products', 'recipes', 'orders', 'production_orders', 'purchase_orders', 'siteContent'];
        const backup = {
            timestamp: new Date().toISOString(),
            data: {}
        };

        console.log("🚀 Iniciando respaldo de seguridad...");

        for (const collName of collections) {
            console.log(`- Respaldando: ${collName}`);
            const snap = await getDocs(collection(db, collName));
            backup.data[collName] = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        }

        const filename = `scratch/checkpoint_full_${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(backup, null, 2));

        console.log(`\n✅ Marca temporal creada con éxito.`);
        console.log(`Archivo: ${filename}`);
        console.log(`Total colecciones: ${collections.length}`);
        
        process.exit(0);
    } catch (err) {
        console.error("❌ Fallo el respaldo:", err);
        process.exit(1);
    }
}

createFullCheckpoint();
