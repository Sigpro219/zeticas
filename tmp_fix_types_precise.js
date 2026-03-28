import { db } from './src/lib/firebase.js';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';

const manualMap = {
    'PT-VINAGRETA': 'Sal',
    'PT-PAPAYUELA-+-LIMONARIA': 'Dulce',
    'PT-ANTIPASTO-TUNA': 'Sal',
    'PT-MERMELADA-AGRAZ-FLOR-JAMAICA-CANELA': 'Dulce',
    'PT-GUAVA-+-ALBAHACA': 'Dulce',
    'PT-BERENJENA-TOSCANA': 'Sal',
    'PT-MERMELADA-RUIBARBO-FRESA': 'Dulce',
    'EMP-001': 'Empaque',
    'PT-001': 'Sal', // Berenjenas untar
    'PT-BERENJENAS-PARA-UNTAR': 'Sal',
    'PT-PERA-JENGIBRE': 'Dulce',
    'PT-MANDARINA-COCO-CARDAMOMO': 'Dulce',
    'PT-ZETAS-GRIEGAS': 'Sal',
    'PT-PESTO-KALE': 'Sal'
};

const keywords = {
    'mermelada': 'Dulce',
    'dulce': 'Dulce',
    'jalea': 'Dulce',
    'antipasto': 'Sal',
    'dip': 'Sal',
    'vinagreta': 'Sal',
    'hummus': 'Sal',
    'pesto': 'Sal',
    'zetas': 'Sal',
    'berenjena': 'Sal',
    'habas': 'Sal'
};

async function fixClassifications() {
    const querySnapshot = await getDocs(collection(db, 'products'));
    let updated = 0;
    
    for (const d of querySnapshot.docs) {
        const data = d.data();
        let productType = data.product_type || 'N/A';
        
        if (manualMap[data.sku]) {
            productType = manualMap[data.sku];
        } else if (data.sku && data.sku.startsWith('PT')) {
            const lowerName = data.name.toLowerCase();
            for (const [kw, type] of Object.entries(keywords)) {
                if (lowerName.includes(kw)) {
                    productType = type;
                    break;
                }
            }
        } else if (data.sku && data.sku.startsWith('MP')) {
            productType = 'Insumo';
        }
        
        await updateDoc(doc(db, 'products', d.id), { product_type: productType });
        updated++;
    }
    console.log(`Updated ${updated} products with precise classifications.`);
}

fixClassifications();
