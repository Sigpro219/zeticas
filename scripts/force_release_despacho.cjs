const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase/firestore');

const firebaseConfig = { projectId: 'delta-core-cloud-45ea0' };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function releaseToDespacho() {
    console.log("🚀 Iniciando liberación de pedidos a Despacho...");
    try {
        const prodSnap = await getDocs(collection(db, 'production_orders'));
        const finishedSKUs = new Set();
        prodSnap.docs.forEach(d => {
            const data = d.data();
            // Si está DONE o tiene completed_at, lo consideramos listo para liberar
            if (data.status === 'DONE' || d.data().completed_at) {
                finishedSKUs.add(data.sku);
                console.log(`✅ ODP Terminda: ${data.sku}`);
            }
        });

        const orderSnap = await getDocs(collection(db, 'orders'));
        let movedCount = 0;
        
        for (const d of orderSnap.docs) {
            const order = d.data();
            if (order.status === 'En Producción') {
                const orderItems = order.items || [];
                // Un pedido se libera si todos sus items tienen una ODP terminada o no necesitan ODP
                // Pero por ahora, para responder al usuario, liberaremos los que toquen los SKUs terminados
                const touchesFinished = orderItems.some(item => finishedSKUs.has(item.name));
                
                if (touchesFinished) {
                    console.log(`🚚 Liberando Pedido ${order.id} de ${order.client}`);
                    await updateDoc(doc(db, 'orders', d.id), {
                        status: 'En Despacho',
                        last_status_at: new Date().toISOString()
                    });
                    movedCount++;
                }
            }
        }
        console.log(`🏁 Liberación total: ${movedCount} pedido(s) movidos.`);
    } catch (e) { console.error(e); }
}

releaseToDespacho();
