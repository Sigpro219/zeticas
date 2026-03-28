import { db } from './src/lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function checkTypesDistribution() {
    const querySnapshot = await getDocs(collection(db, 'products'));
    const dist = {};
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const type = data.product_type || 'UNDEFINED';
        dist[type] = (dist[type] || 0) + 1;
        if (type === 'UNDEFINED' || type === 'N/A') {
            console.log(`Missing type for: ${data.name} (${data.sku})`);
        }
    });
    console.log('Product Type Distribution:', dist);
}

checkTypesDistribution();
