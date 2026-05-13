import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

// Use service account if available, otherwise assume environment is already authenticated
// Looking for a possible service account in the root
const serviceAccountPath = 'c:/Users/German Higuera/OneDrive/Documentos/Projects/zeticas/serviceAccountKey.json';

try {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (e) {
    console.log("No service account found, attempting default initialization...");
    admin.initializeApp({
        projectId: 'delta-core-cloud-45ea0'
    });
}

const db = admin.firestore();
const tenantId = 'deltacore';

const newQuote = '\"Los árboles son solo un elemento del bosque, hacen parte de un ecosistema, que aprende, colabora, conecta, se comunica y responde; Yarumo ancestral, representa el modelo de pensamiento reflexivo, para acompañar a las comunidades, organizaciones y empresas para ser cada día mejor.\"';

async function updateText() {
    console.log(`Updating text for tenant: ${tenantId}...`);
    
    const contentRef = db.collection('tenants').doc(tenantId).collection('site_content');
    
    // Find the hero_quote document
    const q = await contentRef.where('section', '==', 'extra').where('key', '==', 'hero_quote').get();
    
    if (q.empty) {
        console.log("Document not found, creating new one...");
        await contentRef.add({
            section: 'extra',
            key: 'hero_quote',
            content: newQuote
        });
    } else {
        console.log(`Found ${q.size} documents, updating first one...`);
        await q.docs[0].ref.update({
            content: newQuote
        });
    }
    
    console.log("Update successful!");
    process.exit(0);
}

updateText().catch(err => {
    console.error("Error updating text:", err);
    process.exit(1);
});
