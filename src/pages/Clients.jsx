import React, { useState } from 'react';
import {
    UserPlus, Search, X, Save, Phone, Mail, MapPin,
    Building2, User, Download, Upload, Edit2, Trash2,
    AlertTriangle, Hash, Globe, CreditCard, Briefcase,
    ShoppingBag, RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useBusiness } from '../context/BusinessContext';

/* ── constants ────────────────────────────────────────────────────────── */
const EMPTY = {
    name: '', idType: 'NIT', nit: '', address: '', city: '',
    phone: '', email: '', contactName: '', subType: 'B2B',
    source: 'Web', type: 'Jurídica', status: 'Active'
};
const ID_TYPES = ['NIT', 'CC', 'CE', 'PASAPORTE'];
const SOURCES = ['Web', 'Referido', 'CRM', 'WhatsApp', 'Llamada', 'Email', 'Feria', 'Otro'];

/* ── reusable input styles ────────────────────────────────────────────── */
const inp = {
    width: '100%', padding: '0.6rem 0.85rem', borderRadius: '10px',
    border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none',
    background: '#fafafa', boxSizing: 'border-box'
};
const lbl = {
    fontSize: '0.63rem', fontWeight: 800, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: '0.07em',
    marginBottom: '0.3rem', display: 'block'
};

