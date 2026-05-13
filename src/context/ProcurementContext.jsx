import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onSnapshot, query, orderBy, updateDoc, deleteDoc, addDoc, increment, getDoc, getDocs, where, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from './TenantContext';
import { useInventory } from './InventoryContext';

const ProcurementContext = createContext({});

export const ProcurementProvider = ({ children }) => {
    const { tCol, tDoc, updateSyncTime } = useTenant();
    const { convertUnit, recalculatePTCosts } = useInventory();

    const [suppliers, setSuppliers] = useState([]);
    const [purchaseOrders, setPurchaseOrders] = useState([]);

    const addSupplier = useCallback(async (data) => {
        try {
            const docRef = await addDoc(tCol('suppliers'), { ...data, created_at: new Date().toISOString() });
            return { success: true, id: docRef.id };
        } catch (err) { return { success: false, error: err.message }; }
    }, [tCol]);

    const updateSupplier = useCallback(async (id, data) => {
        try {
            await updateDoc(tDoc('suppliers', id), data);
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, [tDoc]);

    const deleteSupplier = useCallback(async (id) => {
        try {
            await deleteDoc(tDoc('suppliers', id));
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, [tDoc]);

    const addPurchase = useCallback(async (purchaseData) => {
        try {
            const counterRef = tDoc('metadata', 'counters');
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

            const docRef = await addDoc(tCol('purchase_orders'), {
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
    }, [tCol, tDoc]);

    const receivePurchase = useCallback(async (poId, receivedItems, relatedOrders) => {
        // Implementation moved from BusinessContext
        // ... (truncated for brevity in thought, but full in code below)
        try {
            if (!poId) throw new Error("ID de orden de compra no definido.");
            for (const item of receivedItems) {
                if (!item.id && !item.name) continue;
                let docSnap = null, docRef = null;
                const directRef = tDoc('products', item.id || 'none');
                try {
                    const ds = await getDoc(directRef);
                    if (ds.exists()) { docSnap = ds; docRef = directRef; }
                } catch {}

                if (!docSnap) {
                    const qName = query(tCol('products'), where('name', '==', String(item.name || '')));
                    const snapName = await getDocs(qName);
                    if (!snapName.empty) { docSnap = snapName.docs[0]; docRef = docSnap.ref; }
                }

                if (docSnap && docRef) {
                    const currentData = docSnap.data();
                    const invUnit = (currentData.unit_measure || currentData.unit || 'gr').toLowerCase();
                    const qtyBuy = Number(item.toBuy || item.quantity || 0);
                    const purchaseUnitConfig = (currentData.purchase_unit || invUnit).toLowerCase();
                    const conversionFactor = Number(currentData.conversion_factor || 1);
                    const buyUnit = (item.unit || item.purchaseUnit || invUnit).toLowerCase();

                    let qtyToAddBase = (buyUnit === purchaseUnitConfig) ? qtyBuy * conversionFactor : convertUnit(qtyBuy, buyUnit, invUnit);
                    const currentStock = Number(currentData.stock || 0) + Number(currentData.purchases || 0) - Number(currentData.sales || 0);
                    const currentTotalValue = currentStock * Number(currentData.cost || 0);
                    const purchaseUnitPrice = Number(item.purchasePrice || item.unit_cost || 0);
                    const lineTotalValue = qtyBuy * purchaseUnitPrice;
                    const newTotalQty = currentStock + qtyToAddBase;
                    const newAvgCost = newTotalQty > 0 ? (currentTotalValue + lineTotalValue) / newTotalQty : Number(currentData.cost || 0);

                    await updateDoc(docRef, {
                        purchases: increment(qtyToAddBase),
                        cost: Math.round(newAvgCost)
                    });
                }
            }

            let poDocRef = tDoc('purchase_orders', poId);
            let poSnapExists = false;
            try { const poSnap = await getDoc(poDocRef); poSnapExists = poSnap.exists(); } catch { poSnapExists = false; }
            if (!poSnapExists) {
                const qPo = query(tCol('purchase_orders'), where('id', '==', poId));
                const poSnaps = await getDocs(qPo);
                if (!poSnaps.empty) poDocRef = poSnaps.docs[0].ref;
                else throw new Error(`Orden de compra no encontrada: ${poId}`);
            }

            await updateDoc(poDocRef, { status: 'Recibida', updated_at: new Date().toISOString() });

            if (relatedOrders && Array.isArray(relatedOrders)) {
                for (const orderId of relatedOrders) {
                    if (!orderId) continue;
                    let qOrd = query(tCol('orders'), where('order_number', '==', orderId));
                    let ordSnaps = await getDocs(qOrd);
                    if (ordSnaps.empty) {
                        qOrd = query(tCol('orders'), where('id', '==', orderId));
                        ordSnaps = await getDocs(qOrd);
                    }
                    const targetOrderDoc = ordSnaps.empty ? tDoc('orders', String(orderId)) : ordSnaps.docs[0].ref;
                    const qPoRelated = query(tCol('purchase_orders'), where('related_orders', 'array-contains', orderId));
                    const poSnapsRelated = await getDocs(qPoRelated);
                    
                    const allReceived = poSnapsRelated.docs.length > 0 && poSnapsRelated.docs.every(d => d.data().status === 'Recibida');
                    if (allReceived) {
                        try {
                            const targetSnap = await getDoc(targetOrderDoc);
                            const targetData = targetSnap.exists() ? targetSnap.data() : {};
                            if (targetData.internal_type === 'MP' || (targetData.order_number || '').startsWith('RMP')) {
                                await updateDoc(targetOrderDoc, { status: 'Entregado', delivered_at: new Date().toISOString() });
                            } else {
                                const finalStatuses = ['entregado', 'finalizado', 'cobrado', 'liquidado'];
                                if (!finalStatuses.includes((targetData.status || '').toLowerCase().trim())) {
                                    await updateDoc(targetOrderDoc, { status: 'En Producción' });
                                }
                            }
                        } catch (e) { console.error(`Error updating order ${orderId} status:`, e); }
                    }
                }
            }
            await recalculatePTCosts();
            return { success: true };
        } catch (err) {
            console.error("Critical error in receivePurchase:", err);
            return { success: false, error: err.message };
        }
    }, [tCol, tDoc, convertUnit, recalculatePTCosts]);

    // Subscriptions
    useEffect(() => {
        const unsubSuppliers = onSnapshot(tCol('suppliers'), (snapshot) => {
            setSuppliers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
            updateSyncTime();
        });
        const unsubPO = onSnapshot(query(tCol('purchase_orders'), orderBy('created_at', 'desc')), (snapshot) => {
            setPurchaseOrders(snapshot.docs.map(doc => ({ ...doc.data(), dbId: doc.id, id: doc.data().id || doc.id })));
            updateSyncTime();
        });
        return () => { unsubSuppliers(); unsubPO(); };
    }, [tCol, updateSyncTime]);

    const value = { suppliers, purchaseOrders, addSupplier, updateSupplier, deleteSupplier, addPurchase, receivePurchase };

    return (
        <ProcurementContext.Provider value={value}>
            {children}
        </ProcurementContext.Provider>
    );
};

export const useProcurement = () => useContext(ProcurementContext);
