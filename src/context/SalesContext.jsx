import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onSnapshot, query, orderBy, updateDoc, deleteDoc, addDoc, increment, getDoc, getDocs, where, runTransaction, setDoc, doc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from './TenantContext';
import { useInventory } from './InventoryContext';
import { supabase } from '../lib/supabase';

const SalesContext = createContext({});

export const SalesProvider = ({ children }) => {
    const { tCol, tDoc, setLoading, updateSyncTime, addAdminLog } = useTenant();
    const { items, recipes, consumeMaterials } = useInventory();

    const [orders, setOrders] = useState([]);
    const [clients, setClients] = useState([]);
    const [quotations, setQuotations] = useState([]);
    const [leads, setLeads] = useState([]);

    const addClient = useCallback(async (data) => {
        try {
            const targetTenants = ['zeticas', 'delta'];
            let finalDisplayId = '';
            let firstDocId = '';

            for (const tId of targetTenants) {
                const counterRef = doc(db, 'tenants', tId, 'metadata', 'counters');
                let finalNumber;

                await runTransaction(db, async (transaction) => {
                    const counterDoc = await transaction.get(counterRef);
                    const nextVal = (counterDoc?.exists() ? (counterDoc.data().last_client_number || 0) : 0) + 1;
                    transaction.set(counterRef, { last_client_number: nextVal }, { merge: true });
                    finalNumber = nextVal;
                });

                const displayId = `CLI-${String(finalNumber).padStart(4, '0')}`;
                if (!finalDisplayId) finalDisplayId = displayId;

                const clientsCol = collection(db, 'tenants', tId, 'clients');
                const clientDocRef = doc(clientsCol, displayId);
                await setDoc(clientDocRef, {
                    ...data,
                    client_number: displayId,
                    id: displayId,
                    created_at: new Date().toISOString()
                });
                if (!firstDocId) firstDocId = displayId;
            }

            return { success: true, id: firstDocId, displayId: finalDisplayId };
        } catch (err) {
            console.error("Error adding client (dual-tenant consecutive):", err);
            return { success: false, error: err.message };
        }
    }, []);

    const updateClient = useCallback(async (clientId, payload) => {
        try {
            await updateDoc(tDoc('clients', clientId), payload);
            return { success: true };
        } catch (err) {
            console.error("Error updating client:", err);
            return { success: false, error: err.message };
        }
    }, [tDoc]);

    /**
     * processItemStockDeduction: Recursive function to explode Kits and Recipes into physical stock deduction.
     */
    const processItemStockDeduction = useCallback(async (itemId, quantity) => {
        try {
            const product = items.find(i => i.id === itemId);
            if (!product) {
                console.warn(`Item deduction skipped: Product ${itemId} not found in state.`);
                return;
            }

            await updateDoc(tDoc('products', itemId), {
                sales: increment(Number(quantity) || 0)
            });

            if (product.product_type === 'Kit' && product.components && Array.isArray(product.components)) {
                for (const comp of product.components) {
                    const totalCompQty = (Number(comp.qty) || 0) * (Number(quantity) || 0);
                    if (totalCompQty > 0) {
                        await processItemStockDeduction(comp.id, totalCompQty);
                    }
                }
            } else {
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
    }, [items, recipes, consumeMaterials, tDoc]);

    const updateOrder = useCallback(async (id, data) => {
        try {
            const orderRef = tDoc('orders', id);
            const snap = await getDoc(orderRef);
            const oldData = snap.exists() ? snap.data() : {};

            if (data.status && data.status !== oldData.status) {
                const now = new Date().toISOString();
                data.last_status_at = now;
                const history = oldData.status_history || [];
                data.status_history = [...history, { status: data.status, at: now }];

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
                    data.materials_consumed = true;
                }
            }

            await updateDoc(orderRef, data);
            return { success: true };
        } catch (err) {
            console.error("Critical error in updateOrder:", err);
            return { success: false, error: err.message };
        }
    }, [tDoc, processItemStockDeduction]);

    const deleteOrders = useCallback(async (ids, user = null) => {
        try {
            const idArray = Array.isArray(ids) ? ids : [ids];
            const finalStatuses = ['finalizado', 'entregado', 'cobrado'];

            for (const id of idArray) {
                const orderRef = tDoc('orders', id);
                const snap = await getDoc(orderRef);
                
                if (snap.exists()) {
                    const data = snap.data();
                    if (data.status && finalStatuses.includes(data.status.toLowerCase())) {
                        if (data.items) {
                            for (const item of data.items) {
                                if (item.id) {
                                    try {
                                        await updateDoc(tDoc('products', item.id), {
                                            sales: increment(-(Number(item.quantity) || 0))
                                        });
                                    } catch (e) {
                                        console.warn(`Failed to reverse stock for ${item.id} on delete:`, e);
                                    }
                                }
                            }
                        }
                    }

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
    }, [addAdminLog, tDoc]);

    const addOrder = useCallback(async (data) => {
        try {
            const targetTenants = ['zeticas', 'delta'];
            let finalDisplayId = '';
            let firstDocId = '';

            for (const tId of targetTenants) {
                const counterRef = doc(db, 'tenants', tId, 'metadata', 'counters');
                let finalNumber;

                await runTransaction(db, async (transaction) => {
                    const counterDoc = await transaction.get(counterRef);
                    const nextVal = (counterDoc?.exists() ? (counterDoc.data().last_order_number || 0) : 0) + 1;
                    transaction.set(counterRef, { last_order_number: nextVal }, { merge: true });
                    finalNumber = nextVal;
                });

                const displayId = String(finalNumber).padStart(4, '0');
                if (!finalDisplayId) finalDisplayId = displayId;

                const ordersCol = collection(db, 'tenants', tId, 'orders');
                const docRef = await addDoc(ordersCol, {
                    ...data,
                    order_number: displayId,
                    id: displayId,
                    created_at: new Date().toISOString()
                });
                if (!firstDocId) firstDocId = docRef.id;
            }

            return { success: true, id: firstDocId, displayId: finalDisplayId };
        } catch (err) {
            console.error("Error adding order (dual-tenant):", err);
            return { success: false, error: err.message };
        }
    }, []);

    const createInternalOrder = useCallback(async (selectedMap = [], type = 'PT') => {
        try {
            const counterRef = tDoc('metadata', 'counters');
            let finalNumber;

            await runTransaction(db, async (transaction) => {
                const counterDoc = await transaction.get(counterRef);
                const nextVal = (counterDoc?.exists() ? (counterDoc.data().last_order_number || 0) : 0) + 1;
                transaction.set(counterRef, { last_order_number: nextVal }, { merge: true });
                finalNumber = nextVal;
            });

            const paddedNumber = String(finalNumber).padStart(4, '0');
            const prefix = type === 'MP' ? 'RMP' : 'RPT';
            const displayId = `${prefix}-${paddedNumber}`;
            
            const isArray = Array.isArray(selectedMap);
            const itemsToProcess = isArray ? selectedMap : Object.keys(selectedMap);

            const allItems = itemsToProcess.map(name => {
                const item = items.find(i => i.name === name);
                const isPT = item?.type === 'product' || item?.category === 'Producto Terminado';
                
                let qty = 1;
                if (!isArray) {
                    qty = selectedMap[name];
                } else {
                    qty = isPT ? Number(item?.batch_size || 1) : 1;
                }
                
                return {
                    name,
                    id: item?.id || null,
                    quantity: Number(qty) || 1,
                    unit: item?.unit || (item?.unit_measure || 'und'),
                    type: isPT ? 'product' : 'material'
                };
            });

            if (allItems.length === 0) return { success: false, error: "No hay ítems seleccionados" };

            const orderData = {
                order_number: displayId,
                id: displayId,
                client: 'Stock Interno',
                client_id: 'INTERNAL_STOCK',
                source: 'Interno',
                items: allItems,
                status: 'Pendiente', 
                payment_status: 'Pagado',
                created_at: new Date().toISOString(),
                amount: 0,
                total_amount: 0,
                is_internal: true,
                production_status: 'scheduled',
                internal_type: type
            };

            const docRef = await addDoc(tCol('orders'), orderData);
            return { success: true, id: docRef.id, displayId };
        } catch (err) {
            console.error("Error creating internal order:", err);
            return { success: false, error: err.message };
        }
    }, [items, tCol, tDoc]);

    const addQuotation = useCallback(async (quoteData) => {
        try { await addDoc(tCol('quotations'), quoteData); return { success: true }; }
        catch (err) { console.error("Error adding quote:", err); return { success: false, error: err.message }; }
    }, [tCol]);

    const deleteQuotation = useCallback(async (id) => {
        try {
            const { error } = await supabase.from('quotations').delete().eq('id', id);
            try {
                await deleteDoc(tDoc('quotations', id));
            } catch (firebaseErr) {
                console.warn("Firebase delete failed (expected if migrating):", firebaseErr.message);
            }
            if (error) throw error;
            return { success: true };
        } catch (err) { 
            console.error("Error deleting quotation:", err);
            return { success: false, error: err.message }; 
        }
    }, [tDoc]);

    const updateLead = useCallback(async (id, data) => {
        try {
            await updateDoc(tDoc('leads', id), { ...data, updated_at: new Date().toISOString() });
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, [tDoc]);

    const upsertMember = useCallback(async (data) => {
        try {
            const targetTenants = ['zeticas', 'delta'];
            const baseId = data.nit || data.idNumber || data.id;
            let masterId = null;
            let existingDocs = {};

            // 1. Buscar en ambos tenants para ver si ya existe un ID CLI-XXXX o documentos antiguos
            for (const tId of targetTenants) {
                const clientsCol = collection(db, 'tenants', tId, 'clients');
                let foundDoc = null;
                if (baseId) {
                    const qNit = query(clientsCol, where('nit', '==', baseId));
                    const snapNit = await getDocs(qNit);
                    if (!snapNit.empty) foundDoc = snapNit.docs[0];
                }
                if (!foundDoc && data.email) {
                    const qEmail = query(clientsCol, where('email', '==', data.email.toLowerCase().trim()));
                    const snapEmail = await getDocs(qEmail);
                    if (!snapEmail.empty) foundDoc = snapEmail.docs[0];
                }

                if (foundDoc) {
                    existingDocs[tId] = foundDoc;
                    const docId = foundDoc.id;
                    const docClientNumber = foundDoc.data().client_number;
                    if (docId.startsWith('CLI-')) { masterId = docId; }
                    else if (docClientNumber && docClientNumber.startsWith('CLI-')) { masterId = docClientNumber; }
                }
            }

            // 2. Si no se encontró ningún masterId CLI-XXXX en ningún tenant, generamos uno nuevo maestro
            if (!masterId) {
                const counterRef = doc(db, 'tenants', 'zeticas', 'metadata', 'counters');
                let finalNumber;
                await runTransaction(db, async (transaction) => {
                    const counterDoc = await transaction.get(counterRef);
                    const nextVal = (counterDoc?.exists() ? (counterDoc.data().last_client_number || 0) : 0) + 1;
                    transaction.set(counterRef, { last_client_number: nextVal }, { merge: true });
                    finalNumber = nextVal;
                });
                masterId = `CLI-${String(finalNumber).padStart(4, '0')}`;
            }

            let finalData = null;

            // 3. Escribir/Migrar en ambos tenants usando el masterId unificado
            for (const tId of targetTenants) {
                const clientsCol = collection(db, 'tenants', tId, 'clients');
                const oldDoc = existingDocs[tId];

                const payload = {
                    ...data,
                    client_number: masterId,
                    id: masterId,
                    updated_at: new Date().toISOString()
                };
                if (data.email) payload.email = data.email.toLowerCase().trim();

                if (oldDoc) {
                    if (oldDoc.id !== masterId) {
                        // MIGRACIÓN: Tiene un ID antiguo aleatorio. Creamos el nuevo con masterId y borramos el viejo.
                        const mergedData = { ...oldDoc.data(), ...payload, id: masterId, client_number: masterId };
                        await setDoc(doc(clientsCol, masterId), mergedData);
                        await deleteDoc(doc(clientsCol, oldDoc.id));
                        finalData = mergedData;
                    } else {
                        // Ya tiene el masterId correcto, solo actualizamos
                        await updateDoc(doc(clientsCol, masterId), payload);
                        finalData = { ...oldDoc.data(), ...payload, id: masterId };
                    }
                } else {
                    // Documento nuevo en este tenant
                    payload.created_at = new Date().toISOString();
                    await setDoc(doc(clientsCol, masterId), payload);
                    finalData = payload;
                }
            }

            return { success: true, id: masterId, data: finalData };
        } catch (err) {
            console.error("Error in upsertMember (dual-tenant unified ID):", err);
            return { success: false, error: err.message };
        }
    }, []);

    const saveWebCheckout = useCallback(async (draftData) => {
        try {
            const targetTenants = ['zeticas', 'delta'];
            let finalId = draftData.orderId || `draft_${Date.now()}`;

            for (const tId of targetTenants) {
                const docRef = doc(db, 'tenants', tId, 'web_checkouts', finalId);
                await setDoc(docRef, { ...draftData, id: finalId, updated_at: new Date().toISOString() }, { merge: true });
            }
            return { success: true, id: finalId };
        } catch (err) {
            console.error("Error in saveWebCheckout (dual-tenant):", err);
            return { success: false, error: err.message };
        }
    }, []);

    const getWebCheckout = useCallback(async (chkID) => {
        try {
            const targetTenants = ['zeticas', 'delta'];
            for (const tId of targetTenants) {
                const docRef = doc(db, 'tenants', tId, 'web_checkouts', chkID);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    return { success: true, data: { ...snap.data(), id: snap.id } };
                }
            }
            throw new Error("Borrador de checkout no encontrado en ningún tenant");
        } catch (err) {
            console.error("Error in getWebCheckout:", err);
            return { success: false, error: err.message };
        }
    }, []);

    const updateWebCheckoutStatus = useCallback(async (chkID, status, boldData = {}) => {
        try {
            const targetTenants = ['zeticas', 'delta'];
            for (const tId of targetTenants) {
                const docRef = doc(db, 'tenants', tId, 'web_checkouts', chkID);
                await setDoc(docRef, { status, bold_data: boldData, updated_at: new Date().toISOString() }, { merge: true });
            }
            return { success: true };
        } catch (err) {
            console.error("Error in updateWebCheckoutStatus (dual-tenant):", err);
            return { success: false, error: err.message };
        }
    }, []);

    const sendWelcomeEmail = useCallback(async (userData, planName, orderSummary = null) => {
        try {
            const targetTenants = ['zeticas', 'delta'];
            const templateData = {
                name: userData.name || userData.nombreCompleto || 'Socio',
                plan: planName || 'Plan Círculo Zeticas',
                frequency: userData.frequency || 'Mensual'
            };

            if (orderSummary) {
                templateData.items = orderSummary.items;
                templateData.subtotal = orderSummary.subtotal;
                templateData.savings = orderSummary.savings;
                templateData.shippingCost = orderSummary.shippingCost;
                templateData.total = orderSummary.total;
                templateData.hasFreeShipping = orderSummary.hasFreeShipping;
            }

            const mailPayload = {
                to: userData.email,
                template: {
                    name: 'welcome_subscription',
                    data: templateData
                },
                created_at: new Date().toISOString()
            };

            // 1. Escribir en la colección raíz 'mail' para que la extensión Trigger Email lo detecte y envíe instantáneamente
            const rootMailCol = collection(db, 'mail');
            await addDoc(rootMailCol, mailPayload);

            // 2. Escribir en el historial de cada tenant para mantener la auditoría multi-tenant intacta
            for (const tId of targetTenants) {
                const tenantMailCol = collection(db, 'tenants', tId, 'mail');
                await addDoc(tenantMailCol, mailPayload);
            }

            return { success: true };
        } catch (err) {
            console.error("Error in sendWelcomeEmail (root + dual-tenant):", err);
            return { success: false, error: err.message };
        }
    }, []);

    // Subscriptions
    useEffect(() => {
        const unsubOrders = onSnapshot(query(tCol('orders'), orderBy('created_at', 'desc')), (snapshot) => {
            setOrders(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
            updateSyncTime();
        }, (error) => console.error("Snapshot Orders Error:", error));

        const unsubClients = onSnapshot(tCol('clients'), (snapshot) => {
            setClients(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
            updateSyncTime();
        }, (error) => console.error("Snapshot Clients Error:", error));

        const unsubQuotations = onSnapshot(tCol('quotations'), (snapshot) => {
            setQuotations(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
            updateSyncTime();
        }, (error) => console.error("Snapshot Quotations Error:", error));

        const unsubLeads = onSnapshot(tCol('leads'), (snapshot) => {
            setLeads(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
            updateSyncTime();
        }, (error) => console.error("Snapshot Leads Error:", error));

        return () => {
            unsubOrders();
            unsubClients();
            unsubQuotations();
            unsubLeads();
        };
    }, [tCol, updateSyncTime]);

    const value = {
        orders,
        clients,
        quotations,
        leads,
        addClient,
        updateClient,
        updateOrder,
        addOrder,
        deleteOrders,
        createInternalOrder,
        addQuotation,
        deleteQuotation,
        updateLead,
        upsertMember,
        saveWebCheckout,
        getWebCheckout,
        updateWebCheckoutStatus,
        sendWelcomeEmail
    };

    return (
        <SalesContext.Provider value={value}>
            {children}
        </SalesContext.Provider>
    );
};

export const useSales = () => useContext(SalesContext);
