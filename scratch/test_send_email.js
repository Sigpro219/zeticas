import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

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

async function testSendEmail() {
    const testEmail = process.argv[2] || "germanhiguera@gmail.com";
    console.log(`Insertando correo de prueba en la colección raíz 'mail' para: ${testEmail}...`);
    try {
        const docRef = await addDoc(collection(db, "mail"), {
            to: testEmail,
            tenantId: "zeticas",
            template: {
                name: "welcome_subscription",
                data: {
                    name: "Usuario de Prueba",
                    plan: "Plan Círculo Zeticas",
                    frequency: "Quincenal"
                }
            },
            created_at: new Date().toISOString()
        });
        console.log(`Documento creado exitosamente con ID: ${docRef.id}`);
        console.log("Si la extensión de Firebase está activa y configurada, procesará este documento y despachará el correo.");
    } catch (e) {
        console.error("Error al insertar el documento de correo:", e);
    }
}

testSendEmail();
