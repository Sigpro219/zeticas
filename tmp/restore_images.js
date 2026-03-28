import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAeHMdtEt04RtYarEx_h19gcCUzsIUUpSc",
  authDomain: "delta-core-cloud-45ea0.firebaseapp.com",
  projectId: "delta-core-cloud-45ea0",
  storageBucket: "delta-core-cloud-45ea0.firebasestorage.app",
  messagingSenderId: "378250949856",
  appId: "1:378250949856:web:7a0ce44de64bc9a5becc85",
};

const products = [
    { nombre: "Vinagreta Migalaba", imagen_url: "https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/products/Vinagreta-1-1024x1024.png" },
    { nombre: "Dip Alcachofas", imagen_url: "https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/products/DIP-Alcachofa-1-1024x1024.png" },
    { nombre: "Antipasto Atún Ahumado", imagen_url: "https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/products/Antipasto-Tuna-2-1024x1024.png" },
    { nombre: "Jalea Pimentón y Ají", imagen_url: "https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/products/Pimenton-Aji-1-1024x1024.png" },
    { nombre: "Mermelada Ruibarbo & Fresa", imagen_url: "https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/products/Ruibarbo-Fresa-1-1024x1024.png" },
    { nombre: "Dulce Guayaba y Albahaca", imagen_url: "https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/products/Guayaba-Albahaca-1-1024x1024.png" },
    { nombre: "Dulce Pera y Jengibre", imagen_url: "https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/products/Pera-Jengibre-1-1024x1024.png" },
    { nombre: "Dulce Papayuela y Limonaria", imagen_url: "https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/products/Papayuela-Limonaria-1-1024x1024.png" },
    { nombre: "Dulce Silvia", imagen_url: "https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/products/Dulce-silvia-1-1024x1024.png" },
    { nombre: "Pesto Kale", imagen_url: "https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/products/Pesto-Kale-1-1024x1024.png" },
    { nombre: "Zetas Griegas", imagen_url: "https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/products/Zetas-Griegas-1-1024x1024.png" },
    { nombre: "Berenjenas para untar", imagen_url: "https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/products/Berenjena-1-1024x1024.png" },
    { nombre: "Habas para untar", imagen_url: "https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/products/Habas-1-1024x1024.png" },
    { nombre: "Hummus de Garbanzo", imagen_url: "https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/products/Humus-Garbanzo-1-1024x1024.png" },
    { nombre: "Berenjena Toscana", imagen_url: "https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/products/Berenjena-Toscana-1-1024x1024.png" },
    { nombre: "Antipasto Veggie", imagen_url: "https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/products/Antipasto-Vegetales-1024x1024.png" }
];

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrate() {
    console.log("Starting migration...");
    const querySnapshot = await getDocs(collection(db, "products"));
    for (const d of querySnapshot.docs) {
        const data = d.data();
        const match = products.find(p => p.nombre.toLowerCase() === data.name.toLowerCase());
        if (match) {
            console.log(`Updating ${data.name}...`);
            await updateDoc(doc(db, "products", d.id), {
                image_url: match.imagen_url
            });
        }
    }
    console.log("Migration finished.");
}

migrate();
