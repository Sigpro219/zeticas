import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onSnapshot, query, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useTenant } from './TenantContext';

const UsersContext = createContext({});

export const UsersProvider = ({ children }) => {
    const { tCol, tDoc, updateSyncTime } = useTenant();
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const unsub = onSnapshot(tCol('users'), (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
            updateSyncTime();
        }, (error) => console.error("Snapshot Users Error:", error));

        return () => unsub();
    }, [tCol, updateSyncTime]);

    const addUser = useCallback(async (userData) => {
        try {
            await addDoc(tCol('users'), {
                ...userData,
                created_at: new Date().toISOString()
            });
            return { success: true };
        } catch (err) {
            console.error("Error adding user:", err);
            return { success: false, error: err.message };
        }
    }, [tCol]);

    const updateUser = useCallback(async (userId, userData) => {
        try {
            await updateDoc(tDoc('users', userId), {
                ...userData,
                updated_at: new Date().toISOString()
            });
            return { success: true };
        } catch (err) {
            console.error("Error updating user:", err);
            return { success: false, error: err.message };
        }
    }, [tDoc]);

    const deleteUser = useCallback(async (userId) => {
        try {
            await deleteDoc(tDoc('users', userId));
            return { success: true };
        } catch (err) {
            console.error("Error deleting user:", err);
            return { success: false, error: err.message };
        }
    }, [tDoc]);

    const value = {
        users,
        addUser,
        updateUser,
        deleteUser
    };

    return (
        <UsersContext.Provider value={value}>
            {children}
        </UsersContext.Provider>
    );
};

export const useUsers = () => useContext(UsersContext);
