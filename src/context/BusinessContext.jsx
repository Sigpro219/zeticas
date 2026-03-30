import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, getDocs, updateDoc, deleteDoc, addDoc, where, increment, setDoc } from 'firebase/firestore';
import { products as masterProducts } from '../data/products';

export const CAMPAIGN_PRESETS = {
    'madre': {
        id: 'madre',
        name: 'Día de la Madre',
        primaryColor: '#FDF8F6',
        accentColor: '#D4785A',
        title: 'Para quien nos dio el gusto por lo auténtico',
        subtitle: 'Descubre nuestra selección artesanal diseñada para celebrar a mamá.',
    },
    'mujer': {
        id: 'mujer',
        name: 'Día de la Mujer',
        primaryColor: '#F8F4FF',
        accentColor: '#7C3AED',
        title: 'Artesanía con Fuerza y Propósito',
        subtitle: 'Honramos el talento y la dedicación de las mujeres en cada frasco.',
    },
    'amor': {
        id: 'amor',
        name: 'Amor y Amistad',
        primaryColor: '#FFF1F2',
        accentColor: '#E11D48',
        title: 'El sabor de compartir',
        subtitle: 'Regalos que combinan con el cariño de los nuestros.',
    },
    'navidad': {
        id: 'navidad',
        name: 'Navidad Zeticas',
        primaryColor: '#F0FDF4',
        accentColor: '#065F46',
        title: 'Tradiciones que se comparten en la mesa',
        subtitle: 'Regala el sabor de nuestra tierra esta navidad.',
    },
    'halloween': {
        id: 'halloween',
        name: 'Halloween / Otoño',
        primaryColor: '#FFF7ED',
        accentColor: '#C2410C',
        title: 'Cosechas de Temporada',
        subtitle: 'Sabores otoñales y especiados para noches acogedoras.',
    }
};

const BusinessContext = createContext();

