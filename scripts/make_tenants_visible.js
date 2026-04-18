import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

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

async function makeVisible() {
    console.log("🛠️ Haciendo visibles los documentos raíz de tenants...");
    
    await setDoc(doc(db, 'tenants', 'zeticas'), { 
        name: 'Zeticas', 
        active: true,
        type: 'tenant_root'
    }, { merge: true });
    
    await setDoc(doc(db, 'tenants', 'deltacore'), { 
        name: 'Delta CoreTech', 
        active: true,
        type: 'tenant_root'
    }, { merge: true });

    console.log("✅ Documentos raíz creados. Ahora deberían aparecer sin cursiva en la consola.");
}

makeVisible().catch(console.error);
