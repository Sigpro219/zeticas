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
    const {
        orders,
        items,
        recipes,
        productionOrders,
        saveOdp,
        deleteOdp,
        consumeMaterials,
        loadFinishedGoods,
        ownCompany,
        updateOrder
    } = useBusiness();

    // const [isLoading, setIsLoading] = useState(false); // Unused
    const [odpSettings, setOdpSettings] = useState(() => {
        const saved = localStorage.getItem('zeticas_odp_settings');
        return saved ? JSON.parse(saved) : {};
    });

    // const [syncStatus, setSyncStatus] = useState('idle'); // Unused
    const [pdfPreview, setPdfPreview] = useState({ show: false, url: '', fileName: '', odpData: null });
    const [confModal, setConfModal] = useState({ show: false, odp: null, endTime: null });
    const [mpConfModal, setMpConfModal] = useState({ show: false, odp: null, materials: [] });
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState(STATUS_ALL);
    const [showEficList, setShowEficList] = useState(false);
    const [showWasteList, setShowWasteList] = useState(false);
    const [dateFilter, setDateFilter] = useState('month');
    const [customRange] = useState({ from: '', to: '' });

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

            // Check if we actually need to update to avoid cascading renders
            setOdpSettings(prev => {
                const needsUpdate = Object.keys(settingsFromDB).some(sku => {
                    const s = settingsFromDB[sku];
                    const p = prev[sku];
                    if (!p) return true;
                    return s.customQty !== p.customQty ||
                        s.wasteQty !== p.wasteQty ||
                        s.start !== p.start ||
                        s.end !== p.end ||
                        s.mpSynced !== p.mpSynced ||
                        s.inventorySynced !== p.inventorySynced ||
                        s.odpId !== p.odpId;
                });

                if (!needsUpdate) return prev;

                const merged = { ...prev, ...settingsFromDB };
                // Timeout to move storage update out of render cycle
                setTimeout(() => localStorage.setItem('zeticas_odp_settings', JSON.stringify(merged)), 0);
                return merged;
            });
            // setSyncStatus('synced');
        }
    }, [productionOrders]);

    // ── Save to Firestore ───────────────────────────────────────────────────
    const saveToFirestore = useCallback(async (sku, settings, odpId) => {
        try {
            // setSyncStatus('syncing');
            const payload = {
                odp_number: odpId || null,
                custom_qty: settings.customQty !== undefined ? Number(settings.customQty) : null,
                waste_qty: settings.wasteQty !== undefined ? Number(settings.wasteQty) : null,
                started_at: settings.start || null,
                completed_at: settings.end || null,
                mp_synced: settings.mpSynced || false,
                inventory_synced: settings.inventorySynced || false,
                materials_consumed: settings.materials_consumed || null,
                status: (settings.end && settings.inventorySynced) ? 'DONE' : (settings.start ? 'IN_PROGRESS' : 'TO_DO'),
            };

            await saveOdp(sku, payload);
            // setSyncStatus('synced');
        } catch (err) {
            console.warn('Error saving ODP to Firestore:', err.message);
            // setSyncStatus('error');
        }
    }, [saveOdp]);

    // ── Cola de ODPs ──────────────────────────────────────────────────────────
    const pendingOrders = useMemo(() => orders.filter(o =>
        o.status === 'En Producción' || o.status === 'En Producción (Iniciada)' || o.status === 'En Compras' || o.status === 'En Despacho'
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

        // ── FUENTE DE VERDAD: production_orders de Firestore ──
        if (productionOrders && productionOrders.length > 0) {
            return productionOrders.map((odpDoc) => {
                const product = items.find(i => i.name === odpDoc.sku);
                const recipeList = recipes[odpDoc.sku] || [];
                const batchSize = product?.batch_size || recipeList[0]?.yield_quantity || 1;
                
                const inventoryPT = product
                    ? (product.initial || 0) + (product.purchases || 0) - (product.sales || 0)
                    : 0;

                const settings = odpSettings[odpDoc.sku] || {};
                
                // Prioridad: 1. Ajuste manual local, 2. Valor en Firestore, 3. Fallback
                const finalQty = settings.customQty !== undefined ? settings.customQty : (odpDoc.qty || 0);

                let status = { text: STATUS_PROGRAMADA, color: 'rgba(239, 68, 68, 0.1)', textColor: '#ef4444' };
                if (odpDoc.status === 'IN_PROGRESS' || settings.start) {
                    status = { text: STATUS_EN_PRODUCCION, color: 'rgba(212, 120, 90, 0.1)', textColor: '#D4785A' };
                }
                if (odpDoc.status === 'DONE' || (settings.end && settings.inventorySynced)) {
                    status = { text: STATUS_FINALIZADA, color: 'rgba(16, 185, 129, 0.1)', textColor: '#10b981' };
                }

                // Waste calculation available as soon as there's a record, even if not finished
                let efficiency = null;
                let waste = null;
                let waste_percent = null;
                const startTime = odpDoc.started_at || settings.start;
                const endTime = odpDoc.completed_at || settings.end;

                const currentWaste = odpDoc.waste_qty !== undefined ? odpDoc.waste_qty : settings.wasteQty;
                if (currentWaste !== undefined && Number(finalQty) > 0) {
                    waste = Number(currentWaste);
                    waste_percent = ((waste / Number(finalQty)) * 100).toFixed(1);
                }

                if (startTime && endTime) {
                    const diffHr = (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60);
                    if (diffHr > 0) efficiency = Math.round(Number(finalQty) / diffHr);
                }

                return {
                    sku: odpDoc.sku,
                    odpId: odpDoc.odp_number || odpDoc.id,
                    dbId: odpDoc.id,
                    inventoryPT,
                    batchSize,
                    finalQty,
                    settings: { ...settings, start: startTime, end: endTime },
                    status,
                    efficiency,
                    waste,
                    waste_percent: waste_percent || '0.0',
                    relatedOrders: [], // Se podría cruzar con pedidos si fuera necesario
                };
            });
        }

        // Fallback for legacy (empty DB)
        return [];
    }, [productionOrders, items, odpSettings, recipes, pendingOrders]);

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

        const perSku = {};
        finished.forEach(o => {
            if (!perSku[o.sku]) perSku[o.sku] = { sku: o.sku, count: 0, total: 0 };
            perSku[o.sku].count++;
            perSku[o.sku].total += o.efficiency;
        });
        const skuRows = Object.values(perSku).map(s => ({
            sku: s.sku,
            avg: s.total / s.count
        })).sort((a, b) => a.avg - b.avg);

        return { avg, rows: skuRows };
    }, [odpQueue]);

    const desperdicioStats = useMemo(() => {
        const finished = odpQueue.filter(o => o.waste_percent !== null);
        if (finished.length === 0) return { avg: null, rows: [] };
        const avg = finished.reduce((acc, o) => acc + Number(o.waste_percent), 0) / finished.length;

        const perSku = {};
        finished.forEach(o => {
            if (!perSku[o.sku]) perSku[o.sku] = { sku: o.sku, count: 0, total: 0 };
            perSku[o.sku].count++;
            perSku[o.sku].total += Number(o.waste_percent);
        });
        const skuRows = Object.values(perSku).map(s => ({
            sku: s.sku,
            avg: s.total / s.count
        })).sort((a, b) => b.avg - a.avg);

        return { avg, rows: skuRows };
    }, [odpQueue]);

    // ── Filtros ───────────────────────────────────────────────────────────────
    // ── Priority Detection (Bottlenecks) ──────────────────────────────────
    const prioritySkus = useMemo(() => {
        const priorities = new Set();
        orders.forEach(order => {
            const statusLower = (order.status || '').toLowerCase();
            const isAtDespacho = [
                'en producción', 'en producción (iniciada)', 'en despacho', 
                'listo para despacho', 'despachado', 'en compras (oc generadas)'
            ].includes(statusLower);

            if (isAtDespacho) {
                const orderItems = order.items || [];
                let totalNeeded = 0;
                let totalReady = 0;
                
                orderItems.forEach(item => {
                    totalNeeded += (Number(item.quantity) || 0);
                    const product = items.find(i => i.name === item.name || i.id === item.id);
                    const currentStock = product ? ((product.initial || 0) + (product.purchases || 0) - (product.sales || 0)) : 0;
                    totalReady += Math.min((Number(item.quantity) || 0), Math.max(0, currentStock));
                });

                const fulfillment = totalNeeded > 0 ? (totalReady / totalNeeded) * 100 : 0;
                
                // Si el pedido está en despacho pero no está listo (fulfillment < 100),
                // identificamos los SKUs que le faltan como prioridad
                if (fulfillment < 100) {
                    orderItems.forEach(item => {
                        const product = items.find(i => i.name === item.name || i.id === item.id);
                        const currentStock = product ? ((product.initial || 0) + (product.purchases || 0) - (product.sales || 0)) : 0;
                        if (currentStock < (Number(item.quantity) || 0)) {
                            priorities.add(item.name);
                        }
                    });
                }
            }
        });
        return priorities;
    }, [orders, items]);

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
            
            let matchStatus = false;
            const currentFilter = (statusFilter || '').toLowerCase().trim();
            const odpStatusStr = (odp.status.text || '').toLowerCase().trim();
            const finalizedStr = STATUS_FINALIZADA.toLowerCase().trim();

            if (currentFilter === STATUS_ALL.toLowerCase().trim() || currentFilter === '') {
                // 'Todos' ahora muestra todo EXCEPTO finalized por instrucción del usuario
                matchStatus = odpStatusStr !== finalizedStr;
            } else if (currentFilter === 'en marcha') {
                // Filtro especial para ver todo lo que no ha terminado
                matchStatus = odpStatusStr !== STATUS_FINALIZADA.toLowerCase().trim();
            } else {
                matchStatus = odpStatusStr === currentFilter;
            }

            const refDateStr = odp.settings.start || (odp.relatedOrders[0]?.date);
            const refDate = refDateStr ? new Date(refDateStr) : null;
            let matchDate = true;
            if (dateFrom && refDate) matchDate = refDate >= dateFrom;
            if (dateTo && refDate) matchDate = matchDate && refDate <= dateTo;
            return matchSearch && matchStatus && matchDate;
        }).map(odp => ({
            ...odp,
            isPriority: prioritySkus.has(odp.sku)
        })).sort((a, b) => {
            // Priority 1: Bottlenecks (isPriority)
            if (a.isPriority && !b.isPriority) return -1;
            if (!a.isPriority && b.isPriority) return 1;

            // Priority 2: Status order (Programada -> In Progress -> Finalized)
            const aFinalized = a.status.text === STATUS_FINALIZADA;
            const bFinalized = b.status.text === STATUS_FINALIZADA;
            if (aFinalized && !bFinalized) return 1;
            if (!aFinalized && bFinalized) return -1;
            return 0;
        });
    }, [odpQueue, searchQuery, statusFilter, dateFilter, customRange, prioritySkus]);

    const handleDeleteOdp = async (odp) => {
        if (!window.confirm(`¿Deseas RETIRAR Y ELIMINAR permanentemente ${odp.sku} de la planta?\n\nLos pedidos vinculados volverán a estado "Pendiente" en el monitor de ventas.`)) return;
        
        // setIsLoading(true);
        try {
            // 1. Return related sales orders to 'Pendiente'
            const updatePromises = (odp.relatedOrders || []).map(order => {
                const orderRef = orders.find(o => o.id === order.id || o.dbId === order.dbId);
                if (orderRef?.dbId) {
                    return updateOrder(orderRef.dbId, { status: 'Pendiente' });
                }
                return Promise.resolve();
            });
            
            await Promise.all(updatePromises);

            // 2. Permanent deletion from Firestore
            if (odp.dbId) {
                await deleteOdp(odp.dbId);
            } else {
                // Fallback trying to find it if dbId wasn't passed early
                console.warn("ODP sin dbId para borrado directo.");
            }

            // 3. Clear local settings for this SKU
            const newSettings = { ...odpSettings };
            delete newSettings[odp.sku];
            setOdpSettings(newSettings);
            localStorage.setItem('zeticas_odp_settings', JSON.stringify(newSettings));
            
            alert(`Lote de ${odp.sku} eliminado de planta exitosamente.`);
        } catch (err) {
            console.error("Error deleting ODP:", err);
            alert("No se pudo eliminar de base de datos: " + err.message);
        } finally {
            // setIsLoading(false);
        }
    };

    // ── Actualizar ODP ────────────────────────────────────────────────────────
    const updateOdp = (sku, field, value) => {
        // Logic for start: show MP confirmation first
        if (field === 'start' && value && !odpSettings[sku]?.mpSynced) {
            const recipeList = recipes[sku] || [];
            const odp = odpQueue.find(o => o.sku === sku);
            if (recipeList.length > 0 && odp) {
                const yieldQty = Number(recipeList[0]?.yield_quantity) || 1;
                const finalToProd = Number(odp.finalQty) || 0;

                const materialsWithQty = recipeList.map(r => ({
                    ...r,
                    id: r.rm_id, // ensure ID is used for consumeMaterials
                    qtyToConsume: (Number(r.qty) / yieldQty) * finalToProd
                }));
                setMpConfModal({ show: true, odp, materials: materialsWithQty });
                return;
            }
        }

        // Logic for wasteQty: cannot exceed batch size
        if (field === 'wasteQty') {
            const odp = odpQueue.find(o => o.sku === sku);
            const limit = Number(odp?.finalQty || 0);
            if (Number(value) > limit) {
                alert(`El desperdicio (${value}) no puede ser superior al tamaño del lote (${limit}).`);
                return;
            }
        }

        // Logic for end: show PT confirmation
        if (field === 'end' && value && !odpSettings[sku]?.inventorySynced) {
            const odp = odpQueue.find(o => o.sku === sku);
            if (odp) {
                setConfModal({ show: true, odp, endTime: value });
                // We don't save 'end' yet, we wait for authorization to stop timer AND charge PT
                return;
            }
        }

        const newSettings = {
            ...odpSettings,
            [sku]: { ...(odpSettings[sku] || {}), [field]: value }
        };

        setOdpSettings(newSettings);
        localStorage.setItem('zeticas_odp_settings', JSON.stringify(newSettings));
        const odpEntry = odpQueue.find(o => o.sku === sku);
        saveToFirestore(sku, newSettings[sku], odpEntry?.odpId);
    };

    const handleConfirmMp = async () => {
        const { odp, materials } = mpConfModal;
        try {
            // 1. Discount from inventory
            const result = await consumeMaterials(materials.map(m => ({ id: m.id, qtyToConsume: m.qtyToConsume })));
            if (result.success) {
                // 2. Update state with start time, sync flag, and the list of materials associated
                const newSettings = {
                    ...odpSettings,
                    [odp.sku]: {
                        ...(odpSettings[odp.sku] || {}),
                        start: new Date().toISOString(),
                        mpSynced: true,
                        materials_consumed: materials.map(m => ({
                            id: m.id,
                            name: m.name,
                            qty: Number(m.qtyToConsume.toFixed(2)),
                            unit: m.unit
                        }))
                    }
                };
                setOdpSettings(newSettings);
                localStorage.setItem('zeticas_odp_settings', JSON.stringify(newSettings));
                await saveToFirestore(odp.sku, newSettings[odp.sku], odp.odpId);
                setMpConfModal({ show: false, odp: null, materials: [] });
            } else {
                alert("Error al descontar materias primas");
            }
        } catch (err) { alert(err.message); }
    };

    const generateOdpPdfFull = (odp, isDownload = false) => {
        const doc = new jsPDF();
        const comp = ownCompany || {};

        // Header with Company Data
        doc.setFontSize(22);
        doc.setTextColor(2, 54, 54);
        doc.text(comp.name || 'Zeticas SAS BIC', 14, 25);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`NIT: ${comp.nit || '901.XXX.XXX-X'}`, 14, 32);
        doc.text(`DIRECCIÓN: ${comp.address || 'Guasca, Cundinamarca'}`, 14, 37);
        doc.text(`TELÉFONO: ${comp.phone || '314 433 6525'}`, 14, 42);

        doc.setFontSize(16);
        doc.setTextColor(2, 54, 54);
        doc.text('ORDEN DE PRODUCCIÓN', 14, 55);

        doc.setFontSize(11);
        doc.setTextColor(33, 33, 33);
        doc.text(`REFERENCIA: ${odp.odpId}`, 14, 65);
        doc.text(`FECHA EMISIÓN: ${new Date().toLocaleDateString()}`, 14, 70);
        doc.text(`ESTADO ACTUAL: ${odp.status.text.toUpperCase()}`, 14, 75);

        // Main Info Table
        autoTable(doc, {
            startY: 85,
            head: [['PRODUCTO / SKU', 'CANTIDAD PROGRAMADA', 'LOTE MÍN.']],
            body: [[odp.sku, `${odp.finalQty} un.`, `${odp.batchSize} un.`]],
            theme: 'grid',
            headStyles: { fillColor: [2, 54, 54], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 5 }
        });

        // Cronometry Table
        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 15,
            head: [['INICIO PRODUCCIÓN', 'FIN PRODUCCIÓN', 'TIEMPO ESTIMADO']],
            body: [[
                odp.settings.start ? new Date(odp.settings.start).toLocaleString() : 'PENDIENTE',
                odp.settings.end ? new Date(odp.settings.end).toLocaleString() : 'PENDIENTE',
                odp.efficiency ? `${odp.efficiency} und/hr (Real)` : 'N/A'
            ]],
            theme: 'striped',
            headStyles: { fillColor: [212, 120, 90] }
        });

        // Signatures
        const finalY = doc.lastAutoTable.finalY + 40;
        doc.line(14, finalY, 80, finalY);
        doc.text('RESPONSABLE PRODUCCIÓN', 14, finalY + 5);

        doc.line(120, finalY, 186, finalY);
        doc.text('CONTROL CALIDAD', 120, finalY + 5);

        if (isDownload) {
            doc.save(`${odp.odpId}_${odp.sku.replace(/\s+/g, '_')}.pdf`);
        } else {
            const pdfBlob = doc.output('bloburl');
            setPdfPreview({ show: true, url: pdfBlob, fileName: `${odp.odpId}.pdf`, odpData: odp });
        }
    };

    const handleInventorySync = async (odp) => {
        try {
            // Calculate NET quantity = Planned - Waste
            const netQty = Math.max(0, Number(odp.finalQty || 0) - Number(odp.waste || 0));

            // 1. Charge Finished Goods to inventory
            const result = await loadFinishedGoods(odp.sku, netQty);
            if (result.success) {
                // 2. Stop timer at the EXACT moment 'Finalizar' was clicked and finalize ODP
                const newSettings = {
                    ...odpSettings,
                    [odp.sku]: {
                        ...odpSettings[odp.sku],
                        end: confModal.endTime || new Date().toISOString(),
                        inventorySynced: true,
                        status: 'DONE'
                    }
                };
                setOdpSettings(newSettings);
                localStorage.setItem('zeticas_odp_settings', JSON.stringify(newSettings));
                await saveToFirestore(odp.sku, newSettings[odp.sku], odp.odpId);

                // 3. AUTO-MOVE ORDERS TO LOGISTICS (Fulfillment-based)
                const ordersToUpdate = [];
                // Refresh context items to get latest stock if possible, or use current + newly added
                for (const order of odp.relatedOrders) {
                    const orderItems = order.items || [];
                    let totalNeeded = 0;
                    let totalReady = 0;

                    for (const item of orderItems) {
                        const qtyNeeded = Number(item.quantity) || 0;
                        totalNeeded += qtyNeeded;
                        
                        // Find current stock in context
                        const inventoryItem = items.find(i => i.name === item.name || i.id === item.id);
                        let currentStock = inventoryItem ? ((inventoryItem.initial || 0) + (inventoryItem.purchases || 0) - (inventoryItem.sales || 0)) : 0;
                        
                        // If this is the SKU we just finished, it might not be in the context yet
                        // so we add the NEW netQty to the count
                        if (item.name === odp.sku) {
                            currentStock += netQty;
                        }

                        totalReady += Math.min(qtyNeeded, Math.max(0, currentStock));
                    }

                    const fulfillment = totalNeeded > 0 ? (totalReady / totalNeeded) * 100 : 0;
                    
                    // If fulfillment reached 100%, it's ready for shipping
                    if (fulfillment >= 100) {
                        ordersToUpdate.push(order);
                    }
                }

                if (ordersToUpdate.length > 0) {
                    let movedCount = 0;
                    for (const o of ordersToUpdate) {
                        // Find the database ID of the original order
                        const orderDbId = o.dbId || (orders.find(ord => ord.id === o.id)?.dbId);
                        if (orderDbId) {
                            await updateOrder(orderDbId, { 
                                status: 'En Despacho',
                                last_status_at: new Date().toISOString()
                            });
                            movedCount++;
                        }
                    }
                    if (movedCount > 0) {
                        alert(`¡Stock Cargado! ${movedCount} pedido(s) han pasado automáticamente a Logística por cumplimiento de inventario al 100%.`);
                    }
                } else {
                    alert(`Ingresado a Inventario: ${netQty} unidades de ${odp.sku}. El pedido sigue en producción esperando componentes adicionales.`);
                }
            }
            setConfModal({ show: false, odp: null, endTime: null });
        } catch (err) { 
            console.error("Error finalizing ODP:", err);
            alert("No se pudo finalizar la ODP: " + err.message); 
        }
    };

    return (
        <div style={{ padding: '2rem', minHeight: '100vh', background: '#f8fafc' }}>

            {/* HEADER removed as it's redundant with the main layout */}

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
                        <button 
                            key={st} 
                            onClick={() => setStatusFilter(st)} 
                            style={{ 
                                padding: '0.8rem 1.5rem', 
                                border: 'none', 
                                borderRadius: '16px', 
                                fontSize: '0.75rem', 
                                fontWeight: '900', 
                                cursor: 'pointer', 
                                background: statusFilter === st ? institutionOcre : 'transparent', 
                                color: statusFilter === st ? '#fff' : '#64748b', 
                                transition: 'all 0.3s', 
                                textTransform: 'uppercase' 
                            }}>
                            {st}
                        </button>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7 }}>Eficiencia (UND/HORA)</span>
                        <button onClick={() => setShowEficList(!showEficList)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', padding: '4px', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>
                            {showEficList ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>
                    <div style={{ marginTop: '1.5rem', fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1px', lineHeight: 1 }}>
                        {eficienciaStats.avg !== null ? eficienciaStats.avg.toFixed(1) : '0.0'}
                        <span style={{ fontSize: '0.8rem', verticalAlign: 'middle', marginLeft: '8px' }}>UND/HR</span>
                    </div>

                    {showEficList && (
                        <div style={{ marginTop: '1.5rem', maxHeight: '150px', overflowY: 'auto', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem' }}>
                            {eficienciaStats.rows.map(r => (
                                <div key={r.sku} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    <span style={{ fontWeight: '700' }}>{r.sku}</span>
                                    <span style={{ opacity: 0.8 }}>{r.avg.toFixed(1)} und/hr</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ background: glassWhite, backdropFilter: 'blur(10px)', padding: '1.5rem 2rem', borderRadius: '24px', border: '1px solid rgba(2, 83, 87, 0.05)', boxShadow: '0 10px 25px rgba(0,0,0,0.02)', animation: 'fadeUp 1s ease-out' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>% Desperdicio</span>
                        <button onClick={() => setShowWasteList(!showWasteList)} style={{ background: 'rgba(2, 54, 54, 0.05)', border: 'none', padding: '4px', borderRadius: '8px', color: deepTeal, cursor: 'pointer' }}>
                            {showWasteList ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>
                    <div style={{ marginTop: '1.5rem', fontSize: '2.5rem', fontWeight: '900', color: premiumSalmon, letterSpacing: '-1px', lineHeight: 1 }}>
                        {desperdicioStats.avg !== null ? desperdicioStats.avg.toFixed(1) : '0.0'}%
                    </div>

                    {showWasteList && (
                        <div style={{ marginTop: '1.5rem', maxHeight: '150px', overflowY: 'auto', background: 'rgba(2, 54, 54, 0.02)', borderRadius: '12px', padding: '1rem' }}>
                            {desperdicioStats.rows.map(r => (
                                <div key={r.sku} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <span style={{ fontWeight: '700', color: deepTeal }}>{r.sku}</span>
                                    <span style={{ color: premiumSalmon, fontWeight: '800' }}>{r.avg.toFixed(1)}%</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ODP Table */}
            <div style={{ background: glassWhite, backdropFilter: 'blur(10px)', borderRadius: '24px', border: '1px solid rgba(2, 83, 87, 0.05)', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.02)', animation: 'fadeUp 1.1s ease-out' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead>
                            <tr style={{ background: 'rgba(2, 83, 87, 0.02)' }}>
                                <th style={{ padding: '1.5rem 2rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Referencia ODP</th>
                                <th style={{ padding: '1.5rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Producto / SKU</th>
                                <th style={{ padding: '1.5rem 1rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Q. Plan</th>
                                <th style={{ padding: '1.5rem 1rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Cronometría</th>
                                <th style={{ padding: '1.5rem 1rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Desperdicio</th>
                                <th style={{ padding: '1.5rem 1rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Eficiencia Und/Hora</th>
                                <th style={{ padding: '1.5rem 1rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>% Desperdicio</th>
                                <th style={{ padding: '1.5rem 1rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Estado</th>
                        <th style={{ padding: '1.5rem 2rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOdpQueue.map((odp) => {
                                const isStarted = !!odp.settings.start;
                                const isFinished = !!odp.settings.end;
                                const isCritical = odp.isPriority;

                                return (
                                    <tr key={odp.dbId || odp.odpId} style={{ 
                                        borderBottom: '1px solid #f8fafc', 
                                        transition: 'all 0.3s',
                                        background: isCritical && !isFinished ? 'rgba(212, 120, 90, 0.03)' : 'transparent',
                                        borderLeft: isCritical && !isFinished ? `6px solid ${institutionOcre}` : 'none'
                                    }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(2, 83, 87, 0.02)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = isCritical && !isFinished ? 'rgba(212, 120, 90, 0.03)' : 'transparent'; }}>
                                        <td style={{ padding: '2rem' }}>
                                            <button
                                                onClick={() => generateOdpPdfFull(odp)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    fontWeight: '900',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.8rem',
                                                    cursor: 'pointer',
                                                    color: deepTeal,
                                                    padding: 0
                                                }}
                                            >
                                                <FileText size={18} /> 
                                                {isCritical && !isFinished && <span title="Prioridad Crítica: Libera Pedido" style={{ animation: 'pulse 2s infinite' }}>💡</span>}
                                                {odp.odpId}
                                            </button>
                                        </td>
                                        <td style={{ padding: '2rem 1rem' }}>
                                            <div style={{ fontWeight: '900', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {odp.sku}
                                                {isCritical && !isFinished && (
                                                    <span style={{ fontSize: '0.6rem', background: institutionOcre, color: '#fff', padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.5px' }}>PRIORIDAD</span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                                <input
                                                    type="number"
                                                    value={odp.finalQty}
                                                    onChange={(e) => updateOdp(odp.sku, 'customQty', Number(e.target.value))}
                                                    style={{
                                                        width: '80px',
                                                        background: '#fff',
                                                        border: '2px solid #e2e8f0',
                                                        padding: '0.6rem',
                                                        borderRadius: '14px',
                                                        fontWeight: '900',
                                                        textAlign: 'center',
                                                        color: deepTeal,
                                                        outline: 'none',
                                                        transition: 'border 0.3s'
                                                    }}
                                                    onFocus={(e) => e.target.style.borderColor = institutionOcre}
                                                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                                />
                                            </div>
                                        </td>
                                        <td style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.6rem', fontWeight: '900', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ color: odp.settings.start ? deepTeal : '#94a3b8' }}>
                                                    {odp.settings.start ? `${new Date(odp.settings.start).toLocaleDateString('es-CO')} ${new Date(odp.settings.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'DATE/TIME START'}
                                                </span>
                                                <div style={{ width: '1px', height: '8px', background: '#e2e8f0', margin: '0 auto' }} />
                                                <span style={{ color: odp.settings.end ? '#10b981' : '#94a3b8' }}>
                                                    {odp.settings.end ? `${new Date(odp.settings.end).toLocaleDateString('es-CO')} ${new Date(odp.settings.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'DATE/TIME END'}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                <input
                                                    type="number"
                                                    placeholder="0"
                                                    value={odp.settings.wasteQty || ''}
                                                    disabled={!isStarted || isFinished}
                                                    onChange={(e) => updateOdp(odp.sku, 'wasteQty', e.target.value)}
                                                    style={{ 
                                                        width: '60px', 
                                                        padding: '0.5rem', 
                                                        borderRadius: '10px', 
                                                        border: '1px solid #e2e8f0', 
                                                        textAlign: 'center', 
                                                        fontSize: '0.8rem', 
                                                        fontWeight: '800',
                                                        background: (!isStarted || isFinished) ? '#f8fafc' : '#fff',
                                                        opacity: (!isStarted || isFinished) ? 0.6 : 1
                                                    }}
                                                />
                                                <span style={{ fontSize: '0.6rem', fontWeight: '900', color: '#94a3b8' }}>UDS</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                                            <div style={{ fontSize: '1rem', fontWeight: '900', color: deepTeal }}>{odp.efficiency || '0.0'}</div>
                                            <div style={{ fontSize: '0.55rem', color: '#94a3b8', fontWeight: '900', textTransform: 'uppercase' }}>und/hr</div>
                                        </td>
                                        <td style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                                            <div style={{ fontSize: '1rem', fontWeight: '900', color: Number(odp.waste_percent) > 5 ? '#ef4444' : premiumSalmon }}>{odp.waste_percent}%</div>
                                        </td>
                                        <td style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                                            <span style={{ padding: '6px 12px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: '900', background: odp.status.color, color: odp.status.textColor, whiteSpace: 'nowrap' }}>{odp.status.text.toUpperCase()}</span>
                                        </td>
                                        <td style={{ padding: '2rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => updateOdp(odp.sku, 'start', new Date().toISOString())}
                                                    disabled={!!odp.settings.start}
                                                    style={{
                                                        padding: '0.8rem 1.2rem',
                                                        borderRadius: '15px',
                                                        border: 'none',
                                                        background: odp.settings.start ? '#e2e8f0' : deepTeal,
                                                        color: '#fff',
                                                        fontWeight: '900',
                                                        cursor: odp.settings.start ? 'not-allowed' : 'pointer',
                                                        fontSize: '0.75rem',
                                                        boxShadow: !odp.settings.start ? '0 4px 12px rgba(2, 54, 54, 0.2)' : 'none',
                                                        transition: 'all 0.2s',
                                                        minWidth: '100px'
                                                    }}
                                                >
                                                    INICIO
                                                </button>
                                                <button
                                                    onClick={() => updateOdp(odp.sku, 'end', new Date().toISOString())}
                                                    disabled={!odp.settings.start || !!odp.settings.end}
                                                    style={{
                                                        padding: '0.8rem 1.2rem',
                                                        borderRadius: '15px',
                                                        border: 'none',
                                                        background: (!odp.settings.start || odp.settings.end) ? '#e2e8f0' : institutionOcre,
                                                        color: '#fff',
                                                        fontWeight: '900',
                                                        cursor: (!odp.settings.start || odp.settings.end) ? 'not-allowed' : 'pointer',
                                                        fontSize: '0.75rem',
                                                        boxShadow: (odp.settings.start && !odp.settings.end) ? `0 4px 12px ${institutionOcre}30` : 'none',
                                                        transition: 'all 0.2s',
                                                        minWidth: '100px'
                                                    }}
                                                >
                                                    FINALIZAR
                                                </button>
                                            </div>
                                            {odp.status.text !== STATUS_FINALIZADA && (
                                                <button onClick={() => handleDeleteOdp(odp)} style={{ width: '40px', height: '40px', borderRadius: '12px', border: '1px solid #f1f5f9', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }} title="Eliminar de Planta"><Trash2 size={16} /></button>
                                            )}
                                            <button onClick={() => generateOdpPdfFull(odp, true)} style={{ width: '40px', height: '40px', borderRadius: '12px', border: '1px solid #f1f5f9', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: deepTeal }} title="Descargar PDF"><Zap size={16} /></button>
                                        </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
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
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ background: '#fff', padding: '3.5rem', borderRadius: '45px', maxWidth: '500px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
                            <Package size={40} />
                        </div>
                        <h3 style={{ fontWeight: '900', color: deepTeal, marginBottom: '1.5rem', fontSize: '1.5rem' }}>Finalizar Producción</h3>
                        <p style={{ fontWeight: '700', color: '#64748b', marginBottom: '2.5rem', lineHeight: '1.6' }}>
                            ¿Autorizas el cargue de <span style={{ color: deepTeal }}>{Math.max(0, Number(confModal.odp?.finalQty || 0) - Number(confModal.odp?.waste || 0))} unidades</span> de {confModal.odp?.sku}?
                            <br />
                            <span style={{ fontSize: '0.9rem', color: institutionOcre }}>
                                Se sumarán a las {confModal.odp?.inventoryPT} unidades del inventario inicial para un total de <b>{Math.max(0, Number(confModal.odp?.finalQty || 0) - Number(confModal.odp?.waste || 0)) + Number(confModal.odp?.inventoryPT || 0)} unidades</b>.
                                {Number(confModal.odp?.waste || 0) > 0 && <span style={{ color: '#ef4444', display: 'block', fontSize: '0.75rem', marginTop: '0.5rem' }}>* {confModal.odp?.waste} unidades descontadas automáticamente por desperdicio/daño.</span>}
                            </span>
                        </p>
                        <div style={{ display: 'flex', gap: '1.5rem' }}>
                            <button onClick={() => setConfModal({ show: false, odp: null, endTime: null })} style={{ flex: 1, padding: '1.2rem', borderRadius: '20px', border: '2px solid #f1f5f9', background: '#fff', fontWeight: '900', cursor: 'pointer' }}>CANCELAR</button>
                            <button onClick={() => handleInventorySync(confModal.odp)} style={{ flex: 2, padding: '1.2rem', borderRadius: '20px', border: 'none', background: '#10b981', color: '#fff', fontWeight: '900', cursor: 'pointer', boxShadow: '0 10px 20px rgba(16, 185, 129, 0.2)' }}>SÍ, AUTORIZAR CARGUE PT</button>
                        </div>
                    </div>
                </div>
            )}

            {mpConfModal.show && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ background: '#fff', padding: '3rem', borderRadius: '40px', maxWidth: '600px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h3 style={{ fontWeight: '900', color: deepTeal, margin: 0 }}>Consumo de Materias Primas</h3>
                            <button onClick={() => setMpConfModal({ show: false, odp: null, materials: [] })} style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <p style={{ fontWeight: '700', color: '#64748b', marginBottom: '1.5rem' }}>Lista de materias primas e insumos a consumir para fabricar <span style={{ color: deepTeal }}>{mpConfModal.odp?.finalQty} un.</span>:</p>

                        <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '2rem', padding: '1.5rem', background: 'rgba(2, 54, 54, 0.02)', borderRadius: '20px' }}>
                            {mpConfModal.materials.map(m => (
                                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                    <div>
                                        <div style={{ fontWeight: '800', fontSize: '0.9rem', color: deepTeal }}>{m.name}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{m.sku}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: '900', color: institutionOcre }}>{m.qtyToConsume} un.</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ padding: '1.2rem', background: 'rgba(212, 120, 90, 0.05)', borderRadius: '16px', marginBottom: '2rem', textAlign: 'center' }}>
                            <p style={{ margin: 0, fontWeight: '800', color: institutionOcre, fontSize: '0.9rem' }}>
                                ¿Autorizas retirar y consumir estas MP e insumos?
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '1.5rem' }}>
                            <button onClick={() => setMpConfModal({ show: false, odp: null, materials: [] })} style={{ flex: 1, padding: '1.2rem', borderRadius: '20px', border: '2px solid #f1f5f9', background: '#fff', fontWeight: '900', cursor: 'pointer' }}>CANCELAR</button>
                            <button onClick={handleConfirmMp} style={{ flex: 2, padding: '1.2rem', borderRadius: '20px', border: 'none', background: deepTeal, color: '#fff', fontWeight: '900', cursor: 'pointer', boxShadow: '0 10px 20px rgba(2, 54, 54, 0.2)' }}>SÍ, AUTORIZAR RETIRO</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.15); opacity: 0.8; } 100% { transform: scale(1); opacity: 1; } }
            `}</style>
        </div>
    );
};

export default Production;
