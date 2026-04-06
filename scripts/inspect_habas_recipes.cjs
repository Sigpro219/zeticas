const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'delta-core-cloud-45ea0'
  });
}
const db = admin.firestore();

async function inspectHabas() {
  console.log("Inspecting 'habas-untar' recipe ingredients...");
  const snapshot = await db.collection('recipes')
    .where('finished_good_id', '==', 'habas-untar')
    .get();

  if (snapshot.empty) {
    console.log("No ingredients found for 'habas-untar'.");
  } else {
    console.log(`Found ${snapshot.size} ingredients:`);
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(` - ID: ${doc.id}, Name: "${data.raw_material_name}", Qty: ${data.input_qty || data.quantity_required}, Unit: ${data.input_unit || data.unit}`);
    });
  }

  console.log("\nSearching for potentially empty ingredients across all recipes...");
  const allRecipes = await db.collection('recipes').get();
  allRecipes.docs.forEach(doc => {
    const data = doc.data();
    if (!data.raw_material_name || data.raw_material_name.trim() === "" || data.raw_material_name === "null" || data.raw_material_name === "undefined") {
      console.log(`⚠️ EMPTY NAME in ${doc.id} (FG: ${data.finished_good_id})`);
    }
  });
}

inspectHabas().catch(console.error);
