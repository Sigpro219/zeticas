import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

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

async function checkCampaign() {
    console.log("Checking campaign data in Firestore...");
    const q = query(collection(db, "site_content"), where("section", "==", "campaign"));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
        console.log("No campaign data found.");
        return;
    }

    console.log(`Found ${querySnapshot.size} campaign fields:`);
    querySnapshot.forEach((doc) => {
        const d = doc.data();
        console.log(`- ${d.key}: ${JSON.stringify(d.content)}`);
    });
}

checkCampaign();
