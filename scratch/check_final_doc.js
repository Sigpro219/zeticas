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
  const docRef = doc(db, "mail", "Ih7EwC1qgharhOrLwufI");
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    console.log("Documento Ih7EwC1qgharhOrLwufI en Firestore:");
    console.log("Estado de entrega:", snap.data().delivery?.state);
    console.log("Error:", snap.data().delivery?.error);
  } else {
    console.log("El documento no existe.");
  }
}

checkDoc();
