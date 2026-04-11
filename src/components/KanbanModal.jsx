import React, { useState } from 'react';
import { 
    X, FileText, ShoppingCart, ChefHat, Truck, 
    DollarSign, Info, Package, Calendar, LayoutGrid, CheckCircle, Clock, CheckCircle2 
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';

const KanbanModal = ({ isOpen, onClose, orders = [], items = [] }) => {
    const { items: contextItems, productionOrders, recipes, updateOrder, purchaseOrders } = useBusiness();
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showHidden, setShowHidden] = useState(false);

    if (!isOpen) return null;

    const currentItems = items.length > 0 ? items : contextItems;
    const deepTeal = "#025357";
    const institutionOcre = "#D6BD98";
    const premiumSalmon = "#D4785A";

    // Helper for finished goods fulfillment
    const getStockFulfillment = (orderItems) => {
        if (!orderItems?.length) return 0;
        let totalNeeded = 0;
        let totalReady = 0;
        for (const item of orderItems) {
            totalNeeded += (Number(item.quantity) || 0);
            const product = currentItems.find(i => i.name === item.name || i.id === item.id);
            const currentStock = product ? ((product.initial || 0) + (product.purchases || 0) - (product.sales || 0)) : 0;
            totalReady += Math.min((Number(item.quantity) || 0), Math.max(0, currentStock));
        }
        return (totalReady / totalNeeded) * 100;
    };

    // --- NUEVO HELPER: CUMPLIMIENTO DE MATERIA PRIMA (MP) ---
    const getMaterialFulfillment = (orderItems) => {
        if (!orderItems?.length) return 100;
        let totalMet = 0;
        let countableItems = 0;

        orderItems.forEach(item => {
            const recipeList = recipes[item.id] || recipes[item.name] || recipes[item.name?.toLowerCase().trim()] || [];
            if (recipeList.length === 0) return;
            
            countableItems++;
            const yieldQty = Number(recipeList[0]?.yield_quantity) || 1;
            const itemMet = recipeList.every(ri => {
                const mp = currentItems.find(i => i.id === ri.rm_id || (i.name && i.name.toLowerCase().trim() === (ri.name || '').toLowerCase().trim()));
                const stock = mp ? ((mp.initial || 0) + (mp.purchases || 0) - (mp.sales || 0)) : 0;
                const needed = (Number(ri.qty) / yieldQty) * Number(item.quantity);
                return stock >= needed;
            });
            if (itemMet) totalMet++;
        });

        return countableItems > 0 ? (totalMet / countableItems) * 100 : 100;
    };

    const columns = [
        { id: 'pedido', label: 'Pedido', icon: <FileText size={18} />, inProcessStatuses: ['Pendiente', 'Pendiente de explosión de materiales'], finishedStatuses: ['En Compras'] },
        { id: 'compras', label: 'Compras', icon: <ShoppingCart size={18} />, inProcessStatuses: ['En Compras', 'En Compras (OC Generadas)'], finishedStatuses: ['En Producción'] },
        { id: 'produccion', label: 'Producción', icon: <ChefHat size={18} />, inProcessStatuses: [], finishedStatuses: [] },
        { id: 'despachos', label: 'Despachos', icon: <Truck size={18} />, inProcessStatuses: ['En Producción', 'En Producción (Iniciada)', 'En Despacho', 'Listo para Despacho', 'Despachado', 'En Compras (OC Generadas)'], finishedStatuses: ['Entregado'] },
        { id: 'finalizado', label: 'Entregado', icon: <CheckCircle size={18} />, inProcessStatuses: ['Entregado'], finishedStatuses: [] }
    ];

    // Helper: Determinar si un pedido debe desaparecer del Kanban (Política de 10 días tras entrega)
    const isTooOldForKanban = (order) => {
        const finalStatuses = ['entregado', 'finalizado', 'cobrado'];
        const statusLower = (order.status || '').toLowerCase();
        
        if (finalStatuses.includes(statusLower)) {
            const deliveryDate = order.delivered_at || order.last_status_at || order.created_at;
            if (deliveryDate) {
                const diffTime = Math.abs(new Date() - new Date(deliveryDate));
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays > 10) return true;
            }
        }
        return false;
    };

    const getColumnStats = (column) => {
        if (column.id === 'produccion') {
            const activeODPs = (productionOrders || []).filter(po => !po.completed_at).length;
            return { inProcess: activeODPs, finished: 0 };
        }
        let inProcess = 0;
        orders.filter(o => !isTooOldForKanban(o)).filter(o => showHidden || !o.kanban_hidden).forEach(o => {
            const statusLower = (o.status || '').toLowerCase();
            const inProcessLowers = column.inProcessStatuses.map(s => s.toLowerCase());
            let isIncluded = inProcessLowers.includes(statusLower);
            if (column.id === 'despachos' && (statusLower === 'en producción' || statusLower === 'en producción (iniciada)')) {
                isIncluded = true;
            }
            if (isIncluded) inProcess++;
        });
        return { inProcess, finished: 0 };
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#f8fafc', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem 2rem', background: deepTeal, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <LayoutGrid size={24} />
                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900' }}>TABLERO KANBAN HÍBRIDO (PEDIDOS + PLANTA)</h2>
                </div>
                <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '10px', borderRadius: '50%', cursor: 'pointer' }}>
                    <X size={24} />
                </button>
            </div>

            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', padding: '1.5rem', background: '#f1f5f9', overflow: 'hidden' }}>
                {columns.map(col => {
                    const stats = getColumnStats(col);
                    return (
                        <div key={col.id} style={{ background: 'rgba(255,255,255,0.8)', borderRadius: '16px', display: 'flex', flexDirection: 'column', minWidth: '250px', border: '1px solid rgba(0,0,0,0.05)', height: '100%', overflow: 'hidden' }}>
                            <div style={{ padding: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: deepTeal }}>
                                    {col.icon}
                                    <span style={{ fontWeight: '950', fontSize: '1rem', textTransform: 'uppercase' }}>{col.label}</span>
                                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <button 
                                            onClick={() => setShowHidden(!showHidden)}
                                            style={{ background: 'none', border: 'none', color: showHidden ? premiumSalmon : '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                                            title={showHidden ? "Ocultar archivados" : "Ver archivados"}
                                        >
                                            {showHidden ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                                        </button>
                                        <div style={{ background: `${deepTeal}15`, color: deepTeal, padding: '2px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '900' }}>
                                            {stats.inProcess}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ flex: 1, padding: '0.8rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {(() => {
                                    // Helper para priorizar: 1. Críticos, 2. Verdes (Accionables), 3. Antigüedad
                                    const sortItems = (a, b, type) => {
                                        // A. PRIORIDAD ABSOLUTA (CRíTICA)
                                        const prioA = (a.priority === 'CRÍTICA' || a.is_critical || a.is_priority) ? 1 : 0;
                                        const prioB = (b.priority === 'CRÍTICA' || b.is_critical || b.is_priority) ? 1 : 0;
                                        if (prioA !== prioB) return prioB - prioA;

                                        // B. ESTADO OPERATIVO (VERDES PRIMERO)
                                        if (type === 'odp') {
                                            const startedA = a.started_at ? 1 : 0;
                                            const startedB = b.started_at ? 1 : 0;
                                            if (startedA !== startedB) return startedB - startedA;
                                        } else {
                                            const readyA = getStockFulfillment(a.items || []) >= 100 ? 1 : 0;
                                            const readyB = getStockFulfillment(b.items || []) >= 100 ? 1 : 0;
                                            if (readyA !== readyB) return readyB - readyA;
                                        }

                                        // C. ANTIGÜEDAD (FIFO)
                                        const dateA = new Date(a.created_at || a.realDate || 0);
                                        const dateB = new Date(b.created_at || b.realDate || 0);
                                        return dateA - dateB;
                                    };
                                    if (col.id === 'produccion') {
                                        const plans = (productionOrders || []).filter(po => {
                                            const status = (po.status?.text || '').toLowerCase().trim();
                                            const isDone = status === 'finalizada' || !!po.completed_at;
                                            if (isDone) return false;

                                            // ── NUEVA GUARDIA DE MATERIALES ──
                                            // Solo permitimos que el Plan de Producción aparezca en la columna si hay MP para ejecutarlo
                                            const productRec = recipes[po.sku] || [];
                                            if (productRec.length === 0) return true; // Si no hay receta, asumimos auto-compra o proceso simple

                                            const requestedQty = Number(po.qty || po.finalQty || 0);
                                            // Asumimos rendimiento de la primera entrada si no hay otro dato
                                            const yieldQty = Number(productRec[0]?.yield_quantity) || 1; 

                                            const allMaterialsReady = productRec.every(ri => {
                                                const mpItem = currentItems.find(i => i.id === ri.rm_id || (i.name && i.name.toLowerCase().trim() === (ri.name || '').toLowerCase().trim()));
                                                const currentStock = mpItem ? ((mpItem.initial || 0) + (mpItem.purchases || 0) - (mpItem.sales || 0)) : 0;
                                                const needed = (Number(ri.qty) / yieldQty) * requestedQty;
                                                return currentStock >= needed;
                                            });

                                            return allMaterialsReady && (showHidden || !po.kanban_hidden);
                                        }).sort((a, b) => sortItems(a, b, 'odp'))
                                        .map(odp => {
                                            const isStarted = !!odp.started_at;
                                            return (
                                                <div key={`odp-${odp.dbId || odp.id}`} style={{ background: '#fff', padding: '1.2rem', borderRadius: '16px', borderLeft: `6px solid ${isStarted ? '#10b981' : '#ef4444'}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)', position: 'relative' }}>
                                                    {(odp.priority === 'CRÍTICA' || odp.is_critical) && (
                                                        <div style={{ position: 'absolute', top: '-8px', left: '12px', background: '#ef4444', color: '#fff', fontSize: '0.55rem', fontWeight: '900', padding: '2px 8px', borderRadius: '4px', zIndex: 1 }}>PRIORIDAD CRÍTICA</div>
                                                    )}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ fontSize: '0.6rem', fontWeight: '950', color: isStarted ? '#10b981' : '#ef4444' }}>PLAN DE PRODUCCIÓN</div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    console.log(`📦 Archiving ODP: ${odp.odp_number}`);
                                                                    saveOdp(odp.sku, { ...odp, kanban_hidden: true });
                                                                }}
                                                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                            <div style={{ fontSize: '0.85rem', fontWeight: '950', color: '#1e293b' }}>#{odp.odp_number || odp.id?.slice(-8)}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: '0.95rem', fontWeight: '900', color: deepTeal }}>{odp.sku}</div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: '900', color: institutionOcre }}>{odp.qty || odp.finalQty} UND</span>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isStarted ? '#10b981' : '#ef4444' }} />
                                                            <span style={{ fontSize: '0.6rem', fontWeight: '900', color: isStarted ? '#10b981' : '#ef4444' }}>{isStarted ? 'EN MARCHA' : 'PENDIENTE'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        });

                                        return [...plans];
                                    }

                                    if (col.id === 'compras') {
                                        const pendingInCompras = (productionOrders || []).filter(po => {
                                            const status = (po.status?.text || '').toLowerCase().trim();
                                            if (status === 'finalizada' || !!po.completed_at) return false;
                                            
                                            const productRec = recipes[po.sku] || [];
                                            if (productRec.length === 0) return false; 
                                            
                                            const requestedQty = Number(po.qty || po.finalQty || 0);
                                            const yieldQty = Number(productRec[0]?.yield_quantity) || 1; 

                                            const allMaterialsReady = productRec.every(ri => {
                                                const mpItem = currentItems.find(i => i.id === ri.rm_id || (i.name && i.name.toLowerCase().trim() === (ri.name || '').toLowerCase().trim()));
                                                const currentStock = mpItem ? ((mpItem.initial || 0) + (mpItem.purchases || 0) - (mpItem.sales || 0)) : 0;
                                                const needed = (Number(ri.qty) / yieldQty) * requestedQty;
                                                return currentStock >= needed;
                                            });
                                            return !allMaterialsReady;
                                        }).map(odp => (
                                            <div key={`odp-blocked-${odp.dbId || odp.id}`} style={{ background: 'rgba(239, 68, 68, 0.03)', padding: '1.2rem', borderRadius: '16px', borderLeft: `6px solid #ef4444`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ fontSize: '0.6rem', fontWeight: '950', color: '#ef4444' }}>ESPERANDO MATERIALES</div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: '950', color: '#1e293b' }}>#{odp.odp_number || odp.id?.slice(-8)}</div>
                                                </div>
                                                <div style={{ fontSize: '0.95rem', fontWeight: '900', color: deepTeal, marginTop: '4px' }}>{odp.sku}</div>
                                                <div style={{ marginTop: '8px', fontSize: '0.65rem', fontWeight: '900', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Clock size={12} /> BLOQUEADO POR INSUMOS
                                                </div>
                                            </div>
                                        ));

                                        const ordersInCompras = orders.filter(o => !isTooOldForKanban(o)).filter(o => {
                                            const statusLower = (o.status || '').toLowerCase();
                                            return col.inProcessStatuses.map(s => s.toLowerCase()).includes(statusLower) && (showHidden || !o.kanban_hidden);
                                        }).sort((a, b) => sortItems(a, b, 'sale'))
                                        .map(order => {
                                            const relatedPOs = (purchaseOrders || []).filter(po => {
                                                const related = (po.relatedOrders || po.related_orders || []).map(id => String(id).toUpperCase().trim());
                                                return related.includes(String(order.id).toUpperCase().trim()) || related.includes(String(order.dbId).toUpperCase().trim());
                                            });
                                            const allPaid = relatedPOs.length > 0 && relatedPOs.every(po => {
                                                const status = String(po.payment_status || po.paymentStatus || '').toLowerCase();
                                                return status === 'pagado';
                                            });
                                            const cardIdColor = allPaid ? '#10b981' : '#D4785A';
                                            
                                            return (
                                                <div key={order.dbId || order.id} onClick={() => setSelectedOrder({ ...order, stageName: col.label })} style={{ background: '#fff', padding: '1.2rem', borderRadius: '16px', borderLeft: `6px solid ${cardIdColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)', cursor: 'pointer' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: '950', color: '#1e293b' }}>#{order.id}</span>
                                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: cardIdColor }} />
                                                    </div>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: '900', color: '#1e293b' }}>{order.client}</div>
                                                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                                                        <span style={{ fontSize: '0.6rem', fontWeight: '900', background: 'rgba(2, 83, 87, 0.05)', color: deepTeal, padding: '2px 8px', borderRadius: '4px' }}>{order.items?.length || 0} SKU</span>
                                                        {allPaid && <span style={{ fontSize: '0.6rem', fontWeight: '900', background: '#10b98115', color: '#10b981', padding: '2px 8px', borderRadius: '4px' }}>PAGADO</span>}
                                                    </div>
                                                </div>
                                            );
                                        });

                                        return [...pendingInCompras, ...ordersInCompras];
                                    }

                                    return orders.filter(o => {
                                        const statusLower = (o.status || '').toLowerCase();
                                        const inProcessLowers = col.inProcessStatuses.map(s => s.toLowerCase());
                                        let isIncluded = inProcessLowers.includes(statusLower);
                                        if (col.id === 'despachos' && (statusLower === 'en producción' || statusLower === 'en producción (iniciada)')) {
                                            isIncluded = true;
                                        }
                                        
                                        return isIncluded && !isTooOldForKanban(o) && (showHidden || !o.kanban_hidden);
                                    }).sort((a, b) => sortItems(a, b, 'sale'))
                                    .map(order => {
                                        const statusLower = (order.status || '').toLowerCase().trim();
                                        const fulfillment = getStockFulfillment(order.items || []);
                                        const isReady = fulfillment >= 100;
                                        
                                        // Definir color de la tarjeta según estado
                                        let cardColor = col.id === 'despachos' ? (isReady ? '#10b981' : '#f59e0b') : (col.id === 'pedido' ? '#94a3b8' : (col.id === 'compras' ? '#D4785A' : '#10b981'));
                                        if (statusLower === 'pendiente' || statusLower === 'pendiente de explosión de materiales' || statusLower === 'pendiente para ejecución') cardColor = '#0ea5e9';

                                        return (
                                            <div key={order.dbId || order.id} onClick={() => setSelectedOrder({ ...order, stageName: col.label })} style={{ background: '#fff', padding: '1.2rem', borderRadius: '16px', borderLeft: `6px solid ${cardColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)', cursor: 'pointer', position: 'relative' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: '950', color: '#1e293b' }}>#{order.id}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {order.kanban_hidden ? (
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    updateOrder(order.dbId, { kanban_hidden: false });
                                                                }}
                                                                style={{ background: 'rgba(212, 120, 90, 0.1)', border: 'none', color: '#D4785A', padding: '4px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.6rem', fontWeight: '900' }}
                                                            >
                                                                RESTAURAR
                                                            </button>
                                                        ) : (
                                                            col.id === 'finalizado' && (
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (confirm('¿Deseas archivar este pedido del Kanban?')) {
                                                                            updateOrder(order.dbId, { kanban_hidden: true });
                                                                        }
                                                                    }}
                                                                    style={{ background: '#10b98115', border: 'none', color: '#10b981', padding: '4px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                >
                                                                    <CheckCircle2 size={16} />
                                                                </button>
                                                            )
                                                        )}
                                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: cardColor }} />
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: '900', color: '#1e293b' }}>{order.client}</div>
                                                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                                                    <span style={{ fontSize: '0.6rem', fontWeight: '900', background: 'rgba(2, 83, 87, 0.05)', color: deepTeal, padding: '2px 8px', borderRadius: '4px' }}>{order.items?.length || 0} SKU</span>
                                                    {(statusLower === 'pendiente' || statusLower === 'pendiente de explosión de materiales' || statusLower === 'pendiente para ejecución') && <span style={{ fontSize: '0.6rem', fontWeight: '900', background: '#0ea5e9', color: '#fff', padding: '2px 8px', borderRadius: '4px' }}>PENDIENTE EXPLOSIÓN</span>}
                                                    {(statusLower === 'en producción' || statusLower === 'en producción (iniciada)') && !isReady && (
                                                        <span style={{ fontSize: '0.6rem', fontWeight: '900', background: premiumSalmon + '20', color: premiumSalmon, padding: '2px 8px', borderRadius: '4px' }}>EN PRODUCCIÓN</span>
                                                    )}
                                                    {isReady && col.id === 'despachos' && <span style={{ fontSize: '0.6rem', fontWeight: '900', background: '#10b98115', color: '#10b981', padding: '2px 8px', borderRadius: '4px' }}>LISTO</span>}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedOrder && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
                    <div style={{ background: '#fff', width: '500px', borderRadius: '24px', padding: '2rem', position: 'relative' }}>
                        <button onClick={() => setSelectedOrder(null)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', border: 'none', background: '#f1f5f9', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>
                        <h3 style={{ margin: 0, color: deepTeal, fontWeight: '950' }}>{selectedOrder.client}</h3>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '700' }}>#{selectedOrder.id} - {selectedOrder.stageName}</p>
                        <div style={{ marginTop: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '12px' }}>
                            <h4 style={{ fontSize: '0.75rem', fontWeight: '900', marginBottom: '10px' }}>PRODUCTOS</h4>
                            {selectedOrder.items?.map(i => (
                                <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: '700', borderBottom: '1px solid #eee', padding: '4px 0' }}>
                                    <span>{i.name}</span>
                                    <span>x{i.quantity}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KanbanModal;
