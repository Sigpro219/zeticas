import { db } from './src/lib/firebase.js';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';

const manualNameMap = {
    'PT-GUAVA-+-ALBAHACA': 'Dulce Guayaba y Albahaca',
    'PT-ANTIPASTO-TUNA': 'Antipasto Atún Ahumado',
    'PT-PERA-JENGIBRE': 'Dulce Pera y Jengibre',
    'PT-JALEA-PIMENTON-AJI': 'Jalea Pimentón y Ají',
    'PT-ZETAS-GRIEGAS': 'Zetas Griegas',
    'PT-PESTO-KALE': 'Pesto Kale',
    'PT-HABAS-PARA-UNTAR': 'Habas para untar',
    'PT-HUMMUS-DE-GARBANZO': 'Hummus de Garbanzo',
    'PT-BERENJENAS-PARA-UNTAR': 'Berenjenas para untar',
    'PT-VINAGRETA': 'Vinagreta Migalaba',
    'PT-ALCACHOFAS': 'Dip Alcachofas'
};

async function forceSyncNames() {
    const querySnapshot = await getDocs(collection(db, 'products'));
    let updated = 0;
    
    for (const d of querySnapshot.docs) {
        const data = d.data();
        if (manualNameMap[data.sku] && data.name !== manualNameMap[data.sku]) {
            console.log(`Forcing ${data.name} -> ${manualNameMap[data.sku]}`);
            await updateDoc(doc(db, 'products', d.id), { 
                name: manualNameMap[data.sku] 
            });
            updated++;
        }
    }
    console.log(`Synced ${updated} product names forcibly.`);
}

forceSyncNames();
