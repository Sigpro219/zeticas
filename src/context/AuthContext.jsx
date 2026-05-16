import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { detectTenantId } from '../lib/tenant';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tenantId] = useState(() => detectTenantId());

    const tCol = (name) => collection(db, 'tenants', tenantId, name);

    useEffect(() => {
        // Restaurar sesión persistente para una experiencia fluida
        const savedUser = localStorage.getItem('zeticas_user');
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (e) {
                console.error("Error al restaurar sesión:", e);
                localStorage.removeItem('zeticas_user');
            }
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        // Opción 1: Backdoor de Emergencia / Administrador del Sistema
        if (email === 'admin@zeticas.com' && password === 'admin123') {
            const systemAdmin = { 
                name: 'Zeticas Admin', 
                role: 'super_admin', 
                email: 'admin@zeticas.com',
                permissions: { all: true }
            };
            setUser(systemAdmin);
            localStorage.setItem('zeticas_user', JSON.stringify(systemAdmin));
            return { success: true };
        }

        try {
            // Opción 2: Autenticación Multicapa (Administradores primero, luego Miembros)
            
            // 2.1 Buscar en colección 'users' del Tenant correspondientes
            const qUser = query(tCol('users'), where('email', '==', email.toLowerCase()));
            const snapshotUser = await getDocs(qUser);
            const activeUserDoc = snapshotUser.docs.find(doc => doc.data().status === 'Active');

            if (activeUserDoc) {
                const userData = activeUserDoc.data();
                if (userData.password === password) {
                    const authenticatedUser = { id: activeUserDoc.id, role: 'admin', ...userData };
                    setUser(authenticatedUser);
                    localStorage.setItem('zeticas_user', JSON.stringify(authenticatedUser));
                    return { success: true };
                } else {
                    throw new Error("La contraseña ingresada es incorrecta.");
                }
            }

            // 2.2 Buscar en colección 'clients' del Tenant (Miembros del Círculo)
            const qClient = query(tCol('clients'), where('email', '==', email.toLowerCase()));
            const snapshotClient = await getDocs(qClient);
            const memberClientDoc = snapshotClient.docs.find(doc => doc.data().is_member === true);

            if (memberClientDoc) {
                const clientData = memberClientDoc.data();
                if (clientData.password === password) {
                    const authenticatedMember = { 
                        id: memberClientDoc.id, 
                        role: 'member', 
                        name: clientData.name || clientData.contactName,
                        ...clientData 
                    };
                    setUser(authenticatedMember);
                    localStorage.setItem('zeticas_user', JSON.stringify(authenticatedMember));
                    return { success: true };
                } else {
                    throw new Error("La contraseña ingresada es incorrecta.");
                }
            }

            throw new Error("Usuario no encontrado o cuenta inactiva.");
        } catch (error) {
            console.error("Error en proceso de login:", error);
            throw error;
        }
    };

    const loginWithGoogle = async () => {
        const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
        const { auth } = await import('../lib/firebase');
        const provider = new GoogleAuthProvider();
        
        try {
            const result = await signInWithPopup(auth, provider);
            const userEmail = result.user.email.toLowerCase();

            // Verificar si es Admin
            const qUser = query(tCol('users'), where('email', '==', userEmail));
            const snapUser = await getDocs(qUser);
            const activeUserDoc = snapUser.docs.find(doc => doc.data().status === 'Active');
            if (activeUserDoc) {
                const authenticatedUser = { id: activeUserDoc.id, role: 'admin', ...activeUserDoc.data() };
                setUser(authenticatedUser);
                localStorage.setItem('zeticas_user', JSON.stringify(authenticatedUser));
                return { success: true };
            }

            // Verificar si es Miembro
            const qClient = query(tCol('clients'), where('email', '==', userEmail));
            const snapClient = await getDocs(qClient);
            const memberClientDoc = snapClient.docs.find(doc => doc.data().is_member === true);
            if (memberClientDoc) {
                const clientData = memberClientDoc.data();
                const authenticatedMember = { id: memberClientDoc.id, role: 'member', name: clientData.name || clientData.contactName, ...clientData };
                setUser(authenticatedMember);
                localStorage.setItem('zeticas_user', JSON.stringify(authenticatedMember));
                return { success: true };
            }

            throw new Error("Este correo de Google no tiene acceso autorizado.");
        } catch (error) {
            console.error("Error Google Login:", error);
            throw error;
        }
    };

    const resetPassword = async (email) => {
        const { sendPasswordResetEmail } = await import('firebase/auth');
        const { auth } = await import('../lib/firebase');
        try {
            await sendPasswordResetEmail(auth, email);
            return { success: true };
        } catch (error) {
            console.error("Error Reset Password:", error);
            throw error;
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('zeticas_user');
    };

    return (
        <AuthContext.Provider value={{ user, login, loginWithGoogle, resetPassword, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
