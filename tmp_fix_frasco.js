import { db } from './src/lib/firebase.js';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';

async function fixFrasco() {
    const querySnapshot = await getDocs(collection(db, 'products'));
    for (const d of querySnapshot.docs) {
        const data = d.data();
        if (data.sku === 'EMP-001' || data.name.toLowerCase().includes('frasco vidrio')) {
            console.log(`Recategorizando ${data.name} como Insumo`);
            await updateDoc(doc(db, 'products', d.id), { 
                product_type: 'Insumo',
                category: 'Materia Prima'
            });
        }
    }
}

fixFrasco();
