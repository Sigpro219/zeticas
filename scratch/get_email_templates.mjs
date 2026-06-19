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

async function getTemplates() {
  console.log("Fetching email templates from Firestore...");
  // Firebase Trigger Email extension usually stores templates in a collection called 'templates' or 'mail_templates' or similar.
  // Let's try both 'templates' and 'mail_templates'
  const collectionsToTry = ['templates', 'mail_templates', 'email_templates'];
  for (const colName of collectionsToTry) {
    console.log(`Trying collection: ${colName}`);
    const colRef = collection(db, colName);
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      console.log(`Found ${snap.size} templates in '${colName}':`);
      snap.forEach(doc => {
        console.log(`\n--- Template ID: ${doc.id} ---`);
        console.log(JSON.stringify(doc.data(), null, 2));
      });
    } else {
      console.log(`Collection '${colName}' is empty or does not exist.`);
    }
  }
}

getTemplates().catch(console.error);
