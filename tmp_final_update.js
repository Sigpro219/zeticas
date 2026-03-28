import { db } from './src/lib/firebase.js';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';

async function updateAllProducts() {
    const querySnapshot = await getDocs(collection(db, 'products'));
    let updated = 0;
    for (const d of querySnapshot.docs) {
        const data = d.data();
        let cat = 'Otros';
        if (data.sku && data.sku.startsWith('PT')) cat = 'Producto Terminado';
        else if (data.sku && data.sku.startsWith('MP')) cat = 'Materia Prima';
        
        await updateDoc(doc(db, 'products', d.id), { 
            category: cat,
            group: cat 
        });
        updated++;
    }
    console.log(`Updated ${updated} products with category and group fields.`);
}

updateAllProducts();
