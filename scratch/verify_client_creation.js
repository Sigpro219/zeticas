import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDoc, doc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAeHMdtEt04RtYarEx_h19gcCUzsIUUpSc",
    authDomain: "delta-core-cloud-45ea0.firebaseapp.com",
    projectId: "delta-core-cloud-45ea0",
    storageBucket: "delta-core-cloud-45ea0.firebasestorage.app",
    messagingSenderId: "378250949856",
    appId: "1:378250949856:web:7a0ce44de64bc9a5becc85",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function verifyClientSchema() {
    console.log("🚀 Simulating Quick Client Creation...");
    const isNit = true;
    const clientPayload = {
        name: "VERIFICATION CLIENT NIT",
        nit: "901874993-7",
        phone: "3001234567",
        address: "Calle Falsa 123",
        city: "Guasca, Cundinamarca",
        email: "verif@client.com",
        id_type: isNit ? 'NIT' : 'Cédula de ciudadanía',
        type: isNit ? 'Jurídica' : 'Natural',
        sub_type: isNit ? 'B2B' : 'B2C',
        source: 'Manual',
        status: 'Active',
        balance: 0,
        audit_status: 'pending'
    };

    console.log("1. Writing to tenants/zeticas/clients subcollection...");
    const colRef = collection(db, "tenants", "zeticas", "clients");
    const docRef = await addDoc(colRef, {
        ...clientPayload,
        created_at: new Date().toISOString()
    });
    console.log(`✅ Document created with ID: ${docRef.id}`);

    console.log("2. Reading back and auditing properties...");
    const readDoc = await getDoc(doc(db, "tenants", "zeticas", "clients", docRef.id));
    const data = readDoc.data();

    const expectedFields = [
        "name", "nit", "phone", "address", "city", "email",
        "id_type", "type", "sub_type", "source", "status", "balance",
        "audit_status", "created_at"
    ];

    let missing = 0;
    expectedFields.forEach(f => {
        if (data[f] === undefined) {
            console.error(`❌ Field '${f}' is missing!`);
            missing++;
        } else {
            console.log(`✔ Field '${f}': ${JSON.stringify(data[f])}`);
        }
    });

    if (missing === 0) {
        console.log("🎉 SUCCESS: All fields are correctly populated in the database!");
    } else {
        console.error(`❌ FAILURE: ${missing} fields are missing!`);
    }

    console.log("3. Cleaning up verification document...");
    await deleteDoc(docRef);
    console.log("✅ Cleanup completed.");
}

verifyClientSchema().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
