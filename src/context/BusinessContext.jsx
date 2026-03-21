import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { products as masterProducts } from '../data/products';

const BusinessContext = createContext();

export const BusinessProvider = ({ children }) => {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);

    const [recipes, setRecipes] = useState({});
    const [providers, setProviders] = useState([]);

    const [orders, setOrders] = useState([]);

    const [expenses, setExpenses] = useState([]);

    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [banks, setBanks] = useState([]);

    const [taxSettings, setTaxSettings] = useState({
        iva: 19,
        retefuente: 2.5,
        ica: 9.6,
        renta: 35
    });

    const [clients, setClients] = useState([]);
    const [lastUpdate, setLastUpdate] = useState(null);

    const refreshData = async () => {
        try {
            // 1. Fetch Products (Inventory)
            const { data: prodData, error: prodError } = await supabase.from('products').select('*');
            if (!prodError && prodData?.length > 0) {
                const synchronizedItems = prodData.map(p => {
                    let price = p.price || 0;

                    // Sincronización con Data Maestra
                    if (price === 0 || price === null) {
                        const normalizedDbName = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                        const manualMappings = {
                            'vinagreta': 'vinagretamigalaba',
                            'antipastotuna': 'antipastoatunahumado',
                            'hummusdegarbanzo': 'hummusdegarbanzo'
                        };
                        const targetName = manualMappings[normalizedDbName] || normalizedDbName;
                        const masterMatch = masterProducts.find(mp =>
                            mp.nombre.toLowerCase().replace(/[^a-z0-9]/g, '') === targetName
                        );
                        if (masterMatch) price = masterMatch.precio;
                    }

                    return {
                        id: p.id,
                        name: p.name,
                        type: p.type === 'PT' ? 'product' : 'material',
                        initial: p.stock || 0,
                        purchases: 0,
                        sales: 0,
                        safety: p.min_stock_level || 0,
                        unit: p.unit_measure,
                        group: p.category || 'Otros',
                        avgCost: p.cost || 0,
                        price: price,
                        sku: p.sku
                    };
                });
                setItems(synchronizedItems);
            }

            // 2. Fetch Clients (PRIORITY & Correct Sorting)
            const { data: clientDataRes } = await supabase
                .from('clients')
                .select('*')
                .order('created_at', { ascending: false });

            if (clientDataRes) {
                setClients(clientDataRes.map(c => ({
                    id: c.id,
                    name: c.name || '',
                    nit: c.nit || '',
                    idType: c.id_type || 'NIT',
                    email: c.email || '',
                    phone: c.phone || '',
                    address: c.address || '',
                    city: c.city || '',
                    contactName: c.contact_name || '',
                    type: c.type || 'Jurídica',
                    subType: c.sub_type || (c.type === 'Natural' ? 'B2C' : 'B2B'),
                    source: c.source || '',
                    status: c.status || 'Active',
                    balance: 0,
                    createdAt: c.created_at || ''
                })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            }

            // 3. Fetch Banks
            const { data: bankData } = await supabase.from('banks').select('*');
            if (bankData?.length > 0) setBanks(bankData);

            // 4. Fetch Orders
            const { data: ordData } = await supabase
                .from('orders')
                .select(`*, order_items(*, product:products(name, sku)), client:clients(name)`)
                .order('created_at', { ascending: false });

            if (ordData?.length > 0) {
                const mappedOrders = ordData.map(o => ({
                    id: o.order_number || o.id,
                    dbId: o.id,
                    client: o.client?.name || o.clients?.[0]?.name || o.clients?.name || 'Cliente Desconocido',
                    amount: o.total_amount || 0,
                    date: o.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
                    realDate: o.created_at || '',
                    status: o.status,
                    source: o.source,
                    invoiceNum: o.invoice_number,
                    dispatchedAt: o.dispatched_at,
                    bankId: o.payment_bank_id,
                    items: (o.order_items || []).map(oi => ({
                        id: oi.product_id,
                        sku: oi.product?.sku || oi.products?.sku || oi.product_id,
                        name: oi.product?.name || oi.products?.name || 'Producto',
                        quantity: oi.quantity || 0,
                        price: oi.unit_price || 0
                    }))
                }));

                // Sorting: Finalized at bottom, Newest at top
                const finalizedStatuses = ['Despachado', 'Entregado', 'Pagado', 'Cerrado'];
                const sortedOrders = [...mappedOrders].sort((a, b) => {
                    const aFinalized = finalizedStatuses.includes(a.status);
                    const bFinalized = finalizedStatuses.includes(b.status);
                    if (aFinalized && !bFinalized) return 1;
                    if (!aFinalized && bFinalized) return -1;
                    return new Date(b.realDate) - new Date(a.realDate);
                });

                setOrders(sortedOrders);
            }

            // 5. Recipes and Providers
            const { data: recData } = await supabase.from('recipes').select('*, products!finished_good_id(name, sku), raw:products!raw_material_id(id, name, sku)');
            if (recData) {
                const groupedRecipes = {};
                recData.forEach(r => {
                    const fgName = r.products?.name;
                    if (!fgName) return;
                    if (!groupedRecipes[fgName]) groupedRecipes[fgName] = [];
                    groupedRecipes[fgName].push({
                        id: r.raw?.id, name: r.raw?.name, sku: r.raw?.sku, qty: r.quantity_required
                    });
                });
                setRecipes(groupedRecipes);
            }

            const { data: provData } = await supabase.from('suppliers').select('*');
            if (provData) {
                setProviders(provData.map(p => ({
                    id: p.id,
                    name: p.name,
                    nit: p.nit,
                    group: p.category || 'General',
                    phone: p.phone,
                    email: p.email,
                    address: p.address,
                    city: p.city,
                    contact_person: p.contact_person,
                    associatedItems: p.associated_items || []
                })));
            }

            // 6. Purchases
            const { data: purData, error: purError } = await supabase
                .from('purchases')
                .select(`*, purchase_items(*, products(name, type)), suppliers(name)`);

            if (!purError && purData?.length > 0) {
                const mappedPurchases = purData.map(p => ({
                    id: p.po_number || p.id,
                    dbId: p.id,
                    providerId: p.supplier_id,
                    providerName: p.suppliers?.name || 'Proveedor',
                    date: p.created_at?.split('T')[0],
                    realDate: p.created_at || '',
                    total: p.total_cost,
                    status: p.status,
                    paymentStatus: p.payment_status,
                    relatedOrders: p.associated_orders ? p.associated_orders.split(', ') : [],
                    items: p.purchase_items.map(pi => ({
                        id: pi.raw_material_id,
                        name: pi.products?.name || 'Material',
                        type: pi.products?.type || 'MP',
                        toBuy: pi.quantity,
                        purchasePrice: pi.unit_cost
                    }))
                }));

                // Sorting: Finalized at bottom, Newest at top
                const purchaseFinalizedStatuses = ['Recibido', 'Pagado', 'Completado'];
                const sortedPurchases = [...mappedPurchases].sort((a, b) => {
                    const aFinalized = purchaseFinalizedStatuses.includes(a.status) || a.paymentStatus === 'Pagado';
                    const bFinalized = purchaseFinalizedStatuses.includes(b.status) || b.paymentStatus === 'Pagado';
                    if (aFinalized && !bFinalized) return 1;
                    if (!aFinalized && bFinalized) return -1;
                    return new Date(b.realDate) - new Date(a.realDate);
                });

                setPurchaseOrders(sortedPurchases);
            }

            // 7. Expenses
            const { data: expData } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false });
            if (expData?.length > 0) {
                setExpenses(expData.map(e => ({
                    id: e.id, date: e.expense_date, category: e.category,
                    description: e.description, amount: e.amount, bankId: e.bank_id
                })));
            }

            setLastUpdate(new Date().toLocaleString('es-CO', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            }));

        } catch (err) {
            console.error("Critical error fetching from Supabase:", err);
        } finally {
            setLoading(false);
        }
    };

    const addClient = async (clientData) => {
        try {
            if (clientData.nit && clientData.nit.trim() !== '') {
                const { data: existing } = await supabase
                    .from('clients')
                    .select('id, name')
                    .eq('nit', clientData.nit.trim())
                    .maybeSingle();

                if (existing) {
                    throw new Error(`Ya existe un cliente (${existing.name}) con este número de identificación: ${clientData.nit}`);
                }
            }

            const { data, error } = await supabase.from('clients').insert([{
                name: clientData.name,
                nit: clientData.nit || '',
                id_type: clientData.idType || 'NIT',
                email: clientData.email || '',
                phone: clientData.phone || '',
                address: clientData.address || '',
                city: clientData.city || '',
                contact_name: clientData.contactName || '',
                type: clientData.type || 'Jurídica',
                sub_type: clientData.subType || 'B2B',
                source: clientData.source || 'CRM',
                status: 'Active'
            }]).select().single();

            if (error) throw error;
            await refreshData();
            return { success: true, data };
        } catch (err) {
            console.error("Error adding client:", err);
            return { success: false, error: err.message };
        }
    };

    useEffect(() => {
        refreshData();

        // Centralized Realtime Subscriptions
        const channel = supabase.channel('business-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
                refreshData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                refreshData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_orders' }, () => {
                refreshData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
                refreshData();
            })
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') {
                    console.warn('Business Realtime connection failed (Channel Error). Realtime updates may be disabled.');
                    supabase.removeChannel(channel);
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const recalculatePTCosts = async () => {
        try {
            const { data: products } = await supabase.from('products').select('id, name, cost, type');
            if (!products) return;

            const { data: recipesData } = await supabase.from('recipes').select('finished_good_id, raw_material_id, quantity_required');
            if (!recipesData) return;

            const costMap = {};
            const pts = products.filter(p => p.type === 'PT');
            products.forEach(p => {
                costMap[p.id] = p.cost || 0;
            });

            const updates = [];
            for (const pt of pts) {
                const myIngredients = recipesData.filter(r => r.finished_good_id === pt.id);
                if (myIngredients.length === 0) continue;

                const totalCost = myIngredients.reduce((sum, ing) => {
                    const ingredientCost = costMap[ing.raw_material_id] || 0;
                    return sum + (ingredientCost * ing.quantity_required);
                }, 0);

                if (Math.round(totalCost) !== Math.round(pt.cost || 0)) {
                    updates.push(supabase.from('products').update({ cost: Math.round(totalCost) }).eq('id', pt.id));
                }
            }

            if (updates.length > 0) {
                await Promise.all(updates);
            }
            await refreshData();
        } catch (err) {
            console.error("Error recalculating PT costs:", err);
        }
    };

    const updateBankBalance = async (bankId, amount, type, description = '', relatedId = '') => {
        try {
            const bank = banks.find(b => b.id === bankId);
            if (!bank) throw new Error("Banco no encontrado");

            const currentBalance = Number(bank.balance) || 0;
            const newBalance = type === 'income' ? currentBalance + Number(amount) : currentBalance - Number(amount);

            // 1. Update Banks Table
            const { error: bankErr } = await supabase.from('banks').update({ balance: newBalance }).eq('id', bankId);
            if (bankErr) throw bankErr;

            // 2. Record Transaction for Audit / P&G
            await supabase.from('bank_transactions').insert({
                bank_id: bankId,
                amount: Number(amount),
                transaction_type: type.toUpperCase(),
                description,
                related_id: relatedId
            });

            await refreshData();
            return { success: true, newBalance };
        } catch (err) {
            console.error("Error updating bank balance:", err);
            return { success: false, error: err.message };
        }
    };

    const addOrder = async (order) => {
        try {
            const { data, error } = await supabase.from('orders').insert([{
                order_number: order.id,
                total_amount: order.amount,
                status: order.status,
                source: order.source,
                client_id: order.clientId || null
            }]).select().single();

            if (error) throw error;

            // Handle items insertion
            if (order.items && order.items.length > 0) {
                const itemsToInsert = order.items.map(item => ({
                    order_id: data.id,
                    product_id: item.id,
                    quantity: item.quantity,
                    unit_price: item.price,
                    total_price: item.price * item.quantity
                }));
                const { error: itemError } = await supabase.from('order_items').insert(itemsToInsert);
                if (itemError) console.error("Error inserting order items:", itemError);
            }

            await refreshData();
            return { success: true, data };
        } catch (err) {
            console.error("Error adding order:", err);
            return { success: false, error: err.message };
        }
    };
    const deleteOrders = async (ids) => {
        try {
            const idArray = Array.isArray(ids) ? ids : [ids];
            if (idArray.length === 0) return { success: true };

            // 1. Delete items first (Cascade handling)
            const { error: itemsErr } = await supabase.from('order_items').delete().in('order_id', idArray);
            if (itemsErr) throw itemsErr;

            // 2. Delete the orders
            const { error: ordersErr } = await supabase.from('orders').delete().in('id', idArray);
            if (ordersErr) throw ordersErr;

            await refreshData();
            return { success: true };
        } catch (err) {
            console.error("Error deleting orders:", err);
            return { success: false, error: err.message };
        }
    };

    const value = {
        loading,
        items,
        recipes,
        providers,
        orders,
        expenses,
        purchaseOrders,
        banks,
        taxSettings,
        clients,
        lastUpdate,
        refreshData,
        addClient,
        addOrder,
        deleteOrders,
        recalculatePTCosts,
        updateBankBalance
    };

    return (
        <BusinessContext.Provider value={value}>
            {children}
        </BusinessContext.Provider>
    );
};

export const useBusiness = () => {
    const context = useContext(BusinessContext);
    if (!context) {
        throw new Error('useBusiness must be used within a BusinessProvider');
    }
    return context;
};