export const BusinessProvider = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [recipes, setRecipes] = useState({});
    const [providers, setProviders] = useState([]);
    const [orders, setOrders] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [productionOrders, setProductionOrders] = useState([]);
    const [banks, setBanks] = useState([]);
    const [clients, setClients] = useState([]);
    const [siteContent, setSiteContent] = useState({});
    const [leads, setLeads] = useState([]);
    const [users, setUsers] = useState([]);
    const [units, setUnits] = useState([]);
    const [unitConversions, setUnitConversions] = useState({});
    const [lastUpdate, setLastUpdate] = useState(null);

    const [taxSettings, setTaxSettings] = useState({
        iva: 19,
        retefuente: 2.5,
        ica: 9.6,
        renta: 35
    });

    const refreshData = useCallback(async () => {
        // Since we are using onSnapshot, refreshData might be redundant for some collections,
        // but we'll keep it for bulk loads or initial state.
    }, []);

    useEffect(() => {
        setLoading(true);

        // Subscriptions to Firestore Collections
        const unsubItems = onSnapshot(collection(db, 'products'), (snapshot) => {
            const synchronizedItems = snapshot.docs.map(doc => {
                const p = doc.data();
                let price = Number(p.price) || 0;
                const pName = p.name ? String(p.name) : '';
                
                if (price === 0 && pName) {
                    const normalizedDbName = pName.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const manualMappings = {
                        'vinagreta': 'vinagretamigalaba',
                        'antipastotuna': 'antipastoatunahumado',
                        'hummusdegarbanzo': 'hummusdegarbanzo'
                    };
                    const targetName = manualMappings[normalizedDbName] || normalizedDbName;
                    const masterMatch = masterProducts.find(mp =>
                        String(mp.nombre || '').toLowerCase().replace(/[^a-z0-9]/g, '') === targetName
                    );
                    if (masterMatch) price = Number(masterMatch.precio) || 0;
                }
                return {
                    id: doc.id,
                    ...p,
                    name: pName,
                    type: p.type === 'PT' ? 'product' : 'material',
                    initial: Number(p.stock) || 0,
                    safety: Number(p.min_stock_level) || 0,
                    avgCost: Number(p.cost) || 0,
                    price: price
                };
            });
            setItems(synchronizedItems);
            setLoading(false);
        }, (error) => console.error("Snapshot Products Error:", error));

        const unsubClients = onSnapshot(query(collection(db, 'clients'), orderBy('created_at', 'desc')), (snapshot) => {
            setClients(snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().created_at
            })));
        }, (error) => console.error("Snapshot Clients Error:", error));

        const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('created_at', 'desc')), (snapshot) => {
            setOrders(snapshot.docs.map(doc => {
                const o = doc.data();
                // Safe date parsing for Firestore Timestamps or ISO strings
                const rawCreatedAt = o.created_at;
                const isoDate = rawCreatedAt?.toDate ? rawCreatedAt.toDate().toISOString() : (typeof rawCreatedAt === 'string' ? rawCreatedAt : new Date().toISOString());
                
                return {
                    id: o.order_number || doc.id,
                    dbId: doc.id,
                    ...o,
                    amount: Number(o.total_amount || o.amount || 0),
                    date: isoDate.split('T')[0],
                    realDate: isoDate,
                };
            }));
        }, (error) => console.error("Snapshot Orders Error:", error));

        const unsubRecipes = onSnapshot(collection(db, 'recipes'), (snapshot) => {
            const groupedRecipes = {};
            snapshot.docs.forEach(doc => {
                const r = doc.data();
                const fgId = r.finished_good_id; 
                if (!fgId) return;
                if (!groupedRecipes[fgId]) groupedRecipes[fgId] = [];
                groupedRecipes[fgId].push({
                    rm_id: r.raw_material_id, 
                    name: r.raw_material_name, 
                    sku: r.raw_material_sku, 
                    qty: r.quantity_required,
                    unit: r.unit || 'und', 
                    finished_good_id: r.finished_good_id,
                    yield_quantity: Number(r.yield_quantity) || 1
                });
            });
            setRecipes(groupedRecipes);
        }, (error) => console.error("Snapshot Recipes Error:", error));

        const unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
            setProviders(snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })));
        }, (error) => console.error("Snapshot Suppliers Error:", error));

        const unsubPurchases = onSnapshot(query(collection(db, 'purchase_orders'), orderBy('created_at', 'desc')), (snapshot) => {
            setPurchaseOrders(snapshot.docs.map(doc => {
                const p = doc.data();
                const rawCreatedAt = p.created_at;
                const isoDate = rawCreatedAt?.toDate ? rawCreatedAt.toDate().toISOString() : (typeof rawCreatedAt === 'string' ? rawCreatedAt : '');
                return {
                    id: p.id || doc.id,
                    dbId: doc.id,
                    providerName: p.provider_name || p.providerName || 'Proveedor',
                    providerId: p.provider_id || p.providerId,
                    date: p.order_date || p.date || isoDate.split('T')[0],
                    total: Number(p.total_amount || p.total_cost || 0),
                    status: p.status || 'Enviada',
                    paymentStatus: p.payment_status || p.paymentStatus || 'Pendiente',
                    relatedOrders: p.related_orders || (p.associated_orders ? p.associated_orders.split(', ') : []),
                    items: p.items || [],
                    realDate: isoDate
                };
            }));
        }, (error) => console.error("Snapshot Purchases Error:", error));

        const unsubExpenses = onSnapshot(query(collection(db, 'expenses'), orderBy('expense_date', 'desc')), (snapshot) => {
            setExpenses(snapshot.docs.map(doc => ({
                id: doc.id, ...doc.data()
            })));
        }, (error) => console.error("Snapshot Expenses Error:", error));

        const unsubBanks = onSnapshot(collection(db, 'banks'), (snapshot) => {
            setBanks(snapshot.docs.map(doc => ({
                id: doc.id, ...doc.data()
            })));
        }, (error) => console.error("Snapshot Banks Error:", error));

        const unsubCMS = onSnapshot(collection(db, 'site_content'), (snapshot) => {
            const formattedContent = {};
            snapshot.docs.forEach(doc => {
                const c = doc.data();
                if (!formattedContent[c.section]) formattedContent[c.section] = {};
                formattedContent[c.section][c.key] = c.content;
            });
            setSiteContent(formattedContent);
        }, (error) => console.error("Snapshot CMS Error:", error));

        const unsubProd = onSnapshot(collection(db, 'production_orders'), (snapshot) => {
            setProductionOrders(snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })));
        }, (error) => console.error("Snapshot Production Error:", error));

        const unsubLeads = onSnapshot(query(collection(db, 'leads'), orderBy('created_at', 'desc')), (snapshot) => {
            setLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error("Snapshot Leads Error:", error));

        const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error("Snapshot Users Error:", error));

        const unsubUnits = onSnapshot(collection(db, 'units'), (snapshot) => {
            setUnits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error("Snapshot Units Error:", error));

        const unsubConversions = onSnapshot(collection(db, 'unit_conversions'), (snapshot) => {
            const convs = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (!convs[data.from]) convs[data.from] = {};
                convs[data.from][data.to] = data.factor;
            });
            setUnitConversions(convs);
        }, (error) => console.error("Snapshot Conversions Error:", error));

        setLastUpdate(new Date().toLocaleString('es-CO', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        }));

        return () => {
            unsubItems();
            unsubClients();
            unsubOrders();
            unsubRecipes();
            unsubSuppliers();
            unsubPurchases();
            unsubExpenses();
            unsubBanks();
            unsubCMS();
            unsubProd();
            unsubLeads();
            unsubUsers();
            unsubUnits();
            unsubConversions();
        };
    }, []);

    const addClient = useCallback(async (clientData) => {
        try {
            const q = query(collection(db, 'clients'), where('nit', '==', clientData.nit.trim()));
            const existing = await getDocs(q);
            if (!existing.empty) {
                throw new Error(`Ya existe un cliente (${existing.docs[0].data().name}) con este NIT: ${clientData.nit}`);
            }

            const docRef = await addDoc(collection(db, 'clients'), {
                ...clientData,
                status: 'Active',
                created_at: new Date().toISOString()
            });
            return { success: true, id: docRef.id };
        } catch (err) {
            console.error("Error adding client:", err);
            return { success: false, error: err.message };
        }
    }, []);

    const addOrder = useCallback(async (order) => {
        try {
            const docRef = await addDoc(collection(db, 'orders'), {
                ...order,
                created_at: new Date().toISOString()
            });
            return { success: true, id: docRef.id };
        } catch (err) {
            console.error("Error adding order:", err);
            return { success: false, error: err.message };
        }
    }, []);

    const deleteClient = useCallback(async (clientId) => {
        try {
            await deleteDoc(doc(db, 'clients', clientId));
            return { success: true };
        } catch (err) {
            console.error("Error deleting client:", err);
            return { success: false, error: err.message };
        }
    }, []);

    const updateClient = useCallback(async (clientId, payload) => {
        try {
            await updateDoc(doc(db, 'clients', clientId), payload);
            return { success: true };
        } catch (err) {
            console.error("Error updating client:", err);
            return { success: false, error: err.message };
        }
    }, []);

    const deleteOrders = useCallback(async (ids) => {
        try {
            const idArray = Array.isArray(ids) ? ids : [ids];
            const promises = idArray.map(id => deleteDoc(doc(db, 'orders', id)));
            await Promise.all(promises);
            return { success: true };
        } catch (err) {
            console.error("Error deleting orders:", err);
            return { success: false, error: err.message };
        }
    }, []);

    const updateSiteContent = useCallback(async (section, key, content) => {
        try {
            const q = query(collection(db, 'site_content'), where('section', '==', section), where('key', '==', key));
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                await addDoc(collection(db, 'site_content'), { section, key, content });
            } else {
                await updateDoc(doc(db, 'site_content', snapshot.docs[0].id), { content });
            }
            return { success: true };
        } catch (err) {
            console.error("Error updating site content:", err);
            return { success: false, error: err.message };
        }
    }, []);

    const recalculatePTCosts = useCallback(async () => {
        console.log("Recalculating PT costs based on BOM...");
        const ptItems = items.filter(i => i.category === 'Producto Terminado');
        const materials = items.filter(i => i.category === 'Materia Prima');
        
        const updates = ptItems.map(async (pt) => {
            const ptRecipe = recipes[pt.id] || [];
            if (ptRecipe.length === 0) return;

            let totalCost = 0;
            ptRecipe.forEach(ingredient => {
                const material = materials.find(m => m.id === ingredient.rm_id);
                if (material) {
                    const materialCost = Number(material.price) || 0;
                    // Convert recipe quantity to material base unit before multiplying
                    const convertedQty = convertUnit(ingredient.qty, ingredient.unit, material.unit);
                    totalCost += convertedQty * materialCost;
                }
            });

            const yieldQty = ptRecipe.length > 0 ? (ptRecipe[0].yield_quantity || 1) : 1;
            const unitCost = totalCost / yieldQty;

            if (unitCost > 0) {
                try {
                    const docRef = doc(db, 'products', pt.id);
                    await updateDoc(docRef, {
                        recipe_cost: unitCost,
                        automated_cost: unitCost,
                        recipe_batch_cost: totalCost, // Keep total batch cost for reference
                        recipe_yield: yieldQty,
                        last_cost_recalc: new Date().toISOString()
                    });
                } catch (err) {
                    console.error(`Error updating cost for ${pt.name}:`, err);
                }
            }
        });

        await Promise.all(updates);
        console.log("PT costs recalculation complete.");
    }, [items, recipes]);

    const addItem = useCallback(async (data) => {
        try {
            const docRef = await addDoc(collection(db, 'products'), { ...data, created_at: new Date().toISOString() });
            return { success: true, id: docRef.id };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const updateItem = useCallback(async (id, data) => {
        try {
            await updateDoc(doc(db, 'products', id), data);
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const deleteItem = useCallback(async (id) => {
        try {
            await deleteDoc(doc(db, 'products', id));
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const addSupplier = useCallback(async (data) => {
        try {
            const docRef = await addDoc(collection(db, 'suppliers'), { ...data, created_at: new Date().toISOString() });
            return { success: true, id: docRef.id };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const updateSupplier = useCallback(async (id, data) => {
        try {
            await updateDoc(doc(db, 'suppliers', id), data);
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const deleteSupplier = useCallback(async (id) => {
        try {
            await deleteDoc(doc(db, 'suppliers', id));
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const updateOrder = useCallback(async (id, data) => {
        try {
            await updateDoc(doc(db, 'orders', id), data);
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const addPurchase = useCallback(async (data) => {
        try {
            const docRef = await addDoc(collection(db, 'purchase_orders'), { ...data, created_at: new Date().toISOString() });
            return { success: true, id: docRef.id };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const addExpense = useCallback(async (data) => {
        try {
            const docRef = await addDoc(collection(db, 'expenses'), { ...data, created_at: new Date().toISOString() });
            return { success: true, id: docRef.id };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const updateExpense = useCallback(async (id, data) => {
        try {
            await updateDoc(doc(db, 'expenses', id), { ...data, updated_at: new Date().toISOString() });
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const deleteExpense = useCallback(async (id) => {
        try {
            await deleteDoc(doc(db, 'expenses', id));
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const addBank = useCallback(async (data) => {
        try {
            const docRef = await addDoc(collection(db, 'banks'), { ...data, created_at: new Date().toISOString() });
            return { success: true, id: docRef.id };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const updateBank = useCallback(async (id, data) => {
        try {
            await updateDoc(doc(db, 'banks', id), { ...data, updated_at: new Date().toISOString() });
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const deleteBank = useCallback(async (id) => {
        try {
            await deleteDoc(doc(db, 'banks', id));
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const updateLead = useCallback(async (id, data) => {
        try {
            await updateDoc(doc(db, 'leads', id), { ...data, updated_at: new Date().toISOString() });
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const receivePurchase = useCallback(async (poId, receivedItems, relatedOrders) => {
        try {
            // 1. Update items inventory and costs
            for (const item of receivedItems) {
                const q = query(collection(db, 'products'), where('id', '==', item.id));
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    const docSnap = snapshot.docs[0];
                    const currentData = docSnap.data();
                    
                    const currentStock = (currentData.stock || 0) + (currentData.purchases || 0) - (currentData.sales || 0);
                    const currentTotalValue = currentStock * (currentData.cost || 0);
                    const purchaseValue = item.toBuy * item.purchasePrice;

                    const newTotalQty = currentStock + item.toBuy;
                    const newAvgCost = newTotalQty > 0 ? (currentTotalValue + purchaseValue) / newTotalQty : (currentData.cost || 0);

                    await updateDoc(docSnap.ref, {
                        purchases: increment(item.toBuy),
                        cost: Math.round(newAvgCost)
                    });
                }
            }

            // 2. Update OC status
            await updateDoc(doc(db, 'purchase_orders', poId), { status: 'Recibida', updated_at: new Date().toISOString() });

            // 3. Logic to check if all POs for related orders are received
            if (relatedOrders && Array.isArray(relatedOrders)) {
                for (const orderId of relatedOrders) {
                    const qPo = query(collection(db, 'purchase_orders'), where('relatedOrders', 'array-contains', orderId));
                    const poSnaps = await getDocs(qPo);
                    const allReceived = poSnaps.docs.every(d => d.data().status === 'Recibida');
                    if (allReceived) {
                        await updateDoc(doc(db, 'orders', orderId), { status: 'En Producción' });
                    }
                }
            }

            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const payPurchase = useCallback(async (poId, bankId) => {
        try {
            await updateDoc(doc(db, 'purchase_orders', poId), { 
                paymentStatus: 'Pagado', 
                bankId: bankId,
                updated_at: new Date().toISOString() 
            });
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const saveOdp = useCallback(async (sku, payload) => {
        try {
            const q = query(collection(db, 'production_orders'), where('sku', '==', sku));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const docId = snapshot.docs[0].id;
                await updateDoc(doc(db, 'production_orders', docId), { ...payload, updated_at: new Date().toISOString() });
            } else {
                await addDoc(collection(db, 'production_orders'), { ...payload, sku, created_at: new Date().toISOString() });
            }
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const addRecipe = useCallback(async (data) => {
        try {
            const docRef = await addDoc(collection(db, 'recipes'), { ...data, created_at: new Date().toISOString() });
            return { success: true, id: docRef.id };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const addLead = useCallback(async (data) => {
        try {
            const docRef = await addDoc(collection(db, 'leads'), { ...data, created_at: new Date().toISOString() });
            return { success: true, id: docRef.id };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const deleteLead = useCallback(async (id) => {
        try {
            await deleteDoc(doc(db, 'leads', id));
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const addUser = useCallback(async (data) => {
        try {
            const docRef = await addDoc(collection(db, 'users'), { 
                ...data, 
                created_at: new Date().toISOString(),
                status: data.status || 'Active'
            });
            return { success: true, id: docRef.id };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const updateUser = useCallback(async (id, data) => {
        try {
            await updateDoc(doc(db, 'users', id), { ...data, updated_at: new Date().toISOString() });
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const deleteUser = useCallback(async (id) => {
        try {
            await deleteDoc(doc(db, 'users', id));
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const deleteRecipeByProduct = useCallback(async (productId) => {
        try {
            const q = query(collection(db, 'recipes'), where('finished_good_id', '==', productId));
            const snapshot = await getDocs(q);
            const promises = snapshot.docs.map(d => deleteDoc(doc(db, 'recipes', d.id)));
            await Promise.all(promises);
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const updateBankBalance = useCallback(async (bankId, amount, type) => {
        try {
            const bank = banks.find(b => b.id === bankId);
            if (!bank) throw new Error("Banco no encontrado");
            const newBalance = type === 'income' ? (bank.balance || 0) + amount : (bank.balance || 0) - amount;
            await updateDoc(doc(db, 'banks', bankId), { balance: newBalance });
            return { success: true };
        } catch (err) {
            console.error("Error updating bank balance:", err);
            return { success: false, error: err.message };
        }
    }, [banks]);

    const consumeMaterials = useCallback(async (materials) => {
        try {
            for (const mat of materials) {
                // materials expected: { id, qtyToConsume }
                const docRef = doc(db, 'products', mat.id);
                await updateDoc(docRef, {
                    initial: increment(-Math.abs(mat.qtyToConsume))
                });
            }
            return { success: true };
        } catch (err) {
            console.error("Error consuming materials:", err);
            return { success: false, error: err.message };
        }
    }, []);

    const loadFinishedGoods = useCallback(async (sku, quantity) => {
        try {
            const q = query(collection(db, 'products'), where('name', '==', sku));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const docSnap = snapshot.docs[0];
                await updateDoc(docSnap.ref, {
                    initial: increment(quantity)
                });
                return { success: true };
            }
            throw new Error("Producto no encontrado en inventario");
        } catch (err) {
            console.error("Error loading finished goods:", err);
            return { success: false, error: err.message };
        }
    }, []);

    const saveWebCheckout = useCallback(async (data) => {
        try {
            const docRef = await addDoc(collection(db, 'web_checkouts'), {
                ...data,
                created_at: new Date().toISOString(),
                status: 'pending'
            });
            return { success: true, id: docRef.id };
        } catch (err) {
            console.error("Error saving web checkout draft:", err);
            return { success: false, error: err.message };
        }
    }, []);

    const getWebCheckout = useCallback(async (checkoutId) => {
        try {
            const docRef = doc(db, 'web_checkouts', checkoutId);
            const snapshot = await getDocs(query(collection(db, 'web_checkouts'), where('__name__', '==', checkoutId)));
            if (snapshot.empty) return { success: false, error: "Checkout no encontrado" };
            return { success: true, data: snapshot.docs[0].data() };
        } catch (err) {
            console.error("Error getting web checkout draft:", err);
            return { success: false, error: err.message };
        }
    }, []);

    const updateWebCheckoutStatus = useCallback(async (checkoutId, status) => {
        try {
            const docRef = doc(db, 'web_checkouts', checkoutId);
            await updateDoc(docRef, { status: status, updated_at: new Date().toISOString() });
            return { success: true };
        } catch (err) {
            console.error("Error updating web checkout status:", err);
            return { success: false, error: err.message };
        }
    }, []);

    const saveConversion = useCallback(async (from, to, factor) => {
        try {
            const id = `${from}_${to}`;
            await setDoc(doc(db, 'unit_conversions', id), { from, to, factor: Number(factor) });
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, []);

    /**
     * Universal Unit Converter
     * Handles: 
     * 1. Standard SI (kg <-> gr, lt <-> ml)
     * 2. Custom Conteo -> Weight/Vol (atado -> gr, caja -> kg) based on saved matrix
     */
    const convertUnit = useCallback((value, from, to) => {
        if (!value || from === to) return Number(value);
        
        // 1. Check Custom Matrix (Conteo -> Weight/Vol)
        if (unitConversions[from] && unitConversions[from][to]) {
            return Number(value) * Number(unitConversions[from][to]);
        }

        // 2. Automatic SI Multipliers (Standardized Ratios)
        const siFactors = {
            'kg_gr': 1000, 'gr_kg': 0.001,
            'lt_ml': 1000, 'ml_lt': 0.001,
            'lb_gr': 453.59, 'gr_lb': 1/453.59,
            'lb_kg': 0.45359, 'kg_lb': 2.20462
        };

        const key = `${from}_${to}`;
        if (siFactors[key]) {
            return Number(value) * siFactors[key];
        }

        // 3. Recursive check? (e.g. Atado -> KG via Atado -> GR -> KG)
        if (unitConversions[from] && unitConversions[from]['gr'] && to === 'kg') {
            return (Number(value) * Number(unitConversions[from]['gr'])) * 0.001;
        }
        if (unitConversions[from] && unitConversions[from]['kg'] && to === 'gr') {
            return (Number(value) * Number(unitConversions[from]['kg'])) * 1000;
        }

        return Number(value); // Fallback
    }, [unitConversions]);
    // ── Perfil de la empresa propia (Zeticas) ──────────────────────────────
    // Busca en providers primero (donde fue creado), luego en clients.
    // Criterio 1: is_own_company === true (flag explícito)
    // Criterio 2: nombre contiene 'zeticas' (fallback mientras no se agrega el flag)
    const ownCompany = useMemo(() => {
        const fromProviders = providers.find(p =>
            p.is_own_company === true ||
            (p.name || '').toLowerCase().includes('zeticas')
        );
        if (fromProviders) {
            return {
                name:             fromProviders.name,
                nit:              fromProviders.nit || fromProviders.tax_id || '',
                address:          fromProviders.address || fromProviders.location || '',
                delivery_address: fromProviders.delivery_address || fromProviders.address || fromProviders.location || '',
                email:            fromProviders.email || '',
                phone:            fromProviders.phone || fromProviders.contact_phone || '',
                city:             fromProviders.city || (fromProviders.address || '').split(',').pop()?.trim() || 'Bogotá D.C.',
                contact:          fromProviders.contact_person || fromProviders.contact || '',
            };
        }
        const fromClients = clients.find(c =>
            c.is_own_company === true ||
            (c.name || '').toLowerCase().includes('zeticas')
        );
        return fromClients || {
            name:             'Zeticas SAS',
            nit:              '',
            address:          '',
            delivery_address: '',
            email:            '',
            phone:            '',
            city:             'Bogotá D.C.',
        };
    }, [providers, clients]);

    const value = useMemo(() => ({
        loading, items, recipes, providers, orders, expenses, purchaseOrders, banks, taxSettings, clients, siteContent, lastUpdate, productionOrders, users, units, unitConversions, ownCompany,
        refreshData, addClient, addOrder, deleteOrders, updateSiteContent, recalculatePTCosts, updateBankBalance, updateClient, deleteClient,
        addItem, updateItem, deleteItem, addSupplier, updateSupplier, deleteSupplier, updateOrder, addPurchase, addRecipe, deleteRecipeByProduct, saveOdp, addExpense, updateExpense, deleteExpense, addBank, updateBank, deleteBank, receivePurchase, payPurchase, leads, updateLead, addLead, deleteLead,
        addUser, updateUser, deleteUser, consumeMaterials, loadFinishedGoods, saveConversion, convertUnit, saveWebCheckout, getWebCheckout, updateWebCheckoutStatus
    }), [
        loading, items, recipes, providers, orders, expenses, purchaseOrders, banks, taxSettings, clients, siteContent, lastUpdate, productionOrders, leads, users, units, unitConversions, refreshData, ownCompany,
        addClient, addOrder, deleteOrders, updateSiteContent, recalculatePTCosts, updateBankBalance, updateClient, deleteClient,
        addItem, updateItem, deleteItem, addSupplier, updateSupplier, deleteSupplier, updateOrder, addPurchase, addRecipe, deleteRecipeByProduct, saveOdp, addExpense, updateExpense, deleteExpense, addBank, updateBank, deleteBank, receivePurchase, payPurchase, updateLead, addLead, deleteLead,
        addUser, updateUser, deleteUser, consumeMaterials, loadFinishedGoods, saveConversion, convertUnit, saveWebCheckout, getWebCheckout, updateWebCheckoutStatus
    ]);

    return (
        <BusinessContext.Provider value={value}>
            {children}
        </BusinessContext.Provider>
    );
};

export const useBusiness = () => useContext(BusinessContext);
