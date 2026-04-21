import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";

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

async function fixGhostODPs() {
    const tenant = "delta";
    const odpsToFix = ["ODP-0012", "ODP-0014", "ODP-0016"];
    
    console.log(`--- Fixing ODPs in tenant: ${tenant} ---`);
    
    for (const odpNum of odpsToFix) {
        const q = query(collection(db, "tenants", tenant, "production_orders"), where("odp_number", "==", odpNum));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
            for (const d of snap.docs) {
                console.log(`Updating ${odpNum} (Doc ID: ${d.id})...`);
                await updateDoc(d.ref, {
                    status: "DONE",
                    completed_at: new Date().toISOString(),
                    inventory_synced: true,
                    updated_at: new Date().toISOString()
                });
            }
        } else {
            console.log(`${odpNum} not found.`);
        }
    }
    console.log("Done.");
}

fixGhostODPs();
