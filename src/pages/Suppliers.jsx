import React, { useState } from 'react';
import { useBusiness } from '../context/BusinessContext';
import {
    Truck,
    Search,
    Plus,
    X,
    Save,
    Phone,
    Mail,
    MapPin,
    Building2,
    User,
    Package,
    ExternalLink,
    Check,
    Edit3,
    Trash2,
    AlertTriangle,
    RefreshCw,
    Briefcase,
    Download,
    ShoppingBag
} from 'lucide-react';

const Suppliers = () => {
    const { items, providers: suppliers, refreshData, addSupplier, updateSupplier } = useBusiness();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCatalogSupplier, setActiveCatalogSupplier] = useState(null);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [showArchived, setShowArchived] = useState(false);

    const [newSupplier, setNewSupplier] = useState({
        name: '',
        nit: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        contact_person: '',
        category: 'Insumos'
    });

    const q = searchTerm.toLowerCase();
    const filteredSuppliers = suppliers.filter(s => {
        const matchesSearch = (
            (s.name || '').toLowerCase().includes(q) ||
            (s.nit || '').toLowerCase().includes(q) ||
            (s.city || '').toLowerCase().includes(q) ||
            (s.email || '').toLowerCase().includes(q) ||
            (s.phone || '').toLowerCase().includes(q) ||
            (s.contact_person || '').toLowerCase().includes(q) ||
            (s.category || '').toLowerCase().includes(q)
        );
        const isArchived = s.status === 'Archived';
        if (showArchived) return matchesSearch && isArchived;
        return matchesSearch && !isArchived;
    });

    const handleSaveSupplier = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const supplierData = {
            name: newSupplier.name,
            nit: newSupplier.nit,
            email: newSupplier.email,
            phone: newSupplier.phone,
            address: newSupplier.address,
            city: newSupplier.city,
            contact_person: newSupplier.contact_person,
            category: newSupplier.category,
            status: 'ACTIVE'
        };

        try {
            if (editingSupplier) {
                const res = await updateSupplier(editingSupplier.id, supplierData);
                if (!res.success) throw new Error(res.error);
            } else {
                const res = await addSupplier(supplierData);
                if (!res.success) throw new Error(res.error);
            }

            await refreshData();
            setIsModalOpen(false);
            setEditingSupplier(null);
            setNewSupplier({ name: '', nit: '', email: '', phone: '', address: '', type: 'Jurídica', location: 'Local', category: 'Insumos' });
        } catch (err) {
            console.error("Error saving supplier:", err);
        } finally {
            setIsSaving(false);
        }
    };

    /* ── archive ─────────────────────────────────────────────────────── */
    const toggleArchive = async (s) => {
        const isCurrentlyArchived = s.status === 'Archived';
        const confirmMsg = isCurrentlyArchived 
            ? `¿Deseas restaurar a ${s.name}?` 
            : `¿Estás seguro de archivar a ${s.name}? No aparecerá en los listados activos.`;
        
        if (window.confirm(confirmMsg)) {
            setIsSaving(true);
            try {
                const res = await updateSupplier(s.id, { status: isCurrentlyArchived ? 'Active' : 'Archived' });
                if (!res.success) throw new Error(res.error);
                await refreshData();
            } catch (err) {
                alert('Error al procesar: ' + err.message);
            } finally {
                setIsSaving(false);
            }
        }
    };

    const toggleMaterialAssociation = async (materialId) => {
        if (!activeCatalogSupplier) return;

        const currentItems = activeCatalogSupplier.associatedItems || [];
        const updatedItems = currentItems.includes(materialId)
            ? currentItems.filter(id => id !== materialId)
            : [...currentItems, materialId];

        try {
            const res = await updateSupplier(activeCatalogSupplier.id, { associated_items: updatedItems });
            if (res.success) {
                setActiveCatalogSupplier({ ...activeCatalogSupplier, associatedItems: updatedItems });
            }
        } catch (err) {
            console.error("Error updating association:", err);
        }
    };

    const rawMaterials = items.filter(i => i.type === 'material');

    return (
        <div className="suppliers-module" style={{ padding: '0 1rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
                <div>
                    <h2 className="font-serif" style={{ fontSize: '2.2rem', color: 'var(--color-primary)', margin: 0 }}>Directorio de Proveedores</h2>
                    <p style={{ color: '#666', fontSize: '0.95rem', marginTop: '0.5rem' }}>Gestión centralizada de aliados comerciales sincronizados con la nube.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Buscar en la nube..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '0.7rem 1rem 0.7rem 2.8rem', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }}
                        />
                    </div>
                    <button onClick={refreshData} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '0.55rem', borderRadius: '12px', cursor: 'pointer' }} title="Actualizar Datos">
                        <RefreshCw size={18} color="#64748b" />
                    </button>
                    <button 
                        onClick={() => setShowArchived(!showArchived)}
                        style={{ 
                            display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.62rem 1.2rem', borderRadius: '12px', 
                            border: '1px solid #e2e8f0', background: showArchived ? '#64748b' : '#f8fafc', 
                            color: showArchived ? '#fff' : '#475569', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' 
                        }}
                    >
                        <ShoppingBag size={15} style={{ opacity: 0.7 }} /> {showArchived ? 'Ver Activos' : 'Ver Archivados'}
                    </button>
                    <button
                        onClick={() => {
                            setEditingSupplier(null);
                            setNewSupplier({ name: '', nit: '', email: '', phone: '', address: '', city: '', contact_person: '', category: 'Insumos' });
                            setIsModalOpen(true);
                        }}
                        style={{
                            background: '#1a3636',
                            color: '#fff',
                            padding: '0.55rem 1.2rem',
                            borderRadius: '12px',
                            border: 'none',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            boxShadow: '0 4px 12px rgba(26, 54, 54, 0.2)',
                            fontSize: '0.85rem'
                        }}
                    >
                        <Plus size={16} /> + Nuevo Proveedor
                    </button>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
                {filteredSuppliers.map(s => (
                    <div key={s.id} style={{
                        background: '#fff',
                        padding: '1.8rem',
                        borderRadius: '24px',
                        border: '1px solid #f1f5f9',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                        transition: 'all 0.3s ease'
                    }} className="supplier-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1a3636', margin: 0 }}>{s.name}</h3>
                            <span style={{ 
                                background: s.status === 'Archived' ? '#f1f5f9' : '#dcfce7', 
                                padding: '4px 10px', 
                                borderRadius: '20px', 
                                fontSize: '0.65rem', 
                                color: s.status === 'Archived' ? '#64748b' : '#166534', 
                                fontWeight: '700' 
                            }}>
                                {s.status === 'Archived' ? 'Archivado' : 'Activo'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
                            <span style={{ background: '#f0fdf4', padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', color: '#166534', border: '1px solid #dcfce7', fontWeight: '600' }}>
                                {s.category || 'General'}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: '#64748b', fontWeight: '500' }}>
                                <Package size={12} /> {(s.associatedItems || []).length} Materias
                            </span>
                        </div>

                        <div style={{ display: 'grid', gap: '0.6rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#475569' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <Building2 size={14} style={{ color: '#94a3b8' }} />
                                <span style={{ fontWeight: '600' }}>NIT:</span> {s.nit || 'N/A'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <MapPin size={14} style={{ color: '#94a3b8' }} />
                                <span>{s.address || 'Sin dirección'} {s.city ? `(${s.city})` : ''}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                    <Phone size={14} style={{ color: '#94a3b8' }} />
                                    <span>{s.phone || 'N/A'}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <Mail size={14} style={{ color: '#94a3b8' }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.email || 'N/A'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.2rem', padding: '0.5rem', background: '#f8fafc', borderRadius: '8px' }}>
                                <User size={14} style={{ color: '#1a3636' }} />
                                <span style={{ fontSize: '0.75rem' }}><b>Contacto:</b> {s.contact_person || 'No definido'}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.8rem' }}>
                            <button onClick={() => setActiveCatalogSupplier(s)} style={{ flex: 1, padding: '0.55rem', fontSize: '0.8rem', fontWeight: '700', color: '#fff', background: '#1a3636', border: 'none', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                                <ExternalLink size={14} /> Catálogo
                            </button>
                            <button onClick={() => { setEditingSupplier(s); setNewSupplier({ ...s }); setIsModalOpen(true); }} style={{ padding: '0.55rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fff', cursor: 'pointer', color: '#64748b' }}>
                                <Edit3 size={14} />
                            </button>
                            <button onClick={() => toggleArchive(s)} title={s.status === 'Archived' ? 'Restaurar' : 'Archivar'} style={{ padding: '0.55rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fff', cursor: 'pointer', color: '#64748b' }}>
                                <Download size={14} style={{ transform: s.status === 'Archived' ? 'rotate(180deg)' : 'none' }} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Catalog Association Modal */}
            {activeCatalogSupplier && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
                    <div style={{ background: '#fff', padding: '2rem', borderRadius: '24px', width: '90%', maxWidth: '700px', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3>Catálogo de {activeCatalogSupplier.name}</h3>
                            <button onClick={() => setActiveCatalogSupplier(null)} style={{ border: 'none', background: 'none' }}><X /></button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem 0' }}>
                            {rawMaterials.map(material => {
                                const isAssociated = (activeCatalogSupplier.associatedItems || []).includes(material.id);
                                return (
                                    <div key={material.id} onClick={() => toggleMaterialAssociation(material.id)} style={{ padding: '1rem', borderRadius: '16px', border: isAssociated ? '2px solid var(--color-primary)' : '1px solid #e2e8f0', background: isAssociated ? '#f0f4f4' : '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold' }}>{material.name}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#666' }}>{material.sku}</div>
                                        </div>
                                        {isAssociated && <Check size={18} color="var(--color-primary)" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Save Modal */}
            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
                    <div style={{ background: '#fff', padding: '2rem', borderRadius: '24px', width: '90%', maxWidth: '500px' }}>
                        <h3>{editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
                        <form onSubmit={handleSaveSupplier} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem', display: 'block' }}>Nombre o Razón Social</label>
                                <input placeholder="Nombre" required value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', outline: 'none' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem', display: 'block' }}>NIT / Identificación</label>
                                <input placeholder="NIT" required value={newSupplier.nit} onChange={(e) => setNewSupplier({ ...newSupplier, nit: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', outline: 'none' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem', display: 'block' }}>Categoría</label>
                                <select value={newSupplier.category} onChange={(e) => setNewSupplier({ ...newSupplier, category: e.target.value })} style={{ width: '100%', padding: '0.86rem', borderRadius: '12px', border: '1px solid #ddd', outline: 'none', background: '#fff' }}>
                                    <option value="Materias Primas">Materias Primas</option>
                                    <option value="Insumos">Insumos</option>
                                    <option value="Empaque">Empaque</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem', display: 'block' }}>Correo Electrónico</label>
                                <input placeholder="Email" type="email" value={newSupplier.email} onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', outline: 'none' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem', display: 'block' }}>Teléfono</label>
                                <input placeholder="Teléfono" value={newSupplier.phone} onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', outline: 'none' }} />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem', display: 'block' }}>Dirección</label>
                                <input placeholder="Dirección" value={newSupplier.address} onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', outline: 'none' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem', display: 'block' }}>Ciudad</label>
                                <input placeholder="Ciudad" value={newSupplier.city} onChange={(e) => setNewSupplier({ ...newSupplier, city: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', outline: 'none' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '0.4rem', display: 'block' }}>Persona de Contacto</label>
                                <input placeholder="Nombre de contacto" value={newSupplier.contact_person} onChange={(e) => setNewSupplier({ ...newSupplier, contact_person: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', outline: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', gridColumn: 'span 2' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: 'none', background: '#f1f5f9', cursor: 'pointer' }}>Cancelar</button>
                                <button type="submit" disabled={isSaving} style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: 'none', background: '#1a3636', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
                                    {isSaving ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

            )}
        </div>
    );
};

export default Suppliers;
