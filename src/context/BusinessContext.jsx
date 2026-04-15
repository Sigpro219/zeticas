import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import { collection, query, orderBy, onSnapshot, doc, getDocs, getDoc, updateDoc, deleteDoc, addDoc, where, increment, setDoc, runTransaction } from 'firebase/firestore';
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
    const [productionAnalytics, setProductionAnalytics] = useState([]);
    const [banks, setBanks] = useState([]);
    const [bankTransactions, setBankTransactions] = useState([]);
    const [clients, setClients] = useState([]);
    const [siteContent, setSiteContent] = useState({});
    const [leads, setLeads] = useState([]);
    const [quotations, setQuotations] = useState([]);
    const [users, setUsers] = useState([]);
    const [units, setUnits] = useState([]);
    const [subscriptions, setSubscriptions] = useState([]);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [analytics, setAnalytics] = useState([]);

    // ── CORE BUSINESS LOGIC (Hoisted to prevent TDZ) ───────────────────

    /**
     * consumeMaterials: Deducts physical stock by increasing the 'sales' counter.
     */
    const consumeMaterials = useCallback(async (materials) => {
        try {
            for (const mat of materials) {
                // materials expected: { id, qtyToConsume }
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

    /**
     * loadFinishedGoods: Updates inventory for produced items and optionally consumes BOM materials.
     */
    const loadFinishedGoods = useCallback(async (sku, quantity, alreadyConsumed = false) => {
        try {
            const searchName = String(sku || '').toLowerCase().trim();
            const snapshot = await getDocs(collection(db, 'products'));
            const docSnap = snapshot.docs.find(d => {
                const p = d.data();
                return String(p.name || '').toLowerCase().trim() === searchName;
            });

            if (docSnap) {
                const ptId = docSnap.id;
                await updateDoc(docSnap.ref, {
                    purchases: increment(Number(quantity) || 0)
                });

                if (!alreadyConsumed) {
                    const recipeList = recipes[ptId] || recipes[sku] || [];
                    if (recipeList.length > 0) {
                        const yieldQty = Number(recipeList[0].yield_quantity) || 1;
                        const materialsToConsume = recipeList.map(r => ({
                            id: r.rm_id,
                            qtyToConsume: (Number(r.qty) / yieldQty) * (Number(quantity) || 0)
                        }));
                        await consumeMaterials(materialsToConsume);
                    }
                }
                return { success: true };
            }
            throw new Error(`Producto [${sku}] no encontrado en el catálogo de productos.`);
        } catch (err) {
            console.error("Error loading finished goods:", err);
            return { success: false, error: err.message };
        }
    }, [recipes, consumeMaterials]);

    // ── AUDIT LOGS SYSTEM ──────────────────────────────────────────────
    
    /**
     * addAdminLog: Centrally records sensitive operations.
     * @param {string} action - 'DELETE_ORDER', 'STOCK_ADJUSTMENT', etc.
     * @param {object} details - Payload of the action.
     * @param {object} user - The user executing the action (for role/uid recording).
     */
    const addAdminLog = useCallback(async (action, details, user = null) => {
        try {
            await addDoc(collection(db, 'admin_logs'), {
                action,
                details,
                user_email: user?.email || 'System',
                user_role: user?.role || 'unknown',
                timestamp: new Date().toISOString(),
                server_timestamp: new Date()
            });
        } catch (err) {
            console.error("Critical: Failed to record admin log:", err);
        }
    }, []);

    /**
     * auditStockAdjustment: Handles manual stock corrections with forced audit.
     */
    const auditStockAdjustment = useCallback(async (productId, newVal, reason, user) => {
        try {
            if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
                throw new Error("No tienes permisos suficientes para realizar ajustes de stock.");
            }

            if (!reason || reason.trim().length < 5) {
                throw new Error("Debes proporcionar un motivo detallado para el ajuste.");
            }

            const productRef = doc(db, 'products', productId);
            const snap = await getDoc(productRef);
            if (!snap.exists()) throw new Error("Producto no encontrado.");
            
            const oldData = snap.data();
            const oldStock = (Number(oldData.stock || 0)) + (Number(oldData.purchases || 0)) - (Number(oldData.sales || 0));

            // Per User preference: "Nuevo Cero" logic
            // We update the master stock to the new value and reset counters to 0
            await updateDoc(productRef, {
                stock: Number(newVal),
                purchases: 0,
                sales: 0,
                updated_at: new Date().toISOString()
            });

            await addAdminLog('STOCK_ADJUSTMENT', {
                product_name: oldData.name,
                productId,
                old_stock: oldStock,
                new_stock: Number(newVal),
                reason: reason || 'Ajuste Manual'
            }, user);

            return { success: true };
        } catch (err) {
            console.error("Error in auditStockAdjustment:", err);
            return { success: false, error: err.message };
        }
    }, [addAdminLog]);

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

    const updateBankBalance = useCallback(async (bankId, amount, type, description = 'Movimiento sistema', category = 'Ajuste', cachedBank = null) => {
        try {
            // Priority: Use cachedBank (if just created) or find in current list
            const bank = cachedBank || banks.find(b => b.id === bankId);
            if (!bank) throw new Error("Banco no encontrado en el sistema.");
            
            const currentBal = Number(bank.real_time || bank.balance || 0);
            const val = Number(amount) || 0;
            const newBalance = type === 'income' ? currentBal + val : currentBal - val;
            
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
                amount: val,
                start_balance: currentBal,
                end_balance: newBalance,
                description: description,
                category: category,
                date: new Date().toLocaleDateString('en-CA'),
                created_at: new Date().toISOString()
            });

            return { success: true, newBalance };
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

        // Standard SI Multipliers (Standardized Ratios)
        const siFactors = {
            'kg_gr': 1000, 'gr_kg': 0.001,
            'lt_ml': 1000, 'ml_lt': 0.001,
            'lb_gr': 500, 'gr_lb': 1 / 500,
            'lb_kg': 0.5, 'kg_lb': 2
        };

        const key = `${from}_${to}`;
        return siFactors[key] ? (Number(value) * siFactors[key]) : Number(value);
    }, []);

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
                    date: new Date(isoDate).toLocaleDateString('en-CA'),
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
                    date: p.order_date || p.date || (isoDate ? new Date(isoDate).toLocaleDateString('en-CA') : ''),
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

        const unsubExpenses = onSnapshot(query(collection(db, 'expenses'), orderBy('created_at', 'desc')), (snapshot) => {
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

        const unsubSubscriptions = onSnapshot(collection(db, 'subscriptions'), (snapshot) => {
            setSubscriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error("Snapshot Subscriptions Error:", error));

        const unsubQuotes = onSnapshot(query(collection(db, 'quotations'), orderBy('createdAt', 'desc')), (snapshot) => {
            setQuotations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error("Snapshot Quotations Error:", error));

        const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error("Snapshot Users Error:", error));

        const unsubUnits = onSnapshot(collection(db, 'units'), (snapshot) => {
            setUnits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error("Snapshot Units Error:", error));

        const unsubProdAnalytics = onSnapshot(query(collection(db, 'production_analytics'), orderBy('timestamp', 'desc')), (snapshot) => {
            setProductionAnalytics(snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : new Date(doc.data().timestamp)
            })));
        }, (error) => console.error("Snapshot ProdAnalytics Error:", error));

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
            unsubSubscriptions();
            unsubQuotes();
            unsubUsers();
            unsubUnits();
            unsubProdAnalytics();
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
    
    // ── MOTOR DE ANALÍTICAS UNIFICADAS DE PRODUCCIÓN ──────────────────────────
    const processedProductionOrders = useMemo(() => {
        return (Array.isArray(productionOrders) ? productionOrders : []).map(odp => {
            const parseVal = (val) => {
                if (!val) return null;
                if (val instanceof Date) return val;
                if (typeof val === 'object' && 'seconds' in val) return new Date(val.seconds * 1000);
                const d = new Date(val);
                return isNaN(d.getTime()) ? null : d;
            };

            const startTime = parseVal(odp.started_at);
            const endTime = parseVal(odp.completed_at);
            const createdAt = parseVal(odp.created_at);
            const refDate = endTime || createdAt || new Date();

            let efficiency = 0;
            if (startTime && endTime) {
                const diffHr = (endTime - startTime) / (1000 * 60 * 60);
                if (diffHr > 0) efficiency = Math.round(Number(odp.custom_qty || 0) / diffHr);
            }

            const isDone = odp.completed_at || ['DONE', 'Finalizada', 'Finalizado'].includes(odp.status);

            return {
                ...odp,
                startTime,
                endTime,
                createdAt,
                refDate,
                efficiency,
                isDone,
                wastePercent: Number(odp.custom_qty) > 0 ? ((Number(odp.waste_qty || 0) / Number(odp.custom_qty)) * 100).toFixed(1) : '0.0'
            };
        });
    }, [productionOrders]);

    const addClient = useCallback(async (clientData) => {
        try {
            const docRef = await addDoc(collection(db, 'clients'), {
                ...clientData,
                status: clientData.status || 'Active',
                created_at: new Date().toISOString()
            });
            return { success: true, id: docRef.id };
        } catch (err) {
            console.error("Error adding client:", err);
            return { success: false, error: err.message };
        }
    }, []);

    const upsertMember = useCallback(async (memberData) => {
        try {
            const nit = memberData.nit?.trim();
            const email = memberData.email?.toLowerCase().trim();
            
            if (!nit) throw new Error("NIT Requerido para registro.");
            
            // 1. Verificar existencia por NIT
            const qNit = query(collection(db, 'clients'), where('nit', '==', nit));
            const snapNit = await getDocs(qNit);
            
            // 2. Verificar existencia por Email
            const qEmail = query(collection(db, 'clients'), where('email', '==', email));
            const snapEmail = await getDocs(qEmail);

            const existingByNit = !snapNit.empty ? snapNit.docs[0].data() : null;
            const existingByEmail = !snapEmail.empty ? snapEmail.docs[0].data() : null;

            // Si ya es miembro con esa cédula o correo, abortar con mensaje claro
            if ((existingByNit && existingByNit.is_member) || (existingByEmail && existingByEmail.is_member)) {
                return { 
                    success: false, 
                    error: "Ya existe un socio registrado con esta cédula o correo electrónico. Por favor, intenta iniciar sesión." 
                };
            }

            let finalId;
            let finalData;

            if (!snapNit.empty) {
                // Actualizar cliente existente (que quizá no era miembro aún)
                finalId = snapNit.docs[0].id;
                finalData = {
                    ...snapNit.docs[0].data(),
                    ...memberData,
                    email, // Asegurar email normalizado
                    is_member: true,
                    status: 'Active',
                    updated_at: new Date().toISOString()
                };
                await updateDoc(doc(db, 'clients', finalId), finalData);
                return { success: true, id: finalId, mode: 'updated', data: finalData };
            } else {
                // Crear nuevo socio desde cero
                finalData = {
                    ...memberData,
                    email,
                    is_member: true,
                    status: 'Active',
                    created_at: new Date().toISOString()
                };
                const docRef = await addDoc(collection(db, 'clients'), finalData);
                return { success: true, id: docRef.id, mode: 'created', data: finalData };
            }
        } catch (err) {
            console.error("Error in upsertMember:", err);
            return { success: false, error: err.message };
        }
    }, []);

    const sendWelcomeEmail = useCallback(async (memberData, plan) => {
        try {
            const months = plan.split(' ')[0];
            const discount = siteContent.recurring?.[`plan_${months}_discount`] || 0;
            const isFreeShipping = String(siteContent.recurring?.[`plan_${months}_shipping`]).toLowerCase() === 'gratis' || months === '12';

            const emailData = {
                to: memberData.email,
                message: {
                    subject: '🌿 ¡Bienvenido al Círculo Zeticas!',
                    html: `
                        <div style="font-family: 'Playfair Display', serif; color: #025357; padding: 40px; background-color: #f8f9f5; border-radius: 20px;">
                            <center>
                                <img src="https://zeticas.com/favicon.png" width="80" style="margin-bottom: 20px;">
                                <h1 style="color: #025357; font-size: 28px; margin-bottom: 10px;">¡Hola, ${memberData.name}!</h1>
                                <p style="font-size: 18px; color: #555;">Es un gusto darte la bienvenida al <b>Círculo de Suscripción Zeticas</b>.</p>
                            </center>
                            
                            <div style="background: white; padding: 30px; border-radius: 15px; margin-top: 30px; border-left: 5px solid #D6BD98;">
                                <h3 style="color: #025357; margin-top: 0;">Tu membresía de ${plan} está activa</h3>
                                <p style="margin-bottom: 20px;">Desde hoy, eres parte de una comunidad que valora lo artesanal y apoya directamente al campo. Estos son tus beneficios exclusivos:</p>
                                
                                <ul style="list-style: none; padding: 0;">
                                    <li style="margin-bottom: 15px;">✅ <b>Ahorro Permanente:</b> Tienes un <b>${discount}% de descuento</b> aplicado automáticamente en todos tus productos terminados.</li>
                                    <li style="margin-bottom: 15px;">✅ <b>Logística Premium:</b> Tus envíos son prioritarios. ${isFreeShipping ? '¡Cuentas con <b>envío gratis</b> en todos tus pedidos!' : 'Cuentas con tarifas preferenciales de envío.'}</li>
                                    <li style="margin-bottom: 15px;">✅ <b>Despensa Inteligente:</b> Nosotros programamos tu entrega según tu frecuencia favorita para que nunca te falte el sabor de la Sabana.</li>
                                </ul>
                            </div>

                            <p style="margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
                                Pronto nos pondremos en contacto contigo para coordinar tu primer despacho.<br>
                                Si tienes dudas, escríbenos a este correo o por WhatsApp.
                            </p>
                            
                            <hr style="border: 0; border-top: 1px solid #D6BD98; margin: 40px 0;">
                            
                            <center>
                                <p style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px;">Propósito Artesanal • Zeticas</p>
                            </center>
                        </div>
                    `
                },
                from: 'zeticas@gmail.com',
                created_at: new Date().toISOString(),
                member_nit: memberData.nit || '',
                type: 'welcome_subscription'
            };

            await addDoc(collection(db, 'mail'), emailData);
            console.log("✅ Welcome email queued for:", memberData.email);
            return { success: true };
        } catch (err) {
            console.error("Error queueing welcome email:", err);
            return { success: false, error: err.message };
        }
    }, [siteContent]);

    const addOrder = useCallback(async (orderData) => {
        try {
            const counterRef = doc(db, 'metadata', 'counters');
            let finalNumber;

            // Transacción para obtener el siguiente número y aumentarlo
            await runTransaction(db, async (transaction) => {
                const counterDoc = await transaction.get(counterRef);
                if (!counterDoc.exists()) {
                    transaction.set(counterRef, { last_order_number: 1 });
                    finalNumber = 1;
                } else {
                    const nextVal = (counterDoc.data().last_order_number || 0) + 1;
                    transaction.update(counterRef, { last_order_number: nextVal });
                    finalNumber = nextVal;
                }
            });

            const paddedNumber = String(finalNumber).padStart(4, '0');
            const source = orderData.source || 'Manual';
            
            // Determinar prefijo basándose en fuente
            let prefix = 'MAN';
            if (source.toLowerCase().includes('web')) prefix = 'WEB';
            if (source.toLowerCase().includes('suscrip')) prefix = 'SUBS';
            
            const displayId = `${prefix}-${paddedNumber}`;
            
            // Si el pedido ya está pagado, actualizar banco
            if (orderData.payment_status === 'Pagado' && orderData.amount > 0 && orderData.payment_bank_id) {
                await updateBankBalance(
                    orderData.payment_bank_id, 
                    orderData.amount, 
                    'income', 
                    `Recaudo Venta ${displayId}`, 
                    `Venta ${source}`
                );
            }

            const docRef = await addDoc(collection(db, 'orders'), {
                ...orderData,
                id: displayId,
                order_number: displayId,
                created_at: new Date().toISOString()
            });

            return { success: true, id: docRef.id, displayId };
        } catch (err) {
            console.error("Error adding order:", err);
            return { success: false, error: err.message };
        }
    }, [updateBankBalance]);

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

    const deleteOrders = useCallback(async (ids, user = null) => {
        try {
            const idArray = Array.isArray(ids) ? ids : [ids];
            const finalStatuses = ['finalizado', 'entregado', 'cobrado'];

            for (const id of idArray) {
                const orderRef = doc(db, 'orders', id);
                const snap = await getDoc(orderRef);
                
                if (snap.exists()) {
                    const data = snap.data();
                    
                    // REVERSAL LOGIC: If order was already subtracting from inventory, add it back
                    if (data.status && finalStatuses.includes(data.status.toLowerCase())) {
                        if (data.items) {
                            for (const item of data.items) {
                                if (item.id) {
                                    try {
                                        await updateDoc(doc(db, 'products', item.id), {
                                            sales: increment(-(Number(item.quantity) || 0))
                                        });
                                    } catch (e) {
                                        console.warn(`Failed to reverse stock for ${item.id} on delete:`, e);
                                    }
                                }
                            }
                        }
                    }

                    // Audit Log
                    await addAdminLog('DELETE_ORDER', {
                        order_id: data.order_number || id,
                        client: data.client,
                        amount: data.total_amount || data.amount,
                        status_at_deletion: data.status
                    }, user);

                    await deleteDoc(orderRef);
                }
            }
            return { success: true };
        } catch (err) {
            console.error("Error deleting orders:", err);
            return { success: false, error: err.message };
        }
    }, [addAdminLog]);

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
                    const factor = Number(material.conversion_factor) || 1;
                    
                    let qtyInPurchaseUnit = ingredient.qty;
                    if (ingredient.unit !== material.purchase_unit) {
                        // If ingredient unit is the 'usage unt' (unit_measure), use specific factor
                        if (ingredient.unit === (material.unit_measure || material.unit)) {
                            qtyInPurchaseUnit = ingredient.qty / factor;
                        } else {
                            // Otherwise fallback to SI conversion
                            qtyInPurchaseUnit = convertUnit(ingredient.qty, ingredient.unit, material.purchase_unit);
                        }
                    }
                    totalCost += qtyInPurchaseUnit * materialCost;
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

    /**
     * processItemStockDeduction: Recursive function to explode Kits and Recipes into physical stock deduction.
     */
    const processItemStockDeduction = useCallback(async (itemId, quantity) => {
        try {
            // Normalize ID and find product
            const product = items.find(i => i.id === itemId);
            if (!product) {
                console.warn(`Item deduction skipped: Product ${itemId} not found in state.`);
                return;
            }

            // A. Increment Sales for the item (Finished Good or Kit)
            await updateDoc(doc(db, 'products', itemId), {
                sales: increment(Number(quantity) || 0)
            });

            // B. If it's a Kit, explode components (Recursive)
            if (product.product_type === 'Kit' && product.components && Array.isArray(product.components)) {
                for (const comp of product.components) {
                    // Multiply component qty by kit qty sold
                    const totalCompQty = (Number(comp.qty) || 0) * (Number(quantity) || 0);
                    if (totalCompQty > 0) {
                        await processItemStockDeduction(comp.id, totalCompQty);
                    }
                }
            } else {
                // C. If it's NOT a Kit but has a recipe, explode materials (Failsafe)
                const recipeList = recipes[itemId] || recipes[product.name] || [];
                if (recipeList.length > 0) {
                    const yieldQty = Number(recipeList[0].yield_quantity) || 1;
                    const materialsToConsume = recipeList.map(r => ({
                        id: r.rm_id,
                        qtyToConsume: (Number(r.qty) / yieldQty) * (Number(quantity) || 0)
                    }));
                    await consumeMaterials(materialsToConsume);
                }
            }
        } catch (e) {
            console.error(`Recursive stock deduction failed for ${itemId}:`, e);
        }
    }, [items, recipes, consumeMaterials]);

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

            // 2. Physical Stock Deduction & Kit/Recipe Explosion
            const finalStatuses = ['finalizado', 'entregado', 'cobrado'];
            if (data.status && finalStatuses.includes(data.status.toLowerCase())) {
                const wasFinal = oldData.status && finalStatuses.includes(oldData.status.toLowerCase());
                const alreadyConsumed = oldData.materials_consumed === true || data.materials_consumed === true;

                if (!wasFinal && oldData.items && !alreadyConsumed) {
                    for (const item of oldData.items) {
                        if (item.id) {
                            await processItemStockDeduction(item.id, item.quantity);
                        }
                    }
                    // Mark as consumed to prevent double-deduction if order is edited later
                    data.materials_consumed = true;
                }
            }

            // 3. Final Firestore Update
            await updateDoc(orderRef, data);
            return { success: true };
        } catch (err) {
            console.error("Critical error in updateOrder:", err);
            return { success: false, error: err.message };
        }
    }, [processItemStockDeduction]);

    const addPurchase = useCallback(async (purchaseData) => {
        try {
            const counterRef = doc(db, 'metadata', 'counters');
            let finalId;

            await runTransaction(db, async (transaction) => {
                const counterDoc = await transaction.get(counterRef);
                let nextVal = 1;
                
                if (counterDoc.exists()) {
                    nextVal = (counterDoc.data().last_purchase_number || 0) + 1;
                    transaction.update(counterRef, { last_purchase_number: nextVal });
                } else {
                    transaction.set(counterRef, { last_purchase_number: 1 }, { merge: true });
                }
                
                finalId = `OC-${String(nextVal).padStart(4, '0')}`;
            });

            const docRef = await addDoc(collection(db, 'purchase_orders'), {
                ...purchaseData,
                id: finalId,
                order_number: finalId,
                created_at: new Date().toISOString()
            });

            return { success: true, id: docRef.id, displayId: finalId };
        } catch (err) {
            console.error("Error adding purchase order:", err);
            return { success: false, error: err.message };
        }
    }, []);

    const addExpense = useCallback(async (data) => {
        try {
            const expenseData = {
                ...data,
                date: data.date || data.expense_date || new Date().toLocaleDateString('en-CA'),
                created_at: new Date().toISOString()
            };
            const docRef = await addDoc(collection(db, 'expenses'), expenseData);

            // AUTO-BANK MOVEMENT
            if (expenseData.bank_id || expenseData.bankId) {
                await updateBankBalance(
                    expenseData.bank_id || expenseData.bankId,
                    Number(expenseData.amount),
                    'expense',
                    `Gasto: ${expenseData.description || expenseData.category}`,
                    expenseData.category
                );

                // LOGIC FOR BANK TRANSFERS
                if (expenseData.category === 'Traslado entre Bancos' && expenseData.target_bank_id) {
                    await updateBankBalance(
                        expenseData.target_bank_id,
                        Number(expenseData.amount),
                        'income',
                        `Entrada por Traslado: ${expenseData.description}`,
                        'Traslado entre Bancos'
                    );
                }
            }

            return { success: true, id: docRef.id };
        } catch (err) { 
            console.error("Error adding expense:", err);
            return { success: false, error: err.message }; 
        }
    }, [updateBankBalance]);

    const updateExpense = useCallback(async (id, data) => {
        try {
            await updateDoc(doc(db, 'expenses', id), { 
                ...data, 
                date: data.date || data.expense_date,
                updated_at: new Date().toISOString() 
            });
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, []);

    const deleteExpense = useCallback(async (id, user = null) => {
        try {
            const expenseRef = doc(db, 'expenses', id);
            const snap = await getDoc(expenseRef);
            if (!snap.exists()) throw new Error("Gasto no encontrado");
            const data = snap.data();

            // REVERSE BANK MOVEMENT
            if (data.bank_id || data.bankId) {
                await updateBankBalance(
                    data.bank_id || data.bankId,
                    Number(data.amount),
                    'income',
                    `Reversa Eliminación Gasto: ${data.description || data.category}`,
                    'Ajuste por Eliminación'
                );
            }

            // Audit Log
            await addAdminLog('DELETE_EXPENSE', {
                amount: data.amount,
                category: data.category,
                description: data.description,
                date: data.date
            }, user);

            await deleteDoc(expenseRef);
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, [updateBankBalance, addAdminLog]);

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
            // Attempt deletion in Supabase (New system)
            const { error } = await supabase.from('quotations').delete().eq('id', id);
            
            // For backward compatibility, also delete in Firebase if it's still there
            try {
                await deleteDoc(doc(db, 'quotations', id));
            } catch (firebaseErr) {
                console.warn("Firebase delete failed (expected if migrating):", firebaseErr.message);
            }

            if (error) throw error;
            
            // Update local state if we're not using a real-time listener for Supabase yet
            setQuotations(prev => prev.filter(q => q.id !== id));

            return { success: true };
        } catch (err) { 
            console.error("Error deleting quotation:", err);
            return { success: false, error: err.message }; 
        }
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

            // 4. Automatic Cost Recalculation (Cascade update for PT margins)
            await recalculatePTCosts();

            return { success: true };
        } catch (err) {
            console.error("Critical error in receivePurchase:", err);
            return { success: false, error: err.message };
        }
    }, [convertUnit, recalculatePTCosts]);

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
                date: new Date().toLocaleDateString('en-CA'),
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

    const saveProductionSnapshot = useCallback(async (odp) => {
        try {
            const parseVal = (val) => {
                if (!val) return null;
                if (val instanceof Date) return val;
                if (typeof val === 'object' && 'seconds' in val) return new Date(val.seconds * 1000);
                const d = new Date(val);
                return isNaN(d.getTime()) ? null : d;
            };

            const startTime = parseVal(odp.started_at);
            const endTime = parseVal(odp.completed_at || new Date());
            const createdAt = parseVal(odp.created_at);
            
            let efficiency = 0;
            let leadTimeHrs = 0;
            if (startTime && endTime) {
                const diffHr = Math.abs(endTime - startTime) / (1000 * 60 * 60);
                if (diffHr > 0) efficiency = Number((Number(odp.custom_qty || 0) / diffHr).toFixed(1));
            }
            if (createdAt && endTime) {
                leadTimeHrs = Number((Math.abs(endTime - createdAt) / (1000 * 60 * 60)).toFixed(1));
            }

            const wasteQty = Number(odp.waste_qty || 0);
            const goodQty = Number(odp.custom_qty || 0);
            const totalQty = goodQty + wasteQty;
            const qualityPercent = totalQty > 0 ? Number(((goodQty / totalQty) * 100).toFixed(1)) : 100;

            const snapshot = {
                odpId: odp.id || odp.odp_number,
                sku: odp.sku,
                date: endTime ? endTime.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                timestamp: endTime || new Date(),
                efficiency,
                leadTimeHrs,
                qualityPercent,
                wasteQty,
                producedQty: goodQty,
                status: 'FINALIZADO',
                // OEE Components (Initial placeholders - can be refined with machine data)
                availability: 100, 
                performance: efficiency > 0 ? 100 : 0, 
                quality: qualityPercent
            };

            await addDoc(collection(db, 'production_analytics'), snapshot);
        } catch (err) {
            console.error("Error saving production snapshot:", err);
        }
    }, []);

    const saveOdp = useCallback(async (sku, payload) => {
        try {
            const q = query(collection(db, 'production_orders'), where('sku', '==', sku));
            const snapshot = await getDocs(q);
            const counterRef = doc(db, 'metadata', 'counters');
            
            if (!snapshot.empty) {
                // UPDATE existing ODP
                const docId = snapshot.docs[0].id;
                await updateDoc(doc(db, 'production_orders', docId), { ...payload, updated_at: new Date().toISOString() });
            } else {
                // CREATE new ODP with sequential numbering
                let finalOdpId = payload.odp_number;
                
                if (!finalOdpId || finalOdpId.includes('REF')) {
                    await runTransaction(db, async (transaction) => {
                        const counterDoc = await transaction.get(counterRef);
                        let nextVal = 1;
                        if (counterDoc.exists()) {
                            nextVal = (counterDoc.data().last_production_number || 0) + 1;
                            transaction.update(counterRef, { last_production_number: nextVal });
                        } else {
                            transaction.set(counterRef, { last_production_number: 1 }, { merge: true });
                        }
                        finalOdpId = `ODP-${String(nextVal).padStart(4, '0')}`;
                    });
                }

                const finalizedOdp = { 
                    ...payload, 
                    sku, 
                    odp_number: finalOdpId,
                    created_at: new Date().toISOString() 
                };
                const newDoc = await addDoc(collection(db, 'production_orders'), finalizedOdp);

                // CREAR SNAPSHOT DE ANALÍTICAS SI ESTÁ FINALIZADA
                if (payload.status === 'DONE' || payload.status === 'Finalizada' || payload.status === 'Finalizado') {
                    await saveProductionSnapshot({ ...finalizedOdp, id: newDoc.id });
                }
            }
            return { success: true };
        } catch (err) { 
            console.error("Error saving ODP:", err);
            return { success: false, error: err.message }; 
        }
    }, [saveProductionSnapshot]);

    const deleteOdp = useCallback(async (dbId, user = null) => {
        try {
            if (!dbId) throw new Error("ID de documento no definido.");
            const odpRef = doc(db, 'production_orders', dbId);
            const snap = await getDoc(odpRef);
            
            if (snap.exists()) {
                const data = snap.data();
                const finalStatuses = ['DONE', 'Finalizada', 'Finalizado'];

                // REVERSAL LOGIC: If ODP was already adding to inventory, subtract it
                if (data.status && finalStatuses.includes(data.status)) {
                    // Find product by SKU/Name to reverse 'purchases'
                    const q = query(collection(db, 'products'), where('name', '==', data.sku));
                    const prodSnap = await getDocs(q);
                    if (!prodSnap.empty) {
                        try {
                            await updateDoc(prodSnap.docs[0].ref, {
                                purchases: increment(-(Number(data.custom_qty || 0)))
                            });
                        } catch (e) {
                            console.warn("Failed to reverse ODP stock on delete:", e);
                        }
                    }
                }

                // Audit Log
                await addAdminLog('DELETE_ODP', {
                    odp_number: data.odp_number,
                    sku: data.sku,
                    quantity: data.custom_qty,
                    status_at_deletion: data.status
                }, user);

                await deleteDoc(odpRef);
            }
            return { success: true };
        } catch (err) {
            console.error("Error deleting ODP:", err);
            return { success: false, error: err.message };
        }
    }, [addAdminLog]);

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
            const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
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
        loading, items, recipes, providers, orders: enrichedOrders, expenses, purchaseOrders, banks, bankTransactions, taxSettings, clients, siteContent, lastUpdate, lastPublish: buildInfo.lastPublish, productionOrders: processedProductionOrders, rawProductionOrders: productionOrders, productionAnalytics, users, units, ownCompany, leads, subscriptions, quotations, analytics,
        setItems, setOrders, setExpenses, setPurchaseOrders, setBanks, setBankTransactions, setClients, setSiteContent, setProductionOrders, setLeads, setSubscriptions, setUsers, setUnits, setTaxSettings, setAnalytics,
        refreshData, addClient, upsertMember, addOrder, deleteOrders, updateSiteContent, recalculatePTCosts, updateBankBalance, updateClient, deleteClient,
        addItem, updateItem, deleteItem, addSupplier, updateSupplier, deleteSupplier, updateOrder, addPurchase, addRecipe, deleteRecipeByProduct, saveOdp, deleteOdp, addExpense, updateExpense, deleteExpense, addBank, updateBank, deleteBank, receivePurchase, payPurchase, updateLead, addLead, deleteLead, addQuotation, deleteQuotation,
        addUser, updateUser, deleteUser, consumeMaterials, loadFinishedGoods, saveConversion, convertUnit, saveWebCheckout, getWebCheckout, updateWebCheckoutStatus, addRejectedProduct, createInternalOrder, updateInventoryConfig, logVisit, addAdminLog, auditStockAdjustment, sendWelcomeEmail
    }), [
        loading, items, recipes, providers, enrichedOrders, expenses, purchaseOrders, banks, bankTransactions, taxSettings, clients, siteContent, lastUpdate, processedProductionOrders, productionOrders, productionAnalytics, leads, subscriptions, quotations, users, units, ownCompany, analytics,
        setItems, setOrders, setExpenses, setPurchaseOrders, setBanks, setBankTransactions, setClients, setSiteContent, setProductionOrders, setLeads, setSubscriptions, setUsers, setUnits, setTaxSettings, setAnalytics,
        refreshData, addClient, upsertMember, addOrder, deleteOrders, updateSiteContent, recalculatePTCosts, updateBankBalance, updateClient, deleteClient,
        addItem, updateItem, deleteItem, addSupplier, updateSupplier, deleteSupplier, updateOrder, addPurchase, addRecipe, deleteRecipeByProduct, saveOdp, deleteOdp, addExpense, updateExpense, deleteExpense, addBank, updateBank, deleteBank, receivePurchase, payPurchase, updateLead, addLead, deleteLead, addQuotation, deleteQuotation,
        addUser, updateUser, deleteUser, consumeMaterials, loadFinishedGoods, saveConversion, convertUnit, saveWebCheckout, getWebCheckout, updateWebCheckoutStatus, addRejectedProduct, createInternalOrder, updateInventoryConfig, logVisit, addAdminLog, auditStockAdjustment, sendWelcomeEmail
    ]);

    return (
        <BusinessContext.Provider value={value}>
            {children}
        </BusinessContext.Provider>
    );
};

export const useBusiness = () => useContext(BusinessContext);
