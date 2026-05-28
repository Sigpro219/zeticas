import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAeHMdtEt04RtYarEx_h19gcCUzsIUUpSc",
  authDomain: "delta-core-cloud-45ea0.firebaseapp.com",
  projectId: "delta-core-cloud-45ea0",
  storageBucket: "delta-core-cloud-45ea0.firebasestorage.app",
  messagingSenderId: "378250949856",
  appId: "1:378250949856:web:7a0ce44de64bc9a5becc85"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspect() {
    console.log("=== BANKS ===");
    const bankSnap = await getDocs(collection(db, "tenants", "zeticas", "banks"));
    bankSnap.forEach(doc => {
        console.log(`${doc.id} => Name: ${doc.data().name}, Balance: ${doc.data().balance}, Type: ${doc.data().type}`);
    });

    console.log("\n=== PRODUCTS ===");
    const productSnap = await getDocs(collection(db, "tenants", "zeticas", "products"));
    const products = [];
    productSnap.forEach(doc => {
        const data = doc.data();
        products.push({ id: doc.id, name: data.name, type: data.type || data.product_type, stock: data.stock, purchases: data.purchases, sales: data.sales });
    });
    console.log(`Found ${products.length} products. Printing first 10:`);
    console.log(products.slice(0, 10));

    console.log("\n=== RECIPES ===");
    const recipeSnap = await getDocs(collection(db, "tenants", "zeticas", "recipes"));
    const recipes = [];
    recipeSnap.forEach(doc => {
        const data = doc.data();
        recipes.push({ id: doc.id, finished_good_name: data.finished_good_name, raw_material_name: data.raw_material_name, qty: data.input_qty || data.quantity_required });
    });
    console.log(`Found ${recipes.length} recipes. Printing first 10:`);
    console.log(recipes.slice(0, 10));
}

inspect().catch(console.error);
