import { initializeApp } from "firebase/app";
import { getFirestore, doc, deleteDoc, getDoc } from "firebase/firestore";

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

const orderIds = ["MAN-0004", "MAN-0005"];

async function run() {
  console.log("--- CLEANING UP TEST ORDERS IN PRODUCTION TENANT 'zeticas' ---");

  for (const id of orderIds) {
    const docRef = doc(db, "tenants", "zeticas", "orders", id);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      console.log(`Found order: ${id} (Client: "${snap.data().client}")`);
      await deleteDoc(docRef);
      console.log(`Deleted order: ${id}`);
    } else {
      console.log(`Order ${id} does not exist in Firestore.`);
    }
  }

  console.log("\nVerification:");
  for (const id of orderIds) {
    const docRef = doc(db, "tenants", "zeticas", "orders", id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      console.log(`Order ${id} verification: DELETED successfully.`);
    } else {
      console.log(`Order ${id} verification FAILED: Still exists!`);
    }
  }

  process.exit(0);
}

run().catch(console.error);
