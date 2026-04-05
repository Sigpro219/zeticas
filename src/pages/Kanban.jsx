import React from 'react';
import { 
    LayoutGrid, FileText, ShoppingCart, 
    ChefHat, Truck, DollarSign, CheckCircle2,
    ArrowRight, AlertCircle, Clock
} from 'lucide-react';

const KanbanSummary = ({ orders = [], onOpenModal }) => {
    const deepTeal = "#025357";
    const premiumSalmon = "#D4785A";

    const stages = [
        { label: 'Nuevos', status: 'Pendiente', icon: <FileText size={16} />, color: '#ef4444' },
        { label: 'Compras', status: 'En Compras', icon: <ShoppingCart size={16} />, color: '#f59e0b' },
        { label: 'Producción', status: 'En Producción', icon: <ChefHat size={16} />, color: premiumSalmon },
        { label: 'Despacho', status: 'Listo para Despacho', icon: <Truck size={16} />, color: '#3b82f6' },
        { label: 'Cartera', status: 'Entregado', icon: <DollarSign size={16} />, color: '#10b981' }
    ];

    const getCountByStatus = (status) => orders.filter(o => o.status === status).length;

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
                    const count = getCountByStatus(stage.status);
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
                    {orders.filter(o => o.status === 'Pendiente').slice(0, 8).map((order, idx) => (
                        <div 
                            key={idx} 
                            onClick={onOpenModal}
                            style={{ 
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                padding: '10px 16px', background: '#f8fafc', borderRadius: '14px', 
                                border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#fff'}
                            onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                                <span style={{ fontWeight: '800', fontSize: '0.85rem', color: '#1e293b' }}>
                                    #{order.id} — <span style={{ color: '#64748b' }}>{order.client}</span>
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#94a3b8' }}>{order.items?.length || 0} ítems</span>
                                <ArrowRight size={14} color="#e2e8f0" />
                            </div>
                        </div>
                    ))}
                    
                    {orders.filter(o => o.status === 'Pendiente').length === 0 && (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                            <CheckCircle2 size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                            <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>Excelente, no hay pedidos pendientes por ahora.</div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default KanbanSummary;
