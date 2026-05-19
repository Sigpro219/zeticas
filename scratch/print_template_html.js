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

async function printTemplate() {
  const docRef = doc(db, "mail_templates", "welcome_subscription");
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    console.log("Subject:", data.subject);
    console.log("Contiene 'Amig@s de Zeticas'?:", data.html.includes("Amig@s de Zeticas"));
    console.log("Extracto HTML alrededor del párrafo de bienvenida:");
    const welcomeIndex = data.html.indexOf("Es un gusto");
    if (welcomeIndex !== -1) {
      console.log(data.html.substring(welcomeIndex - 50, welcomeIndex + 150));
    } else {
      console.log("No se encontró el texto de bienvenida.");
    }
  } else {
    console.log("El template no existe.");
  }
}

printTemplate();
