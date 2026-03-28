import { db } from './src/lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function listPtProducts() {
    const querySnapshot = await getDocs(collection(db, 'products'));
    const ptProducts = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.sku && data.sku.startsWith('PT')) {
            ptProducts.push({ id: doc.id, ...data });
        }
    });
    console.log(JSON.stringify(ptProducts, null, 2));
}

listPtProducts();
