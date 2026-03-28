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

const collections = ['products', 'clients', 'orders', 'recipes', 'suppliers', 'purchases', 'expenses', 'banks', 'site_content'];

async function checkAllFirestore() {
    for (const collName of collections) {
        try {
            const querySnapshot = await getDocs(collection(db, collName));
            console.log(`Collection ${collName}: ${querySnapshot.size} documents`);
        } catch (e) {
            console.log(`Collection ${collName}: Error (${e.message})`);
        }
    }
}

checkAllFirestore();
