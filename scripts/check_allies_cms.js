import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccountPath = 'c:/Users/German Higuera/OneDrive/Documentos/Projects/zeticas/serviceAccountKey.json';

try {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (e) {
    admin.initializeApp({
        projectId: 'delta-core-cloud-45ea0'
    });
}

const db = admin.firestore();
const tenantId = 'deltacore';

async function checkAllies() {
    console.log(`Checking allies for tenant: ${tenantId}...`);
    
    const contentRef = db.collection('tenants').doc(tenantId).collection('site_content');
    const q = await contentRef.where('section', '==', 'allies').get();
    
    if (q.empty) {
        console.log("No allies content found in CMS.");
    } else {
        q.forEach(doc => {
            console.log(`Document ID: ${doc.id}`);
            console.log(JSON.stringify(doc.data(), null, 2));
        });
    }
    process.exit(0);
}

checkAllies().catch(err => {
    console.error(err);
    process.exit(1);
});