/* ═══════════════════════════════════════════════════════════════════════ */
const Clients = () => {
    const { orders, clients, refreshData, addClient, updateClient } = useBusiness();

    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [modal, setModal] = useState(null);   // null | { mode:'create'|'edit', data:{} }
    const [duplicatesModal, setDuplicatesModal] = useState({ isOpen: false, newClients: [], duplicatedClients: [] });
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [showArchived, setShowArchived] = useState(false);

    /* ── helpers ─────────────────────────────────────────────────────── */
    const q = searchTerm.toLowerCase();
    const filtered = clients.filter(c => {
        const matchesSearch = (
            (c.name || '').toLowerCase().includes(q) ||
            (c.nit || '').toLowerCase().includes(q) ||
            (c.city || '').toLowerCase().includes(q) ||
            (c.email || '').toLowerCase().includes(q) ||
            (c.phone || '').toLowerCase().includes(q) ||
            (c.contactName || '').toLowerCase().includes(q)
        );
        const isArchived = c.status === 'Archived';
        if (showArchived) return matchesSearch && isArchived;
        return matchesSearch && !isArchived;
    });

    // Count orders per client (linked)
    const orderCountFor = (c) =>
        orders.filter(o => o.client_id === c.id || o.client === c.name).length;

    /* ── modal helpers ───────────────────────────────────────────────── */
    const openCreate = () => setModal({ mode: 'create', data: { ...EMPTY } });
    const openEdit = (c) => setModal({ mode: 'edit', data: { ...c } });
    const closeModal = () => setModal(null);
    const onChange = (f, v) => setModal(m => ({ ...m, data: { ...m.data, [f]: v } }));

    /* ── save ────────────────────────────────────────────────────────── */
    const handleSave = async (e) => {
        e.preventDefault();
        if (!modal) return;
        setIsSaving(true);
        const d = modal.data;
        const payload = {
            name: d.name, nit: d.nit || '', id_type: d.idType || 'NIT',
            email: d.email || '', phone: d.phone || '',
            address: d.address || '', city: d.city || '',
            contact_name: d.contactName || '',
            type: d.subType === 'B2C' ? 'Natural' : 'Jurídica',
            sub_type: d.subType || 'B2B',
            source: d.source || 'Web',
            status: d.status || 'Active'
        };
        try {
            if (modal.mode === 'create') {
                const res = await addClient(payload);
                if (!res.success) throw new Error(res.error);
            } else {
                const res = await updateClient(d.id, payload);
                if (!res.success) throw new Error(res.error);
            }
            closeModal();
        } catch (err) {
            alert('Error al guardar: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    /* ── archive ─────────────────────────────────────────────────────── */
    const toggleArchive = async (c) => {
        const isCurrentlyArchived = c.status === 'Archived';
        const confirmMsg = isCurrentlyArchived 
            ? `¿Deseas restaurar a ${c.name}?` 
            : `¿Estás seguro de archivar a ${c.name}? No aparecerá en el directorio activo.`;
        
        if (window.confirm(confirmMsg)) {
            setIsSaving(true);
            try {
                const res = await updateClient(c.id, { status: isCurrentlyArchived ? 'Active' : 'Archived' });
                if (!res.success) throw new Error(res.error);
            } catch (err) {
                alert('Error al procesar: ' + err.message);
            } finally {
                setIsSaving(false);
            }
        }
    };

    /* ── bulk upload ─────────────────────────────────────────────────── */
    const handleBulkUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            const wb = XLSX.read(evt.target.result, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws);
            if (!data.length) return;

            const get = (row, terms) => {
                const keys = Object.keys(row);
                for (const t of terms) {
                    const k = keys.find(k => k.trim().toLowerCase().includes(t.toLowerCase()));
                    if (k && row[k] !== undefined) return row[k];
                }
                return null;
            };

            const mapped = data.map(row => {
                const rawSub = String(get(row, ['tipo cliente', 'b2b', 'b2c']) || 'B2B').toUpperCase();
                const sub = rawSub.includes('B2C') ? 'B2C' : 'B2B';
                return {
                    name: String(get(row, ['nombre o razón', 'razón social', 'nombre', 'cliente']) || 'Sin Nombre'),
                    id_type: String(get(row, ['tipo de identif', 'tipo identif']) || 'NIT'),
                    nit: String(get(row, ['número de identif', 'nit', 'identificacion']) || ''),
                    address: String(get(row, ['dirección', 'direccion']) || ''),
                    city: String(get(row, ['ciudad']) || ''),
                    phone: String(get(row, ['teléfono', 'telefono', 'celular']) || ''),
                    email: String(get(row, ['correo', 'email']) || ''),
                    contact_name: String(get(row, ['nombre contacto', 'contacto']) || ''),
                    sub_type: sub,
                    type: sub === 'B2C' ? 'Natural' : 'Jurídica',
                    source: String(get(row, ['fuente pedido', 'fuente']) || 'Web'),
                    status: 'Active'
                };
            });

            const existingNits = new Set(clients.map(c => c.nit));
            const unique = [], dupes = [];
            mapped.forEach(c => (c.nit && existingNits.has(c.nit) ? dupes : unique).push(c));

            if (dupes.length > 0) {
                setDuplicatesModal({ isOpen: true, newClients: unique, duplicatedClients: dupes });
            } else {
                await persistClients(unique);
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = null;
    };

    const persistClients = async (list) => {
        setIsSaving(true);
        try {
            // Bulk insert in Firestore (simple loop or batch, but context has addClient for single)
            // For bulk, let's keep it simple for now as per "small steps"
            for (const c of list) {
                await addClient(c);
            }
            alert(`✅ ${list.length} cliente(s) procesados.`);
        } catch (err) {
            alert('Error al guardar: ' + err.message);
        } finally {
            setIsSaving(false);
            setDuplicatesModal({ isOpen: false, newClients: [], duplicatedClients: [] });
        }
    };

    /* ── download template ───────────────────────────────────────────── */
    const downloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([
            ['Nombre o Razón Social', 'Tipo de Identificación (NIT/CC/CE)', 'Número de Identificación',
                'Dirección', 'Ciudad', 'Teléfono', 'Correo Electrónico', 'Nombre Contacto',
                'Tipo Cliente (B2B/B2C)', 'Fuente Pedido'],
            ['Empresa Ejemplo SAS', 'NIT', '900123456-1', 'Calle 123 # 45-67', 'Bogotá',
                '3001234567', 'contacto@empresa.com', 'Juan Pérez', 'B2B', 'Web']
        ]);
        ws['!cols'] = [
            { wch: 30 }, { wch: 28 }, { wch: 22 }, { wch: 28 }, { wch: 15 },
            { wch: 16 }, { wch: 28 }, { wch: 22 }, { wch: 18 }, { wch: 14 }
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
        XLSX.writeFile(wb, 'Plantilla_Cargue_Masivo_Clientes.xlsx');
    };

    /* ── sub-badge ───────────────────────────────────────────────────── */
    const SubBadge = ({ sub }) => (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
            padding: '3px 10px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 800,
            background: sub === 'B2B' ? '#f0f9ff' : '#fdf4ff',
            color: sub === 'B2B' ? '#0369a1' : '#9333ea'
        }}>
            {sub === 'B2B' ? <Briefcase size={11} /> : <User size={11} />} {sub || 'B2B'}
        </span>
    );

    /* ── RENDER ──────────────────────────────────────────────────────── */
    return (
        <div className="clients-module" style={{ padding: '0 1rem' }}>

            {/* HEADER */}
            <header style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '1.5rem',
                marginTop: '1rem'
            }}>
                <div>
                    <h2 className="font-serif" style={{ fontSize: '1.5rem', color: 'var(--color-primary)', margin: 0 }}>
                        Maestro de Clientes
                    </h2>
                    <p style={{ color: '#666', fontSize: '0.85rem', margin: 0 }}>
                        Directorio centralizado ({filtered.length} perfiles).
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {/* Search */}
                    <div style={{ position: 'relative', width: '280px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Buscar en la nube..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ ...inp, paddingLeft: '2.5rem', width: '100%' }}
                        />
                    </div>

                    {/* Refresh */}
                    <button onClick={refreshData} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '0.55rem', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Actualizar">
                        <RefreshCw size={17} color="#64748b" />
                    </button>

                    {/* Archive toggle */}
                    <button 
                        onClick={() => setShowArchived(!showArchived)}
                        style={{ 
                            display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.6rem 1rem', borderRadius: '12px', 
                            border: '1px solid #e2e8f0', background: showArchived ? '#64748b' : '#f8fafc', 
                            color: showArchived ? '#fff' : '#475569', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' 
                        }}
                    >
                        <ShoppingBag size={15} /> {showArchived ? 'Ver Activos' : 'Ver Archivados'}
                    </button>

                    {/* Bulk Actions */}
                    <button 
                        onClick={() => setIsBulkModalOpen(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.6rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                        <RefreshCw size={15} /> Carga Masiva
                    </button>

                    {/* New client */}
                    <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', borderRadius: '12px', border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(26,54,54,0.18)' }}>
                        <UserPlus size={16} /> + Nuevo Cliente
                    </button>
                </div>
            </header>

            {/* CARDS GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.75rem' }}>
                {filtered.length === 0 && (
                    <div style={{ gridColumn: '1/-1', padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                        <User size={40} style={{ display: 'block', margin: '0 auto 1rem', opacity: 0.3 }} />
                        No hay clientes que coincidan con la búsqueda.
                    </div>
                )}
                {filtered
                    .sort((a, b) => {
                        const aIsMain = (a.name || '').toLowerCase().includes('zeticas sas bic');
                        const bIsMain = (b.name || '').toLowerCase().includes('zeticas sas bic');
                        if (aIsMain) return -1;
                        if (bIsMain) return 1;
                        return 0;
                    })
                    .map(c => {
                    const nOrders = orderCountFor(c);
                    const isMainCompany = (c.name || '').toLowerCase().includes('zeticas sas bic');
                    
                    return (
                        <div
                            key={c.id}
                            className={`supplier-card ${isMainCompany ? 'own-company-card' : ''}`}
                            style={{
                                background: isMainCompany ? 'rgba(2, 54, 54, 0.02)' : '#fff', 
                                padding: '1.8rem', 
                                borderRadius: '24px',
                                border: isMainCompany ? `2.5px solid var(--color-primary)` : '1px solid #f1f5f9', 
                                boxShadow: isMainCompany ? '0 10px 30px rgba(2, 54, 54, 0.1)' : '0 4px 15px rgba(0,0,0,0.02)',
                                transition: 'all 0.25s ease', 
                                opacity: c.status === 'Inactive' ? 0.6 : 1,
                                position: 'relative'
                            }}
                        >
                            {/* Top row: badge + status */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <SubBadge sub={c.subType} />
                                    {isMainCompany && (
                                        <span style={{
                                            background: 'var(--color-primary)',
                                            color: 'white',
                                            padding: '3px 12px',
                                            borderRadius: '20px',
                                            fontSize: '0.65rem',
                                            fontWeight: '900',
                                            letterSpacing: '0.5px'
                                        }}>TU EMPRESA</span>
                                    )}
                                </div>
                                <span style={{
                                    padding: '3px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 700,
                                    background: c.status === 'Archived' ? '#f1f5f9' : (c.status === 'Active' ? '#dcfce7' : '#fef2f2'),
                                    color: c.status === 'Archived' ? '#64748b' : (c.status === 'Active' ? '#166534' : '#991b1b')
                                }}>
                                    {c.status === 'Archived' ? 'Archivado' : (c.status === 'Active' ? 'Activo' : 'Inactivo')}
                                </span>
                            </div>

                            {/* Name */}
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.3rem' }}>
                                {c.name}
                            </h3>

                            {/* Tags row */}
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
                                {c.nit && (
                                    <span style={{ background: '#f8fafc', padding: '3px 10px', borderRadius: '8px', fontSize: '0.72rem', color: '#475569', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <Hash size={11} /> {c.nit}
                                    </span>
                                )}
                                {c.city && (
                                    <span style={{ background: '#f8fafc', padding: '3px 10px', borderRadius: '8px', fontSize: '0.72rem', color: '#475569', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <MapPin size={11} /> {c.city}
                                    </span>
                                )}
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                                    <ShoppingBag size={11} /> {nOrders} Pedido{nOrders !== 1 ? 's' : ''}
                                </span>
                            </div>

                            {/* Info rows */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1.5rem' }}>
                                {c.phone && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>
                                        <Phone size={13} style={{ color: '#94a3b8', flexShrink: 0 }} /> {c.phone}
                                    </div>
                                )}
                                {c.email && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#475569', overflow: 'hidden' }}>
                                        <Mail size={13} style={{ color: '#94a3b8', flexShrink: 0 }} /> {c.email}
                                    </div>
                                )}
                                {c.contactName && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>
                                        <User size={13} style={{ color: '#94a3b8', flexShrink: 0 }} /> {c.contactName}
                                    </div>
                                )}
                                {c.source && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>
                                        <Globe size={13} style={{ color: '#94a3b8', flexShrink: 0 }} /> {c.source}
                                    </div>
                                )}
                            </div>

                            {/* Action buttons */}
                            <div style={{ display: 'flex', gap: '0.65rem' }}>
                                {/* Edit */}
                                <button
                                    onClick={() => openEdit(c)}
                                    title="Editar cliente"
                                    style={{ padding: '0.55rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fff', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#e0f2fe'; e.currentTarget.style.color = '#0369a1'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#64748b'; }}
                                >
                                    <Edit2 size={15} />
                                </button>
                                {/* Archive Toggle */}
                                <button
                                    onClick={() => toggleArchive(c)}
                                    title={c.status === 'Archived' ? 'Restaurar cliente' : 'Archivar cliente'}
                                    style={{ padding: '0.55rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fff', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = c.status === 'Archived' ? '#dcfce7' : '#fee2e2'; e.currentTarget.style.color = c.status === 'Archived' ? '#166534' : '#ef4444'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#64748b'; }}
                                >
                                    <Download size={15} style={{ transform: c.status === 'Archived' ? 'rotate(180deg)' : 'none' }} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── CREATE / EDIT MODAL ─────────────────────────────────────── */}
            {modal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '1rem' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '660px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>

                        {/* Header */}
                        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1, borderRadius: '24px 24px 0 0' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--color-primary)', fontWeight: 800 }}>
                                    {modal.mode === 'create' ? '+ Nuevo Cliente' : 'Editar Cliente'}
                                </h3>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Completa todos los campos del perfil del cliente</p>
                            </div>
                            <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={22} /></button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSave} style={{ padding: '1.75rem 2rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

                                <div style={{ gridColumn: '1/-1' }}>
                                    <label style={lbl}><Building2 size={11} style={{ display: 'inline', marginRight: 4 }} />Nombre o Razón Social *</label>
                                    <input required placeholder="Empresa Ejemplo SAS" value={modal.data.name} onChange={e => onChange('name', e.target.value)} style={inp} />
                                </div>

                                <div>
                                    <label style={lbl}><CreditCard size={11} style={{ display: 'inline', marginRight: 4 }} />Tipo de Identificación</label>
                                    <select value={modal.data.idType} onChange={e => onChange('idType', e.target.value)} style={inp}>
                                        {ID_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={lbl}><Hash size={11} style={{ display: 'inline', marginRight: 4 }} />Número de Identificación</label>
                                    <input placeholder="900123456-1" value={modal.data.nit} onChange={e => onChange('nit', e.target.value)} style={inp} />
                                </div>

                                <div style={{ gridColumn: '1/-1' }}>
                                    <label style={lbl}><MapPin size={11} style={{ display: 'inline', marginRight: 4 }} />Dirección</label>
                                    <input placeholder="Calle 123 # 45-67" value={modal.data.address} onChange={e => onChange('address', e.target.value)} style={inp} />
                                </div>

                                <div>
                                    <label style={lbl}><Globe size={11} style={{ display: 'inline', marginRight: 4 }} />Ciudad</label>
                                    <input placeholder="Bogotá" value={modal.data.city} onChange={e => onChange('city', e.target.value)} style={inp} />
                                </div>
                                <div>
                                    <label style={lbl}><Phone size={11} style={{ display: 'inline', marginRight: 4 }} />Teléfono / Celular</label>
                                    <input placeholder="3001234567" value={modal.data.phone} onChange={e => onChange('phone', e.target.value)} style={inp} />
                                </div>

                                <div>
                                    <label style={lbl}><Mail size={11} style={{ display: 'inline', marginRight: 4 }} />Correo Electrónico</label>
                                    <input type="email" placeholder="contacto@empresa.com" value={modal.data.email} onChange={e => onChange('email', e.target.value)} style={inp} />
                                </div>
                                <div>
                                    <label style={lbl}><User size={11} style={{ display: 'inline', marginRight: 4 }} />Nombre Contacto</label>
                                    <input placeholder="Juan Pérez" value={modal.data.contactName} onChange={e => onChange('contactName', e.target.value)} style={inp} />
                                </div>

                                <div>
                                    <label style={lbl}><Briefcase size={11} style={{ display: 'inline', marginRight: 4 }} />Tipo Cliente</label>
                                    <select value={modal.data.subType} onChange={e => onChange('subType', e.target.value)} style={inp}>
                                        <option value="B2B">B2B</option>
                                        <option value="B2C">B2C</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={lbl}><Globe size={11} style={{ display: 'inline', marginRight: 4 }} />Fuente de Pedido</label>
                                    <select value={modal.data.source} onChange={e => onChange('source', e.target.value)} style={inp}>
                                        {SOURCES.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>

                                {modal.mode === 'edit' && (
                                    <div>
                                        <label style={lbl}>Estado</label>
                                        <select value={modal.data.status} onChange={e => onChange('status', e.target.value)} style={inp}>
                                            <option value="Active">Activo</option>
                                            <option value="Inactive">Inactivo</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
                                <button type="button" onClick={closeModal} style={{ padding: '0.7rem 1.5rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.75rem', borderRadius: '10px', border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: isSaving ? 0.7 : 1 }}>
                                    <Save size={15} />{isSaving ? 'Guardando...' : (modal.mode === 'create' ? 'Registrar Cliente' : 'Guardar Cambios')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── BATCH LOAD MODAL ────────────────────────────────────────── */}
            {isBulkModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000, padding: '1rem' }}>
                    <div style={{ background: '#fff', borderRadius: '25px', padding: '2.5rem', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative' }}>
                        <button onClick={() => setIsBulkModalOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={24} /></button>
                        
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{ width: '60px', height: '60px', background: '#f0f9ff', color: '#0369a1', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                <Upload size={30} />
                            </div>
                            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.4rem', fontWeight: 800 }}>Carga Masiva de Clientes</h3>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                Importa tu base de datos de clientes rápidamente usando una plantilla de Excel.
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Step 1: Download */}
                            <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '18px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>1. Descargar Plantilla</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Obtén el formato correcto</div>
                                </div>
                                <button onClick={downloadTemplate} style={{ padding: '0.6rem 1rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Download size={14} /> Descargar
                                </button>
                            </div>

                            {/* Step 2: Upload */}
                            <div style={{ padding: '1.25rem', background: '#f0f9ff', borderRadius: '18px', border: '1px solid #bae6fd' }}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0369a1' }}>2. Subir Excel Diligenciado</div>
                                    <div style={{ fontSize: '0.75rem', color: '#0369a1', opacity: 0.8 }}>Selecciona tu archivo .xlsx</div>
                                </div>
                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', padding: '1rem', background: '#0369a1', color: '#fff', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.2s' }}>
                                    <Upload size={18} /> SELECCIONAR ARCHIVO
                                    <input type="file" accept=".xlsx,.xls" onChange={(e) => { handleBulkUpload(e); setIsBulkModalOpen(false); }} style={{ display: 'none' }} />
                                </label>
                            </div>
                        </div>

                        <button onClick={() => setIsBulkModalOpen(false)} style={{ width: '100%', padding: '1rem', marginTop: '1.5rem', border: 'none', background: 'transparent', color: '#94a3b8', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                            Cerrar
                        </button>
                    </div>
                </div>
            )}

            {/* ── DUPLICATES MODAL ────────────────────────────────────────── */}
            {duplicatesModal.isOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000, padding: '1rem' }}>
                    <div style={{ background: '#fff', borderRadius: '20px', padding: '2rem', width: '100%', maxWidth: '480px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                            <div style={{ background: '#fef3c7', borderRadius: '12px', padding: '0.75rem', color: '#b45309', flexShrink: 0 }}>
                                <AlertTriangle size={22} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Clientes Duplicados</h3>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                                    {duplicatesModal.duplicatedClients.length} cliente(s) ya existen por NIT y serán omitidos.
                                </p>
                            </div>
                        </div>
                        <div style={{ background: '#fffbeb', borderRadius: '10px', padding: '0.75rem', marginBottom: '1.25rem', maxHeight: '150px', overflowY: 'auto' }}>
                            {duplicatesModal.duplicatedClients.map((c, i) => (
                                <div key={i} style={{ fontSize: '0.8rem', color: '#92400e', padding: '0.2rem 0' }}>⚠ {c.name} — NIT: {c.nit}</div>
                            ))}
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1.25rem' }}>
                            Se importarán <strong>{duplicatesModal.newClients.length}</strong> cliente(s) nuevos. ¿Deseas continuar?
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setDuplicatesModal({ isOpen: false, newClients: [], duplicatedClients: [] })} style={{ padding: '0.7rem 1.5rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>
                                Cancelar
                            </button>
                            <button onClick={() => persistClients(duplicatesModal.newClients)} disabled={isSaving || !duplicatesModal.newClients.length} style={{ padding: '0.7rem 1.5rem', borderRadius: '10px', border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: (isSaving || !duplicatesModal.newClients.length) ? 0.6 : 1 }}>
                                {isSaving ? 'Importando...' : `Importar ${duplicatesModal.newClients.length} nuevos`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Clients;
