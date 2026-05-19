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

async function checkDoc() {
  const docRef = doc(db, "mail", "G0IIDHWWhyfv9tMrt0gR");
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    console.log("Documento encontrado:", snap.data());
  } else {
    console.log("El documento no existe (probablemente ya fue eliminado por el TTL).");
  }
}

checkDoc();
