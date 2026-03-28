const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Since I'm in the environment, I'll try to find a service account or check if I can use admin SDK without a key (default credentials)
// Often in these environments there are local credentials.
// Let's check for any .json in the root that looks like a service account.
// Or I'll just write one that tries to read from the 'site_content' collection.

async function inspectCMS() {
  const serviceAccount = require('./serviceAccountKey.json'); // I'll assume it exists or I'll look for it.

  initializeApp({
    credential: cert(serviceAccount)
  });

  const db = getFirestore();
  const snapshot = await db.collection('site_content').where('section', '==', 'campaign').get();
  
  if (snapshot.empty) {
    console.log('No campaign data found in site_content.');
    return;
  }

  const campaign = {};
  snapshot.forEach(doc => {
    const data = doc.data();
    campaign[data.key] = data.content;
  });

  console.log('Current Campaign Data in Firestore:');
  console.log(JSON.stringify(campaign, null, 2));
}

inspectCMS().catch(console.error);
