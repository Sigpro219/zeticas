import React, { useState } from 'react';
import { 
    X, FileText, ShoppingCart, ChefHat, Truck, 
    DollarSign, Info, Package, Calendar, LayoutGrid 
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';

const KanbanModal = ({ isOpen, onClose, orders = [], items = [] }) => {
    const { purchaseOrders, updateOrder, refreshData } = useBusiness();
    const [selectedOrder, setSelectedOrder] = useState(null);

    if (!isOpen) return null;

    // Premium Branding Colors
    const deepTeal = "#025357";
    const institutionOcre = "#D6BD98";
    const premiumSalmon = "#D4785A";

    const columns = [
        {
            id: 'pedido',
            label: 'Pedido',
            icon: <FileText size={18} />,
            inProcessStatuses: ['Pendiente'],
            finishedStatuses: ['En Compras', 'En Compras (OC Generadas)']
        },
        {
            id: 'compras',
            label: 'Compras',
            icon: <ShoppingCart size={18} />,
            inProcessStatuses: ['En Compras', 'En Compras (OC Generadas)'],
            finishedStatuses: ['En Producción']
        },
        {
            id: 'produccion',
            label: 'Producción',
            icon: <ChefHat size={18} />,
            inProcessStatuses: ['En Producción', 'En Producción (Iniciada)'],
            finishedStatuses: ['Listo para Despacho']
        },
        {
            id: 'despachos',
            label: 'Despachos',
            icon: <Truck size={18} />,
            inProcessStatuses: ['Listo para Despacho', 'Despachado'],
            finishedStatuses: ['Entregado']
        },
        {
            id: 'cartera',
            label: 'Cartera',
            icon: <DollarSign size={18} />,
            inProcessStatuses: ['Entregado'],
            finishedStatuses: ['Pagado']
        },
        {
            id: 'finalizado',
            label: 'Finalizado',
            icon: <Package size={18} />,
            inProcessStatuses: ['Pagado'],
            finishedStatuses: []
        }
    ];

    const getColumnStats = (column) => {
        let inProcess = 0;
        let finished = 0;
        orders.forEach(o => {
            if (column.inProcessStatuses.includes(o.status)) {
                inProcess++;
            } else if (column.finishedStatuses.includes(o.status)) {
                finished++;
            }
        });
        return { inProcess, finished };
    };

    const handleDragStart = (e, orderId) => {
        e.dataTransfer.setData('orderDbId', orderId);
    };

    const handleDrop = async (e, column) => {
        e.preventDefault();
        const dbId = e.dataTransfer.getData('orderDbId');
        if (!dbId) return;
        const newStatus = column.inProcessStatuses[0];
        try {
            const res = await updateOrder(dbId, { status: newStatus });
            if (res.success) await refreshData();
        } catch (err) {
            console.error("Error updating order via DND:", err);
        }
    };

    const StatusTag = ({ color, text }) => (
        <div style={{
            background: `${color}15`, color, fontSize: '0.65rem', fontWeight: '900',
            padding: '4px 10px', borderRadius: '50px', border: `1px solid ${color}30`,
            textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '6px'
        }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
            {text}
        </div>
    );

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, width: '100vw', height: '100vh',
            background: '#f8fafc',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeIn 0.3s ease-out'
        }}>
            {/* Header del Modal */}
            <div style={{
                padding: '1rem 2rem', background: deepTeal, color: '#fff',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '12px' }}>
                        <LayoutGrid size={24} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', letterSpacing: '0.5px' }}>TABLERO KANBAN OPERATIVO</h2>
                        <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.8, textTransform: 'uppercase' }}>Vista de flujo completo de procesos</p>
                    </div>
                </div>
                <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '10px', borderRadius: '50%', cursor: 'pointer' }}>
                    <X size={24} />
                </button>
            </div>

            {/* Cuerpos de Columnas */}
            <div style={{
                flex: 1, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)',
                gap: '1rem', padding: '1.5rem', overflowX: 'auto', background: '#f1f5f9'
            }}>
                {columns.map(col => {
                    const stats = getColumnStats(col);
                    return (
                        <div key={col.id} onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, col)} style={{ background: 'rgba(255,255,255,0.8)', borderRadius: '16px', display: 'flex', flexDirection: 'column', minWidth: '250px', border: '1px solid rgba(0,0,0,0.05)', height: '100%' }}>
                            <div style={{ padding: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: deepTeal, marginBottom: '8px' }}>
                                    {col.icon}
                                    <span style={{ fontWeight: '900', fontSize: '0.85rem', textTransform: 'uppercase' }}>{col.label}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <div style={{ flex: 1, background: '#fee2e2', color: '#ef4444', fontSize: '0.6rem', fontWeight: '900', padding: '2px 6px', borderRadius: '4px', textAlign: 'center' }}>
                                        IP: {stats.inProcess}
                                    </div>
                                    <div style={{ flex: 1, background: '#dcfce7', color: '#16a34a', fontSize: '0.6rem', fontWeight: '900', padding: '2px 6px', borderRadius: '4px', textAlign: 'center' }}>
                                        FIN: {stats.finished}
                                    </div>
                                </div>
                            </div>
                            <div style={{ flex: 1, padding: '0.8rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {orders.filter(o => col.inProcessStatuses.includes(o.status)).map(order => (
                                    <div
                                        key={order.id} draggable onDragStart={e => handleDragStart(e, order.dbId)}
                                        onClick={() => setSelectedOrder({ ...order, stageName: col.label })}
                                        style={{ background: '#fff', padding: '0.8rem', borderRadius: '10px', borderLeft: `3px solid ${deepTeal}`, cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                                    >
                                        <div style={{ fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8' }}>#{order.id}</div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1e293b', margin: '4px 0' }}>{order.client}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Info Modal Interno */}
            {selectedOrder && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1rem' }}>
                    <div style={{ background: '#fff', width: '500px', maxWidth: '95vw', borderRadius: '24px', padding: '2rem', position: 'relative' }}>
                        <button onClick={() => setSelectedOrder(null)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', border: 'none', background: '#f1f5f9', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>
                        <h3 style={{ margin: 0, fontSize: '1.5rem', color: deepTeal, fontWeight: '900' }}>#{selectedOrder.id} - {selectedOrder.client}</h3>
                        <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '0.5rem' }}>Etapa actual: <strong>{selectedOrder.stageName}</strong></p>
                        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px' }}>
                            <h4 style={{ fontSize: '0.8rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 10px' }}>Productos</h4>
                            {selectedOrder.items?.map(i => <div key={i.id} style={{ fontSize: '0.9rem', fontWeight: '600' }}>{i.name} x{i.quantity}</div>)}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
            `}</style>
        </div>
    );
};

export default KanbanModal;
