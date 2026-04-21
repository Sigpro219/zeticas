import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, listCollections } from "firebase/firestore";

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

async function checkAllCollections() {
    // Note: listCollections is only available in Admin SDK or through a hack in Client SDK if enabled.
    // I will try to query common names instead.
    const collections = ["production_orders", "production", "odps", "plans"];
    for (const col of collections) {
        console.log(`--- Checking tenants/zeticas/${col} ---`);
        try {
            const querySnapshot = await getDocs(collection(db, "tenants", "zeticas", col));
            console.log(`Found ${querySnapshot.size} docs in ${col}.`);
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                console.log(`ID: ${doc.id}, ODP: ${data.odp_number || data.id}, SKU: ${data.sku || data.product_name}`);
            });
        } catch (e) {
            console.log(`Error checking ${col}: ${e.message}`);
        }
    }
}

checkAllCollections();
