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

async function testOrderEmail() {
  console.log("Encolando correo de prueba de confirmación de pedido...");
  try {
    const docRef = await addDoc(collection(db, "mail"), {
      to: "germanhiguera@gmail.com",
      tenantId: "zeticas",
      template: {
        name: "order_confirmation",
        data: {
          client: "CLIMART SAS",
          order_number: "MAN-0001",
          date: "2026-04-17",
          total_amount: "140.000",
          items: [
            { name: "Sopa de Espinaca", quantity: 4, price: "20.000" },
            { name: "Jalea de pimentón con ají amazónico", quantity: 2, price: "30.000" }
          ]
        }
      },
      created_at: new Date().toISOString()
    });
    console.log(`Documento creado con ID: ${docRef.id}`);
  } catch (e) {
    console.error("Error al encolar el correo:", e);
  }
}

testOrderEmail();
