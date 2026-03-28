import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";

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

async function checkLeads() {
    try {
        const q = query(collection(db, "leads"), limit(5));
        const querySnapshot = await getDocs(q);
        console.log(`Leads en base de datos: ${querySnapshot.size}`);
        querySnapshot.forEach((doc) => {
            console.log(`Leads ID: ${doc.id} => ${JSON.stringify(doc.data(), null, 2)}`);
        });
    } catch (e) {
        console.error("Error consultando BD:", e);
    }
}

checkLeads();
