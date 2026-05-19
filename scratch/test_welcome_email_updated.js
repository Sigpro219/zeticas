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

async function testWelcomeEmail() {
  console.log("Encolando correo de prueba de bienvenida al Círculo Zeticas...");
  try {
    const docRef = await addDoc(collection(db, "mail"), {
      to: "sigpro219@gmail.com",
      tenantId: "zeticas",
      template: {
        name: "welcome_subscription",
        data: {
          name: "German Higuera",
          plan: "12 Meses",
          frequency: "Quincenal",
          subtotal: "551.000",
          savings: "49.100",
          shippingCost: "0",
          total: "501.900",
          hasFreeShipping: true,
          items: [
            { name: "Zetas Griegas", quantity: 5, price: "150.000" },
            { name: "Antipasto Veggie", quantity: 5, price: "142.500" },
            { name: "Dulce Papayuela & limonaria", quantity: 6, price: "126.000" },
            { name: "Hummus de Garbanzo", quantity: 5, price: "132.500" }
          ]
        }
      },
      created_at: new Date().toISOString()
    });
    console.log(`Documento de correo de bienvenida encolado exitosamente con ID: ${docRef.id}`);
  } catch (e) {
    console.error("Error al encolar el correo:", e);
  }
}

testWelcomeEmail();
