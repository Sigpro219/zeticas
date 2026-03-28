import React, { useState, useMemo, useEffect, useCallback } from 'react';
// supabase import removed
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useBusiness } from '../context/BusinessContext';
import {
    Search,
    CheckCircle2,
    Activity,
    Package,
    X,
    ShoppingCart,
    Send,
    ListChecks,
    PlayCircle,
    CheckSquare,
    CalendarClock,
    RefreshCw,
    CloudOff,
    Cloud,
    ExternalLink,
    FileText,
    ChevronDown,
    ChevronUp,
    Zap,
    Trash2
} from 'lucide-react';

const STATUS_ALL = 'Todos';
const STATUS_PROGRAMADA = 'Programada';
const STATUS_EN_PRODUCCION = 'En Producción';
const STATUS_FINALIZADA = 'Finalizada';

// Brand Colors
const deepTeal = "#023636";
const institutionOcre = "#D4785A";
const premiumSalmon = "#E29783";
const glassWhite = "rgba(255, 255, 255, 0.85)";

const Production = () => {
    const { orders, items, recipes, refreshData, productionOrders, saveOdp, updateItem } = useBusiness();
    
    const [explosionPreview, setExplosionPreview] = useState(null);
    const [odpSettings, setOdpSettings] = useState(() => {
        const saved = localStorage.getItem('zeticas_odp_settings');
        return saved ? JSON.parse(saved) : {};
    });

    const [syncStatus, setSyncStatus] = useState('idle');
    const [orderModal, setOrderModal] = useState({ show: false, order: null });
    const [pdfPreview, setPdfPreview] = useState({ show: false, url: '', fileName: '', odpData: null });
    const [confModal, setConfModal] = useState({ show: false, odp: null });
    const [mpConfModal, setMpConfModal] = useState({ show: false, odp: null, materials: [] });
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState(STATUS_ALL);
    const [showEficList, setShowEficList] = useState(false);
    const [showWasteList, setShowWasteList] = useState(false);
    const [isGeneratingOC, setIsGeneratingOC] = useState(false);
    const [dateFilter, setDateFilter] = useState('month');
    const [customRange, setCustomRange] = useState({ from: '', to: '' });

    // ── Sync from Context to local state ──────────────────────────────────────
    useEffect(() => {
        if (productionOrders && productionOrders.length > 0) {
            const settingsFromDB = {};
            productionOrders.forEach(row => {
                if (row.sku) {
                    settingsFromDB[row.sku] = {
                        customQty: row.custom_qty ?? undefined,
                        wasteQty: row.waste_qty ?? undefined,
                        start: row.started_at || undefined,
                        end: row.completed_at || undefined,
                        mpSynced: row.mp_synced || false,
                        inventorySynced: row.inventory_synced || false,
                        odpId: row.odp_number
                    };
                }
            });
            setOdpSettings(prev => {
                const merged = { ...prev, ...settingsFromDB };
                localStorage.setItem('zeticas_odp_settings', JSON.stringify(merged));
                return merged;
            });
            setSyncStatus('synced');
        }
    }, [productionOrders]);

    // ── Save to Firestore ───────────────────────────────────────────────────
    const saveToFirestore = useCallback(async (sku, settings, odpId) => {
        try {
            setSyncStatus('syncing');
            const payload = {
                odp_number: odpId || null,
                custom_qty: settings.customQty !== undefined ? Number(settings.customQty) : null,
                waste_qty: settings.wasteQty !== undefined ? Number(settings.wasteQty) : null,
                started_at: settings.start || null,
                completed_at: settings.end || null,
                mp_synced: settings.mpSynced || false,
                inventory_synced: settings.inventorySynced || false,
                status: settings.end ? 'DONE' : (settings.start ? 'IN_PROGRESS' : 'TO_DO'),
            };

            await saveOdp(sku, payload);
            setSyncStatus('synced');
        } catch (err) {
            console.warn('Error saving ODP to Firestore:', err.message);
            setSyncStatus('error');
        }
    }, [saveOdp]);

    // ── Cola de ODPs ──────────────────────────────────────────────────────────
    const pendingOrders = useMemo(() => orders.filter(o =>
        o.status === 'En Producción' || o.status === 'En Producción (Iniciada)' || o.status === 'En Compras'
    ), [orders]);

    const odpQueue = useMemo(() => {
        const groups = {};
        pendingOrders.forEach(order => {
            order.items?.forEach(item => {
                const sku = item.name;
                if (!groups[sku]) groups[sku] = { sku, relatedOrders: [], totalRequested: 0 };
                groups[sku].relatedOrders.push(order);
                groups[sku].totalRequested += (Number(item.quantity) || 0);
            });
        });

        return Object.values(groups).map((group, index) => {
            const product = items.find(i => i.name === group.sku);
            const inventoryPT = product
                ? (product.initial || 0) + (product.purchases || 0) - (product.sales || 0)
                : 0;
            const safetyStock = product?.safety || 0;
            const calculatedQty = Math.max(0, group.totalRequested - inventoryPT + safetyStock);
            const settings = odpSettings[group.sku] || {};

            const finalQty = settings.customQty !== undefined ? settings.customQty : calculatedQty;

            let status = { text: STATUS_PROGRAMADA, color: 'rgba(239, 68, 68, 0.1)', textColor: '#ef4444' };
            if (settings.start) status = { text: STATUS_EN_PRODUCCION, color: 'rgba(212, 120, 90, 0.1)', textColor: '#D4785A' };
            if (settings.end) status = { text: STATUS_FINALIZADA, color: 'rgba(16, 185, 129, 0.1)', textColor: '#10b981' };

            // Efficiency and waste calculations
            let efficiency = null;
            let waste = null;
            let waste_percent = null;
            if (settings.start && settings.end) {
                const start = new Date(settings.start);
                const end = new Date(settings.end);
                const diffHr = (end - start) / (1000 * 60 * 60);
                if (diffHr > 0) efficiency = Math.round(Number(finalQty) / diffHr);
                
                if (settings.wasteQty !== undefined) {
                    waste = Number(settings.wasteQty);
                    waste_percent = ((waste / Number(finalQty)) * 100).toFixed(1);
                }
            }

            return {
                ...group,
                odpId: settings.odpId || `ODP-${(index + 1).toString().padStart(3, '0')}`,
                inventoryPT,
                safetyStock,
                calculatedQty,
                finalQty,
                settings,
                status,
                efficiency,
                waste,
                waste_percent,
                calcBreakdown: !product ? 'No encontrado' : `Req:${group.totalRequested} - Inv:${inventoryPT} + Min:${safetyStock} = ${calculatedQty}`
            };
        });
    }, [pendingOrders, items, odpSettings]);

    // ── KPIs ──────────────────────────────────────────────────────────────────
    const kpis = useMemo(() => ({
        total: odpQueue.length,
        programadas: odpQueue.filter(o => o.status.text === STATUS_PROGRAMADA).length,
        enProduccion: odpQueue.filter(o => o.status.text === STATUS_EN_PRODUCCION).length,
        finalizadas: odpQueue.filter(o => o.status.text === STATUS_FINALIZADA).length,
    }), [odpQueue]);

    const eficienciaStats = useMemo(() => {
        const finished = odpQueue.filter(o => o.efficiency !== null);
        if (finished.length === 0) return { avg: null, rows: [] };
        const avg = finished.reduce((acc, o) => acc + o.efficiency, 0) / finished.length;
        return { avg, rows: finished };
    }, [odpQueue]);

    const desperdicioStats = useMemo(() => {
        const finished = odpQueue.filter(o => o.waste_percent !== null);
        if (finished.length === 0) return { avg: null, rows: [] };
        const avg = finished.reduce((acc, o) => acc + Number(o.waste_percent), 0) / finished.length;
        return { avg, rows: finished };
    }, [odpQueue]);

    // ── Filtros ───────────────────────────────────────────────────────────────
    const filteredOdpQueue = useMemo(() => {
        const query = searchQuery.toLowerCase();
        let dateFrom = null;
        let dateTo = null;
        if (dateFilter === 'week') {
            dateFrom = new Date();
            dateFrom.setDate(dateFrom.getDate() - 7);
        } else if (dateFilter === 'month') {
            dateFrom = new Date();
            dateFrom.setDate(1);
        } else if (dateFilter === 'custom' && customRange.from && customRange.to) {
            dateFrom = new Date(customRange.from);
            dateTo = new Date(customRange.to);
        }

        return odpQueue.filter(odp => {
            const matchSearch = !query || odp.odpId.toLowerCase().includes(query) || odp.sku.toLowerCase().includes(query);
            const matchStatus = statusFilter === STATUS_ALL || odp.status.text === statusFilter;
            const refDateStr = odp.settings.start || (odp.relatedOrders[0]?.date);
            const refDate = refDateStr ? new Date(refDateStr) : null;
            let matchDate = true;
            if (dateFrom && refDate) matchDate = refDate >= dateFrom;
            if (dateTo && refDate) matchDate = matchDate && refDate <= dateTo;
            return matchSearch && matchStatus && matchDate;
        }).sort((a, b) => {
            const aFinalized = a.status.text === STATUS_FINALIZADA;
            const bFinalized = b.status.text === STATUS_FINALIZADA;
            if (aFinalized && !bFinalized) return 1;
            if (!aFinalized && bFinalized) return -1;
            return 0;
        });
    }, [odpQueue, searchQuery, statusFilter, dateFilter, customRange]);

    // ── Actualizar ODP ────────────────────────────────────────────────────────
    const updateOdp = (sku, field, value) => {
        const newSettings = {
            ...odpSettings,
            [sku]: { ...(odpSettings[sku] || {}), [field]: value }
        };
        setOdpSettings(newSettings);
        localStorage.setItem('zeticas_odp_settings', JSON.stringify(newSettings));
        const odpEntry = odpQueue.find(o => o.sku === sku);
        saveToFirestore(sku, newSettings[sku], odpEntry?.odpId);
        
        if (field === 'end' && value && !newSettings[sku]?.inventorySynced) {
            const odp = odpQueue.find(o => o.sku === sku);
            if (odp) setConfModal({ show: true, odp });
        }
    };

    const generateOdpPdfFull = (odp, isDownload = false) => {
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.setTextColor(2, 54, 54);
        doc.text('ORDEN DE PRODUCCIÓN', 14, 25);
        doc.setFontSize(10);
        doc.text(`NO. ODP: ${odp.odpId}`, 14, 35);
        doc.text(`FECHA: ${new Date().toLocaleDateString()}`, 14, 40);
        
        autoTable(doc, {
            startY: 50,
            head: [['SKU', 'CANTIDAD', 'INICIO', 'FIN']],
            body: [[odp.sku, odp.finalQty, odp.settings.start || 'N/A', odp.settings.end || 'N/A']],
            theme: 'grid',
            headStyles: { fillColor: [2, 54, 54] }
        });

        if (isDownload) {
            doc.save(`${odp.odpId}.pdf`);
        } else {
            const pdfBlob = doc.output('bloburl');
            setPdfPreview({ show: true, url: pdfBlob, fileName: `${odp.odpId}.pdf`, odpData: odp });
        }
    };

    const handleInventorySync = async (odp) => {
        try {
            const item = items.find(i => i.name === odp.sku);
            if (item) {
                const newStock = (item.initial || 0) + Number(odp.finalQty);
                await updateItem(item.id, { initial: newStock });
                setOdpSettings({ ...odpSettings, [odp.sku]: { ...odpSettings[odp.sku], inventorySynced: true } });
                await refreshData();
            }
            setConfModal({ show: false, odp: null });
        } catch (err) { alert(err.message); }
    };

    return (
        <div style={{ padding: '2rem', minHeight: '100vh', background: '#f8fafc' }}>

            {/* HEADER - Smart Factory OS */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', animation: 'fadeUp 0.6s ease-out' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: deepTeal, marginBottom: '0.3rem' }}>
                        <Activity size={24} />
                        <h2 className="font-serif" style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-1.2px' }}>Smart Factory OS</h2>
                    </div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: '700' }}>Orquestación en tiempo real de la cadena de valor.</p>
                </div>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.8rem', 
                    padding: '0.6rem 1.2rem', 
                    borderRadius: '16px', 
                    background: glassWhite,
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${syncStatus === 'synced' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.5)'}`,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
                }}>
                    <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: syncStatus === 'synced' ? '#10b981' : '#f59e0b'
                    }} />
                    <span style={{ fontSize: '0.7rem', fontWeight: '900', color: deepTeal, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {syncStatus === 'syncing' ? 'Sincronizando...' : 'Planta Sincronizada'}
                    </span>
                </div>
            </header>

            {/* Filter Bar */}
            <div style={{ 
                display: 'flex', 
                gap: '1.5rem', 
                marginBottom: '1.5rem', 
                alignItems: 'center',
                background: glassWhite,
                backdropFilter: 'blur(10px)',
                padding: '1.2rem 2rem',
                borderRadius: '24px',
                border: '1px solid rgba(2, 83, 87, 0.05)',
                boxShadow: '0 10px 25px rgba(0,0,0,0.02)',
                animation: 'fadeUp 0.7s ease-out'
            }}>
                <div style={{ display: 'flex', background: 'rgba(2, 83, 87, 0.05)', padding: '4px', borderRadius: '16px', border: '1px solid rgba(2, 83, 87, 0.08)' }}>
                    {[{ key: 'week', label: 'Semana' }, { key: 'month', label: 'Mes' }, { key: 'custom', label: 'Personalizado' }].map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setDateFilter(key)}
                            style={{ 
                                padding: '0.7rem 1.5rem', 
                                border: 'none', 
                                borderRadius: '12px', 
                                fontSize: '0.75rem', 
                                fontWeight: '900', 
                                cursor: 'pointer', 
                                background: dateFilter === key ? deepTeal : 'transparent', 
                                color: dateFilter === key ? '#fff' : '#64748b', 
                                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                            {label}
                        </button>
                    ))}
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', opacity: 0.6 }} />
                    <input
                        type="text"
                        placeholder="Buscar por ODP, Pedido o Producto..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '1rem 1rem 1rem 3.5rem', borderRadius: '16px', border: '1px solid #f1f5f9', background: '#fff', outline: 'none', fontSize: '0.9rem', fontWeight: '900', color: '#1e293b' }}
                    />
                </div>
                <div style={{ display: 'flex', background: 'rgba(2, 83, 87, 0.05)', padding: '6px', borderRadius: '22px' }}>
                    {[STATUS_ALL, STATUS_PROGRAMADA, STATUS_EN_PRODUCCION, STATUS_FINALIZADA].map(st => (
                        <button key={st} onClick={() => setStatusFilter(st)} style={{ padding: '0.8rem 1.5rem', border: 'none', borderRadius: '16px', fontSize: '0.75rem', fontWeight: '900', cursor: 'pointer', background: statusFilter === st ? institutionOcre : 'transparent', color: statusFilter === st ? '#fff' : '#64748b', transition: 'all 0.3s', textTransform: 'uppercase' }}>{st}</button>
                    ))}
                </div>
            </div>

            {/* KPI Section */}
            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ background: glassWhite, backdropFilter: 'blur(10px)', padding: '1.5rem 2rem', borderRadius: '24px', border: '1px solid rgba(2, 83, 87, 0.05)', boxShadow: '0 10px 25px rgba(0,0,0,0.02)', animation: 'fadeUp 0.8s ease-out' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Flujo de Planta</span>
                        <Package size={18} color={deepTeal} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                        {[
                            { label: 'Espera', count: kpis.programadas, color: premiumSalmon },
                            { label: 'Proc.', count: kpis.enProduccion, color: institutionOcre },
                            { label: 'Fin.', count: kpis.finalizadas, color: '#10b981' }
                        ].map(({ label, count, color }) => (
                            <div key={label} style={{ background: '#fcfcfc', padding: '1rem', borderRadius: '16px', textAlign: 'center', border: '1px solid #f1f5f9' }}>
                                <div style={{ fontSize: '1.8rem', fontWeight: '900', color, lineHeight: 1 }}>{count}</div>
                                <div style={{ fontSize: '0.6rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginTop: '0.5rem' }}>{label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ background: `linear-gradient(135deg, ${deepTeal} 0%, #037075 100%)`, padding: '1.5rem 2rem', borderRadius: '24px', color: '#fff', boxShadow: `0 15px 35px ${deepTeal}20`, animation: 'fadeUp 0.9s ease-out', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', right: '-15px', top: '-15px', opacity: 0.1 }}><Zap size={100} /></div>
                    <span style={{ fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7 }}>Eficiencia Operativa</span>
                    <div style={{ marginTop: '1.5rem', fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1px', lineHeight: 1 }}>
                        {eficienciaStats.avg !== null ? eficienciaStats.avg.toFixed(1) : '0.0'}
                        <span style={{ fontSize: '0.8rem', verticalAlign: 'middle', marginLeft: '8px' }}>UND/HR</span>
                    </div>
                </div>

                <div style={{ background: glassWhite, backdropFilter: 'blur(10px)', padding: '1.5rem 2rem', borderRadius: '24px', border: '1px solid rgba(2, 83, 87, 0.05)', boxShadow: '0 10px 25px rgba(0,0,0,0.02)', animation: 'fadeUp 1s ease-out' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Ratio de Mermas</span>
                    <div style={{ marginTop: '1.5rem', fontSize: '2.5rem', fontWeight: '900', color: premiumSalmon, letterSpacing: '-1px', lineHeight: 1 }}>
                        {desperdicioStats.avg !== null ? desperdicioStats.avg.toFixed(1) : '0.0'}%
                    </div>
                    <div style={{ marginTop: '1.5rem', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${desperdicioStats.avg || 0}%`, height: '100%', background: premiumSalmon }} />
                    </div>
                </div>
            </section>

            {/* ODP Table */}
            <div style={{ background: glassWhite, backdropFilter: 'blur(10px)', borderRadius: '24px', border: '1px solid rgba(2, 83, 87, 0.05)', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.02)', animation: 'fadeUp 1.1s ease-out' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead>
                        <tr style={{ background: 'rgba(2, 83, 87, 0.02)' }}>
                            <th style={{ padding: '1.5rem 2rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Referencia ODP</th>
                            <th style={{ padding: '1.5rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Producto / SKU</th>
                            <th style={{ padding: '1.5rem 1rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Q. Plan</th>
                            <th style={{ padding: '1.5rem 1rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Cronometría</th>
                            <th style={{ padding: '1.5rem 1rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Estado</th>
                            <th style={{ padding: '1.5rem 2rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOdpQueue.map((odp) => (
                            <tr key={odp.odpId} style={{ borderBottom: '1px solid #f8fafc', transition: 'all 0.3s' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(2, 83, 87, 0.02)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                                <td style={{ padding: '2rem' }}><div style={{ fontWeight: '900', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}><FileText size={18} color={deepTeal}/> {odp.odpId}</div></td>
                                <td style={{ padding: '2rem 1rem' }}><div style={{ fontWeight: '900' }}>{odp.sku}</div></td>
                                <td style={{ padding: '2rem 1rem', textAlign: 'center' }}><div style={{ background: '#f1f5f9', padding: '0.6rem 1rem', borderRadius: '15px', fontWeight: '900', display: 'inline-block' }}>{odp.finalQty}</div></td>
                                <td style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: '900', color: '#94a3b8' }}>{odp.settings.start ? new Date(odp.settings.start).toLocaleTimeString() : '--'} - {odp.settings.end ? new Date(odp.settings.end).toLocaleTimeString() : '--'}</div>
                                </td>
                                <td style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                                    <span style={{ padding: '6px 12px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: '900', background: odp.status.color, color: odp.status.textColor }}>{odp.status.text}</span>
                                </td>
                                <td style={{ padding: '2rem', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                                        {!odp.settings.start && <button onClick={() => updateOdp(odp.sku, 'start', new Date().toISOString())} style={{ padding: '0.8rem 1.5rem', borderRadius: '15px', border: 'none', background: deepTeal, color: '#fff', fontWeight: '900', cursor: 'pointer' }}>INICIAR</button>}
                                        {odp.settings.start && !odp.settings.end && <button onClick={() => updateOdp(odp.sku, 'end', new Date().toISOString())} style={{ padding: '0.8rem 1.5rem', borderRadius: '15px', border: 'none', background: '#10b981', color: '#fff', fontWeight: '900', cursor: 'pointer' }}>TERMINAR</button>}
                                        <button onClick={() => generateOdpPdfFull(odp)} style={{ width: '45px', height: '45px', borderRadius: '50%', border: '1px solid #f1f5f9', background: '#fff', cursor: 'pointer' }}><FileText size={18} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Basic Logic for Modals Restored */}
            {pdfPreview.show && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', padding: '3rem', borderRadius: '45px', width: '90%', height: '90%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                        <button onClick={() => setPdfPreview({ show: false, url: '', fileName: '', odpData: null })} style={{ position: 'absolute', top: '2rem', right: '2rem', border: 'none', background: '#f1f5f9', width: '45px', height: '45px', borderRadius: '50%', cursor: 'pointer' }}><X size={20} /></button>
                        <iframe src={pdfPreview.url} style={{ flex: 1, border: 'none', borderRadius: '25px' }} />
                    </div>
                </div>
            )}

            {confModal.show && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', padding: '3.5rem', borderRadius: '45px', maxWidth: '500px', textAlign: 'center' }}>
                        <h3 style={{ fontWeight: '900', color: deepTeal, marginBottom: '1.5rem' }}>¿Sincronizar Inventario?</h3>
                        <p style={{ fontWeight: '700', color: '#64748b', marginBottom: '2.5rem' }}>Has terminado la producción. ¿Deseas sumar estas unidades al stock disponible?</p>
                        <div style={{ display: 'flex', gap: '1.5rem' }}>
                            <button onClick={() => setConfModal({ show: false, odp: null })} style={{ flex: 1, padding: '1.2rem', borderRadius: '20px', border: '2px solid #f1f5f9', background: '#fff', fontWeight: '900' }}>NO, DESPUÉS</button>
                            <button onClick={() => handleInventorySync(confModal.odp)} style={{ flex: 1, padding: '1.2rem', borderRadius: '20px', border: 'none', background: '#10b981', color: '#fff', fontWeight: '900' }}>SÍ, ACTUALIZAR</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default Production;
