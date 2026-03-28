const admin = require('firebase-admin');
admin.initializeApp({
  projectId: 'delta-core-cloud-45ea0'
});
const db = admin.firestore();

async function test() {
  console.log("Checking Firestore for 'products'...");
  const snapshot = await db.collection('products').get();
  if (snapshot.empty) {
    console.log("⚠️ No products found in Firestore.");
  } else {
    console.log(`✅ Success! Found ${snapshot.size} products.`);
    snapshot.docs.slice(0, 3).forEach(doc => console.log(` - ${doc.id}: ${doc.data().name}`));
  }
}

test().catch(console.error);
