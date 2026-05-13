const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyAeHMdtEt04RtYarEx_h19gcCUzsIUUpSc",
  authDomain: "delta-core-cloud-45ea0.firebaseapp.com",
  projectId: "delta-core-cloud-45ea0",
  storageBucket: "delta-core-cloud-45ea0.firebasestorage.app",
  messagingSenderId: "378250949856",
  appId: "1:378250949856:web:7a0ce44de64bc9a5becc85",
  measurementId: "G-Q1BXE4WVZP"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listProducts(tenantId) {
    console.log(`Listing products for tenant: ${tenantId}`);
    try {
        const snap = await getDocs(collection(db, `tenants/${tenantId}/products`));
        if (snap.empty) {
            console.log("No products found.");
            return;
        }
        snap.docs.forEach(doc => {
            const data = doc.data();
            console.log(`- ${data.name} (SKU: ${data.sku || 'N/A'})`);
        });
    } catch (err) {
        console.error("Error:", err);
    }
}

listProducts('zeticas');
