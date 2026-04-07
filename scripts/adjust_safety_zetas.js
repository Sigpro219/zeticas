import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAeHMdtEt04RtYarEx_h19gcCUzsIUUpSc",
  authDomain: "delta-core-cloud-45ea0.firebaseapp.com",
  projectId: "delta-core-cloud-45ea0",
  storageBucket: "delta-core-cloud-45ea0.firebasestorage.app",
  messagingSenderId: "378250949856",
  appId: "1:378250949856:web:7a0ce44de64bc9a5becc85",
  measurementId: "G-Q1BXE4WVZP"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const q = query(collection(db, "products"), where("name", "==", "Zetas Griegas"));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
      console.log("No product found with name 'Zetas Griegas'");
      return;
  }

  for (const docSnap of querySnapshot.docs) {
      console.log(`Updating product: ${docSnap.id} (Zetas Griegas)...`);
      await updateDoc(doc(db, "products", docSnap.id), {
          min_stock_level: 0,
          safety: 0,
          reorder_point: 0
      });
  }
  console.log("Security levels adjusted to 0.");
}

run().catch(console.error);
