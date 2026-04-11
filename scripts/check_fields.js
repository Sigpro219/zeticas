
import { db } from '../src/lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function checkFieldNames() {
    try {
        const recipesSnap = await getDocs(collection(db, 'recipes'));
        console.log("🔍 Muestreo de campos en documentos de recetas:");
        
        const firstDoc = recipesSnap.docs[0];
        if (firstDoc) {
            console.log("Campos encontrados en el primer documento:", Object.keys(firstDoc.data()));
            console.log("Valores ejemplo:", JSON.stringify(firstDoc.data(), null, 2));
        } else {
            console.log("No se encontraron documentos en la colección 'recipes'.");
        }
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkFieldNames();
