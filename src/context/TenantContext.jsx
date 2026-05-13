import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, doc, addDoc, onSnapshot, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { detectTenantId } from '../lib/tenant';

const TenantContext = createContext({});

export const TenantProvider = ({ children }) => {
    const [tenantId, setTenantId] = useState(() => detectTenantId());
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);

    const updateSyncTime = useCallback(() => {
        setLastUpdate(new Date().toLocaleString('es-CO', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        }));
    }, []);

    const getTenantPath = useCallback((colName) => {
        return ['tenants', tenantId, colName];
    }, [tenantId]);

    const tCol = useCallback((name) => {
        if (!tenantId) throw new Error("Tenant ID no detectado. Operación de base de datos bloqueada por seguridad.");
        return collection(db, 'tenants', tenantId, name);
    }, [tenantId]);

    const tDoc = useCallback((name, id) => {
        if (!tenantId) throw new Error("Tenant ID no detectado. Operación de base de datos bloqueada por seguridad.");
        return doc(db, 'tenants', tenantId, name, id);
    }, [tenantId]);

    /**
     * addAdminLog: Centrally records sensitive operations.
     * @param {string} action - 'DELETE_ORDER', 'STOCK_ADJUSTMENT', etc.
     * @param {object} details - Payload of the action.
     * @param {object} user - The user executing the action (for role/uid recording).
     */
    const addAdminLog = useCallback(async (action, details, user = null) => {
        try {
            await addDoc(tCol('admin_logs'), {
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
    }, [tCol]);

    const [siteContent, setSiteContent] = useState({});
    const [ownCompany, setOwnCompany] = useState({});

    const updateSiteContent = useCallback(async (section, key, content) => {
        if (!section || !key || content === undefined) {
            console.warn(`[ContentSync] Ignored invalid update for ${section}/${key}: content is undefined`);
            return { success: false, error: "Datos de contenido inválidos (undefined)" };
        }
        try {
            const q = query(tCol('site_content'), where('section', '==', section), where('key', '==', key));
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                await addDoc(tCol('site_content'), { section, key, content });
            } else {
                await updateDoc(tDoc('site_content', snapshot.docs[0].id), { content });
            }
            return { success: true };
        } catch (err) {
            console.error("Error updating site content:", err);
            return { success: false, error: err.message };
        }
    }, [tCol, tDoc]);

    useEffect(() => {
        if (!tenantId) return;
        const unsub = onSnapshot(tCol('site_content'), (snapshot) => {
            const content = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (!content[data.section]) content[data.section] = {};
                content[data.section][data.key] = data.content;
            });
            setSiteContent(content);
            updateSyncTime();
        });
        const unsubCompany = onSnapshot(tDoc('metadata', 'company'), (doc) => {
            if (doc.exists()) setOwnCompany(doc.data());
            updateSyncTime();
        });
        return () => { unsub(); unsubCompany(); };
    }, [tenantId, tCol, tDoc, updateSyncTime]);

    const value = {
        tenantId,
        setTenantId,
        loading,
        setLoading,
        lastUpdate,
        updateSyncTime,
        getTenantPath,
        tCol,
        tDoc,
        addAdminLog,
        siteContent,
        ownCompany,
        updateSiteContent
    };

    return (
        <TenantContext.Provider value={value}>
            {children}
        </TenantContext.Provider>
    );
};

export const useTenant = () => useContext(TenantContext);
