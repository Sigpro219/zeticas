import { initializeApp } from 'firebase/app';
import { 
    getFirestore, 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    addDoc, 
    deleteDoc,
    updateDoc,
    runTransaction, 
    query, 
    where 
} from 'firebase/firestore';
import dotenv from 'dotenv';

dotenv.config();

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

async function cleanZeticasAndPopulateDelta() {
    console.log("=================================================================");
    console.log("🧹 1. LIMPIEZA COMPLETA DEL TENANT 'zeticas'");
    console.log("=================================================================\n");

    // 1.1 Eliminar los 20 pedidos de prueba en tenants/zeticas/orders
    const zeticasOrdersCol = collection(db, 'tenants', 'zeticas', 'orders');
    const qZeticasOrders = query(zeticasOrdersCol, where('client_id', '==', 'CLI-0032'));
    const snapOrders = await getDocs(qZeticasOrders);
    
    console.log(`Encontrados ${snapOrders.size} pedidos QA en 'zeticas' para eliminar.`);
    for (const d of snapOrders.docs) {
        console.log(` - Eliminando pedido zeticas #${d.data().order_number} (${d.id})`);
        await deleteDoc(d.ref);
    }

    // 1.2 Eliminar cliente de prueba CLI-0032 en tenants/zeticas/clients
    const clientRef = doc(db, 'tenants', 'zeticas', 'clients', 'CLI-0032');
    const clientSnap = await getDoc(clientRef);
    if (clientSnap.exists()) {
        console.log(" - Eliminando cliente de prueba CLI-0032 en 'zeticas'");
        await deleteDoc(clientRef);
    }

    // 1.3 Restaurar contadores en tenants/zeticas/metadata/counters
    const zeticasCounterRef = doc(db, 'tenants', 'zeticas', 'metadata', 'counters');
    await updateDoc(zeticasCounterRef, {
        last_order_number: 25,
        last_client_number: 31
    });
    console.log("✅ Contadores de 'zeticas' restaurados: last_order_number = 25, last_client_number = 31.");

    // 1.4 Limpiar correos encolados de esta prueba en 'mail'
    const mailCol = collection(db, 'mail');
    const qMail = query(mailCol, where('to', 'array-contains', 'gerencia@deltactech.net'));
    const mailSnap = await getDocs(qMail);
    console.log(`Encontrados ${mailSnap.size} correos de prueba en 'mail' para eliminar.`);
    for (const d of mailSnap.docs) {
        if (d.data().tenantId === 'zeticas') {
            await deleteDoc(d.ref);
        }
    }

    console.log("\n✨ ¡TENANT 'zeticas' TOTALMENTE LIMPIO Y EN SU ESTADO ORIGINAL!\n");

    console.log("=================================================================");
    console.log("🚀 2. CREACIÓN DE LOS 20 PEDIDOS DE PRUEBA EN EL TENANT 'delta'");
    console.log("=================================================================\n");

    const targetTenant = 'delta';

    // 2.1 Verificar / Crear Cliente QA en 'delta'
    const deltaClientsCol = collection(db, 'tenants', targetTenant, 'clients');
    const deltaClientQuery = query(deltaClientsCol, where('email', '==', 'gerencia@deltactech.net'));
    const deltaClientSnap = await getDocs(deltaClientQuery);

    let deltaClientId = '';
    let deltaClientData = null;

    if (!deltaClientSnap.empty) {
        const docFound = deltaClientSnap.docs[0];
        deltaClientId = docFound.id;
        deltaClientData = docFound.data();
        console.log(`✅ Cliente QA existente en 'delta': [${deltaClientId}] ${deltaClientData.name}`);
    } else {
        const deltaCounterRef = doc(db, 'tenants', targetTenant, 'metadata', 'counters');
        let cNum;
        await runTransaction(db, async (tx) => {
            const snap = await tx.get(deltaCounterRef);
            const nextVal = (snap.exists() ? (snap.data().last_client_number || 0) : 0) + 1;
            tx.set(deltaCounterRef, { last_client_number: nextVal }, { merge: true });
            cNum = nextVal;
        });

        deltaClientId = `CLI-${String(cNum).padStart(4, '0')}`;
        deltaClientData = {
            id: deltaClientId,
            client_number: deltaClientId,
            name: "QA DeltaTech Testing Corp",
            contactName: "Gerencia DeltaTech",
            email: "gerencia@deltactech.net",
            phone: "3105559988",
            nit: "901999888-7",
            address: "Carrera 7 # 116-50 Torre Cundinamarca Of 802",
            city: "Bogotá (Bogotá D.C.)",
            type: "Empresa",
            status: "Active",
            created_at: new Date().toISOString()
        };

        await setDoc(doc(db, 'tenants', targetTenant, 'clients', deltaClientId), deltaClientData);
        console.log(`✅ Cliente QA creado en 'delta': [${deltaClientId}] ${deltaClientData.name}`);
    }

    // 2.2 Obtener catálogo de PT de 'delta'
    const deltaProductsCol = collection(db, 'tenants', targetTenant, 'products');
    const deltaProductsSnap = await getDocs(deltaProductsCol);
    const catalogPTDelta = [];

    deltaProductsSnap.forEach(d => {
        const p = d.data();
        if (p.type === 'PT' && Number(p.price) > 0) {
            catalogPTDelta.push({
                id: d.id,
                name: p.name,
                price: Number(p.price),
                category: p.category || 'General'
            });
        }
    });

    console.log(`✅ Se encontraron ${catalogPTDelta.length} referencias de PT en 'delta' para muestreo.`);

    // 2.3 Montar los 20 pedidos en 'delta'
    const deltaOrdersCol = collection(db, 'tenants', targetTenant, 'orders');
    const orderPlans = [
        { items: [{ idx: 0, qty: 3 }], shipping: 0, tag: "Antipasto Veggie x3" },
        { items: [{ idx: 1, qty: 2 }, { idx: 3, qty: 1 }], shipping: 13500, tag: "Zetas Griegas + Albahaca" },
        { items: [{ idx: 2, qty: 4 }], shipping: 0, tag: "Vinagreta x4" },
        { items: [{ idx: 4, qty: 2 }, { idx: 5, qty: 2 }], shipping: 0, tag: "Sopa Cosecha + Dulce Papayuela" },
        { items: [{ idx: 6, qty: 5 }], shipping: 0, tag: "Antipasto Tuna x5" },
        { items: [{ idx: 7, qty: 3 }, { idx: 8, qty: 1 }], shipping: 13500, tag: "Hummus + Mermelada Agraz" },
        { items: [{ idx: 9, qty: 2 }], shipping: 13500, tag: "Habas para untar x2" },
        { items: [{ idx: 10, qty: 3 }, { idx: 11, qty: 2 }], shipping: 0, tag: "Dip Alcachofas + Sopa Alcachofa" },
        { items: [{ idx: 12, qty: 4 }], shipping: 0, tag: "Dulce Pera & Jengibre x4" },
        { items: [{ idx: 13, qty: 3 }, { idx: 14, qty: 2 }], shipping: 0, tag: "Dulce Silvia + Pesto Kale" },
        { items: [{ idx: 15, qty: 2 }, { idx: 0, qty: 1 }], shipping: 13500, tag: "Berenjena Toscana + Veggie" },
        { items: [{ idx: 16, qty: 3 }], shipping: 13500, tag: "Mermelada Ruibarbo Fresa x3" },
        { items: [{ idx: 17, qty: 2 }, { idx: 6, qty: 2 }], shipping: 0, tag: "Berenjenas Untar + Tuna" },
        { items: [{ idx: 18, qty: 4 }], shipping: 0, tag: "Sopa Cosecha 1200g x4" },
        { items: [{ idx: 19, qty: 2 }, { idx: 7, qty: 2 }], shipping: 13500, tag: "Jalea Ají Amazónico + Hummus" },
        { items: [{ idx: 1, qty: 1 }, { idx: 10, qty: 2 }, { idx: 14, qty: 1 }], shipping: 0, tag: "Combo Degustación Gourmet" },
        { items: [{ idx: 3, qty: 3 }, { idx: 12, qty: 3 }], shipping: 0, tag: "Dúo Dulces Tradicionales" },
        { items: [{ idx: 0, qty: 2 }, { idx: 6, qty: 2 }, { idx: 15, qty: 2 }], shipping: 0, tag: "Trío Antipastos & Berenjena" },
        { items: [{ idx: 7, qty: 4 }, { idx: 9, qty: 3 }], shipping: 0, tag: "Pack Proteína Untables" },
        { items: [{ idx: 8, qty: 2 }, { idx: 16, qty: 2 }, { idx: 19, qty: 2 }], shipping: 0, tag: "Selección Mermeladas & Jaleas" }
    ];

    const createdDeltaOrders = [];

    for (let i = 0; i < orderPlans.length; i++) {
        const plan = orderPlans[i];
        const orderItems = plan.items.map(it => {
            const prod = catalogPTDelta[it.idx % catalogPTDelta.length];
            return {
                id: prod.id,
                name: prod.name,
                price: prod.price,
                quantity: it.qty,
                total: prod.price * it.qty
            };
        });

        const subtotal = orderItems.reduce((acc, it) => acc + it.total, 0);
        const shippingCost = plan.shipping;
        const totalAmount = subtotal + shippingCost;

        const deltaCounterRef = doc(db, 'tenants', targetTenant, 'metadata', 'counters');
        let orderNum;
        await runTransaction(db, async (tx) => {
            const snap = await tx.get(deltaCounterRef);
            const nextVal = (snap.exists() ? (snap.data().last_order_number || 0) : 0) + 1;
            tx.set(deltaCounterRef, { last_order_number: nextVal }, { merge: true });
            orderNum = nextVal;
        });

        const displayOrderNumber = String(orderNum).padStart(4, '0');
        const now = new Date().toISOString();

        const orderPayload = {
            order_number: displayOrderNumber,
            id: displayOrderNumber,
            client: deltaClientData.name,
            clientId: deltaClientId,
            client_id: deltaClientId,
            nit: deltaClientData.nit,
            email: deltaClientData.email,
            shipping_email: deltaClientData.email,
            phone: deltaClientData.phone,
            address: deltaClientData.address,
            city: deltaClientData.city,
            source: 'QA Automation / Browser Auditor (Delta)',
            channel: 'Web',
            status: 'Pendiente',
            items: orderItems,
            subtotal: subtotal,
            shipping: shippingCost,
            amount: totalAmount,
            total_amount: totalAmount,
            date: new Date().toLocaleDateString('es-CO'),
            created_at: now,
            status_history: [
                { status: 'Pendiente', at: now, note: `Pedido QA Delta #${i + 1} (${plan.tag})` }
            ],
            notes: `[DELTA QA AUDIT] ${plan.tag}`
        };

        const docRef = await addDoc(deltaOrdersCol, orderPayload);

        createdDeltaOrders.push({
            orderNumber: displayOrderNumber,
            docId: docRef.id,
            description: plan.tag,
            itemsCount: orderItems.length,
            total: totalAmount
        });

        console.log(` [${i + 1}/20] Pedido Delta #${displayOrderNumber} registrado | Total: $${totalAmount.toLocaleString('es-CO')} | ${plan.tag}`);
    }

    console.log("\n=================================================================");
    console.log("🎯 REPORTE FINAL: OPERACIÓN COMPLETADA CON ÉXITO");
    console.log("=================================================================");
    console.log(`- Tenant 'zeticas': Totalmente limpio (pedidos eliminados, contadores restaurados).`);
    console.log(`- Tenant 'delta': 20 pedidos creados y verificados (#${createdDeltaOrders[0].orderNumber} al #${createdDeltaOrders[createdDeltaOrders.length - 1].orderNumber}).`);
}

cleanZeticasAndPopulateDelta().catch(err => {
    console.error("❌ Error en la operación:", err);
    process.exit(1);
});
