import React from 'react';
import { 
    LayoutGrid, FileText, ShoppingCart, 
    ChefHat, Truck, DollarSign, CheckCircle, CheckCircle2,
    ArrowRight, AlertCircle, Clock, Zap, MessageCircle
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';

const KanbanSummary = ({ orders = [], productionOrders = [], items = [], recipes = {}, onOpenModal }) => {
    const { siteContent, purchaseOrders } = useBusiness();
    const deepTeal = "#025357";
    const premiumSalmon = "#D4785A";

    // Helper for finished goods fulfillment
    const getStockFulfillment = (orderItems) => {
        if (!orderItems?.length) return 0;
        let totalNeeded = 0;
        let totalReady = 0;
        for (const item of orderItems) {
            totalNeeded += (Number(item.quantity) || 0);
            const product = items.find(i => i.name === item.name || i.id === item.id);
            const currentStock = product ? ((product.initial || 0) + (product.purchases || 0) - (product.sales || 0)) : 0;
            totalReady += Math.min((Number(item.quantity) || 0), Math.max(0, currentStock));
        }
        return totalNeeded > 0 ? (totalReady / totalNeeded) * 100 : 0;
    };

    // --- NUEVO HELPER: CUMPLIMIENTO DE MATERIA PRIMA (MP) ---
    const getMaterialFulfillment = (orderItems) => {
        if (!orderItems?.length) return 100;
        let totalMet = 0;
        let countableItems = 0;

        orderItems.forEach(item => {
            const recipeList = recipes[item.id] || recipes[item.name] || recipes[item.name?.toLowerCase().trim()] || [];
            if (recipeList.length === 0) return; // Si no hay receta, no penaliza MP (ej: merch)
            
            countableItems++;
            const yieldQty = Number(recipeList[0]?.yield_quantity) || 1;
            const itemMet = recipeList.every(ri => {
                const mp = items.find(i => i.id === ri.rm_id || (i.name && i.name.toLowerCase().trim() === (ri.name || '').toLowerCase().trim()));
                const stock = mp ? ((mp.initial || 0) + (mp.purchases || 0) - (mp.sales || 0)) : 0;
                const needed = (Number(ri.qty) / yieldQty) * Number(item.quantity);
                return stock >= needed;
            });
            if (itemMet) totalMet++;
        });

        return countableItems > 0 ? (totalMet / countableItems) * 100 : 100;
    };

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
            const activeODPs = (productionOrders || []).filter(po => !po.isDone).length;
            return activeODPs;
        }
        let count = 0;
        orders.filter(o => !isTooOldForKanban(o)).forEach(o => {
            const statusLower = (o.status || '').toLowerCase();
            const inProcessLowers = (column.inProcessStatuses || []).map(s => s.toLowerCase());
            let isIncluded = inProcessLowers.includes(statusLower);
            if (column.id === 'despacho' && statusLower === 'en producción') {
                if (getStockFulfillment(o.items || []) >= 100) isIncluded = true;
            }
            if (isIncluded) count++;
        });
        return count;
    };

    const stages = [
        { id: 'pedido', label: 'Nuevos', status: 'Pendiente', inProcessStatuses: ['Pendiente'], icon: <FileText size={16} />, color: '#ef4444' },
        { id: 'compras', label: 'Compras', status: 'En Compras', inProcessStatuses: ['En Compras', 'En Compras (OC Generadas)'], icon: <ShoppingCart size={16} />, color: '#f59e0b' },
        { id: 'produccion', label: 'Producción', status: 'En Producción', inProcessStatuses: ['En Producción', 'En Producción (Iniciada)'], icon: <ChefHat size={16} />, color: premiumSalmon },
        { id: 'despacho', label: 'Despacho', status: 'En Despacho', inProcessStatuses: ['En Producción', 'En Producción (Iniciada)', 'En Despacho', 'Listo para Despacho', 'Despachado', 'En Compras (OC Generadas)'], icon: <Truck size={16} />, color: '#3b82f6' },
        { id: 'entregado', label: 'Entregado', status: 'Entregado', inProcessStatuses: ['Entregado'], icon: <CheckCircle size={16} />, color: '#10b981' }
    ];

    return (
        <div style={{ animation: 'fadeIn 0.3s ease-out', maxWidth: '1000px', margin: '0 auto', paddingBottom: '2rem' }}>
            
            {/* Cabecera Ultra-Limpia */}
            <div style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                marginBottom: '1.5rem', background: '#fff', padding: '1rem 1.5rem', 
                borderRadius: '20px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '900', color: deepTeal, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Dashboard Operativo
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>Vista rápida de tareas hoy</p>
                </div>
                <button 
                    onClick={onOpenModal}
                    style={{
                        background: deepTeal, color: '#fff', border: 'none', 
                        padding: '8px 20px', borderRadius: '12px', fontSize: '0.75rem', 
                        fontWeight: '800', cursor: 'pointer', display: 'flex', 
                        alignItems: 'center', gap: '8px', transition: 'all 0.2s',
                        boxShadow: `0 4px 12px ${deepTeal}30`
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <LayoutGrid size={16} /> ABRIR TABLERO
                </button>
            </div>

            {/* Fila de Métricas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                {stages.map((stage, idx) => {
                    const count = getColumnStats(stage);
                    return (
                        <div 
                            key={idx}
                            onClick={onOpenModal}
                            style={{
                                background: '#fff', padding: '1rem', borderRadius: '18px',
                                border: '1px solid rgba(0,0,0,0.05)', display: 'flex', 
                                alignItems: 'center', gap: '14px', cursor: 'pointer', transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = stage.color}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.05)'}
                        >
                            <div style={{ 
                                width: '36px', height: '36px', borderRadius: '10px', 
                                background: `${stage.color}10`, color: stage.color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {stage.icon}
                            </div>
                            <div>
                                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: deepTeal, lineHeight: 1 }}>{count}</div>
                                <div style={{ fontSize: '0.65rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>{stage.label}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Panel de Alertas Full-Width */}
            <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.2rem', color: '#ef4444' }}>
                    <AlertCircle size={18} />
                    <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Pedidos Pendientes de Acción
                    </h4>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(() => {
                        // Helper para priorizar: 1. Críticos, 2. Verdes (Accionables), 3. Antigüedad
                        const sortItems = (a, b) => {
                            // A. PRIORIDAD ABSOLUTA (CRíTICA)
                            const prioA = (a.priority === 'CRÍTICA' || a.is_critical || a.is_priority) ? 1 : 0;
                            const prioB = (b.priority === 'CRÍTICA' || b.is_critical || b.is_priority) ? 1 : 0;
                            if (prioA !== prioB) return prioB - prioA;

                            // B. ESTADO OPERATIVO (VERDES PRIMERO)
                            const readyA = getStockFulfillment(a.items || []) >= 100 ? 1 : 0;
                            const readyB = getStockFulfillment(b.items || []) >= 100 ? 1 : 0;
                            if (readyA !== readyB) return readyB - readyA;

                            // C. ANTIGÜEDAD (FIFO)
                            const dateA = new Date(a.created_at || a.realDate || 0);
                            const dateB = new Date(b.created_at || b.realDate || 0);
                            return dateA - dateB;
                        };

                        const actionRequiredOrders = orders.filter(o => !isTooOldForKanban(o)).filter(o => {
                            const statusLower = (o.status || '').toLowerCase().trim();
                            
                            // 1. Nuevos Pendientes o Pendientes de Explosión
                            if (statusLower === 'pendiente' || statusLower === 'pendiente de explosión de materiales') return true;

                            // 2. Compras (Acción: Recibir materiales)
                            if (statusLower === 'en compras' || statusLower === 'en compras (oc generadas)') return true;

                            // 3. Producción (Si tiene materiales al 100% -> Acción: Ejecutar)
                            if (statusLower === 'en producción' || statusLower === 'en producción (iniciada)') {
                                const fulfillment = getStockFulfillment(o.items || []);
                                if (fulfillment >= 100) return true;
                            }

                            // 4. Listos para Despacho (100% Fulfillment)
                            if (statusLower === 'en despacho' || statusLower === 'listo para despacho' || statusLower === 'despachado') {
                                const fulfillment = getStockFulfillment(o.items || []);
                                if (fulfillment >= 100) return true;
                            }

                            return false;
                        }).sort(sortItems);

                        if (actionRequiredOrders.length === 0) {
                            return (
                                <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                                    <CheckCircle2 size={40} style={{ margin: '0 auto 1rem', display: 'block', color: '#10b981' }} />
                                    <p style={{ fontSize: '0.8rem', fontWeight: '700' }}>Excelente, no hay pedidos urgentes por ahora.</p>
                                </div>
                            );
                        }

                        return actionRequiredOrders.slice(0, 8).map((order, idx) => {
                            const statusLower = (order.status || '').toLowerCase().trim();
                            const isReady = [
                                'en producción', 'en producción (iniciada)', 'en despacho', 
                                'listo para despacho', 'despachado', 'en compras (oc generadas)'
                            ].includes(statusLower) && getStockFulfillment(order.items || []) >= 100;

                            return (
                                <div 
                                    key={idx} 
                                    onClick={onOpenModal}
                                    style={{ 
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                        padding: '10px 16px', background: isReady ? 'rgba(239, 68, 68, 0.03)' : '#f8fafc', 
                                        borderRadius: '14px', 
                                        border: isReady ? '1px solid rgba(239, 68, 68, 0.1)' : '1px solid #f1f5f9',
                                        cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#fff'}
                                    onMouseLeave={e => e.currentTarget.style.background = isReady ? 'rgba(239, 68, 68, 0.03)' : '#f8fafc'}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {(() => {
                                            const relatedPOs = (purchaseOrders || []).filter(po => {
                                                const related = (po.relatedOrders || po.related_orders || []).map(id => String(id).toUpperCase().trim());
                                                return related.includes(String(order.id).toUpperCase().trim()) || related.includes(String(order.dbId).toUpperCase().trim());
                                            });
                                            const allPaid = relatedPOs.length > 0 && relatedPOs.every(po => {
                                                const status = String(po.payment_status || po.paymentStatus || '').toLowerCase();
                                                return status === 'pagado';
                                            });
                                            const dotColor = allPaid ? '#10b981' : (statusLower.includes('compras') ? '#f59e0b' : '#ef4444');
                                            return <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor }} />;
                                        })()}
                                        <span style={{ fontWeight: '800', fontSize: '0.85rem', color: '#1e293b' }}>
                                            #{order.id} — <span style={{ color: '#64748b' }}>{order.client}</span>
                                        </span>
                                        {(() => {
                                            const clientLower = (order.client || '').toLowerCase().trim();
                                            const isInternalStock = clientLower === 'stock interno' || (order.id && order.id.startsWith('INT-')) || order.is_internal;
                                            const fulfillment = getStockFulfillment(order.items || []);

                                            // 1. Pendientes de acción inicial
                                            if (statusLower === 'pendiente' || statusLower === 'pendiente de explosión de materiales') {
                                                return <span style={{ fontSize: '0.6rem', background: '#0ea5e9', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: '900', marginLeft: '8px' }}>PENDIENTE EXPLOSIÓN</span>;
                                            }

                                            const relatedPOs = (purchaseOrders || []).filter(po => {
                                                const related = (po.relatedOrders || []).map(id => String(id).toUpperCase().trim());
                                                return related.includes(String(order.id).toUpperCase().trim()) || related.includes(String(order.dbId).toUpperCase().trim());
                                            });
                                            const allPaid = relatedPOs.length > 0 && relatedPOs.every(po => {
                                                const status = String(po.payment_status || po.paymentStatus || '').toLowerCase();
                                                return status === 'pagado';
                                            });

                                            // 2. Gestión de Compras
                                            if (statusLower === 'en compras' || statusLower === 'en compras (oc generadas)') {
                                                if (allPaid) {
                                                    return <span style={{ fontSize: '0.6rem', background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: '900', marginLeft: '8px' }}>PAGADO - PENDIENTE RECIBIR</span>;
                                                }
                                                return <span style={{ fontSize: '0.6rem', background: '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: '900', marginLeft: '8px' }}>PENDIENTE RECIBIR</span>;
                                            }

                                            // 3. Gestión de Producción
                                            const matFulfillment = getMaterialFulfillment(order.items || []);
                                            if ((statusLower === 'en producción' || statusLower === 'en producción (iniciada)') && matFulfillment >= 100) {
                                                return <span style={{ fontSize: '0.6rem', background: premiumSalmon, color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: '900', marginLeft: '8px' }}>LISTO PARA PRODUCIR</span>;
                                            }
                                            if ((statusLower === 'en producción' || statusLower === 'en producción (iniciada)') && matFulfillment < 100) {
                                                return <span style={{ fontSize: '0.6rem', background: '#94a3b8', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: '900', marginLeft: '8px' }}>FALTA MATERIA PRIMA</span>;
                                            }

                                            // 4. Gestión de Despacho
                                            if (isReady) {
                                                return <span style={{ fontSize: '0.6rem', background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: '900', marginLeft: '8px' }}>LISTO PARA ENVÍO</span>;
                                            }

                                            if (isInternalStock && statusLower === 'pendiente') {
                                                const hasRecipe = (order.items || []).some(item => {
                                                    const name = (item.name || '').toLowerCase().trim();
                                                    return recipes[item.id] || recipes[name];
                                                });
                                                
                                                if (hasRecipe) {
                                                    return <span style={{ fontSize: '0.6rem', background: premiumSalmon, color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: '900', marginLeft: '8px' }}>PENDIENTE INICIAR PEDIDO</span>;
                                                } else {
                                                    return <span style={{ fontSize: '0.6rem', background: '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: '900', marginLeft: '8px' }}>PENDIENTE INICIAR COMPRA</span>;
                                                }
                                            }
                                            return null;
                                        })()}
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#94a3b8' }}>{order.items?.length || 0} SKU</span>
                                        <ArrowRight size={14} color="#e2e8f0" />
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>
            </div>
            
            {/* Radar de Membresía */}
            <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', marginTop: '1.5rem', borderBottom: `4px solid ${premiumSalmon}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: deepTeal }}>
                        <Zap size={18} fill="#D6BD98" color="#D6BD98" />
                        <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Radar de Membresía (Recurrentes)
                        </h4>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    {(() => {
                        const recurringOrders = orders.filter(o => o.isRecurring);
                        if (recurringOrders.length === 0) return <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>No hay pedidos recurrentes activos hoy.</p>;

                        return recurringOrders.map(order => {
                            const template = "Hola {name}, estamos preparando tu pedido de {plan}. Confirmamos tus items: {items}. Total: {total}.";
                            const itemsStr = (order.items || []).map(i => `${i.quantity} ${i.name}`).join(', ');
                            const encodedMsg = encodeURIComponent(
                                template
                                    .replace('{name}', order.client || '')
                                    .replace('{plan}', order.membership_plan || 'Suscripción')
                                    .replace('{items}', itemsStr)
                                    .replace('{total}', `$${(order.amount || 0).toLocaleString()}`)
                            );
                            const waUrl = `https://wa.me/${order.shipping_phone?.replace(/\D/g, '') || ''}?text=${encodedMsg}`;

                            return (
                                <div key={order.id} style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '18px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: '900', color: deepTeal }}>#{order.id}</span>
                                        <span style={{ fontSize: '0.6rem', background: '#D6BD98', color: deepTeal, padding: '2px 8px', borderRadius: '4px', fontWeight: '900' }}>
                                            {order.membership_plan || 'MIEMBRO'}
                                        </span>
                                    </div>
                                    <h5 style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: '#1e293b' }}>{order.client}</h5>
                                    <p style={{ margin: '0 0 15px 0', fontSize: '0.7rem', color: '#64748b' }}>Frecuencia: {order.frequency || 'Mensual'}</p>
                                    
                                    <a 
                                        href={waUrl} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        style={{ 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            width: '100%', padding: '10px', background: '#10b981', color: '#fff',
                                            borderRadius: '12px', fontSize: '0.7rem', fontWeight: '900', textDecoration: 'none',
                                            boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)'
                                        }}
                                    >
                                        <MessageCircle size={14} /> ENVIAR RECORDATORIO
                                    </a>
                                </div>
                            );
                        });
                    })()}
                </div>
            </div>


            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default KanbanSummary;
