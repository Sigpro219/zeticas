import { db } from './src/lib/firebase.js';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { products as masterProducts } from './src/data/products.js';

async function updateProductDetails() {
    const querySnapshot = await getDocs(collection(db, 'products'));
    let updated = 0;
    
    for (const d of querySnapshot.docs) {
        const data = d.data();
        let productType = 'N/A';
        
        // Find match in masterProducts for Sal/Dulce info
        const match = masterProducts.find(p => 
            p.id === data.sku || 
            p.id.toLowerCase() === data.sku.toLowerCase().replace('pt-', '') ||
            p.nombre.toLowerCase() === data.name.toLowerCase()
        );
        
        if (match) {
            productType = match.categoria;
        } else if (data.sku && data.sku.startsWith('MP')) {
            productType = 'Insumo';
        }
        
        await updateDoc(doc(db, 'products', d.id), { 
            product_type: productType 
        });
        updated++;
    }
    console.log(`Updated ${updated} products with 'product_type' field.`);
}

updateProductDetails();
