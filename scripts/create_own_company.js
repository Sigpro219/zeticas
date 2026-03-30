/**
 * create_own_company.js
 * Crea el perfil de Zeticas SAS en la colección `clients` de Firestore.
 * Ejecutar UNA sola vez: node scripts/create_own_company.js
 *
 * ⚠️  Editar los datos reales antes de ejecutar.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

const zeticasProfile = {
    // ── Identificación ──────────────────────────────────────────
    is_own_company: true,           // Flag especial — NO cambiar
    name:     'Zeticas SAS',
    nit:      '901.321.456-7',      // ← actualizar con NIT real

    // ── Contacto ────────────────────────────────────────────────
    email:    'info@zeticas.com',   // ← actualizar
    phone:    '+57 300 000 0000',   // ← actualizar

    // ── Direcciones ─────────────────────────────────────────────
    address:        'Calle XX #XX-XX, Ciudad',   // ← dirección fiscal
    delivery_address: 'Bodega Zeticas – Calle XX #XX-XX, Ciudad', // ← dirección de bodega/entrega

    city:     'Bogotá D.C.',
    country:  'Colombia',
    status:   'Active',
    source:   'Empresa',
    created_at: new Date().toISOString(),
};

async function run() {
    // Verificar que no existe ya
    const q = query(collection(db, 'clients'), where('is_own_company', '==', true));
    const snap = await getDocs(q);
    if (!snap.empty) {
        console.log('⚠️  Ya existe un registro is_own_company=true en clients:', snap.docs[0].id);
        console.log('   Datos actuales:', snap.docs[0].data());
        process.exit(0);
    }

    const docRef = await addDoc(collection(db, 'clients'), zeticasProfile);
    console.log('✅ Perfil de Zeticas creado con ID:', docRef.id);
    console.log('   Datos guardados:', zeticasProfile);
}

run().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
