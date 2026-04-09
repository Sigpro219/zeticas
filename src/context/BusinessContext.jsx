import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, getDocs, getDoc, updateDoc, deleteDoc, addDoc, where, increment, setDoc } from 'firebase/firestore';
import { products as masterProducts } from '../data/products';
import buildInfo from '../data/build_info.json';

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

const BusinessContext = createContext({});

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
    const [bankTransactions, setBankTransactions] = useState([]);
    const [clients, setClients] = useState([]);
    const [siteContent, setSiteContent] = useState({});
    const [leads, setLeads] = useState([]);
    const [quotations, setQuotations] = useState([]);
    const [users, setUsers] = useState([]);
    const [units, setUnits] = useState([]);
    const [unitConversions, setUnitConversions] = useState({});
    const [lastUpdate, setLastUpdate] = useState(null);
    const [analytics, setAnalytics] = useState([]);

    const [taxSettings, setTaxSettings] = useState({
        iva: 19,
        retefuente: 2.5,
        ica: 9.6,
        renta: 35
    });

    const updateSyncTime = useCallback(() => {
        setLastUpdate(new Date().toLocaleString('es-CO', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        }));
    }, []);

    const updateBankBalance = useCallback(async (bankId, amount, type, description = 'Movimiento sistema', category = 'Ajuste') => {
        try {
            const bank = banks.find(b => b.id === bankId);
            if (!bank) throw new Error("Banco no encontrado");
            const currentBal = Number(bank.real_time || bank.balance || 0);
            const newBalance = type === 'income' ? currentBal + amount : currentBal - amount;
            
            // 1. Update the Main balance
            await updateDoc(doc(db, 'banks', bankId), { 
                balance: newBalance,
                real_time: newBalance,
                updated_at: new Date().toISOString()
            });

            // 2. Log the Transaction (The "Fact")
            await addDoc(collection(db, 'bank_transactions'), {
                bank_id: bankId,
                bank_name: bank.name,
                type: type, // 'income' or 'expense'
                amount: amount,
                start_balance: currentBal,
                end_balance: newBalance,
                description: description,
                category: category,
                date: new Date().toISOString().split('T')[0],
                created_at: new Date().toISOString()
            });

            return { success: true };
        } catch (err) {
            console.error("Error updating bank balance:", err);
            return { success: false, error: err.message };
        }
    }, [banks]);

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
            'lb_gr': 500, 'gr_lb': 1 / 500,
            'lb_kg': 0.5, 'kg_lb': 2
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

    const refreshData = useCallback(async () => {
        // Since we are using onSnapshot, refreshData might be redundant for some collections,
        // but we'll keep it for bulk loads or initial state.
    }, []);

    const enrichedOrders = useMemo(() => {
        return orders.map(o => {
            if ((!o.client || o.client === 'Sin Cliente') && o.client_id) {
                const clientObj = clients.find(c => c.id === o.client_id || c.nit === o.client_id);
                if (clientObj) return { ...o, client: clientObj.name };
            }
            return { ...o, client: o.client || 'Sin Cliente' };
        });
    }, [orders, clients]);

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
            updateSyncTime();
        }, (error) => console.error("Snapshot Products Error:", error));

        const unsubClients = onSnapshot(query(collection(db, 'clients'), orderBy('created_at', 'desc')), (snapshot) => {
            setClients(snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().created_at
            })));
            updateSyncTime();
        }, (error) => console.error("Snapshot Clients Error:", error));

        const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('created_at', 'desc')), (snapshot) => {
            setOrders(snapshot.docs.map(doc => {
                const o = doc.data();
                // Safe date parsing for Firestore Timestamps or ISO strings
                const rawCreatedAt = o.created_at;
                const isoDate = rawCreatedAt?.toDate ? rawCreatedAt.toDate().toISOString() : (typeof rawCreatedAt === 'string' ? rawCreatedAt : new Date().toISOString());

                // Mapeo inteligente de ítems (compatibilidad con product_name)
                const mappedItems = (o.items || []).map(i => ({
                    ...i,
                    name: i.name || i.product_name || 'Ítem'
                }));

                return {
                    ...o,
                    id: o.order_number || o.id || doc.id,
                    dbId: doc.id,
                    client: o.client || o.customer_name || o.client_name || o.user_fullName || o.billing_first_name || '',
                    items: mappedItems,
                    amount: Number(o.total_amount || o.amount || 0),
                    date: isoDate.split('T')[0],
                    realDate: isoDate,
                };
            }));
            updateSyncTime();
        }, (error) => console.error("Snapshot Orders Error:", error));

        const unsubRecipes = onSnapshot(collection(db, 'recipes'), (snapshot) => {
            const groupedRecipes = {};
            snapshot.docs.forEach(doc => {
                const r = doc.data();
                const fgId = r.finished_good_id;
                const fgName = (r.finished_good_name || '').toLowerCase().trim();
                if (!fgId && !fgName) return;

                const recipeItem = {
                    rm_id: r.raw_material_id,
                    name: r.raw_material_name,
                    sku: r.raw_material_sku,
                    qty: r.input_qty !== undefined ? r.input_qty : r.quantity_required,
                    unit: r.input_unit || r.unit || 'und',
                    finished_good_id: fgId,
                    finished_good_name: r.finished_good_name,
                    yield_quantity: Number(r.yield_quantity) || 1
                };

                if (fgId) {
                    if (!groupedRecipes[fgId]) groupedRecipes[fgId] = [];
                    groupedRecipes[fgId].push(recipeItem);
                }
                if (fgName) {
                    if (!groupedRecipes[fgName]) groupedRecipes[fgName] = [];
                    groupedRecipes[fgName].push(recipeItem);
                }
            });
            setRecipes(groupedRecipes);
            updateSyncTime();
        }, (error) => console.error("Snapshot Recipes Error:", error));

        const unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
            setProviders(snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })));
            updateSyncTime();
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
            updateSyncTime();
        }, (error) => console.error("Snapshot Purchases Error:", error));

        const unsubExpenses = onSnapshot(query(collection(db, 'expenses'), orderBy('date', 'desc')), (snapshot) => {
            setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            updateSyncTime();
        }, (error) => console.error("Snapshot Expenses Error:", error));

        const unsubBanks = onSnapshot(collection(db, 'banks'), (snapshot) => {
            setBanks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            updateSyncTime();
        }, (error) => console.error("Snapshot Banks Error:", error));

        const unsubBankTrans = onSnapshot(query(collection(db, 'bank_transactions'), orderBy('created_at', 'desc')), (snapshot) => {
            setBankTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error("Snapshot Bank Transactions Error:", error));

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

        const unsubAnalytics = onSnapshot(query(collection(db, 'analytics'), orderBy('date', 'asc')), (snapshot) => {
            setAnalytics(snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })));
        }, (error) => console.error("Snapshot Analytics Error:", error));

        const unsubLeads = onSnapshot(query(collection(db, 'leads'), orderBy('created_at', 'desc')), (snapshot) => {
            setLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error("Snapshot Leads Error:", error));

        const unsubQuotes = onSnapshot(query(collection(db, 'quotations'), orderBy('createdAt', 'desc')), (snapshot) => {
            setQuotations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error("Snapshot Quotations Error:", error));

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

        updateSyncTime();

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
            unsubQuotes();
            unsubUsers();
            unsubUnits();
            unsubConversions();
            unsubBankTrans();
        };
    }, [updateSyncTime]);

    // ── MOTOR DE RECONCILIACIÓN DE ODPS (Semáforo Industrial) ──
    useEffect(() => {
        const interval = setInterval(() => {
            if (!loading && items.length > 0) {
                for (const product of items) {
                    const currentStock = (product.initial || 0) + (product.purchases || 0) - (product.sales || 0);
                    const safetyStock = Number(product.min_stock_level) || Number(product.safety) || Number(product.reorder_point) || 0;
                    
                    if (currentStock <= safetyStock) {
                        const recipeItems = recipes[product.name] || recipes[product.id] || [];
                        const missing = [];
                        
                        recipeItems.forEach(ri => {
                            const mp = items.find(i => i.id === ri.rm_id || (i.name && i.name.toLowerCase().trim() === (ri.name || '').toLowerCase().trim()));
                            const mpStock = mp ? ((mp.initial || 0) + (mp.purchases || 0) - (mp.sales || 0)) : 0;
                            if (mpStock < Number(ri.qty)) {
                                missing.push({
                                    id: mp?.id || ri.rm_id,
                                    name: ri.name,
                                    required: Number(ri.qty),
                                    current: mpStock,
                                    missing: Number(ri.qty) - mpStock
                                });
                            }
                        });
                        
                        // En la lógica asistida, ya no disparamos addDoc automáticamente.
                        // Solo notificamos en consola para debugging si se activó el umbral.
                        // console.log(`🔍 [Replenishment Target] ${product.name} (Stock: ${currentStock}). Insumos faltantes: ${missing.length}`);
                    }
                }
            }
        }, 15000); // Check every 15s
        return () => clearInterval(interval);
    }, [items, productionOrders, recipes]);


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

    const addOrder = useCallback(async (orderData) => {
        try {
            const displayId = orderData.order_number || orderData.id || `WEB-${Math.floor(Date.now() / 1000)}`;
            
            const docRef = await addDoc(collection(db, 'orders'), {
                ...orderData,
                id: displayId,
                order_number: displayId, // Mantener consistencia entre campos de búsqueda
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
        if (!section || !key || content === undefined) {
            console.warn(`[ContentSync] Ignored invalid update for ${section}/${key}: content is undefined`);
            return { success: false, error: "Datos de contenido inválidos (undefined)" };
        }
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

    const createInternalOrder = useCallback(async (selectedNames = []) => {
        try {
            const batchNum = `INT-${Date.now().toString().slice(-6)}`;
            
            const allItems = selectedNames.map(name => {
                const item = items.find(i => i.name === name);
                const isPT = item?.type === 'product' || item?.category === 'Producto Terminado';
                const batchSize = isPT ? Number(item?.batch_size || 1) : 1;
                
                return {
                    name,
                    id: item?.id || null,
                    quantity: batchSize,
                    unit: item?.unit || (item?.unit_measure || 'und'),
                    type: isPT ? 'product' : 'material'
                };
            });

            if (allItems.length === 0) return { success: false, error: "No hay ítems seleccionados" };

            const orderData = {
                order_number: batchNum,
                client: 'Stock Interno',
                client_id: 'INTERNAL_STOCK',
                items: allItems,
                status: 'pending',
                payment_status: 'paid',
                created_at: new Date().toISOString(),
                total_amount: 0,
                is_internal: true,
                production_status: 'scheduled'
            };

            const docRef = await addDoc(collection(db, 'orders'), orderData);
            setOrders(prev => [{ id: docRef.id, ...orderData }, ...prev]);
            return { success: true, id: docRef.id };
        } catch (err) {
            console.error("Error creating internal order:", err);
            return { success: false, error: err.message };
        }
    }, [items, setOrders]);

    const updateInventoryConfig = useCallback(async (threshold) => {
        try {
            const currentConfig = siteContent.inventory || {};
            await updateSiteContent('inventory', 'config', { ...currentConfig, redThreshold: Number(threshold) });
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, [siteContent, updateSiteContent]);

    const recalculatePTCosts = useCallback(async () => {
        if (!items || items.length === 0) return;
        console.log("Recalculating PT costs based on BOM...");
        const ptItems = items.filter(i => i.type === 'product' || i.category === 'Producto Terminado');

        const updates = ptItems.map(async (pt) => {
            const ptRecipe = recipes[pt.id] || [];
            if (ptRecipe.length === 0) return;

            let totalCost = 0;
            ptRecipe.forEach(ingredient => {
                const material = items.find(m => m.id === ingredient.rm_id || m.name === ingredient.name);
                if (material) {
                    const materialCost = Number(material.price || material.cost || material.avgCost) || 0;
                    const convertedQty = convertUnit(ingredient.qty, ingredient.unit, material.unit_measure || material.unit || material.purchase_unit);
                    totalCost += convertedQty * materialCost;
                }
            });

            const yieldQty = ptRecipe.length > 0 ? (Number(ptRecipe[0].yield_quantity) || 1) : 1;
            const unitCost = totalCost / yieldQty;

            if (unitCost > 0) {
                try {
                    const docRef = doc(db, 'products', pt.id);
                    await updateDoc(docRef, {
                        recipe_cost: unitCost,
                        automated_cost: unitCost,
                        recipe_batch_cost: totalCost,
                        recipe_yield: yieldQty,
                        last_cost_recalc: new Date().toISOString(),
                        cost: unitCost
                    });
                } catch (err) {
                    console.error(`Error updating cost for ${pt.name}:`, err);
                }
            }
        });

        await Promise.all(updates);
        console.log("PT costs recalculation complete.");
    }, [items, recipes, convertUnit]);

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
            const orderRef = doc(db, 'orders', id);
            const snap = await getDoc(orderRef);
            const oldData = snap.exists() ? snap.data() : {};

            // 1. Audit & Status History (Enhanced Traceability)
            if (data.status && data.status !== oldData.status) {
                const now = new Date().toISOString();
                data.last_status_at = now;
                const history = oldData.status_history || [];
                data.status_history = [...history, { status: data.status, at: now }];

                // LEAD TIME CALCULATION: Capture "Effective Delivery"
                const isDelivered = ['entregado', 'finalizado', 'cobrado'].includes(data.status.toLowerCase());
                const wasNotDelivered = !['entregado', 'finalizado', 'cobrado'].includes((oldData.status || '').toLowerCase());

                if (isDelivered && wasNotDelivered) {
                    const deliveredAt = now;
                    data.delivered_at = deliveredAt;
                    const createdAt = oldData.created_at;
                    if (createdAt) {
                        const start = new Date(createdAt);
                        const end = new Date(deliveredAt);
                        const diffMs = end - start;
                        data.lead_time_days = parseFloat((diffMs / (1000 * 60 * 60 * 24)).toFixed(2));
                    }
                }
            }

            // 2. Physical Stock Deduction (Safe Execution)
            const finalStatuses = ['finalizado', 'entregado', 'cobrado'];
            if (data.status && finalStatuses.includes(data.status.toLowerCase())) {
                const wasFinal = oldData.status && finalStatuses.includes(oldData.status.toLowerCase());
                if (!wasFinal && oldData.items) {
                    for (const item of oldData.items) {
                        if (item.id) {
                            try {
                                await updateDoc(doc(db, 'products', item.id), {
                                    sales: increment(Number(item.quantity) || 0)
                                });
                            } catch (e) {
                                console.warn(`Stock update failed for item ${item.id}:`, e);
                            }
                        }
                    }
                }
            }

            // 3. Final Firestore Update
            await updateDoc(orderRef, data);
            return { success: true };
        } catch (err) {
            console.error("Critical error in updateOrder:", err);
            return { success: false, error: err.message };
        }
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

    const addQuotation = useCallback(async (quoteData) => {
        try { await addDoc(collection(db, 'quotations'), quoteData); return { success: true }; }
        catch (err) { console.error("Error adding quote:", err); return { success: false, error: err.message }; }
    }, []);

    const deleteQuotation = useCallback(async (id) => {
        try {
            await deleteDoc(doc(db, 'quotations', id));
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
            if (!poId) throw new Error("ID de orden de compra no definido.");
            if (!receivedItems) throw new Error("No hay items para ingresar.");

            // 1. Update items inventory and costs
            for (const item of receivedItems) {
                if (!item.id && !item.name) continue;

                // Find product in Firestore
                let docSnap = null;
                let docRef = null;
                const directRef = doc(db, 'products', item.id || 'none');
                try {
                    const ds = await getDoc(directRef);
                    if (ds.exists()) {
                        docSnap = ds;
                        docRef = directRef;
                    }
                } catch (err) {
                    console.log("Direct ref lookup fail, falling back to name search:", err.message);
                } 


                if (!docSnap) {
                    const qName = query(collection(db, 'products'), where('name', '==', String(item.name || '')));
                    const snapName = await getDocs(qName);
                    if (!snapName.empty) {
                        docSnap = snapName.docs[0];
                        docRef = docSnap.ref;
                    }
                }

                if (docSnap && docRef) {
                    const currentData = docSnap.data();
                    const invUnit = (currentData.unit_measure || currentData.unit || 'gr').toLowerCase();
                    const qtyBuy = Number(item.toBuy || item.quantity || 0);
                    const purchaseUnitConfig = (currentData.purchase_unit || invUnit).toLowerCase();
                    const conversionFactor = Number(currentData.conversion_factor || 1);
                    const buyUnit = (item.unit || item.purchaseUnit || invUnit).toLowerCase();

                    // PRIORITY: If buying in the configured purchase unit, use the specific conversion_factor from Master Data
                    let qtyToAddBase;
                    if (buyUnit === purchaseUnitConfig) {
                        qtyToAddBase = qtyBuy * conversionFactor;
                    } else {
                        // FALLBACK: Use universal SI or custom matrix converter
                        qtyToAddBase = convertUnit(qtyBuy, buyUnit, invUnit);
                    }

                    const currentStock = Number(currentData.stock || 0) + Number(currentData.purchases || 0) - Number(currentData.sales || 0);
                    const currentTotalValue = currentStock * Number(currentData.cost || 0);

                    const purchaseUnitPrice = Number(item.purchasePrice || item.unit_cost || 0);
                    const lineTotalValue = qtyBuy * purchaseUnitPrice;

                    // The weighted average must remain consistent with the total money spent vs total items in base units
                    const newTotalQty = currentStock + qtyToAddBase;
                    const newAvgCost = newTotalQty > 0 ? (currentTotalValue + lineTotalValue) / newTotalQty : Number(currentData.cost || 0);

                    await updateDoc(docRef, {
                        purchases: increment(qtyToAddBase),
                        cost: Math.round(newAvgCost)
                    });
                }
            }

            // 2. Update OC status - Search for the doc to be safe (it might be poId or dbId)
            let poDocRef = doc(db, 'purchase_orders', poId);
            let poSnapExists = false;
            try {
                const poSnap = await getDoc(poDocRef);
                poSnapExists = poSnap.exists();
            } catch { poSnapExists = false; }

            if (!poSnapExists) {
                // If ID doesn't match a doc ID, search by custom 'id' field
                const qPo = query(collection(db, 'purchase_orders'), where('id', '==', poId));
                const poSnaps = await getDocs(qPo);
                if (!poSnaps.empty) {
                    poDocRef = poSnaps.docs[0].ref;
                } else {
                    throw new Error(`Orden de compra no encontrada en el servidor: ${poId}`);
                }
            }

            await updateDoc(poDocRef, {
                status: 'Recibida',
                updated_at: new Date().toISOString()
            });

            // 3. Logic to check if all POs for related orders are received
            if (relatedOrders && Array.isArray(relatedOrders)) {
                for (const orderId of relatedOrders) {
                    if (!orderId) continue;
                    // Búsqueda inteligente: intentar por order_number o por el campo id (manuales)
                    let qOrd = query(collection(db, 'orders'), where('order_number', '==', orderId));
                    let ordSnaps = await getDocs(qOrd);
                    
                    if (ordSnaps.empty) {
                        qOrd = query(collection(db, 'orders'), where('id', '==', orderId));
                        ordSnaps = await getDocs(qOrd);
                    }

                    const targetOrderDoc = ordSnaps.empty ? doc(db, 'orders', String(orderId)) : ordSnaps.docs[0].ref;

                    // Check all POs related to this order
                    const qPoRelated = query(collection(db, 'purchase_orders'), where('related_orders', 'array-contains', orderId));
                    const poSnapsRelated = await getDocs(qPoRelated);

                    // If no POs found by related_orders array, check for simple relatedOrders field (migration compatibility)
                    let docsToCheck = poSnapsRelated.docs;
                    if (docsToCheck.length === 0) {
                        const qPoFallback = query(collection(db, 'purchase_orders'), where('relatedOrders', 'array-contains', orderId));
                        const poSnapsFallback = await getDocs(qPoFallback);
                        docsToCheck = poSnapsFallback.docs;
                    }

                    const allReceived = docsToCheck.length > 0 && docsToCheck.every(d => d.data().status === 'Recibida');
                    if (allReceived) {
                        try {
                            await updateDoc(targetOrderDoc, { status: 'En Producción' });
                        } catch (e) {
                            console.error(`Error updating order ${orderId} to En Producción:`, e);
                        }
                    }
                }
            }

            return { success: true };
        } catch (err) {
            console.error("Critical error in receivePurchase:", err);
            return { success: false, error: err.message };
        }
    }, [convertUnit]);

    const payPurchase = useCallback(async (poId, bankId, amount, providerName) => {
        try {
            // 1. Identify the OC document. poId might be the Firestore Doc ID (dbId) or the display ID (e.g. OC-8008)
            let docId = poId;
            let finalAmount = amount;
            let finalProvider = providerName;

            // Search by order_number/id field if document doesn't exist directly
            const directRef = doc(db, 'purchase_orders', poId);
            const directSnap = await getDoc(directRef).catch(() => null);

            if (!directSnap || !directSnap.exists()) {
                const q = query(collection(db, 'purchase_orders'), where('id', '==', poId));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    docId = snap.docs[0].id;
                    const data = snap.docs[0].data();
                    if (!finalAmount) finalAmount = data.total_amount || data.total_cost || 0;
                    if (!finalProvider) finalProvider = data.provider_name || data.providerName || 'Proveedor';
                } else {
                    // One last try searching by order_number
                    const q2 = query(collection(db, 'purchase_orders'), where('order_number', '==', poId));
                    const snap2 = await getDocs(q2);
                    if (!snap2.empty) {
                        docId = snap2.docs[0].id;
                        const data = snap2.docs[0].data();
                        if (!finalAmount) finalAmount = data.total_amount || data.total_cost || 0;
                        if (!finalProvider) finalProvider = data.provider_name || data.providerName || 'Proveedor';
                    }
                }
            } else {
                const data = directSnap.data();
                if (!finalAmount) finalAmount = data.total_amount || data.total_cost || 0;
                if (!finalProvider) finalProvider = data.provider_name || data.providerName || 'Proveedor';
            }

            // 2. Update OC payment status
            await updateDoc(doc(db, 'purchase_orders', docId), {
                payment_status: 'Pagado',
                paymentStatus: 'Pagado',
                bank_id: bankId,
                bankId: bankId,
                updated_at: new Date().toISOString()
            });

            // 3. Create Expense Record (PyG module)
            await addDoc(collection(db, 'expenses'), {
                expense_date: new Date().toISOString().split('T')[0],
                category: 'Materia Prima / Compras',
                description: `Pago OC ${poId} - ${finalProvider}`,
                amount: Number(finalAmount),
                payment_method: 'Transferencia',
                bank_id: bankId,
                status: 'Pagado',
                related_purchase_id: docId,
                related_oc: poId,
                created_at: new Date().toISOString()
            });

            // 4. Update Bank Balance (includes automated transaction logging)
            await updateBankBalance(
                bankId, 
                Number(finalAmount), 
                'expense', 
                `Pago OC ${poId} - ${finalProvider}`,
                'Materia Prima / Compras'
            );

            return { success: true };
        } catch (err) {
            console.error("Error in payPurchase:", err);
            return { success: false, error: err.message };
        }
    }, [updateBankBalance]);

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

    const deleteOdp = useCallback(async (dbId) => {
        try {
            if (!dbId) throw new Error("ID de documento no definido.");
            await deleteDoc(doc(db, 'production_orders', dbId));
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


    const consumeMaterials = useCallback(async (materials) => {
        try {
            for (const mat of materials) {
                // materials expected: { id, qtyToConsume }
                // Use 'sales' property to record MATERIA PRIMA consumption accurately mapped in Kárdex (Inv. Final)
                const docRef = doc(db, 'products', mat.id);
                await updateDoc(docRef, {
                    sales: increment(Math.abs(mat.qtyToConsume))
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
                // Use 'purchases' property to record PRODUCTO TERMINADO output accurately mapped in Kárdex (Inv. Final)
                await updateDoc(docSnap.ref, {
                    purchases: increment(quantity)
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

    const addRejectedProduct = useCallback(async (data) => {
        try {
            const docRef = await addDoc(collection(db, 'rejected_products'), { 
                ...data, 
                created_at: new Date().toISOString() 
            });
            return { success: true, id: docRef.id };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const saveConversion = useCallback(async (from, to, factor) => {
        try {
            const id = `${from}_${to}`;
            await setDoc(doc(db, 'unit_conversions', id), { from, to, factor: Number(factor) });
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    /**
     * LOG VISIT: Increments a daily counter in a new 'analytics' collection.
     * Fires once per session to avoid inflated counts.
     */
    const logVisit = useCallback(async () => {
        const sessionKey = 'zeticas_visit_logged';
        if (sessionStorage.getItem(sessionKey)) return;

        try {
            const today = new Date().toISOString().split('T')[0];
            const analyticsRef = doc(db, 'analytics', today);
            
            await setDoc(analyticsRef, {
                date: today,
                count: increment(1)
            }, { merge: true });

            sessionStorage.setItem(sessionKey, 'true');
        } catch (err) {
            console.error("Error logging visit:", err);
        }
    }, [db]);


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
                name: fromProviders.name,
                nit: fromProviders.nit || fromProviders.tax_id || '',
                address: fromProviders.address || fromProviders.location || '',
                delivery_address: fromProviders.delivery_address || fromProviders.address || fromProviders.location || '',
                email: fromProviders.email || '',
                phone: fromProviders.phone || fromProviders.contact_phone || '',
                city: fromProviders.city || (fromProviders.address || '').split(',').pop()?.trim() || 'Bogotá D.C.',
                contact: fromProviders.contact_person || fromProviders.contact || '',
            };
        }
        const fromClients = clients.find(c =>
            c.is_own_company === true ||
            (c.name || '').toLowerCase().includes('zeticas')
        );
        return fromClients || {
            name: 'Zeticas SAS',
            nit: '',
            address: '',
            delivery_address: '',
            email: '',
            phone: '',
            city: 'Bogotá D.C.',
        };
    }, [providers, clients]);


    const value = useMemo(() => ({
        loading, items, recipes, providers, orders: enrichedOrders, expenses, purchaseOrders, banks, bankTransactions, taxSettings, clients, siteContent, lastUpdate, lastPublish: buildInfo.lastPublish, productionOrders, users, units, unitConversions, ownCompany, leads, quotations, analytics,
        setItems, setOrders, setExpenses, setPurchaseOrders, setBanks, setBankTransactions, setClients, setSiteContent, setProductionOrders, setLeads, setUsers, setUnits, setUnitConversions, setTaxSettings, setAnalytics,
        refreshData, addClient, addOrder, deleteOrders, updateSiteContent, recalculatePTCosts, updateBankBalance, updateClient, deleteClient,
        addItem, updateItem, deleteItem, addSupplier, updateSupplier, deleteSupplier, updateOrder, addPurchase, addRecipe, deleteRecipeByProduct, saveOdp, deleteOdp, addExpense, updateExpense, deleteExpense, addBank, updateBank, deleteBank, receivePurchase, payPurchase, updateLead, addLead, deleteLead, addQuotation, deleteQuotation,
        addUser, updateUser, deleteUser, consumeMaterials, loadFinishedGoods, saveConversion, convertUnit, saveWebCheckout, getWebCheckout, updateWebCheckoutStatus, addRejectedProduct, createInternalOrder, updateInventoryConfig, logVisit
    }), [
        loading, items, recipes, providers, enrichedOrders, expenses, purchaseOrders, banks, bankTransactions, taxSettings, clients, siteContent, lastUpdate, productionOrders, leads, quotations, users, units, unitConversions, ownCompany, analytics,
        setItems, setOrders, setExpenses, setPurchaseOrders, setBanks, setBankTransactions, setClients, setSiteContent, setProductionOrders, setLeads, setUsers, setUnits, setUnitConversions, setTaxSettings, setAnalytics,
        refreshData, addClient, addOrder, deleteOrders, updateSiteContent, recalculatePTCosts, updateBankBalance, updateClient, deleteClient,
        addItem, updateItem, deleteItem, addSupplier, updateSupplier, deleteSupplier, updateOrder, addPurchase, addRecipe, deleteRecipeByProduct, saveOdp, deleteOdp, addExpense, updateExpense, deleteExpense, addBank, updateBank, deleteBank, receivePurchase, payPurchase, updateLead, addLead, deleteLead, addQuotation, deleteQuotation,
        addUser, updateUser, deleteUser, consumeMaterials, loadFinishedGoods, saveConversion, convertUnit, saveWebCheckout, getWebCheckout, updateWebCheckoutStatus, addRejectedProduct, createInternalOrder, updateInventoryConfig, logVisit
    ]);

    return (
        <BusinessContext.Provider value={value}>
            {children}
        </BusinessContext.Provider>
    );
};

export const useBusiness = () => useContext(BusinessContext);
