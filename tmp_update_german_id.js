
import { db } from './src/lib/firebase.js';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/status.js'; // Note: adjust imports based on project structure

// This is a conceptual script to be run in the environment or a simulated execution
const updateGermanOrder = async () => {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('client', '==', 'German Higuera Duran'));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach(async (document) => {
        const orderRef = doc(db, 'orders', document.id);
        await updateDoc(orderRef, {
            id: 'MAN-0001'
        });
        console.log(`Orden ${document.id} actualizada a MAN-0001`);
    });
};
