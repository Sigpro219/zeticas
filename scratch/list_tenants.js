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

async function listTenants() {
    console.log("--- Tenants ---");
    const querySnapshot = await getDocs(collection(db, "tenants"));
    console.log(`Found ${querySnapshot.size} tenants.`);
    querySnapshot.forEach((doc) => {
        console.log(`Tenant: ${doc.id}`);
    });
}

listTenants();
