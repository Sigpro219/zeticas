import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
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

const Production = () => {
    const { orders, items, recipes, refreshData, providers } = useBusiness();
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
    const [dateFilter, setDateFilter] = useState('month');
    const [customRange, setCustomRange] = useState({ from: '', to: '' });

    // ── Cargar desde Supabase ─────────────────────────────────────────────────
    const loadFromSupabase = useCallback(async () => {
        try {
            setSyncStatus('syncing');
            const { data, error } = await supabase
                .from('production_orders')
                .select('sku, custom_qty, waste_qty, started_at, completed_at, mp_synced, inventory_synced, odp_number')
                .not('sku', 'is', null);

            if (error) throw error;

            if (data && data.length > 0) {
                const settingsFromDB = {};
                data.forEach(row => {
                    if (row.sku) {
                        settingsFromDB[row.sku] = {
                            customQty: row.custom_qty ?? undefined,
                            wasteQty: row.waste_qty ?? undefined,
                            start: row.started_at ? new Date(row.started_at).toISOString().slice(0, 16) : undefined,
                            end: row.completed_at ? new Date(row.completed_at).toISOString().slice(0, 16) : undefined,
                            mpSynced: row.mp_synced || false,
                            inventorySynced: row.inventory_synced || false,
                            odpId: row.odp_number
                        };
                    }
                });
                const merged = { ...odpSettings, ...settingsFromDB };
                setOdpSettings(merged);
                localStorage.setItem('zeticas_odp_settings', JSON.stringify(merged));
            }
            setSyncStatus('synced');
        } catch (err) {
            console.warn('No se pudo cargar desde Supabase, usando caché local:', err.message);
            setSyncStatus('error');
        }
    }, []);

    useEffect(() => { loadFromSupabase(); }, [loadFromSupabase]);

    // ── Guardar en Supabase ───────────────────────────────────────────────────
    const saveToSupabase = useCallback(async (sku, settings, odpId) => {
        try {
            setSyncStatus('syncing');
            const { data: existing } = await supabase
                .from('production_orders')
                .select('id')
                .eq('sku', sku)
                .maybeSingle();

            const payload = {
                sku,
                odp_number: odpId || null,
                custom_qty: settings.customQty !== undefined ? Number(settings.customQty) : null,
                waste_qty: settings.wasteQty !== undefined ? Number(settings.wasteQty) : null,
                started_at: settings.start ? new Date(settings.start).toISOString() : null,
                completed_at: settings.end ? new Date(settings.end).toISOString() : null,
                mp_synced: settings.mpSynced || false,
                inventory_synced: settings.inventorySynced || false,
                status: settings.end ? 'DONE' : (settings.start ? 'IN_PROGRESS' : 'TO_DO'),
            };

            if (existing?.id) {
                await supabase.from('production_orders').update(payload).eq('id', existing.id);
            } else {
                await supabase.from('production_orders').insert({ ...payload, quantity: 0 });
            }
            setSyncStatus('synced');
        } catch (err) {
            console.warn('Error guardando en Supabase:', err.message);
            setSyncStatus('error');
        }
    }, []);

    // ── Cola de ODPs ──────────────────────────────────────────────────────────
    const pendingOrders = useMemo(() => orders.filter(o =>
        o.status === 'En Producción' || o.status === 'En Producción (Iniciada)' || o.status === 'En Compras'
    ), [orders]);

    const odpQueue = useMemo(() => {
        const groups = {};
        pendingOrders.forEach(order => {
            order.items.forEach(item => {
                const sku = item.name;
                if (!groups[sku]) groups[sku] = { sku, relatedOrders: [], totalRequested: 0 };
                groups[sku].relatedOrders.push(order);
                groups[sku].totalRequested += item.quantity;
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

            // The calculated values are strictly based on the requested formula
            const finalQty = settings.customQty !== undefined ? settings.customQty : calculatedQty;

            let status = { text: STATUS_PROGRAMADA, color: '#fee2e2', textColor: '#dc2626' };
            if (settings.start) status = { text: STATUS_EN_PRODUCCION, color: '#fef3c7', textColor: '#b45309' };
            if (settings.end) status = { text: STATUS_FINALIZADA, color: '#dcfce7', textColor: '#15803d' };

            return {
                ...group,
                odpId: settings.odpId || `ODP-${(index + 1).toString().padStart(3, '0')}`,
                inventoryPT,
                safetyStock,
                calculatedQty,
                finalQty,
                settings,
                status,
                isMissing: !product,
                calcBreakdown: !product ? 'No encontrado\nen maestros' : `Req:${group.totalRequested} - Inv:${inventoryPT}\n+ Min:${safetyStock} = ${calculatedQty}`
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

    const eficienciaStats = useMemo(() => ({ avg: null, rows: [] }), []);
    const desperdicioStats = useMemo(() => ({ avg: null, rows: [] }), []);

    // ── Filtros ───────────────────────────────────────────────────────────────
    const filteredOdpQueue = useMemo(() => {
        const query = searchQuery.toLowerCase();

        // Date range boundaries
        let dateFrom = null;
        let dateTo = null;
        if (dateFilter === 'week') {
            dateFrom = new Date();
            dateFrom.setDate(dateFrom.getDate() - 7);
        } else if (dateFilter === 'month') {
            dateFrom = new Date();
            dateFrom.setDate(1);
            dateFrom.setHours(0, 0, 0, 0);
        } else if (dateFilter === 'custom' && customRange.from && customRange.to) {
            dateFrom = new Date(customRange.from + 'T00:00:00');
            dateTo = new Date(customRange.to + 'T23:59:59');
        }

        return odpQueue.filter(odp => {
            // Text search: ODP id, pedido ids, SKU
            const pedidoStr = odp.relatedOrders.map(r => r.id).join(' ');
            const matchSearch = !query ||
                odp.odpId.toLowerCase().includes(query) ||
                odp.sku.toLowerCase().includes(query) ||
                pedidoStr.toLowerCase().includes(query);

            // Status filter
            const matchStatus = statusFilter === STATUS_ALL || odp.status.text === statusFilter;

            // Date filter — use start timestamp, fall back to relatedOrder date
            const refDateStr = odp.settings.start || (odp.relatedOrders[0]?.date ?? null);
            const refDate = refDateStr ? new Date(refDateStr) : null;
            let matchDate = true;
            if (dateFrom && refDate) matchDate = refDate >= dateFrom;
            if (dateTo && refDate) matchDate = matchDate && refDate <= dateTo;

            return matchSearch && matchStatus && matchDate;
        }).sort((a, b) => {
            // 1. Finalized status to bottom
            const aFinalized = a.status.text === STATUS_FINALIZADA;
            const bFinalized = b.status.text === STATUS_FINALIZADA;
            if (aFinalized && !bFinalized) return 1;
            if (!aFinalized && bFinalized) return -1;

            // 2. Newest first (using start date or related order date)
            const dateA = a.settings.start || (a.relatedOrders[0]?.date ?? '0');
            const dateB = b.settings.start || (b.relatedOrders[0]?.date ?? '0');
            return new Date(dateB) - new Date(dateA);
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
        const odpId = odpEntry?.odpId;
        saveToSupabase(sku, newSettings[sku], odpId);

        if (field === 'end' && value && !newSettings[sku]?.inventorySynced) {
            const odp = odpQueue.find(o => o.sku === sku);
            if (odp) setConfModal({ show: true, odp: { ...odp, finalQty: odp.finalQty } });
        }

        if (field === 'start' && value && !newSettings[sku]?.mpSynced) {
            const odp = odpQueue.find(o => o.sku === sku);
            const recipe = recipes[sku] || [];
            if (odp && recipe.length > 0) {
                const materials = recipe.map(r => ({
                    ...r,
                    totalQty: (r.qty * (Number(odp.finalQty) || 0)).toFixed(2)
                }));
                setMpConfModal({ show: true, odp: { ...odp, finalQty: odp.finalQty }, materials });
            } else if (odp && recipe.length === 0) {
                const s = { ...newSettings[sku], mpSynced: true };
                const updated = { ...newSettings, [sku]: s };
                setOdpSettings(updated);
                localStorage.setItem('zeticas_odp_settings', JSON.stringify(updated));
                saveToSupabase(sku, s, odpId);
            }
        }
    };

    const generateOdpPdfFull = async (odp, isDownload = false) => {
        const doc = new jsPDF();

        // Logo
        try {
            const logoUrl = 'https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/assets/logo.png';
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = logoUrl;
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
            doc.addImage(img, 'PNG', 150, 10, 45, 12);
        } catch (e) {
            console.error("No logo in PDF", e);
        }

        // Header
        doc.setFontSize(22);
        doc.setTextColor(0, 77, 77); // Zeticas Teal
        doc.setFont('helvetica', 'bold');
        doc.text('ORDEN DE PRODUCCIÓN', 14, 25);

        doc.setDrawColor(0, 77, 77);
        doc.setLineWidth(0.5);
        doc.line(14, 32, 196, 32);

        // Zeticas info
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'bold');
        doc.text('ZETICAS S.A.S.', 14, 42);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('NIT: 901.234.567-8', 14, 47);
        doc.text('Bogotá, Colombia', 14, 52);
        doc.text('Email: info@zeticas.com', 14, 57);

        // ODP Data
        doc.setFontSize(12);
        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'bold');
        doc.text(`NO. ODP: ${odp.odpId}`, 120, 42);
        doc.setFont('helvetica', 'normal');
        doc.text(`Fecha Emisión: ${new Date().toLocaleDateString()}`, 120, 47);
        doc.text(`Estado: ${odp.status.text}`, 120, 52);

        // Details Table
        autoTable(doc, {
            startY: 65,
            head: [['SKU / PRODUCTO', 'CANTIDAD', 'INICIO', 'FIN']],
            body: [[
                odp.sku,
                odp.finalQty.toString(),
                odp.settings.start ? new Date(odp.settings.start).toLocaleString() : 'No iniciada',
                odp.settings.end ? new Date(odp.settings.end).toLocaleString() : 'No terminada'
            ]],
            theme: 'grid',
            headStyles: { fillColor: [0, 77, 77], textColor: [255, 255, 255], fontStyle: 'bold' },
            bodyStyles: { textColor: [51, 65, 85] }
        });

        const finalY = (doc.lastAutoTable?.finalY || 65) + 15;

        // Breakdown details
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 77, 77);
        doc.text('DETALLES DE CÁLCULO DE CANTIDAD:', 14, finalY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text(odp.calcBreakdown.replace('\n', ' '), 14, finalY + 7);

        // Associated Orders
        const ordersY = finalY + 20;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 77, 77);
        doc.text('PEDIDOS ASOCIADOS:', 14, ordersY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text(odp.relatedOrders.map(o => o.id).join(', ') || 'Varios / Sin ID específico', 60, ordersY);

        // KPI Section (if finished)
        if (odp.settings.start && odp.settings.end) {
            const kpiY = ordersY + 15;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 77, 77);
            doc.text('INDICADORES DE GESTIÓN (KPIs):', 14, kpiY);

            const efficiencyText = `Eficiencia: ${odp.efficiency || '—'} Und/Hora`;
            const wasteText = `Desperdicio: ${odp.waste || '—'} Und (${odp.waste_percent || '—'}%)`;

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(51, 65, 85);
            doc.text(`${efficiencyText} | ${wasteText}`, 14, kpiY + 7);
        }

        // Footer
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(148, 163, 184);
        doc.text('Este documento es una copia legal de la Órden de Producción.', 105, 280, { align: 'center' });
        doc.text('Generado por Zeticas OS - Sistema de Gestión de Calidad', 105, 285, { align: 'center' });

        const fileName = `${odp.odpId.toUpperCase().replace(/[-\s]/g, '_')}_ZETICAS.PDF`;
        if (isDownload) {
            doc.save(fileName);
        } else {
            const pdfBlob = doc.output('bloburl');
            setPdfPreview({ show: true, url: pdfBlob, fileName, odpData: odp });
        }
    };

    // ── Sync MP ───────────────────────────────────────────────────────────────
    const handleMPSync = async (odp, materials) => {
        try {
            for (const m of materials) {
                const item = items.find(i =>
                    i.name.toLowerCase().trim() === m.name.toLowerCase().trim() ||
                    (i.sku && i.sku === m.sku)
                );
                if (item) {
                    const newStock = (item.initial || 0) - Number(m.totalQty);
                    await supabase.from('products').update({ stock: newStock }).eq('id', item.id);
                } else {
                    console.error('Material no encontrado para sincronización:', m.name);
                }
            }
            const updated = { ...odpSettings, [odp.sku]: { ...(odpSettings[odp.sku] || {}), mpSynced: true } };
            setOdpSettings(updated);
            localStorage.setItem('zeticas_odp_settings', JSON.stringify(updated));
            saveToSupabase(odp.sku, updated[odp.sku], odp.odpId);
            await refreshData();
            setMpConfModal({ show: false, odp: null, materials: [] });
        } catch (err) {
            console.error('Error syncing MP:', err);
        }
    };

    // ── Sync PT ───────────────────────────────────────────────────────────────
    const handleInventorySync = async (odp) => {
        try {
            const item = items.find(i =>
                i.name.toLowerCase().trim() === odp.sku.toLowerCase().trim() ||
                (i.sku && i.sku === odp.sku)
            );
            if (item) {
                const newStock = (item.initial || 0) + Number(odp.finalQty);
                await supabase.from('products').update({ stock: newStock }).eq('id', item.id);
            } else {
                console.error('Producto Terminado no encontrado para sincronización:', odp.sku);
            }
            const updated = { ...odpSettings, [odp.sku]: { ...(odpSettings[odp.sku] || {}), inventorySynced: true } };
            setOdpSettings(updated);
            localStorage.setItem('zeticas_odp_settings', JSON.stringify(updated));
            saveToSupabase(odp.sku, updated[odp.sku], odp.odpId);
            await refreshData();
            setConfModal({ show: false, odp: null });
        } catch (err) {
            console.error('Error syncing PT:', err);
        }
    };

    const totalEstimatedOCs = useMemo(() => {
        if (!explosionPreview) return 0;
        return explosionPreview.reduce((acc, m) => {
            const toBuy = Math.max(0, m.required - m.stock + m.safety);
            return acc + (toBuy * m.cost * 1.19);
        }, 0);
    }, [explosionPreview]);

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div style={{ padding: '0 1rem 3rem' }}>

            {/* HEADER */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h2 className="font-serif" style={{ fontSize: '2rem', color: 'var(--color-primary)', margin: 0 }}>
                        Módulo de Producción
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.3rem' }}>
                        Seguimiento y control de órdenes de producción — sincronizado en tiempo real.
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '10px', background: syncStatus === 'synced' ? '#f0fdf4' : syncStatus === 'error' ? '#fef2f2' : '#f8fafc', border: `1px solid ${syncStatus === 'synced' ? '#bbf7d0' : syncStatus === 'error' ? '#fecaca' : '#e2e8f0'}` }}>
                    {syncStatus === 'syncing' && <RefreshCw size={14} style={{ color: '#64748b' }} />}
                    {syncStatus === 'synced' && <Cloud size={14} style={{ color: '#16a34a' }} />}
                    {syncStatus === 'error' && <CloudOff size={14} style={{ color: '#dc2626' }} />}
                    {syncStatus === 'idle' && <Cloud size={14} style={{ color: '#94a3b8' }} />}
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: syncStatus === 'synced' ? '#15803d' : syncStatus === 'error' ? '#dc2626' : '#64748b' }}>
                        {syncStatus === 'syncing' ? 'Sincronizando...' : syncStatus === 'synced' ? 'Guardado en la nube' : syncStatus === 'error' ? 'Guardado localmente' : 'Conectando...'}
                    </span>
                </div>
            </header>

            {/* FILTERS — date style like Compras + search */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>

                {/* Date preset tabs */}
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', gap: '4px' }}>
                    {[{ key: 'week', label: 'ODP última Semana' }, { key: 'month', label: 'ODP Mes' }, { key: 'custom', label: 'Personalizado' }].map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setDateFilter(key)}
                            style={{
                                padding: '0.5rem 1rem',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                background: dateFilter === key ? '#fff' : 'transparent',
                                color: dateFilter === key ? 'var(--color-primary)' : '#64748b',
                                boxShadow: dateFilter === key ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                transition: 'all 0.18s'
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Custom date range */}
                {dateFilter === 'custom' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="date"
                            value={customRange.from}
                            onChange={(e) => setCustomRange(r => ({ ...r, from: e.target.value }))}
                            style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none' }}
                        />
                        <span style={{ color: '#94a3b8', fontWeight: 600 }}>a</span>
                        <input
                            type="date"
                            value={customRange.to}
                            onChange={(e) => setCustomRange(r => ({ ...r, to: e.target.value }))}
                            style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none' }}
                        />
                    </div>
                )}

                {/* Search */}
                <div style={{ flex: 1, position: 'relative', minWidth: '260px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Buscar por ODP, Pedido o SKU..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.875rem', background: '#fff', boxSizing: 'border-box' }}
                    />
                </div>

                {/* Status quick-filter pills */}
                <div style={{ display: 'flex', gap: '0.5rem', background: '#fff', padding: '0.35rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    {[STATUS_ALL, STATUS_PROGRAMADA, STATUS_EN_PRODUCCION, STATUS_FINALIZADA].map(st => (
                        <button
                            key={st}
                            onClick={() => setStatusFilter(st)}
                            style={{ padding: '0.4rem 0.9rem', borderRadius: '8px', border: 'none', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.18s', background: statusFilter === st ? 'var(--color-primary)' : 'transparent', color: statusFilter === st ? '#fff' : '#64748b' }}
                        >
                            {st}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI INDICATORS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: '1rem', marginBottom: '1.75rem' }}>

                {/* Card 1: Estado general (merged) */}
                <div style={{ background: '#fff', borderRadius: '20px', padding: '1.4rem 1.75rem', border: '1px solid #f1f5f9', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Estado de ODPs</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                        {[
                            { label: 'Total', count: kpis.total, color: '#6366f1', bg: 'rgba(99,102,241,0.08)', icon: <ListChecks size={16} />, filter: null },
                            { label: 'Programadas', count: kpis.programadas, color: '#dc2626', bg: 'rgba(220,38,38,0.08)', icon: <CalendarClock size={16} />, filter: STATUS_PROGRAMADA },
                            { label: 'En Prod.', count: kpis.enProduccion, color: '#b45309', bg: 'rgba(245,158,11,0.08)', icon: <PlayCircle size={16} />, filter: STATUS_EN_PRODUCCION },
                            { label: 'Finaliz.', count: kpis.finalizadas, color: '#15803d', bg: 'rgba(22,163,74,0.08)', icon: <CheckSquare size={16} />, filter: STATUS_FINALIZADA },
                        ].map(({ label, count, color, bg, icon, filter }) => (
                            <div
                                key={label}
                                onClick={() => filter && setStatusFilter(statusFilter === filter ? STATUS_ALL : filter)}
                                style={{ background: filter && statusFilter === filter ? bg : '#f8fafc', borderRadius: '14px', padding: '0.85rem 0.75rem', border: `1.5px solid ${filter && statusFilter === filter ? color + '40' : '#f1f5f9'}`, cursor: filter ? 'pointer' : 'default', transition: 'all 0.18s', textAlign: 'center' }}
                            >
                                <div style={{ color, marginBottom: '0.3rem', display: 'flex', justifyContent: 'center' }}>{icon}</div>
                                <div style={{ fontSize: '1.7rem', fontWeight: 900, color, lineHeight: 1 }}>{count}</div>
                                <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700, marginTop: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Card 2: Eficiencia Und/Hora */}
                <div style={{ background: '#fff', borderRadius: '20px', padding: '1.4rem 1.75rem', border: '1px solid #f1f5f9', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Eficiencia (Und/Hora)</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                        <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0369a1', lineHeight: 1 }}>
                            {eficienciaStats.avg !== null ? eficienciaStats.avg.toFixed(1) : '—'}
                        </div>
                        {eficienciaStats.avg !== null && <div style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: 600, marginBottom: '0.4rem' }}>und/h promedio</div>}
                    </div>
                    <button
                        onClick={() => setShowEficList(v => !v)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: '#0369a1', background: '#e0f2fe', border: 'none', borderRadius: '8px', padding: '0.35rem 0.65rem', cursor: 'pointer', fontWeight: 600, alignSelf: 'flex-start' }}
                    >
                        {showEficList ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        {showEficList ? 'Ocultar' : 'Ver por SKU'}
                    </button>
                    {showEficList && eficienciaStats.rows.length > 0 && (
                        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#fff', borderRadius: '14px', border: '1px solid #e0f2fe', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: '230px', overflowY: 'auto', padding: '0.5rem' }}>
                            {eficienciaStats.rows.map((r, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0.75rem', borderRadius: '8px', background: i % 2 === 0 ? '#f0f9ff' : '#fff' }}>
                                    <span style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{r.sku}</span>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0369a1', background: '#e0f2fe', borderRadius: '6px', padding: '0.15rem 0.5rem' }}>{r.efic.toFixed(1)} u/h</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Card 3: % Desperdicio */}
                <div style={{ background: '#fff', borderRadius: '20px', padding: '1.4rem 1.75rem', border: '1px solid #f1f5f9', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>% Desperdicio</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                        {(() => {
                            const avg = desperdicioStats.avg;
                            const color = avg === null ? '#94a3b8' : avg > 10 ? '#dc2626' : avg > 5 ? '#b45309' : '#15803d';
                            return (
                                <>
                                    <div style={{ fontSize: '2.4rem', fontWeight: 900, color, lineHeight: 1 }}>
                                        {avg !== null ? avg.toFixed(1) + '%' : '—'}
                                    </div>
                                    {avg !== null && <div style={{ fontSize: '0.8rem', color, fontWeight: 600, marginBottom: '0.4rem', opacity: 0.7 }}>promedio</div>}
                                </>
                            );
                        })()}
                    </div>
                    <button
                        onClick={() => setShowWasteList(v => !v)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: '#92400e', background: '#fef3c7', border: 'none', borderRadius: '8px', padding: '0.35rem 0.65rem', cursor: 'pointer', fontWeight: 600, alignSelf: 'flex-start' }}
                    >
                        {showWasteList ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        {showWasteList ? 'Ocultar' : 'Ver por SKU'}
                    </button>
                    {showWasteList && desperdicioStats.rows.length > 0 && (
                        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#fff', borderRadius: '14px', border: '1px solid #fde68a', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: '230px', overflowY: 'auto', padding: '0.5rem' }}>
                            {desperdicioStats.rows.map((r, i) => {
                                const color = r.pct > 10 ? '#dc2626' : r.pct > 5 ? '#b45309' : '#15803d';
                                const bg = r.pct > 10 ? '#fee2e2' : r.pct > 5 ? '#fef3c7' : '#dcfce7';
                                return (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0.75rem', borderRadius: '8px', background: i % 2 === 0 ? '#fffbeb' : '#fff' }}>
                                        <span style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{r.sku}</span>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color, background: bg, borderRadius: '6px', padding: '0.15rem 0.5rem' }}>{r.pct.toFixed(1)}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* TABLE */}
            <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                            {[
                                { label: 'ODP', align: 'left' },
                                { label: 'SKU', align: 'left' },
                                { label: 'Pedido(s)', align: 'left' },
                                { label: 'Cant.', align: 'center', width: '45px' },
                                { label: 'Inicio', align: 'center', width: '110px' },
                                { label: 'Fin', align: 'center', width: '110px' },
                                { label: 'Estado', align: 'center' },
                                { label: 'Q\nDesp.', align: 'center', width: '50px' },
                                { label: 'Eficiencia\nUnd/H', align: 'center', width: '65px' },
                                { label: '%\nDesp.', align: 'center', width: '55px' },
                            ].map(col => (
                                <th key={col.label} style={{ padding: '0.9rem 0.5rem', textAlign: col.align, fontSize: '0.63rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', width: col.width || undefined, whiteSpace: 'pre-line', lineHeight: '1.3' }}>
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOdpQueue.length === 0 ? (
                            <tr>
                                <td colSpan={10} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                                    <Activity size={32} style={{ display: 'block', margin: '0 auto 0.75rem', opacity: 0.3 }} />
                                    No hay órdenes de producción que coincidan con los filtros.
                                </td>
                            </tr>
                        ) : (
                            filteredOdpQueue.map((odp, idx) => (
                                <tr
                                    key={odp.odpId}
                                    style={{ borderBottom: idx < filteredOdpQueue.length - 1 ? '1px solid #f8fafc' : 'none', transition: 'background 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    {/* ODP */}
                                    <td style={{ padding: '1rem 1.25rem' }}>
                                        <button
                                            onClick={() => generateOdpPdfFull(odp)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                padding: 0,
                                                fontWeight: 800,
                                                color: 'var(--color-primary)',
                                                fontSize: '0.95rem',
                                                cursor: 'pointer',
                                                textDecoration: 'underline decoration-dotted',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem'
                                            }}
                                            title="Descargar Orden de Producción Legal (PDF)"
                                        >
                                            <FileText size={14} />
                                            {odp.odpId}
                                        </button>
                                    </td>

                                    {/* SKU */}
                                    <td style={{ padding: '1rem 1.25rem', color: '#475569', fontSize: '0.9rem', maxWidth: '160px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                            <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontWeight: odp.isMissing ? 'normal' : '600' }}>
                                                {odp.sku}
                                            </span>
                                            {odp.isMissing && (
                                                <span style={{ fontSize: '0.65rem', color: '#e11d48', fontWeight: 'bold', background: '#fff1f2', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fecaca' }}>
                                                    No existe en Módulo de Datos Maestros de Productos, Crealo primero
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Pedido(s) */}
                                    <td style={{ padding: '1rem 1.25rem' }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                                            {odp.relatedOrders.map((order, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setOrderModal({ show: true, order })}
                                                    title={`Ver pedido ${order.id} — ${order.client}`}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem',
                                                        padding: '0.28rem 0.65rem',
                                                        borderRadius: '8px',
                                                        border: '1px solid #bfdbfe',
                                                        background: '#eff6ff',
                                                        color: '#1d4ed8',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s',
                                                        whiteSpace: 'nowrap',
                                                        lineHeight: 1
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.borderColor = '#93c5fd'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                                                >
                                                    <FileText size={11} />
                                                    {order.id}
                                                    <ExternalLink size={10} style={{ opacity: 0.55 }} />
                                                </button>
                                            ))}
                                        </div>
                                    </td>

                                    {/* Cantidad */}
                                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <input
                                                type="number"
                                                value={odp.finalQty}
                                                onChange={(e) => updateOdp(odp.sku, 'customQty', e.target.value)}
                                                style={{ width: '52px', textAlign: 'center', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '0.3rem 0.35rem', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', outline: 'none', background: '#fafafa' }}
                                            />
                                            <div style={{ fontSize: '0.55rem', color: '#94a3b8', marginTop: '0.2rem', whiteSpace: 'pre-line', fontWeight: 600, lineHeight: '1.2' }}>
                                                {odp.calcBreakdown}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Inicio */}
                                    <td style={{ padding: '0.75rem 0.35rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                            {(() => {
                                                const [d, t] = (odp.settings.start || 'T').split('T');
                                                return (
                                                    <>
                                                        <input
                                                            type="date"
                                                            value={d || ''}
                                                            onChange={(e) => updateOdp(odp.sku, 'start', `${e.target.value}T${t || '00:00'}`)}
                                                            style={{ fontSize: '0.7rem', border: '1.5px solid #e2e8f0', borderRadius: '6px', padding: '0.2rem 0.3rem', color: '#334155', background: d ? '#f0fdf4' : '#fafafa', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                                                        />
                                                        <input
                                                            type="time"
                                                            value={t || ''}
                                                            onChange={(e) => updateOdp(odp.sku, 'start', `${d || '2026-03-19'}T${e.target.value}`)}
                                                            style={{ fontSize: '0.7rem', border: '1.5px solid #e2e8f0', borderRadius: '6px', padding: '0.2rem 0.3rem', color: '#334155', background: t ? '#f0fdf4' : '#fafafa', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                                                        />
                                                    </>
                                                );
                                            })()}
                                        </div>
                                        {odp.settings.mpSynced && (
                                            <div style={{ color: '#15803d', fontSize: '0.62rem', marginTop: '0.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.15rem' }}>
                                                <CheckCircle2 size={10} /> MP Desc.
                                            </div>
                                        )}
                                    </td>

                                    {/* Fin */}
                                    <td style={{ padding: '0.75rem 0.35rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                            {(() => {
                                                const [d, t] = (odp.settings.end || 'T').split('T');
                                                return (
                                                    <>
                                                        <input
                                                            type="date"
                                                            value={d || ''}
                                                            onChange={(e) => updateOdp(odp.sku, 'end', `${e.target.value}T${t || '00:00'}`)}
                                                            style={{ fontSize: '0.7rem', border: '1.5px solid #e2e8f0', borderRadius: '6px', padding: '0.2rem 0.3rem', color: '#334155', background: d ? '#f0fdf4' : '#fafafa', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                                                        />
                                                        <input
                                                            type="time"
                                                            value={t || ''}
                                                            onChange={(e) => updateOdp(odp.sku, 'end', `${d || '2026-03-19'}T${e.target.value}`)}
                                                            style={{ fontSize: '0.7rem', border: '1.5px solid #e2e8f0', borderRadius: '6px', padding: '0.2rem 0.3rem', color: '#334155', background: t ? '#f0fdf4' : '#fafafa', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                                                        />
                                                    </>
                                                );
                                            })()}
                                        </div>
                                        {odp.settings.inventorySynced && (
                                            <div style={{ color: '#15803d', fontSize: '0.62rem', marginTop: '0.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.15rem' }}>
                                                <CheckCircle2 size={10} /> PT Carg.
                                            </div>
                                        )}
                                    </td>

                                    {/* Estado */}
                                    <td style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>
                                        <span style={{ padding: '0.3rem 0.7rem', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700, background: odp.status.color, color: odp.status.textColor, border: `1px solid ${odp.status.textColor}30`, whiteSpace: 'nowrap' }}>
                                            {odp.status.text}
                                        </span>
                                    </td>

                                    {/* Q Desperdicio */}
                                    <td style={{ padding: '0.5rem 0.3rem', textAlign: 'center' }}>
                                        <input
                                            type="number"
                                            min="0"
                                            value={odp.settings.wasteQty ?? ''}
                                            onChange={(e) => updateOdp(odp.sku, 'wasteQty', e.target.value)}
                                            placeholder="0"
                                            style={{ width: '46px', textAlign: 'center', border: '1.5px solid #fde68a', borderRadius: '6px', padding: '0.25rem 0.25rem', fontSize: '0.78rem', fontWeight: 700, color: '#92400e', outline: 'none', background: '#fffbeb' }}
                                        />
                                    </td>

                                    {/* Eficiencia Und/Hora */}
                                    <td style={{ padding: '0.5rem 0.3rem', textAlign: 'center' }}>
                                        {(() => {
                                            const start = odp.settings.start;
                                            const end = odp.settings.end;
                                            const qty = Number(odp.finalQty) || 0;
                                            if (!start || !end || qty === 0) return <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>—</span>;
                                            const hours = (new Date(end) - new Date(start)) / 3600000;
                                            if (hours <= 0) return <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>—</span>;
                                            const efic = qty / hours;
                                            return (
                                                <span style={{ fontWeight: 800, fontSize: '0.78rem', color: '#0369a1', background: '#e0f2fe', borderRadius: '6px', padding: '0.2rem 0.4rem', display: 'inline-block' }}>
                                                    {efic.toFixed(1)}
                                                    <span style={{ fontSize: '0.58rem', fontWeight: 500, color: '#0284c7', marginLeft: '2px' }}>u/h</span>
                                                </span>
                                            );
                                        })()}
                                    </td>

                                    {/* % Desperdicio */}
                                    <td style={{ padding: '0.5rem 0.3rem', textAlign: 'center' }}>
                                        {(() => {
                                            const waste = Number(odp.settings.wasteQty);
                                            const qty = Number(odp.finalQty) || 0;
                                            if (!odp.settings.wasteQty || qty === 0) return <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>—</span>;
                                            const pct = (waste / qty) * 100;
                                            const color = pct > 10 ? '#dc2626' : pct > 5 ? '#b45309' : '#15803d';
                                            const bg = pct > 10 ? '#fee2e2' : pct > 5 ? '#fef3c7' : '#dcfce7';
                                            return (
                                                <span style={{ fontWeight: 800, fontSize: '0.78rem', color, background: bg, borderRadius: '6px', padding: '0.2rem 0.4rem', display: 'inline-block' }}>
                                                    {pct.toFixed(1)}%
                                                </span>
                                            );
                                        })()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL: Explosión BOM */}
            {explosionPreview && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(26,54,54,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ background: '#fff', borderRadius: '28px', width: '90%', maxWidth: '850px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                        <header style={{ padding: '1.75rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ background: 'rgba(234,88,12,0.1)', color: '#ea580c', padding: '0.8rem', borderRadius: '16px' }}><ShoppingCart size={26} /></div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#1A3636' }}>Explosión de Materiales (BOM)</h3>
                                    <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>Revisa y ajusta antes de generar las Órdenes de Compra.</p>
                                </div>
                            </div>
                            <button onClick={() => setExplosionPreview(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
                        </header>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem', display: 'grid', gap: '0.75rem' }}>
                            {explosionPreview.map((m, idx) => {
                                const toBuy = Math.max(0, m.required - m.stock + m.safety);
                                return (
                                    <div key={idx} style={{ background: toBuy > 0 ? '#fff7ed' : '#f8fafc', border: `1px solid ${toBuy > 0 ? '#fed7aa' : '#f1f5f9'}`, borderRadius: '16px', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ background: toBuy > 0 ? 'rgba(234,88,12,0.1)' : '#f0fdf4', color: toBuy > 0 ? '#ea580c' : '#16a34a', padding: '0.65rem', borderRadius: '12px' }}><Package size={20} /></div>
                                            <div>
                                                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>{m.name}</div>
                                                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                                                    Req: <strong>{m.required.toFixed(1)} {m.unit}</strong> · Stock: <strong>{m.stock.toFixed(1)}</strong> · Safety: <strong>{m.safety}</strong>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: toBuy > 0 ? '#ea580c' : '#94a3b8', textTransform: 'uppercase', marginBottom: '0.15rem' }}>A Comprar</div>
                                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: toBuy > 0 ? '#ea580c' : '#94a3b8' }}>{toBuy.toFixed(1)} <span style={{ fontSize: '0.75rem' }}>{m.unit}</span></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <footer style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Total Estimado (con IVA):</div>
                                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#1A3636' }}>${totalEstimatedOCs.toLocaleString('es-CO', { minimumFractionDigits: 0 })}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button onClick={() => setExplosionPreview(null)} style={{ padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                                <button onClick={handlePreviewAndSendOC} disabled={isGeneratingOC} style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', border: 'none', background: '#ea580c', color: '#fff', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 6px 16px rgba(234,88,12,0.25)' }}>
                                    {isGeneratingOC ? 'Procesando...' : 'Generar OC y Enviar'} <Send size={16} />
                                </button>
                            </div>
                        </footer>
                    </div>
                </div>
            )}

            {/* MODAL: Consumo MP */}
            {mpConfModal.show && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ background: '#fff', padding: '2rem', borderRadius: '24px', maxWidth: '480px', width: '90%', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div style={{ background: 'rgba(234,88,12,0.1)', borderRadius: '12px', padding: '0.65rem', color: '#ea580c' }}><Package size={22} /></div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Confirmar Consumo de MP</h3>
                        </div>
                        <p style={{ color: '#64748b', margin: '0 0 1rem', fontSize: '0.9rem' }}>
                            ¿Autorizas descontar las materias primas del inventario para producir <strong>{mpConfModal.odp?.finalQty} unidades</strong> de <strong>{mpConfModal.odp?.sku}</strong>?
                        </p>
                        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
                            {mpConfModal.materials.map((m, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#475569', padding: '0.3rem 0', borderBottom: i < mpConfModal.materials.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                    <span>{m.name}</span>
                                    <strong>- {m.totalQty} {m.unit || 'und'}</strong>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <button onClick={() => setMpConfModal({ show: false, odp: null, materials: [] })} style={{ padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                            <button onClick={() => handleMPSync(mpConfModal.odp, mpConfModal.materials)} style={{ padding: '0.75rem', borderRadius: '12px', background: '#ea580c', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>✓ Autorizar Consumo</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Ingreso PT */}
            {confModal.show && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ background: '#fff', padding: '2rem', borderRadius: '24px', maxWidth: '420px', width: '90%', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div style={{ background: 'rgba(22,163,74,0.1)', borderRadius: '12px', padding: '0.65rem', color: '#16a34a' }}><CheckCircle2 size={22} /></div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Ingreso a Inventario PT</h3>
                        </div>
                        <p style={{ color: '#64748b', margin: '0 0 1.25rem', fontSize: '0.9rem' }}>
                            ¿Autorizas ingresar <strong>{confModal.odp?.finalQty} unidades</strong> de <strong>{confModal.odp?.sku}</strong> al inventario de Producto Terminado?
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <button onClick={() => setConfModal({ show: false, odp: null })} style={{ padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>Omitir</button>
                            <button onClick={() => handleInventorySync(confModal.odp)} style={{ padding: '0.75rem', borderRadius: '12px', background: 'var(--color-primary)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>✓ Cargar Inventario</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Detalle de Pedido */}
            {orderModal.show && orderModal.order && (
                <div
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
                    onClick={() => setOrderModal({ show: false, order: null })}
                >
                    <div
                        style={{ background: '#fff', padding: '2rem', borderRadius: '24px', maxWidth: '540px', width: '92%', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header del pedido */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                <div style={{ background: '#eff6ff', borderRadius: '14px', padding: '0.75rem', color: '#1d4ed8' }}>
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#1e293b', fontWeight: 900, letterSpacing: '-0.02em' }}>
                                        {orderModal.order.id}
                                    </h3>
                                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
                                        📅 {orderModal.order.date} &nbsp;·&nbsp; {orderModal.order.source || 'Directo'}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setOrderModal({ show: false, order: null })}
                                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '38px', height: '38px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', flexShrink: 0 }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Resumen cliente / total */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1.25rem' }}>
                            <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '0.9rem 1.1rem' }}>
                                <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.35rem' }}>Cliente</div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>{orderModal.order.client}</div>
                            </div>
                            <div style={{ background: '#f0fdf4', borderRadius: '14px', padding: '0.9rem 1.1rem', border: '1px solid #dcfce7' }}>
                                <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.35rem' }}>Total Pedido</div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#15803d' }}>
                                    ${(orderModal.order.amount || 0).toLocaleString('es-CO')}
                                </div>
                            </div>
                        </div>

                        {/* Productos del pedido */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.65rem' }}>
                                Productos en el pedido
                            </div>
                            <div style={{ border: '1px solid #f1f5f9', borderRadius: '14px', overflow: 'hidden' }}>
                                {(orderModal.order.items || []).length === 0 ? (
                                    <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>Sin items registrados</div>
                                ) : (
                                    (orderModal.order.items || []).map((item, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1.1rem', borderBottom: i < (orderModal.order.items.length - 1) ? '1px solid #f8fafc' : 'none', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                            <div>
                                                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>{item.name}</div>
                                                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.12rem' }}>
                                                    {item.quantity} und &nbsp;×&nbsp; ${(item.price || 0).toLocaleString('es-CO')}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#475569' }}>
                                                ${((item.quantity || 0) * (item.price || 0)).toLocaleString('es-CO')}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Footer: estado + cerrar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ padding: '0.35rem 0.9rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                                {orderModal.order.status}
                            </span>
                            <button
                                onClick={() => setOrderModal({ show: false, order: null })}
                                style={{ padding: '0.65rem 1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de Previsualización PDF */}
            {pdfPreview.show && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '2rem' }}>
                    <div style={{ background: '#fff', borderRadius: '12px', width: '900px', maxWidth: '95%', height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                        <div style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <FileText size={20} color="var(--color-primary)" />
                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Previsualización: {pdfPreview.fileName}</h3>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    onClick={() => generateOdpPdfFull(pdfPreview.odpData, true)}
                                    style={{
                                        background: 'var(--color-primary)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '0.5rem 1.25rem',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    <Send size={16} /> Exportar / Descargar PDF
                                </button>
                                <button
                                    onClick={() => setPdfPreview({ ...pdfPreview, show: false })}
                                    style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div style={{ flex: 1, background: '#525659', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <iframe
                                src={pdfPreview.url}
                                style={{ width: '100%', height: '100%', border: 'none' }}
                                title="Prueba PDF"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Production;
