import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAeHMdtEt04RtYarEx_h19gcCUzsIUUpSc",
  authDomain: "delta-core-cloud-45ea0.firebaseapp.com",
  projectId: "delta-core-cloud-45ea0",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkAllies() {
    const tenantId = 'delta';
    console.log(`Checking allies for tenant: ${tenantId}...`);
    
    const contentRef = collection(db, 'tenants', tenantId, 'site_content');
    const q = query(contentRef, where('section', '==', 'allies'));
    const snap = await getDocs(q);
    
    if (snap.empty) {
        console.log("No allies content found.");
    } else {
        snap.forEach(doc => {
            console.log(`\nDocument ID: ${doc.id}`);
            const data = doc.data();
            if (data.key === 'list') {
                console.log("List of allies found:");
                console.log(JSON.stringify(data.content, null, 2));
            } else {
                console.log(`${data.key}: ${data.content}`);
            }
        });
    }
}

checkAllies().catch(console.error);
