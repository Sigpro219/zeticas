import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onSnapshot, query, orderBy, updateDoc, deleteDoc, addDoc, getDoc, where } from 'firebase/firestore';
import { useTenant } from './TenantContext';

const ProductionContext = createContext({});

export const ProductionProvider = ({ children }) => {
    const { tCol, tDoc, updateSyncTime } = useTenant();
    const [productionOrders, setProductionOrders] = useState([]);

    const saveOdp = useCallback(async (data) => {
        try {
            const docRef = await addDoc(tCol('production_orders'), {
                ...data,
                created_at: new Date().toISOString(),
                status: data.status || 'Scheduled'
            });
            return { success: true, id: docRef.id };
        } catch (err) {
            console.error("Error saving ODP:", err);
            return { success: false, error: err.message };
        }
    }, [tCol]);

    const updateOdp = useCallback(async (id, data) => {
        try {
            await updateDoc(tDoc('production_orders', id), {
                ...data,
                updated_at: new Date().toISOString()
            });
            return { success: true };
        } catch (err) {
            console.error("Error updating ODP:", err);
            return { success: false, error: err.message };
        }
    }, [tDoc]);

    // Subscriptions
    useEffect(() => {
        const unsub = onSnapshot(query(tCol('production_orders'), orderBy('created_at', 'desc')), (snapshot) => {
            setProductionOrders(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
            updateSyncTime();
        });
        return () => unsub();
    }, [tCol, updateSyncTime]);

    const value = {
        productionOrders,
        rawProductionOrders: productionOrders, // Legacy alias
        saveOdp,
        updateOdp
    };

    return (
        <ProductionContext.Provider value={value}>
            {children}
        </ProductionContext.Provider>
    );
};

export const useProduction = () => useContext(ProductionContext);
