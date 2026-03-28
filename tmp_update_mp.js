import { db } from './src/lib/firebase.js';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';

async function updateMpCategory() {
    const querySnapshot = await getDocs(collection(db, 'products'));
    let updated = 0;
    for (const d of querySnapshot.docs) {
        const data = d.data();
        if (data.sku && data.sku.startsWith('MP')) {
            await updateDoc(doc(db, 'products', d.id), { category: 'Materia Prima' });
            updated++;
        }
    }
    console.log(`Updated ${updated} products to "Materia Prima" category.`);
}

updateMpCategory();
