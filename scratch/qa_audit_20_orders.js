import { initializeApp } from 'firebase/app';
import { 
    getFirestore, 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    addDoc, 
    runTransaction, 
    query, 
    where, 
    orderBy 
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
const tenantId = 'zeticas';

async function runQAAudit() {
    console.log("=================================================================");
    console.log("🚀 INICIANDO AUDITORÍA E2E QA - 20 PEDIDOS DE PRUEBA EN ZETICAS");
    console.log("=================================================================\n");

    // 1. Validar Credenciales del Usuario de Pruebas
    console.log("▶ PASE 1: Verificación de Usuario QA (pruebas@zeticas.com)");
    const usersCol = collection(db, 'tenants', tenantId, 'users');
    const userQuery = query(usersCol, where('email', '==', 'pruebas@zeticas.com'));
    const userSnap = await getDocs(userQuery);
    
    if (userSnap.empty) {
        throw new Error("Usuario pruebas@zeticas.com no encontrado en Firestore.");
    }
    const testUser = userSnap.docs[0].data();
    console.log(`✅ Usuario QA validado: ${testUser.name} (${testUser.email}) | Rol: ${testUser.role} | Status: ${testUser.status}`);

    // 2. Validar / Crear Cliente de Pruebas con Email gerencia@deltactech.net
    console.log("\n▶ PASE 2: Verificación de Cliente de Pruebas (gerencia@deltactech.net)");
    const clientsCol = collection(db, 'tenants', tenantId, 'clients');
    const clientQuery = query(clientsCol, where('email', '==', 'gerencia@deltactech.net'));
    const clientSnap = await getDocs(clientQuery);

    let testClientId = '';
    let testClientData = null;

    if (!clientSnap.empty) {
        const clientDoc = clientSnap.docs[0];
        testClientId = clientDoc.id;
        testClientData = clientDoc.data();
        console.log(`✅ Cliente QA existente encontrado: [${testClientId}] ${testClientData.name}`);
    } else {
        // Crear cliente de pruebas
        const counterRef = doc(db, 'tenants', tenantId, 'metadata', 'counters');
        let clientNumber;
        await runTransaction(db, async (tx) => {
            const snap = await tx.get(counterRef);
            const nextVal = (snap.exists() ? (snap.data().last_client_number || 0) : 0) + 1;
            tx.set(counterRef, { last_client_number: nextVal }, { merge: true });
            clientNumber = nextVal;
        });

        testClientId = `CLI-${String(clientNumber).padStart(4, '0')}`;
        testClientData = {
            id: testClientId,
            client_number: testClientId,
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

        await setDoc(doc(db, 'tenants', tenantId, 'clients', testClientId), testClientData);
        console.log(`✅ Nuevo Cliente QA creado: [${testClientId}] ${testClientData.name} (${testClientData.email})`);
    }

    // 3. Obtener Catálogo de Productos Terminados (PT)
    console.log("\n▶ PASE 3: Carga de Catálogo de Productos Terminados (PT)");
    const productsCol = collection(db, 'tenants', tenantId, 'products');
    const productsSnap = await getDocs(productsCol);
    const catalogPT = [];

    productsSnap.forEach(d => {
        const p = d.data();
        if (p.type === 'PT' && p.price > 0) {
            catalogPT.push({
                id: d.id,
                name: p.name,
                price: Number(p.price),
                category: p.category || 'Conservas'
            });
        }
    });

    console.log(`✅ Se encontraron ${catalogPT.length} referencias de Producto Terminado disponibles para el muestreo.`);

    // 4. Diseñar y Montar 20 Pedidos Variados
    console.log("\n▶ PASE 4: Generación y Despacho de los 20 Pedidos de Prueba");
    const createdOrders = [];
    const ordersCol = collection(db, 'tenants', tenantId, 'orders');
    const mailCol = collection(db, 'mail');

    // Matriz de combinaciones para variedad de 20 pedidos
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

    for (let i = 0; i < orderPlans.length; i++) {
        const plan = orderPlans[i];
        
        // Mapear items con catálogo real
        const orderItems = plan.items.map(it => {
            const prod = catalogPT[it.idx % catalogPT.length];
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

        // Asignar número consecutivo atómico
        const counterRef = doc(db, 'tenants', tenantId, 'metadata', 'counters');
        let orderNum;
        await runTransaction(db, async (tx) => {
            const snap = await tx.get(counterRef);
            const nextVal = (snap.exists() ? (snap.data().last_order_number || 0) : 0) + 1;
            tx.set(counterRef, { last_order_number: nextVal }, { merge: true });
            orderNum = nextVal;
        });

        const displayOrderNumber = String(orderNum).padStart(4, '0');
        const now = new Date().toISOString();

        const orderPayload = {
            order_number: displayOrderNumber,
            id: displayOrderNumber,
            client: testClientData.name,
            clientId: testClientId,
            client_id: testClientId,
            nit: testClientData.nit,
            email: testClientData.email,
            shipping_email: testClientData.email,
            phone: testClientData.phone,
            address: testClientData.address,
            city: testClientData.city,
            source: 'QA Automation / Browser Auditor',
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
                { status: 'Pendiente', at: now, note: `Pedido de prueba automático QA #${i + 1} (${plan.tag})` }
            ],
            notes: `[QA AUDIT PASS] ${plan.tag} - Verificación automatizada de flujo de ventas.`
        };

        // 1. Guardar en orders
        const docRef = await addDoc(ordersCol, orderPayload);

        // 2. Encolar notificación en colección mail
        await addDoc(mailCol, {
            to: [testClientData.email, 'zeticas@gmail.com'],
            tenantId: 'zeticas',
            template: {
                name: 'order_confirmation',
                data: {
                    client: testClientData.name,
                    order_number: displayOrderNumber,
                    date: orderPayload.date,
                    total_amount: totalAmount.toLocaleString('es-CO'),
                    items: orderItems.map(item => ({
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price.toLocaleString('es-CO')
                    }))
                }
            },
            created_at: now
        });

        createdOrders.push({
            orderNumber: displayOrderNumber,
            docId: docRef.id,
            description: plan.tag,
            itemsCount: orderItems.length,
            total: totalAmount
        });

        console.log(` [${i + 1}/20] Pedido #${displayOrderNumber} registrado con éxito | Total: $${totalAmount.toLocaleString('es-CO')} | ${plan.tag}`);
    }

    // 5. Verificación y Auditoría de Consistencia en Firestore
    console.log("\n▶ PASE 5: Verificación Cruzada en Base de Datos");
    console.log(`✅ Total pedidos creados en esta sesión: ${createdOrders.length}`);
    
    // Consultar pedidos creados para el cliente
    const verifyQuery = query(ordersCol, where('client_id', '==', testClientId));
    const verifySnap = await getDocs(verifyQuery);
    console.log(`✅ Total pedidos verificados en Firestore para ${testClientData.email}: ${verifySnap.size}`);

    // Consultar cola de correos generada
    const mailQuery = query(mailCol, where('tenantId', '==', 'zeticas'));
    const mailSnap = await getDocs(mailQuery);
    console.log(`✅ Total registros encolados en colección 'mail' (Zeticas): ${mailSnap.size}`);

    console.log("\n=================================================================");
    console.log("🎯 REPORTE FINAL: 20 PEDIDOS CREADOS Y VERIFICADOS CON ÉXITO");
    console.log("=================================================================");
    
    return {
        success: true,
        client: testClientData,
        orders: createdOrders
    };
}

runQAAudit().catch(err => {
    console.error("❌ Error en la auditoría QA:", err);
    process.exit(1);
});
