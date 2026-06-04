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
  const colRef = collection(db, "tenants", "zeticas", "orders");
  const snap = await getDocs(colRef);
  
  const summary = {};
  snap.forEach(doc => {
    const data = doc.data();
    const client = data.client || "No Client";
    if (!summary[client]) {
      summary[client] = [];
    }
    summary[client].push({
      id: doc.id,
      date: data.date,
      amount: data.total_amount || data.amount || 0,
      status: data.status
    });
  });

  console.log(`Total orders in tenants/zeticas/orders: ${snap.size}\n`);
  for (const [client, list] of Object.entries(summary)) {
    console.log(`Client: "${client}" (${list.length} orders)`);
    list.slice(0, 5).forEach(o => {
      console.log(`  - ID: ${o.id} | Date: ${o.date} | Amount: ${o.amount} | Status: ${o.status}`);
    });
    if (list.length > 5) {
      console.log(`  - ... and ${list.length - 5} more`);
    }
  }

  process.exit(0);
}

run().catch(console.error);
