import { db } from './src/lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function checkCategories() {
    const querySnapshot = await getDocs(collection(db, 'products'));
    const categs = {};
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const cat = data.category || 'null';
        categs[cat] = (categs[cat] || 0) + 1;
        if (cat === 'Otros' || cat === 'null') {
            console.log(`- SKU: ${data.sku}, Name: ${data.name}, Cat: ${cat}`);
        }
    });
    console.log(JSON.stringify(categs, null, 2));
}

checkCategories();
