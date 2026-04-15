import React, { useState, useMemo } from 'react';
import {
    Users, Search, RefreshCw, Star, Calendar,
    Clock, CheckCircle, XCircle, AlertTriangle,
    ChevronDown, ChevronUp, Package, Phone, Mail,
    MapPin, TrendingUp, Download, Archive, Trash2, FolderArchive, UserCheck
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import * as XLSX from 'xlsx';

const deepTeal = "#023636";
const institutionOcre = "#D4785A";
const lightBg = "#f8fafc";

const PLAN_COLORS = {
    '3 Meses':  { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
    '6 Meses':  { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
    '12 Meses': { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
};

const STATUS_STYLES = {
    Active:   { bg: '#dcfce7', color: '#15803d', label: 'Activo' },
    Inactive: { bg: '#fee2e2', color: '#dc2626', label: 'Inactivo' },
    Pending:  { bg: '#fef9c3', color: '#ca8a04', label: 'Pendiente' },
    Archived: { bg: '#f1f5f9', color: '#64748b', label: 'Archivado' },
};

// ── Utility ──────────────────────────────────────────────────────────────────
const daysRemaining = (member) => {
    const rawCreatedAt = member?.membership?.created_at || member?.created_at;
    const planStr = member?.membership?.plan || member?.plan || '';
    const months = parseInt(planStr) || 0;
    if (!rawCreatedAt || months === 0) return null;
    const start = new Date(rawCreatedAt);
    const end = new Date(new Date(start).setMonth(start.getMonth() + months));
    const diff = Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24));
    return { days: diff, end, isExpired: diff <= 0, isApproaching: diff > 0 && diff <= 30 };
};

const planMonths = (p) => parseInt((p || '').split(' ')[0]) || 0;

// ── Member Detail Drawer ──────────────────────────────────────────────────────
const MemberDrawer = ({ member, items, onClose }) => {
    if (!member) return null;
    const plan = daysRemaining(member);
    const planStyle = PLAN_COLORS[member?.membership?.plan || member?.plan] || PLAN_COLORS['3 Meses'];
    const statusStyle = STATUS_STYLES[member.status] || STATUS_STYLES['Pending'];
    const pantry = member.pantry || [];

    const total = pantry.reduce((acc, p) => {
        const product = items.find(i => i.id === p.id);
        return acc + (product?.price || p.price || 0) * p.quantity;
    }, 0);

    return (
        <div style={{
            position: 'fixed', top: 0, right: 0, height: '100vh', width: '420px',
            background: '#fff', boxShadow: '-20px 0 50px rgba(0,0,0,0.12)', zIndex: 3000,
            display: 'flex', flexDirection: 'column', overflowY: 'auto',
            animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
            <div style={{ padding: '2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.4rem', color: deepTeal, fontWeight: 800 }}>{member.name || 'Sin nombre'}</h2>
                    <p style={{ margin: '0.3rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>{member.email}</p>
                </div>
                <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '0.5rem 0.8rem', cursor: 'pointer', fontWeight: 700, color: '#64748b' }}>✕</button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Status + Plan */}
                <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                    <span style={{ padding: '0.35rem 1rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 800, background: statusStyle.bg, color: statusStyle.color }}>
                        {statusStyle.label}
                    </span>
                    {(member?.membership?.plan || member?.plan) && (
                        <span style={{ padding: '0.35rem 1rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 800, background: planStyle.bg, color: planStyle.color, border: `1px solid ${planStyle.border}` }}>
                            <Star size={11} style={{ marginRight: 4 }} />
                            {member?.membership?.plan || member?.plan}
                        </span>
                    )}
                    {member.frequency && (
                        <span style={{ padding: '0.35rem 1rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700, background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <RefreshCw size={11} /> {member.frequency}
                        </span>
                    )}
                </div>

                {/* Plan Progress */}
                {plan && (
                    <div style={{ background: plan.isExpired ? '#fff1f2' : (plan.isApproaching ? '#fffbeb' : '#f0fdf4'), padding: '1rem', borderRadius: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: plan.isExpired ? '#dc2626' : deepTeal, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {plan.isExpired ? '⚠ EXPIRADO' : '📅 Vigencia del Plan'}
                            </span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: plan.isExpired ? '#dc2626' : (plan.isApproaching ? '#d97706' : '#16a34a') }}>
                                {plan.isExpired ? `Expiró ${plan.end.toLocaleDateString('es-CO')}` : `${plan.days} días restantes`}
                            </span>
                        </div>
                        {!plan.isExpired && (
                            <div style={{ background: 'rgba(0,0,0,0.06)', borderRadius: '10px', height: '6px', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${Math.min(100, (1 - plan.days / (planMonths(member?.membership?.plan || member?.plan) * 30)) * 100)}%`,
                                    height: '100%',
                                    background: plan.isApproaching ? '#f59e0b' : '#22c55e',
                                    borderRadius: '10px',
                                    transition: 'width 1s ease'
                                }} />
                            </div>
                        )}
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>Vence: {plan.end.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                )}

                {/* Contact */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Contacto</h4>
                    {member.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: '#334155' }}><Phone size={14} color={deepTeal} /> {member.phone}</div>}
                    {member.email && <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: '#334155' }}><Mail size={14} color={deepTeal} /> {member.email}</div>}
                    {member.address && <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: '#334155' }}><MapPin size={14} color={deepTeal} /> {member.address}{member.city ? `, ${member.city}` : ''}</div>}
                    {member.nit && <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: '#334155' }}><span style={{ fontWeight: 700, color: '#94a3b8', fontSize: '0.75rem' }}>NIT/CC</span> {member.nit}</div>}
                </div>

                {/* Pantry */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                        <h4 style={{ margin: 0, fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Su Despensa ({pantry.length} productos)</h4>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem', color: deepTeal }}>${total.toLocaleString()}/envío</span>
                    </div>
                    {pantry.length === 0 ? (
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>Sin productos configurados aún</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {pantry.map((p, idx) => {
                                const product = items.find(i => i.id === p.id);
                                return (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.7rem 1rem', background: lightBg, borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                            {product?.image_url ? (
                                                <img src={product.image_url} alt={p.name} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Package size={16} color="#94a3b8" />
                                                </div>
                                            )}
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>{p.name || product?.name || 'Producto'}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>x{p.quantity} uds</div>
                                            </div>
                                        </div>
                                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: deepTeal }}>${((product?.price || p.price || 0) * p.quantity).toLocaleString()}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Timestamps */}
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {member.created_at && <span>📅 Creado: {new Date(member.created_at).toLocaleDateString('es-CO')}</span>}
                    {member.last_pantry_update && <span>🔄 Última actualización: {new Date(member.last_pantry_update).toLocaleDateString('es-CO')}</span>}
                </div>
            </div>
            <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
const AdminSubscriptions = () => {
    const { clients, items, updateClient, deleteClient } = useBusiness();

    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPlan, setFilterPlan] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [sortDir, setSortDir] = useState('asc');
    const [selectedMember, setSelectedMember] = useState(null);
    const [archiveConfirm, setArchiveConfirm] = useState(null); // memberId waiting 2nd click
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [view, setView] = useState('active'); // 'active' or 'archived'

    const handleArchive = async (e, member) => {
        e.stopPropagation();
        if (archiveConfirm !== member.id) {
            setArchiveConfirm(member.id);
            setTimeout(() => setArchiveConfirm(null), 3000);
            return;
        }
        setArchiveConfirm(null);
        try {
            await updateClient(member.id, { status: 'Archived', archived_at: new Date().toISOString() });
        } catch (err) { console.error(err); }
    };

    const handleRestore = async (e, member) => {
        e.stopPropagation();
        try {
            await updateClient(member.id, { status: 'Active', archived_at: null });
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (e, member) => {
        e.stopPropagation();
        if (deleteConfirm !== member.id) {
            setDeleteConfirm(member.id);
            setTimeout(() => setDeleteConfirm(null), 3000);
            return;
        }
        setDeleteConfirm(null);
        try {
            await deleteClient(member.id);
        } catch (err) { console.error(err); }
    };

    // Members are clients with is_member===true or who have a membership plan
    const allMembers = useMemo(() => {
        return clients.filter(c =>
            c.is_member === true ||
            c.role === 'member' ||
            c.membership?.plan ||
            c.plan
        );
    }, [clients]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        let result = allMembers.filter(m => {
            // View filter
            const isArchived = m.status === 'Archived';
            if (view === 'active' && isArchived) return false;
            if (view === 'archived' && !isArchived) return false;

            const matchSearch = !q ||
                (m.name || '').toLowerCase().includes(q) ||
                (m.email || '').toLowerCase().includes(q) ||
                (m.city || '').toLowerCase().includes(q) ||
                (m.phone || '').toLowerCase().includes(q) ||
                (m.nit || '').toLowerCase().includes(q);

            const statusOk = filterStatus === 'all' ||
                (filterStatus === 'expired' && (daysRemaining(m)?.isExpired)) ||
                (filterStatus === 'approaching' && (daysRemaining(m)?.isApproaching)) ||
                (filterStatus === 'active' && !daysRemaining(m)?.isExpired && m.status !== 'Inactive') ||
                (filterStatus === 'inactive' && m.status === 'Inactive');

            const plan = m?.membership?.plan || m?.plan || '';
            const planOk = filterPlan === 'all' || plan === filterPlan;

            return matchSearch && statusOk && planOk;
        });

        result.sort((a, b) => {
            let valA, valB;
            if (sortBy === 'name')   { valA = (a.name || '').toLowerCase(); valB = (b.name || '').toLowerCase(); }
            if (sortBy === 'plan')   { valA = planMonths(a?.membership?.plan || a?.plan); valB = planMonths(b?.membership?.plan || b?.plan); }
            if (sortBy === 'days')   { valA = daysRemaining(a)?.days ?? -Infinity; valB = daysRemaining(b)?.days ?? -Infinity; }
            if (sortBy === 'pantry') { valA = (a.pantry || []).length; valB = (b.pantry || []).length; }
            if (sortDir === 'asc') return valA > valB ? 1 : -1;
            return valA < valB ? 1 : -1;
        });

        return result;
    }, [allMembers, search, filterStatus, filterPlan, sortBy, sortDir, view]);

    // ── KPIs ─────────────────────────────────────────────────────────────────
    const kpis = useMemo(() => {
        const activePool = allMembers.filter(m => m.status !== 'Archived');
        const active = activePool.filter(m => !daysRemaining(m)?.isExpired && m.status !== 'Inactive').length;
        const expired = activePool.filter(m => daysRemaining(m)?.isExpired).length;
        const approaching = activePool.filter(m => daysRemaining(m)?.isApproaching).length;
        const revenue = activePool.reduce((acc, m) => {
            const pantry = m.pantry || [];
            return acc + pantry.reduce((s, p) => {
                const product = items.find(i => i.id === p.id);
                return s + (product?.price || p.price || 0) * p.quantity;
            }, 0);
        }, 0);
        return { total: activePool.length, active, expired, approaching, revenue, archived: allMembers.length - activePool.length };
    }, [allMembers, items]);

    // ── Export ────────────────────────────────────────────────────────────────
    const handleExport = () => {
        const rows = filtered.map(m => ({
            Nombre: m.name || '',
            Email: m.email || '',
            Teléfono: m.phone || '',
            Ciudad: m.city || '',
            Plan: m?.membership?.plan || m?.plan || '',
            Frecuencia: m.frequency || '',
            Estado: m.status || '',
            'Días Restantes': daysRemaining(m)?.days ?? 'N/A',
            'Productos en Despensa': (m.pantry || []).length,
            NIT: m.nit || '',
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Suscriptores');
        XLSX.writeFile(wb, `suscriptores_zeticas_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const toggleSort = (col) => {
        if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortBy(col); setSortDir('asc'); }
    };

    const SortIcon = ({ col }) => {
        if (sortBy !== col) return <ChevronDown size={12} style={{ opacity: 0.3 }} />;
        return sortDir === 'asc' ? <ChevronUp size={12} color={institutionOcre} /> : <ChevronDown size={12} color={institutionOcre} />;
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {/* ── KPI Row ─────────────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Total Socios', value: kpis.total, icon: <Users size={20} />, color: deepTeal, bg: '#e6f2f2' },
                    { label: 'Activos', value: kpis.active, icon: <CheckCircle size={20} />, color: '#16a34a', bg: '#dcfce7' },
                    { label: 'Revenue Est.', value: `$${kpis.revenue.toLocaleString()}`, icon: <TrendingUp size={20} />, color: institutionOcre, bg: '#fff7ed' },
                    { label: 'En Carpeta', value: kpis.archived, icon: <FolderArchive size={20} />, color: '#64748b', bg: '#f1f5f9' },
                ].map(k => (
                    <div key={k.label} style={{ background: '#fff', padding: '1.2rem', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: 42, height: 42, borderRadius: '12px', background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color, flexShrink: 0 }}>
                            {k.icon}
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: deepTeal, lineHeight: 1 }}>{k.value}</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginTop: 4, textTransform: 'uppercase' }}>{k.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── View Switcher ── */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
                <button onClick={() => setView('active')} style={{ 
                    padding: '0.8rem 1.5rem', border: 'none', background: 'none', cursor: 'pointer',
                    fontSize: '0.9rem', fontWeight: 800, color: view === 'active' ? institutionOcre : '#64748b',
                    borderBottom: view === 'active' ? `3px solid ${institutionOcre}` : '3px solid transparent',
                    transition: 'all 0.3s'
                }}>
                    Suscripciones Activas
                </button>
                <button onClick={() => setView('archived')} style={{ 
                    padding: '0.8rem 1.5rem', border: 'none', background: 'none', cursor: 'pointer',
                    fontSize: '0.9rem', fontWeight: 800, color: view === 'archived' ? institutionOcre : '#64748b',
                    borderBottom: view === 'archived' ? `3px solid ${institutionOcre}` : '3px solid transparent',
                    transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                    <FolderArchive size={16} /> Carpeta de Archivados
                </button>
            </div>

            {/* ── Filters ──────────────────────────────────────────────────── */}
            <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '20px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#f8fafc', padding: '0.6rem 1rem', borderRadius: '12px', flex: 1 }}>
                    <Search size={16} color="#94a3b8" />
                    <input
                        type="text"
                        placeholder="Buscar socio..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', width: '100%' }}
                    />
                </div>

                {view === 'active' && (
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '0.6rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 700, color: deepTeal }}>
                        <option value="all">Todos los estados</option>
                        <option value="active">Activos</option>
                        <option value="approaching">Expirando pronto</option>
                        <option value="expired">Expirados</option>
                        <option value="inactive">Inactivos (Baja)</option>
                    </select>
                )}

                <button onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1.2rem', background: deepTeal, color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    <Download size={16} /> Exportar
                </button>
            </div>

            {/* ── Table ────────────────────────────────────────────────────── */}
            <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr 0.8fr 80px', gap: '1rem', padding: '1rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                    <div onClick={() => toggleSort('name')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>Socio <SortIcon col="name" /></div>
                    <div onClick={() => toggleSort('plan')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>Plan <SortIcon col="plan" /></div>
                    <div onClick={() => toggleSort('days')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>Vigencia <SortIcon col="days" /></div>
                    <div>Estado</div>
                    <div onClick={() => toggleSort('pantry')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>Despensa <SortIcon col="pantry" /></div>
                    <div style={{ textAlign: 'center' }}>Acción</div>
                </div>

                {filtered.length === 0 ? (
                    <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                        <FolderArchive size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                        <p style={{ fontWeight: 700 }}>No hay socios en esta vista</p>
                    </div>
                ) : filtered.map((m, idx) => {
                    const plan = daysRemaining(m);
                    const planStr = m?.membership?.plan || m?.plan || '';
                    const planStyle = PLAN_COLORS[planStr] || { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' };
                    const statusStyle = STATUS_STYLES[m.status] || STATUS_STYLES['Pending'];
                    
                    return (
                        <div
                            key={m.id || idx}
                            onClick={() => setSelectedMember(m)}
                            style={{
                                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr 0.8fr 80px', gap: '1rem',
                                padding: '1.2rem 1.5rem', borderBottom: '1px solid #f8fafc',
                                cursor: 'pointer', alignItems: 'center', transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <div>
                                <div style={{ fontWeight: 800, color: deepTeal }}>{m.name || 'Sin nombre'}</div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{m.email}</div>
                            </div>

                            <div>
                                <span style={{ padding: '0.3rem 0.8rem', borderRadius: '50px', fontSize: '0.7rem', fontWeight: 800, background: planStyle.bg, color: planStyle.color, border: `1px solid ${planStyle.border}` }}>
                                    {planStr || 'Sin plan'}
                                </span>
                            </div>

                            <div>
                                {plan ? (
                                    <span style={{ fontWeight: 800, color: plan.isExpired ? '#dc2626' : (plan.isApproaching ? '#d97706' : '#16a34a') }}>
                                        {plan.isExpired ? 'Expirado' : `${plan.days}d`}
                                    </span>
                                ) : '—'}
                            </div>

                            <div>
                                <span style={{ padding: '0.3rem 0.6rem', borderRadius: '50px', fontSize: '0.7rem', fontWeight: 700, background: statusStyle.bg, color: statusStyle.color }}>
                                    {statusStyle.label}
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: deepTeal }}>
                                <Package size={14} /> {(m.pantry || []).length}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
                                {view === 'active' ? (
                                    <button 
                                        onClick={(e) => handleArchive(e, m)}
                                        style={{ background: archiveConfirm === m.id ? '#fee2e2' : 'none', border: 'none', color: archiveConfirm === m.id ? '#ef4444' : '#94a3b8', cursor: 'pointer', padding: '5px', borderRadius: '8px' }}
                                        title="Archivar"
                                    >
                                        <Archive size={18} />
                                    </button>
                                ) : (
                                    <>
                                        <button onClick={(e) => handleRestore(e, m)} style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer' }} title="Restaurar">
                                            <UserCheck size={18} />
                                        </button>
                                        <button onClick={(e) => handleDelete(e, m)} style={{ background: deleteConfirm === m.id ? '#fee2e2' : 'none', border: 'none', color: deleteConfirm === m.id ? '#ef4444' : '#94a3b8', cursor: 'pointer', padding: '5px', borderRadius: '8px' }} title="Eliminar Permanente">
                                            <Trash2 size={18} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedMember && (
                <>
                    <div onClick={() => setSelectedMember(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 2999, backdropFilter: 'blur(2px)' }} />
                    <MemberDrawer member={selectedMember} items={items} onClose={() => setSelectedMember(null)} />
                </>
            )}
        </div>
    );
};

export default AdminSubscriptions;
