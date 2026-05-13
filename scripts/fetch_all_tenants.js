import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAeHMdtEt04RtYarEx_h19gcCUzsIUUpSc",
  authDomain: "delta-core-cloud-45ea0.firebaseapp.com",
  projectId: "delta-core-cloud-45ea0",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkAll() {
    const tenants = ['deltacore', 'zeticas', 'delta'];
    for (const tenantId of tenants) {
        console.log(`\n--- Checking tenant: ${tenantId} ---`);
        const contentRef = collection(db, 'tenants', tenantId, 'site_content');
        const snap = await getDocs(contentRef);
        
        if (snap.empty) {
            console.log(`No site_content found for ${tenantId}.`);
        } else {
            console.log(`Found ${snap.size} documents for ${tenantId}:`);
            snap.forEach(doc => {
                const data = doc.data();
                console.log(`- ${data.section} / ${data.key}`);
            });
        }
    }
}

checkAll().catch(console.error);
