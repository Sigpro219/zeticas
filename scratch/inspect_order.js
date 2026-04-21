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

async function inspectOrder() {
    const tenant = "delta";
    // INT-228609 was the number, but what is the DOC ID?
    // I will search for it again.
    const { collection, query, where, getDocs } = await import("firebase/firestore");
    const q = query(collection(db, "tenants", tenant, "orders"), where("order_number", "==", "INT-228609"));
    const snap = await getDocs(q);
    
    snap.forEach(d => {
        console.log(JSON.stringify(d.data(), null, 2));
    });
}

inspectOrder();
