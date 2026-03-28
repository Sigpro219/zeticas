import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // Restaurando el Usuario Simulado (Mock) para que el equipo pueda trabajar sin bloqueos de Firebase
    const [user, setUser] = useState({ 
        name: 'Sigpro Admin', 
        role: 'super_admin', 
        email: 'admin@zeticas.com',
        permissions: { all: true } // Permisos totales simulados
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // En este modo, no consultamos a Firebase, permitimos entrada directa
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        // Validación simulada simple (puedes ajustarla si quieres probar logins falsos)
        if (email === 'admin@zeticas.com' && password === 'admin123') {
            setUser({ name: 'Sigpro Admin', role: 'super_admin', email, permissions: { all: true } });
            return { success: true };
        }
        throw new Error("Credenciales inválidas en modo simulado");
    };

    const loginWithGoogle = async () => {
        // Simulación de Google login
        setUser({ name: 'Google User Admin', role: 'super_admin', email: 'google@admin.com', permissions: { all: true } });
        return { success: true };
    };

    const logout = () => {
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, loginWithGoogle, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
