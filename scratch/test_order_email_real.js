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

async function testRealOrderEmail() {
  console.log("Encolando correo de prueba de confirmación de pedido real para sigpro219@gmail.com...");
  try {
    const docRef = await addDoc(collection(db, "mail"), {
      to: "sigpro219@gmail.com",
      tenantId: "zeticas",
      template: {
        name: "order_confirmation",
        data: {
          client: "CLIMART SAS",
          order_number: "WEB-2098",
          date: new Date().toLocaleDateString('es-CO'),
          total_amount: "212.000",
          items: [
            { name: "Zetas Griegas", quantity: 3, price: "25.000" },
            { name: "Antipasto Veggie", quantity: 2, price: "28.500" },
            { name: "Hummus de Garbanzo", quantity: 5, price: "16.000" }
          ]
        }
      },
      created_at: new Date().toISOString()
    });
    console.log(`Documento de correo encolado exitosamente con ID: ${docRef.id}`);
  } catch (e) {
    console.error("Error al encolar el correo:", e);
  }
}

testRealOrderEmail();
