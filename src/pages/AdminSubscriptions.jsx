import React, { useState, useMemo } from 'react';
import {
    Users, Search, RefreshCw, Star, Calendar,
    Clock, CheckCircle, XCircle, AlertTriangle,
    ChevronDown, ChevronUp, Package, Phone, Mail,
    MapPin, TrendingUp, Download, Archive, Trash2
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
    const { clients, subscriptions, items, updateClient } = useBusiness();

    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPlan, setFilterPlan] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [sortDir, setSortDir] = useState('asc');
    const [selectedMember, setSelectedMember] = useState(null);
    const [archiveConfirm, setArchiveConfirm] = useState(null); // memberId waiting 2nd click

    const archiveMember = async (e, member) => {
        e.stopPropagation();
        if (archiveConfirm !== member.id) {
            // First click — request confirmation
            setArchiveConfirm(member.id);
            setTimeout(() => setArchiveConfirm(null), 4000); // auto-cancel after 4s
            return;
        }
        // Second click — proceed
        setArchiveConfirm(null);
        try {
            await updateClient(member.id, { is_member: false, archived_at: new Date().toISOString() });
        } catch (err) {
            console.error('Error archivando socio:', err);
        }
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
    }, [allMembers, search, filterStatus, filterPlan, sortBy, sortDir]);

    // ── KPIs ─────────────────────────────────────────────────────────────────
    const kpis = useMemo(() => {
        const active = allMembers.filter(m => !daysRemaining(m)?.isExpired && m.status !== 'Inactive').length;
        const expired = allMembers.filter(m => daysRemaining(m)?.isExpired).length;
        const approaching = allMembers.filter(m => daysRemaining(m)?.isApproaching).length;
        const revenue = allMembers.reduce((acc, m) => {
            const pantry = m.pantry || [];
            return acc + pantry.reduce((s, p) => {
                const product = items.find(i => i.id === p.id);
                return s + (product?.price || p.price || 0) * p.quantity;
            }, 0);
        }, 0);
        return { total: allMembers.length, active, expired, approaching, revenue };
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Total Socios', value: kpis.total, icon: <Users size={20} />, color: deepTeal, bg: '#e6f2f2' },
                    { label: 'Activos', value: kpis.active, icon: <CheckCircle size={20} />, color: '#16a34a', bg: '#dcfce7' },
                    { label: 'Expirando', value: kpis.approaching, icon: <AlertTriangle size={20} />, color: '#d97706', bg: '#fef9c3' },
                    { label: 'Expirados', value: kpis.expired, icon: <XCircle size={20} />, color: '#dc2626', bg: '#fee2e2' },
                    { label: 'Revenue Est./envío', value: `$${kpis.revenue.toLocaleString()}`, icon: <TrendingUp size={20} />, color: institutionOcre, bg: '#fff7ed' },
                ].map(k => (
                    <div key={k.label} style={{ background: '#fff', padding: '1.2rem 1.4rem', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                        <div style={{ width: 42, height: 42, borderRadius: '12px', background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color, flexShrink: 0 }}>
                            {k.icon}
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '1.3rem', color: deepTeal, lineHeight: 1 }}>{k.value}</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Filters ──────────────────────────────────────────────────── */}
            <div style={{ background: '#fff', padding: '1.2rem 1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#f8fafc', padding: '0.6rem 1rem', borderRadius: '12px', flex: '1 1 220px' }}>
                    <Search size={16} color="#94a3b8" />
                    <input
                        type="text"
                        placeholder="Buscar socio..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', color: deepTeal, width: '100%', fontWeight: 600 }}
                    />
                </div>

                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '0.6rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 700, color: deepTeal, background: '#fff', cursor: 'pointer' }}>
                    <option value="all">Todos los estados</option>
                    <option value="active">Activos</option>
                    <option value="approaching">Expirando pronto (≤30d)</option>
                    <option value="expired">Expirados</option>
                    <option value="inactive">Inactivos</option>
                </select>

                <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)} style={{ padding: '0.6rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 700, color: deepTeal, background: '#fff', cursor: 'pointer' }}>
                    <option value="all">Todos los planes</option>
                    <option value="3 Meses">3 Meses</option>
                    <option value="6 Meses">6 Meses</option>
                    <option value="12 Meses">12 Meses</option>
                </select>

                <button
                    onClick={handleExport}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', background: deepTeal, color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', marginLeft: 'auto' }}
                >
                    <Download size={16} /> Exportar
                </button>
            </div>

            {/* ── Table ────────────────────────────────────────────────────── */}
            <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr 0.8fr 48px', gap: '1rem', padding: '0.9rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {[['name','Socio'],['plan','Plan'],['days','Vigencia'],['',null],['pantry','Despensa'],['','']].map(([col, label], idx) =>
                        label ? (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: col ? 'pointer' : 'default' }} onClick={() => col && toggleSort(col)}>
                                {label} {col && <SortIcon col={col} />}
                            </div>
                        ) : <div key={idx}></div>
                    )}
                </div>

                {/* Rows */}
                {filtered.length === 0 ? (
                    <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                        <Users size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                        <p style={{ fontWeight: 700, fontSize: '1rem' }}>No se encontraron socios</p>
                        <p style={{ fontSize: '0.85rem' }}>Ajusta los filtros o espera a que los usuarios se registren desde /recurrentes</p>
                    </div>
                ) : filtered.map((m, idx) => {
                    const plan = daysRemaining(m);
                    const planStr = m?.membership?.plan || m?.plan || '';
                    const planStyle = PLAN_COLORS[planStr] || { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' };
                    const statusStyle = STATUS_STYLES[m.status] || STATUS_STYLES['Pending'];
                    const pantryCount = (m.pantry || []).length;
                    const freq = m.frequency || 'Mensual';

                    return (
                        <div
                            key={m.id || idx}
                            onClick={() => setSelectedMember(m)}
                            style={{
                                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr 0.8fr 48px', gap: '1rem',
                                padding: '1rem 1.5rem', borderBottom: '1px solid #f8fafc',
                                cursor: 'pointer', transition: 'background 0.2s',
                                background: idx % 2 === 0 ? '#fff' : '#fafbfc',
                                alignItems: 'center'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                            onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafbfc'}
                        >
                            {/* Name + contact */}
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: deepTeal }}>{m.name || '—'}</div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>{m.email || m.phone || m.city || '—'}</div>
                            </div>

                            {/* Plan badge */}
                            <div>
                                {planStr ? (
                                    <span style={{ padding: '0.3rem 0.8rem', borderRadius: '50px', fontSize: '0.7rem', fontWeight: 800, background: planStyle.bg, color: planStyle.color, border: `1px solid ${planStyle.border}` }}>
                                        <Star size={10} style={{ marginRight: 3 }} />{planStr}
                                    </span>
                                ) : <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>Sin plan</span>}
                            </div>

                            {/* Vigencia */}
                            <div>
                                {plan ? (
                                    <div>
                                        <span style={{ fontWeight: 800, fontSize: '0.85rem', color: plan.isExpired ? '#dc2626' : (plan.isApproaching ? '#d97706' : '#16a34a') }}>
                                            {plan.isExpired ? 'EXPIRADO' : `${plan.days}d`}
                                        </span>
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>
                                            {plan.isExpired ? `Expiró ${plan.end.toLocaleDateString('es-CO')}` : `Vence ${plan.end.toLocaleDateString('es-CO')}`}
                                        </div>
                                    </div>
                                ) : <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>—</span>}
                            </div>

                            {/* Status + Frequency */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '50px', fontSize: '0.7rem', fontWeight: 700, background: statusStyle.bg, color: statusStyle.color, width: 'fit-content' }}>
                                    {statusStyle.label}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <RefreshCw size={10} /> {freq}
                                </span>
                            </div>

                            {/* Pantry count */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Package size={14} color={pantryCount > 0 ? deepTeal : '#cbd5e1'} />
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: pantryCount > 0 ? deepTeal : '#cbd5e1' }}>{pantryCount}</span>
                            </div>

                            {/* Archive button */}
                            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', justifyContent: 'center' }}>
                                <button
                                    onClick={(e) => archiveMember(e, m)}
                                    title={archiveConfirm === m.id ? 'Haz clic de nuevo para confirmar' : 'Archivar suscriptor'}
                                    style={{
                                        background: archiveConfirm === m.id ? '#fee2e2' : 'transparent',
                                        border: archiveConfirm === m.id ? '1px solid #fca5a5' : '1px solid transparent',
                                        borderRadius: '8px',
                                        padding: '0.35rem',
                                        cursor: 'pointer',
                                        color: archiveConfirm === m.id ? '#dc2626' : '#cbd5e1',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    onMouseEnter={e => { if (archiveConfirm !== m.id) { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#ef4444'; }}}
                                    onMouseLeave={e => { if (archiveConfirm !== m.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#cbd5e1'; }}}
                                >
                                    {archiveConfirm === m.id ? <Trash2 size={14} /> : <Archive size={14} />}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <p style={{ textAlign: 'right', marginTop: '1rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                Mostrando {filtered.length} de {allMembers.length} socios
            </p>

            {/* ── Member Detail Drawer ─────────────────────────────────────── */}
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
