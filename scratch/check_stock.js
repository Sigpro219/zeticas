import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

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

async function checkProductStock() {
    const tenant = "delta";
    const q = query(collection(db, "tenants", tenant, "items"), where("name", "==", "Mermelada Ruibarbo & Fresa"));
    const snap = await getDocs(q);
    
    snap.forEach(d => {
        console.log(`Product: ${d.data().name}`);
        console.log(`Initial: ${d.data().initial}`);
        console.log(`Purchases: ${d.data().purchases}`);
        console.log(`Sales: ${d.data().sales}`);
        console.log('---');
    });
}

checkProductStock();
