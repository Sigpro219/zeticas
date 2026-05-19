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

async function listTemplates() {
    console.log("Consultando todos los documentos en la colección 'mail_templates'...");
    try {
        const querySnapshot = await getDocs(collection(db, "mail_templates"));
        console.log(`Encontrados ${querySnapshot.size} documentos en la colección 'mail_templates'.`);
        querySnapshot.forEach((doc) => {
            console.log(`- ID: ${doc.id}`);
            const data = doc.data();
            console.log(`  Subject: ${data.subject}`);
            console.log(`  Keys:`, Object.keys(data));
        });
    } catch (e) {
        console.error("Error al consultar la colección:", e);
    }
}

listTemplates();
