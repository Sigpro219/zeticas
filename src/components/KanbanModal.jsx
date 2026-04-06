import React, { useState } from 'react';
import { 
    X, FileText, ShoppingCart, ChefHat, Truck, 
    DollarSign, Info, Package, Calendar, LayoutGrid 
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';

const KanbanModal = ({ isOpen, onClose, orders = [], items = [] }) => {
    const { recipes, items: contextItems, updateOrder, refreshData, clients, leads } = useBusiness();
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [hoveredOrder, setHoveredOrder] = useState(null);
    const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

    if (!isOpen) return null;

    // Use items from context if not provided via props
    const currentItems = items.length > 0 ? items : contextItems;

    // Combinar bases de datos para búsqueda
    const allContacts = [...(clients || []), ...(leads || [])];

    // Premium Branding Colors
    const deepTeal = "#025357";

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
                gap: '1rem', padding: '1.5rem', background: '#f1f5f9',
                overflow: 'hidden' // Removiendo el "slider" o scroll lateral
            }}>
                {columns.map(col => {
                    const stats = getColumnStats(col);
                    return (
                                <div key={col.id} style={{ background: 'rgba(255,255,255,0.8)', borderRadius: '16px', display: 'flex', flexDirection: 'column', minWidth: '250px', border: '1px solid rgba(0,0,0,0.05)', height: '100%', overflow: 'hidden' }}>
                            <div style={{ padding: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: deepTeal }}>
                                    {col.icon}
                                    <span style={{ fontWeight: '950', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{col.label}</span>
                                    <div style={{ marginLeft: 'auto', background: `${deepTeal}15`, color: deepTeal, padding: '2px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '900' }}>
                                        {stats.inProcess}
                                    </div>
                                </div>
                            </div>
                            <div style={{ flex: 1, padding: '0.8rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {orders.filter(o => col.inProcessStatuses.includes(o.status)).map(order => {
                                    // 1. Lógica de Alerta Operativa (Stock y Entrada)
                                    const isNew = order.status === 'Pendiente';
                                    const needsMP = order.status === 'En Compras' || order.status === 'En Producción';
                                    let hasMissingMaterials = isNew; // Rojo por defecto si es nuevo (requiere acción)
                                    
                                    if (needsMP && recipes && currentItems) {
                                        order.items?.forEach(item => {
                                            const recipe = recipes[item.name] || [];
                                            recipe.forEach(ing => {
                                                const mat = currentItems.find(i => i.id === ing.rm_id || i.name === ing.name);
                                                const stock = (mat?.initial || 0) + (mat?.purchases || 0) - (mat?.sales || 0);
                                                const multiplier = (Number(item.quantity) || 0) / (mat?.batch_size || 1);
                                                if (stock < (Number(ing.qty) * multiplier)) hasMissingMaterials = true;
                                            });
                                        });
                                    }

                                    // 2. Lógica del "Cronómetro" de Gestión (Lead Time)
                                    const getTimeInStage = (lastAt) => {
                                        if (!lastAt) return 'Nuevo';
                                        const diffMs = new Date() - new Date(lastAt);
                                        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                                        const diffMin = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                                        if (diffHrs > 0) return `Hace ${diffHrs}h ${diffMin}m`;
                                        return `Hace ${diffMin}m`;
                                    };

                                    const isAutoMoved = order.auto_moved_at && (new Date() - new Date(order.auto_moved_at) < 86400000);
                                    const isStuck = order.last_status_at && (new Date() - new Date(order.last_status_at) > 86400000);

                                    return (
                                        <div
                                            key={order.dbId || order.id} 
                                            onClick={() => setSelectedOrder({ ...order, stageName: col.label })}
                                            className="kanban-card"
                                            style={{ 
                                                background: '#fff', padding: '0.6rem 0.8rem', borderRadius: '12px', 
                                                border: `2px solid ${hasMissingMaterials ? '#ef4444' : 'rgba(0,0,0,0.05)'}`,
                                                borderLeft: `6px solid ${hasMissingMaterials ? '#ef4444' : deepTeal}`, 
                                                cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                                                position: 'relative', transition: 'all 0.2s',
                                                minHeight: '65px'
                                            }}
                                            onMouseEnter={e => {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const tooltipWidth = 270;
                                                const windowWidth = window.innerWidth;
                                                
                                                let xPos = rect.right + 10;
                                                if (xPos + tooltipWidth > windowWidth) {
                                                    xPos = rect.left - tooltipWidth - 10;
                                                }

                                                setHoveredOrder(order);
                                                setHoverPos({ x: xPos, y: rect.top });
                                            }}
                                            onMouseLeave={() => setHoveredOrder(null)}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                <div style={{ fontSize: '0.6rem', fontWeight: '950', color: '#94a3b8' }}>#{order.id}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <div style={{ fontSize: '0.6rem', fontWeight: '900', color: isStuck ? '#ea580c' : '#bdc3c7' }}>
                                                        {getTimeInStage(order.last_status_at)}
                                                    </div>
                                                    <div style={{
                                                        width: '8px', height: '8px', borderRadius: '50%',
                                                        background: hasMissingMaterials ? '#ef4444' : '#10b981',
                                                        boxShadow: hasMissingMaterials ? '0 0 5px #ef4444' : 'none',
                                                        animation: (hasMissingMaterials && col.id === 'produccion') || isAutoMoved ? 'blink 1s infinite' : 'none'
                                                    }} />
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '0.82rem', fontWeight: '850', color: '#1e293b', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {order.client}
                                            </div>
                                        </div>
                                    );
                                })}
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
                        
                        <div style={{ borderLeft: `8px solid ${deepTeal}`, paddingLeft: '1.2rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.5rem', color: deepTeal, fontWeight: '950' }}>#{selectedOrder.id} - {selectedOrder.client}</h3>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0', textTransform: 'uppercase', fontWeight: '700' }}>{selectedOrder.stageName}</p>
                                {(() => {
                                    const o = selectedOrder;
                                    
                                    // Función para normalizar texto (quitar tildes y espacios)
                                    const normalize = (str) => 
                                        str?.toLowerCase()
                                           .normalize("NFD")
                                           .replace(/[\u0300-\u036f]/g, "")
                                           .trim() || "";

                                    const targetName = normalize(o.client);
                                    
                                    // Búsqueda inteligente (Fuzzy Match): German Higuera -> German Higuera Duran
                                    const clientInfo = allContacts?.find(c => {
                                        const cName = normalize(c.name);
                                        return cName === targetName || 
                                               cName.includes(targetName) || 
                                               targetName.includes(cName) ||
                                               c.id === (o.clientId || o.client_id);
                                    });
                                    
                                    // Lógica de Prioridad: 1. CRM Maestro, 2. Datos de OC, 3. "No registrado"
                                    const finalCity = clientInfo?.city || o.shipping_city || o.city || 'Ciudad no registrada';
                                    const finalAddress = clientInfo?.address || o.shipping_address || o.address || 'Sin dirección registrada';
                                    const finalPhone = clientInfo?.phone || o.shipping_phone || o.phone || 'Sin teléfono registrado';
                                    const finalEmail = clientInfo?.email || o.customer_email || o.email || 'No registrado';

                                    return (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginTop: '2rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <label style={{ fontSize: '0.65rem', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase' }}>Información del Cliente</label>
                                                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b' }}>
                                                    {finalCity}
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                                    {finalAddress}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                    {finalPhone}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <label style={{ fontSize: '0.65rem', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase' }}>Trazabilidad Operativa</label>
                                                <div style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: '600' }}>
                                                    Creado: {o.realDate || o.date || 'N/A'}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                    Email: {finalEmail}
                                                </div>
                                                <div style={{ fontSize: '0.6rem', color: '#cbd5e1', fontStyle: 'italic', marginTop: '5px' }}>
                                                    Sistema: Link {clientInfo ? 'Exitoso ✅' : 'No encontrado ❌'}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                        </div>

                        <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                            <h4 style={{ fontSize: '0.8rem', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Package size={16} /> Detalle de Productos
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {selectedOrder.items?.map(i => (
                                    <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: '800', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                                        <span>{i.name}</span>
                                        <span style={{ color: deepTeal }}>x{i.quantity}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tooltip Maestro - Prioridad Z Máxima */}
            {hoveredOrder && (
                <div style={{
                    position: 'fixed',
                    top: hoverPos.y,
                    left: hoverPos.x,
                    width: '260px',
                    background: '#0f172a',
                    color: '#fff',
                    padding: '16px',
                    borderRadius: '16px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                    zIndex: 999999, // Jerarquía Suprema
                    pointerEvents: 'none',
                    border: '1px solid rgba(255,255,255,0.15)',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '950', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '6px', marginBottom: '10px', color: '#10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        DETALLE DEL PEDIDO
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                        {hoveredOrder.items?.map((item, idx) => (
                            <div key={idx} style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', gap: '15px' }}>
                                <span style={{ opacity: 0.9, fontWeight: '600' }}>{item.name.toUpperCase()}</span>
                                <span style={{ fontWeight: '950', color: '#10b981' }}>x{item.quantity}</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px', fontSize: '0.65rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={10} /> 
                        MOVIDO: {hoveredOrder.last_status_at ? new Date(hoveredOrder.last_status_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Reciente'}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
                @keyframes blink { 
                    0% { opacity: 1; transform: scale(1); box-shadow: 0 0 15px rgba(239, 68, 68, 0.8); } 
                    50% { opacity: 0.4; transform: scale(0.85); box-shadow: 0 0 5px rgba(239, 68, 68, 0.2); } 
                    100% { opacity: 1; transform: scale(1); box-shadow: 0 0 15px rgba(239, 68, 68, 0.8); } 
                }

                .kanban-card { position: relative; }
                .kanban-card:hover { transform: translateY(-2px); }
            `}</style>
        </div>
    );
};

export default KanbanModal;
