import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAeHMdtEt04RtYarEx_h19gcCUzsIUUpSc",
  authDomain: "delta-core-cloud-45ea0.firebaseapp.com",
  projectId: "delta-core-cloud-45ea0",
  storageBucket: "delta-core-cloud-45ea0.firebasestorage.app",
  messagingSenderId: "378250949856",
  appId: "1:378250949856:web:7a0ce44de64bc9a5becc85",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log("--- LISTING ORDERS FOR TENANT 'zeticas' ---");
  const colRef = collection(db, "tenants", "zeticas", "orders");
  const snap = await getDocs(colRef);
  if (snap.empty) {
    console.log("No orders found in 'tenants/zeticas/orders'.");
  } else {
    console.log(`Found ${snap.size} orders:`);
    snap.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id} | OrderNum: ${data.order_number} | Client: ${data.client} | Payment: ${data.payment_status} | Status: ${data.status} | Total: ${data.total_amount} | Date: ${data.date} | CreatedAt: ${data.created_at}`);
    });
  }

  console.log("\n--- LISTING ORDERS FOR TENANT 'delta' ---");
  const colRefDelta = collection(db, "tenants", "delta", "orders");
  const snapDelta = await getDocs(colRefDelta);
  if (snapDelta.empty) {
    console.log("No orders found in 'tenants/delta/orders'.");
  } else {
    console.log(`Found ${snapDelta.size} orders:`);
    snapDelta.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id} | OrderNum: ${data.order_number} | Client: ${data.client} | Payment: ${data.payment_status} | Status: ${data.status} | Total: ${data.total_amount} | Date: ${data.date} | CreatedAt: ${data.created_at}`);
    });
  }

  process.exit(0);
}

run().catch(console.error);
