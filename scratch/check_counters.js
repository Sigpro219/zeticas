import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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

async function checkCounter() {
    const tenant = "delta";
    const ref = doc(db, "tenants", tenant, "metadata", "counters");
    const snap = await getDoc(ref);
    if (snap.exists()) {
        console.log("Current counters for Delta:", JSON.stringify(snap.data(), null, 2));
    } else {
        console.log("Counter doc not found.");
    }
}

checkCounter();
