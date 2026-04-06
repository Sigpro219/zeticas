const admin = require('firebase-admin');
admin.initializeApp({
  projectId: 'delta-core-cloud-45ea0'
});
const db = admin.firestore();

async function test() {
  console.log("Checking Firestore for 'recipes' for 'habas-untar'...");
  const snapshot = await db.collection('recipes').where('finished_good_id', '==', 'habas-untar').get();
  if (snapshot.empty) {
    console.log("⚠️ No ingredients found for 'habas-untar'.");
  } else {
    console.log(`✅ Found ${snapshot.size} ingredients for 'habas-untar':`);
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(` - ID: ${doc.id}, Name: "${data.raw_material_name}", Qty: ${data.input_qty || data.quantity_required}, Unit: ${data.input_unit || data.unit}`);
    });
  }

  console.log("\nSearching for empty ingredients in 'recipes'...");
  const allRecipes = await db.collection('recipes').get();
  allRecipes.docs.forEach(doc => {
    const data = doc.data();
    if (!data.raw_material_name || data.raw_material_name.trim() === "") {
        console.log(`⚠️ EMPTY NAME in doc ${doc.id} (FG: ${data.finished_good_id})`);
    }
  });
}

test().catch(console.error);
