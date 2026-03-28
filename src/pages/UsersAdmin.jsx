import React, { useState } from 'react';
import { 
    Users, 
    UserPlus, 
    Shield, 
    Mail, 
    Clock, 
    MoreVertical, 
    Edit2, 
    Trash2, 
    CheckCircle2, 
    XCircle,
    Key,
    Lock,
    Unlock,
    Settings,
    Eye,
    EyeOff
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';

const UsersAdmin = () => {
    const { users, addUser, updateUser, deleteUser } = useBusiness();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'colaborador',
        status: 'Active',
        permissions: {
            kanban: true,
            orders: true,
            purchases: false,
            production: false,
            inventory: false,
            recipes: false,
            suppliers: false,
            clients: false,
            banks: false,
            expenses: false,
            reports: false,
            costs: false,
            web_cms: false,
            web_shipping: false,
            users_admin: false
        }
    });

    const roles = [
        { id: 'super_admin', label: 'Administrador Maestro', icon: <Shield size={16} /> },
        { id: 'colaborador', label: 'Colaborador Equipo', icon: <Users size={16} /> }
    ];

    const modules = [
        { id: 'kanban', label: 'Tablero Kanban', category: 'Operaciones' },
        { id: 'orders', label: 'Pedidos / Ventas', category: 'Operaciones' },
        { id: 'purchases', label: 'Compras / OC', category: 'Operaciones' },
        { id: 'production', label: 'Producción / ODP', category: 'Operaciones' },
        { id: 'shipping', label: 'Logística / Despachos', category: 'Operaciones' },
        { id: 'inventory', label: 'Inventarios', category: 'Inventario' },
        { id: 'recipes', label: 'Recetas (BOM)', category: 'Inventario' },
        { id: 'suppliers', label: 'Proveedores', category: 'Contactos' },
        { id: 'clients', label: 'Clientes / CRM', category: 'Contactos' },
        { id: 'banks', label: 'Bancos / Tesorería', category: 'Finanzas' },
        { id: 'expenses', label: 'Gastos / PYG', category: 'Finanzas' },
        { id: 'reports', label: 'Reportes Dashboard', category: 'Análisis' },
        { id: 'costs', label: 'Análisis de Costos', category: 'Análisis' },
        { id: 'web_cms', label: 'Contenido Web', category: 'Administración' },
        { id: 'web_shipping', label: 'Config. Envíos', category: 'Administración' },
        { id: 'users_admin', label: 'Gestión de Usuarios', category: 'Administración' },
    ];

    const handleOpenModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                name: user.name || '',
                email: user.email || '',
                role: user.role || 'colaborador',
                status: user.status || 'Active',
                permissions: user.permissions || formData.permissions
            });
        } else {
            setEditingUser(null);
            setFormData({
                name: '',
                email: '',
                role: 'colaborador',
                status: 'Active',
                permissions: { ...formData.permissions }
            });
        }
        setIsModalOpen(true);
    };

    const handleTogglePermission = (modId) => {
        setFormData(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [modId]: !prev.permissions[modId]
            }
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (editingUser) {
                await updateUser(editingUser.id, formData);
            } else {
                await addUser(formData);
            }
            setIsModalOpen(false);
        } catch (err) {
            console.error("Error saving user:", err);
            alert("Error al guardar el usuario");
        }
        setIsSaving(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro de eliminar este usuario? Perderá acceso inmediato.')) {
            try {
                await deleteUser(id);
            } catch (err) {
                console.error("Error deleting user:", err);
            }
        }
    };

    return (
        <div style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.8rem', color: '#023636', margin: 0, fontWeight: '800' }}>Control de Acceso & Seguridad</h2>
                    <p style={{ color: '#64748b', marginTop: '0.4rem', fontWeight: '500' }}>Gestiona los permisos de tu equipo y acceso a módulos</p>
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem 1.8rem', 
                        background: '#023636', color: '#fff', border: 'none', borderRadius: '16px', 
                        fontWeight: '700', cursor: 'pointer', boxShadow: '0 10px 20px rgba(2, 54, 54, 0.2)', transition: 'all 0.3s'
                    }}
                >
                    <UserPlus size={18} /> Nuevo Colaborador
                </button>
            </div>

            <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Colaborador</th>
                            <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Rol</th>
                            <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Permisos</th>
                            <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Estado</th>
                            <th style={{ padding: '1.2rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                                <td style={{ padding: '1.2rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(2, 54, 54, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#023636', fontWeight: '800' }}>
                                            {user.name?.charAt(0) || user.email?.charAt(0)}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '700', color: '#023636' }}>{user.name || 'Sin nombre'}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '1.2rem' }}>
                                    <span style={{ 
                                        padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700',
                                        background: user.role === 'super_admin' ? 'rgba(212, 120, 90, 0.1)' : 'rgba(2, 54, 54, 0.05)',
                                        color: user.role === 'super_admin' ? '#D4785A' : '#023636',
                                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem'
                                    }}>
                                        {user.role === 'super_admin' ? <Shield size={14} /> : <Users size={14} />}
                                        {user.role === 'super_admin' ? 'Master Admin' : 'Colaborador'}
                                    </span>
                                </td>
                                <td style={{ padding: '1.2rem' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                        {user.role === 'super_admin' ? (
                                            <span style={{ color: '#059669', fontWeight: '600' }}>Acceso Total</span>
                                        ) : (
                                            <span>{Object.values(user.permissions || {}).filter(Boolean).length} módulos activos</span>
                                        )}
                                    </div>
                                </td>
                                <td style={{ padding: '1.2rem' }}>
                                    <span style={{ 
                                        padding: '0.3rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700',
                                        background: user.status === 'Active' ? '#f0fdf4' : '#fef2f2',
                                        color: user.status === 'Active' ? '#10b981' : '#ef4444',
                                        border: `1px solid ${user.status === 'Active' ? '#bbf7d0' : '#fecaca'}`
                                    }}>
                                        {user.status === 'Active' ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td style={{ padding: '1.2rem', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                        <button 
                                            onClick={() => handleOpenModal(user)}
                                            style={{ padding: '0.5rem', border: 'none', borderRadius: '10px', background: 'rgba(2, 54, 54, 0.05)', color: '#023636', cursor: 'pointer' }}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(user.id)}
                                            style={{ padding: '0.5rem', border: 'none', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal de Usuario */}
            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
                    <div style={{ background: '#fff', width: '100%', maxWidth: '700px', borderRadius: '32px', padding: '2.5rem', maxHeight: '90vh', overflowY: 'auto', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#023636', fontWeight: '800' }}>
                                    {editingUser ? 'Editar Colaborador' : 'Nuevo Colaborador'}
                                </h3>
                                <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0.4rem 0 0' }}>Configura los accesos y perfil del usuario</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: '#f8fafc', border: 'none', width: '40px', height: '40px', borderRadius: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <XCircle size={20} color="#94a3b8" />
                            </button>
                        </div>

                        <form onSubmit={handleSave}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b' }}>Nombre Completo</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        placeholder="Ej: Juan Pérez"
                                        style={{ padding: '0.8rem 1.2rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b' }}>Correo Electrónico</label>
                                    <input 
                                        type="email" 
                                        required
                                        value={formData.email}
                                        onChange={e => setFormData({...formData, email: e.target.value.toLowerCase()})}
                                        placeholder="correo@ejemplo.com"
                                        style={{ padding: '0.8rem 1.2rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', marginBottom: '1rem', display: 'block' }}>Rol de Usuario</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    {roles.map(role => (
                                        <div 
                                            key={role.id}
                                            onClick={() => setFormData({...formData, role: role.id})}
                                            style={{ 
                                                padding: '1rem', borderRadius: '16px', border: `2px solid ${formData.role === role.id ? '#023636' : '#f1f5f9'}`,
                                                background: formData.role === role.id ? 'rgba(2, 54, 54, 0.02)' : 'transparent',
                                                cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '1rem'
                                            }}
                                        >
                                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: formData.role === role.id ? '#023636' : '#f1f5f9', color: formData.role === role.id ? '#fff' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {role.icon}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#023636' }}>{role.label}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{role.id === 'super_admin' ? 'Control total' : 'Accesos limitados'}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {formData.role === 'colaborador' && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', marginBottom: '1rem', display: 'block' }}>Permisos por Módulo</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.6rem', maxHeght: '300px', overflowY: 'auto', padding: '0.5rem', background: '#f8fafc', borderRadius: '16px' }}>
                                        {modules.map(mod => (
                                            <div 
                                                key={mod.id}
                                                onClick={() => handleTogglePermission(mod.id)}
                                                style={{ 
                                                    display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.6rem 0.8rem', 
                                                    background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer',
                                                    boxShadow: formData.permissions[mod.id] ? '0 2px 4px rgba(2, 54, 54, 0.05)' : 'none',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div style={{ 
                                                    width: '18px', height: '18px', borderRadius: '4px', border: `2px solid ${formData.permissions[mod.id] ? '#023636' : '#cbd5e1'}`,
                                                    background: formData.permissions[mod.id] ? '#023636' : 'transparent',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    {formData.permissions[mod.id] && <div style={{ width: '6px', height: '6px', borderRadius: '1px', background: '#fff' }} />}
                                                </div>
                                                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: formData.permissions[mod.id] ? '#1e293b' : '#94a3b8' }}>{mod.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    style={{ flex: 1, padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'transparent', fontWeight: '700', cursor: 'pointer' }}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isSaving}
                                    style={{ flex: 2, padding: '1rem', borderRadius: '16px', border: 'none', background: '#023636', color: '#fff', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 20px rgba(2, 54, 54, 0.2)' }}
                                >
                                    {isSaving ? 'Guardando...' : editingUser ? 'Actualizar Usuario' : 'Crear Usuario'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersAdmin;
