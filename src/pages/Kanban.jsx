import React from 'react';
import { 
    LayoutGrid, FileText, ShoppingCart, 
    ChefHat, Truck, DollarSign, CheckCircle, CheckCircle2,
    ArrowRight, AlertCircle, Clock
} from 'lucide-react';

const KanbanSummary = ({ orders = [], productionOrders = [], items = [], recipes = {}, onOpenModal }) => {
    const deepTeal = "#025357";
    const premiumSalmon = "#D4785A";

    // Helper for stock fulfillment (Same logic as KanbanModal)
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

    const getColumnStats = (column) => {
        if (column.id === 'produccion') {
            const activeODPs = (productionOrders || []).filter(po => {
                const status = (po.status?.text || '').toLowerCase().trim();
                return status !== 'finalizada' && !po.completed_at;
            }).length;
            return activeODPs;
        }
        let count = 0;
        orders.forEach(o => {
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
                        const actionRequiredOrders = orders.filter(o => {
                            const statusLower = (o.status || '').toLowerCase();
                            
                            // 1. Nuevos Pendientes
                            if (statusLower === 'pendiente') return true;

                            // 2. Listos para Despacho (100% Fulfillment) que no han sido entregados
                            const inDespachoStage = [
                                'en producción', 'en producción (iniciada)', 'en despacho', 
                                'listo para despacho', 'despachado', 'en compras (oc generadas)'
                            ].includes(statusLower);
                            
                            if (inDespachoStage) {
                                const fulfillment = getStockFulfillment(o.items || []);
                                if (fulfillment >= 100) return true;
                            }

                            return false;
                        });

                        if (actionRequiredOrders.length === 0) {
                            return (
                                <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                                    <CheckCircle2 size={40} style={{ margin: '0 auto 1rem', display: 'block', color: '#10b981' }} />
                                    <p style={{ fontSize: '0.8rem', fontWeight: '700' }}>Excelente, no hay pedidos urgentes por ahora.</p>
                                </div>
                            );
                        }

                        return actionRequiredOrders.slice(0, 8).map((order, idx) => {
                            const statusLower = (order.status || '').toLowerCase();
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
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                                        <span style={{ fontWeight: '800', fontSize: '0.85rem', color: '#1e293b' }}>
                                            #{order.id} — <span style={{ color: '#64748b' }}>{order.client}</span>
                                        </span>
                                        {isReady && <span style={{ fontSize: '0.6rem', background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: '900' }}>LISTO PARA ENVÍO</span>}
                                        {(() => {
                                            const clientLower = (order.client || '').toLowerCase().trim();
                                            const isInternalStock = clientLower === 'stock interno' || (order.id && order.id.startsWith('INT-')) || order.is_internal;
                                            
                                            if (isInternalStock && statusLower === 'pendiente') {
                                                const hasRecipe = (order.items || []).some(item => {
                                                    const name = (item.name || '').toLowerCase().trim();
                                                    return recipes[item.id] || recipes[name]; // Check by ID or Name
                                                });
                                                
                                                if (hasRecipe) {
                                                    return <span style={{ fontSize: '0.6rem', background: premiumSalmon, color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: '900' }}>PENDIENTE INICIAR PEDIDO</span>;
                                                } else {
                                                    return <span style={{ fontSize: '0.6rem', background: '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: '900' }}>PENDIENTE INICIAR COMPRA</span>;
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

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default KanbanSummary;
