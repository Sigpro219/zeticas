import { db } from './src/lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function checkSpecificProduct() {
    const querySnapshot = await getDocs(collection(db, 'products'));
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.sku === 'MP-ACEITE-OLIVA') {
            console.log(JSON.stringify(data, null, 2));
        }
    });
}

checkSpecificProduct();
