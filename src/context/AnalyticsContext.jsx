import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onSnapshot, query, orderBy, addDoc, getDocs, where, updateDoc, increment, limit } from 'firebase/firestore';
import { useTenant } from './TenantContext';

const AnalyticsContext = createContext({});

export const AnalyticsProvider = ({ children }) => {
    const { tCol, updateSyncTime } = useTenant();
    
    const [productionAnalytics, setProductionAnalytics] = useState([]);
    const [analytics, setAnalytics] = useState([]);

    const logVisit = useCallback(async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const q = query(tCol('analytics'), where('date', '==', today));
            const snap = await getDocs(q);
            
            if (snap.empty) {
                await addDoc(tCol('analytics'), { date: today, count: 1 });
            } else {
                const docRef = snap.docs[0].ref;
                await updateDoc(docRef, { count: increment(1) });
            }
        } catch (err) {
            console.warn("Analytics log failed:", err);
        }
    }, [tCol]);

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
                availability: 100, 
                performance: efficiency > 0 ? 100 : 0, 
                quality: qualityPercent
            };

            await addDoc(tCol('production_analytics'), snapshot);
            return { success: true };
        } catch (err) {
            console.error("Error saving production snapshot:", err);
            return { success: false, error: err.message };
        }
    }, [tCol]);

    // Subscriptions
    useEffect(() => {
        const unsubProd = onSnapshot(query(tCol('production_analytics'), orderBy('timestamp', 'desc'), limit(500)), (snapshot) => {
            setProductionAnalytics(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            updateSyncTime();
        });
        const unsubVisits = onSnapshot(query(tCol('analytics'), orderBy('date', 'desc'), limit(90)), (snapshot) => {
            setAnalytics(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            updateSyncTime();
        });
        return () => { unsubProd(); unsubVisits(); };
    }, [tCol, updateSyncTime]);

    const value = { productionAnalytics, analytics, logVisit, saveProductionSnapshot };

    return (
        <AnalyticsContext.Provider value={value}>
            {children}
        </AnalyticsContext.Provider>
    );
};

export const useAnalytics = () => useContext(AnalyticsContext);
