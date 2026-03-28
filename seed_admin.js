import { getFirestore, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from './src/lib/firebase.js'; // Adjust path if needed

async function seedAdmin() {
    const email = 'sigpro219@gmail.com';
    const usersRef = collection(db, 'users');
    
    // Check if user already exists
    const q = query(usersRef, where('email', '==', email));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        await addDoc(usersRef, {
            name: 'Sigpro Master',
            email: email,
            role: 'super_admin',
            status: 'Active',
            permissions: {
                kanban: true,
                orders: true,
                purchases: true,
                production: true,
                shipping: true,
                inventory: true,
                recipes: true,
                suppliers: true,
                clients: true,
                banks: true,
                expenses: true,
                reports: true,
                costs: true,
                web_cms: true,
                web_shipping: true,
                users_admin: true
            },
            created_at: new Date().toISOString()
        });
        console.log('✅ Super Admin whitelisted successfully:', email);
    } else {
        console.log('ℹ️ User already exists in Whitelist');
    }
}

seedAdmin();
