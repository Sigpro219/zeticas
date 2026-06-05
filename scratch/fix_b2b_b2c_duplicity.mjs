import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

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

async function normalizeClientSegments() {
    console.log("🚀 STARTING CLIENT SEGMENT NORMALIZATION");
    console.log("=========================================");
    
    const tenants = ["zeticas", "delta"]; // Normalize for both tenants if applicable
    
    for (const tenant of tenants) {
        console.log(`\n📂 Normalizing clients for tenant: ${tenant}...`);
        const colRef = collection(db, 'tenants', tenant, 'clients');
        
        let snapshot;
        try {
            snapshot = await getDocs(colRef);
        } catch (e) {
            console.log(`ℹ️ Tenant '${tenant}' clients collection not found or inaccessible.`);
            continue;
        }
        
        let updatedCount = 0;
        let conflictCount = 0;
        
        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const clientId = docSnap.id;
            
            const subType = data.subType;
            const sub_type = data.sub_type;
            
            // Check for conflict or missing field
            if (subType !== sub_type || subType === undefined || sub_type === undefined) {
                // Source of truth: sub_type (if present), else subType, else default to 'B2C'
                const finalType = sub_type || subType || 'B2C';
                
                if (subType && sub_type && subType !== sub_type) {
                    conflictCount++;
                    console.log(`⚠️ Conflict in client [${clientId}] (${data.name}): subType='${subType}' vs sub_type='${sub_type}'. Normalizing to '${finalType}'.`);
                }
                
                const clientDocRef = doc(db, 'tenants', tenant, 'clients', clientId);
                await updateDoc(clientDocRef, {
                    subType: finalType,
                    sub_type: finalType
                });
                updatedCount++;
            }
        }
        
        console.log(`✅ Tenant '${tenant}': Normalized ${updatedCount} clients (${conflictCount} conflicts resolved).`);
    }
    
    console.log("\n🎯 CLIENT SEGMENT NORMALIZATION COMPLETED SUCCESSFULLY.");
}

normalizeClientSegments().catch(console.error);
