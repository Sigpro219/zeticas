
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc, query, where } = require('firebase/firestore');
require('dotenv').config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrate() {
  console.log("Iniciando migración de estados...");
  const q = query(collection(db, "orders"), where("status", "==", "Pagado"));
  const snap = await getDocs(q);
  
  let count = 0;
  for (const document of snap.docs) {
    const orderRef = doc(db, "orders", document.id);
    await updateDoc(orderRef, {
      status: "Pendiente"
    });
    console.log(`Pedido ${document.data().id} actualizado a "Pendiente"`);
    count++;
  }
  
  console.log(`Migración completada. ${count} pedidos actualizados.`);
  process.exit();
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
