import { db } from './src/lib/firebase.js';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { products as masterProducts } from './src/data/products.js';

async function updateProductNames() {
    const querySnapshot = await getDocs(collection(db, 'products'));
    let updated = 0;
    
    for (const d of querySnapshot.docs) {
        const data = d.data();
        if (!data.sku || !data.sku.startsWith('PT')) continue;
        
        // Find best match in masterProducts
        const match = masterProducts.find(p => {
            // Slugify both to compare
            const slugMaster = p.id.replace(/-/g, '').toLowerCase();
            const slugDb = data.sku.replace('PT-', '').replace(/-/g, '').replace(/\+/g, '').toLowerCase();
            return slugMaster === slugDb || 
                   p.nombre.toLowerCase().includes(data.name.toLowerCase()) ||
                   data.name.toLowerCase().includes(p.nombre.toLowerCase());
        });
        
        if (match && data.name !== match.nombre) {
            console.log(`Updating ${data.name} -> ${match.nombre}`);
            await updateDoc(doc(db, 'products', d.id), { 
                name: match.nombre 
            });
            updated++;
        }
    }
    console.log(`Synced ${updated} product names from Landing Page to Master SKU.`);
}

updateProductNames();
