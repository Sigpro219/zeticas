import React, { useState, useMemo, useEffect } from 'react';
import { useBusiness } from '../context/BusinessContext';
import {
    Truck,
    FileText,
    Download,
    CheckCircle2,
    AlertCircle,
    Package,
    FileCheck,
    ArrowRight,
    Search,
    Printer,
    Tags,
    Calendar,
    TrendingUp,
    Activity,
    Clock
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';

const Shipping = () => {
    const { orders, setOrders, items, setItems, refreshData } = useBusiness();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('month');
    const [customRange, setCustomRange] = useState({ from: '', to: '' });


    const zeticasInfo = {
        name: 'ZETICAs S.A.S.',
        nit: '901.234.567-8',
        address: 'Carrera 45 # 100-24, Bogotá, Colombia',
        phone: '312 456 7890',
        email: 'ventas@zeticas.com'
    };

    // Calculate inventory availability for an order
    const checkAvailability = (orderItems) => {
        for (const item of orderItems) {
            const inventoryItem = items.find(i => i.name === item.name || i.id === item.id);
            if (!inventoryItem) return false;
            const currentStock = (inventoryItem.initial || 0) + (inventoryItem.purchases || 0) - (inventoryItem.sales || 0);
            if (currentStock < item.quantity) return false;
        }
        return true;
    };

    // Calculate days since order
    const getDaysSince = (orderDate) => {
        const today = new Date();
        const created = new Date(orderDate);
        const diffTime = Math.abs(today - created);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const generateInvoiceNumber = () => {
        const lastNum = localStorage.getItem('zeticas_last_invoice_num') || '1000';
        const nextNum = parseInt(lastNum) + 1;
        localStorage.setItem('zeticas_last_invoice_num', nextNum.toString());
        return `FE-${nextNum}`;
    };

    const handleCreateInvoice = async (order) => {
        const invNum = generateInvoiceNumber();
        const invDate = new Date().toISOString();

        // Generate PDF
        const doc = new jsPDF();

        // Invoice Header
        doc.setFontSize(20);
        doc.setTextColor(26, 54, 54);
        doc.text('FACTURA DE VENTA', 14, 20);
        doc.setFontSize(10);
        doc.text(`No. ${invNum}`, 14, 28);
        doc.text(`Fecha Emisión: ${new Date().toLocaleDateString()}`, 14, 33);

        // Zeticas Info
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(zeticasInfo.name, 120, 20);
        doc.setFont('helvetica', 'normal');
        doc.text(`NIT: ${zeticasInfo.nit}`, 120, 25);
        doc.text(zeticasInfo.address, 120, 30);
        doc.text(`Tel: ${zeticasInfo.phone}`, 120, 35);

        doc.line(14, 45, 196, 45);

        // Client Info
        doc.setFont('helvetica', 'bold');
        doc.text('FACTURAR A:', 14, 55);
        doc.setFont('helvetica', 'normal');
        doc.text(order.client, 14, 62);
        doc.text('Bogotá, Colombia', 14, 67);
        doc.text(`Pedido Ref: ${order.id}`, 14, 72);

        // Table
        // Table
        const tableColumn = ["Ref / SKU", "Descripción", "Cantidad", "Valor Unit.", "Total"];
        const tableRows = (order.items || []).map(item => [
            item.sku || item.id || 'N/A',
            item.name,
            item.quantity,
            `$${(item.price || 0).toLocaleString()}`,
            `$${((item.price || 0) * (item.quantity || 0)).toLocaleString()}`
        ]);

        autoTable(doc, {
            startY: 80,
            head: [tableColumn],
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: [26, 54, 54] },
            margin: { left: 14, right: 14 }
        });

        const subtotal = order.amount || 0;
        const iva = subtotal * 0.19;
        const total = subtotal + iva;

        let finalY = (doc).lastAutoTable.finalY + 15;
        const labelX = 140;
        const valueX = 196;

        doc.setFontSize(10);
        doc.text(`Subtotal:`, labelX, finalY);
        doc.text(`$${subtotal.toLocaleString()}`, valueX, finalY, { align: 'right' });

        finalY += 8;
        doc.text(`IVA (19%):`, labelX, finalY);
        doc.text(`$${iva.toLocaleString()}`, valueX, finalY, { align: 'right' });

        finalY += 10;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(`TOTAL FACTURA:`, labelX, finalY);
        doc.text(`$${total.toLocaleString()}`, valueX, finalY, { align: 'right' });

        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text('Esta factura se asimila en todos sus efectos a una letra de cambio según el Art. 774 del Código de Comercio.', 105, 280, { align: 'center' });

        doc.save(`Factura_${invNum}_${order.client}.pdf`);

        // Update in Supabase
        await supabase.from('orders').update({
            invoice_number: invNum,
            status: 'Facturado'
        }).eq('order_number', order.id);

        await refreshData();
    };

    const handleGenerateLabel = async (order) => {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [100, 150]
        });

        const invoiceNum = order.invoiceNum;

        doc.setLineWidth(1);
        doc.rect(5, 5, 140, 90);

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('ZETICAS SAS - DESPACHOS', 10, 15);

        doc.setFontSize(10);
        doc.text('REMITENTE:', 10, 25);
        doc.setFont('helvetica', 'normal');
        doc.text(zeticasInfo.address, 10, 30);

        doc.line(10, 35, 140, 35);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('DESTINATARIO:', 10, 45);
        doc.setFontSize(14);
        doc.text(order.client.toUpperCase(), 10, 52);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Dirección: Carrera 7 # 12-45 (Distribuidor)', 10, 58);
        doc.text('Ciudad: Bogotá D.C.', 10, 63);
        doc.text(`Tel: 300 123 4567`, 10, 68);

        doc.rect(80, 70, 60, 20);
        doc.setFontSize(8);
        doc.text('No. PEDIDO:', 82, 75);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(order.id, 82, 85);

        if (invoiceNum) {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text('No. FACTURA:', 110, 75);
            doc.text(invoiceNum, 110, 85);
        }

        doc.save(`Etiqueta_${order.id}.pdf`);

        // Update in Supabase
        await supabase.from('orders').update({
            dispatched_at: new Date().toISOString(),
            status: 'Despachado'
        }).eq('order_number', order.id);

        await refreshData();
    };

    // Filter Logic
    const filteredOrders = useMemo(() => {
        let result = orders;

        // Date selection
        if (filterType === 'week') {
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            result = result.filter(o => new Date(o.date) >= lastWeek);
        } else if (filterType === 'month') {
            const thisMonth = new Date();
            thisMonth.setDate(1);
            result = result.filter(o => new Date(o.date) >= thisMonth);
        } else if (filterType === 'custom' && customRange.from && customRange.to) {
            result = result.filter(o => o.date >= customRange.from && o.date <= customRange.to);
        }

        // Search multitem
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            result = result.filter(o => {
                return (
                    o.id.toLowerCase().includes(q) ||
                    o.client.toLowerCase().includes(q) ||
                    (o.invoiceNum && o.invoiceNum.toLowerCase().includes(q))
                );
            });
        }

        return result.sort((a, b) => {
            const aFinalized = a.status === 'Despachado' || a.status === 'Entregado';
            const bFinalized = b.status === 'Despachado' || b.status === 'Entregado';
            if (aFinalized && !bFinalized) return 1;
            if (!aFinalized && bFinalized) return -1;
            return new Date(b.date) - new Date(a.date);
        });
    }, [orders, searchTerm, filterType, customRange]);

    // KPI Calculations
    const kpis = useMemo(() => {
        const stats = {
            totalOrders: filteredOrders.length,
            totalValue: filteredOrders.reduce((sum, o) => sum + o.amount, 0),
            despachados: 0,
            disponibles: 0,
            noDisponibles: 0,
            times: []
        };

        filteredOrders.forEach(o => {
            if (o.dispatchedAt) stats.despachados++;

            const isAvail = checkAvailability(o.items || []);
            if (isAvail) stats.disponibles++;
            else stats.noDisponibles++;

            if (o.invoiceNum) {
                // Assuming invoice date was date order was moved to this module
                const days = Math.ceil(Math.abs(new Date() - new Date(o.date)) / (1000 * 60 * 60 * 24));
                stats.times.push(days);
            }
        });

        const avg = stats.times.length > 0 ? (stats.times.reduce((a, b) => a + b, 0) / stats.times.length).toFixed(1) : 0;
        const max = stats.times.length > 0 ? Math.max(...stats.times) : 0;
        const min = stats.times.length > 0 ? Math.min(...stats.times) : 0;

        return { ...stats, avg, max, min };
    }, [filteredOrders, items]);

    return (
        <div className="shipping-container" style={{ padding: '0 1rem' }}>
            <header style={{ marginBottom: '2.5rem' }}>
                <h2 className="font-serif" style={{ fontSize: '2.2rem', color: 'var(--color-primary)', margin: 0 }}>Logística y Despachos</h2>
                <p style={{ color: '#666', fontSize: '0.95rem', marginTop: '0.4rem' }}>Optimización de flujo JIT y facturación automática.</p>
            </header>

            {/* Filter Bar */}
            <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '16px', border: '1px solid #f1f5f9', marginBottom: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.3rem', borderRadius: '10px' }}>
                    {['week', 'month', 'custom'].map(t => (
                        <button
                            key={t}
                            onClick={() => setFilterType(t)}
                            style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', background: filterType === t ? '#fff' : 'transparent', color: filterType === t ? 'var(--color-primary)' : '#64748b', boxShadow: filterType === t ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
                            {t === 'week' ? 'Despachos Semana' : t === 'month' ? 'Despachos Mes' : 'Personalizado'}
                        </button>
                    ))}
                </div>
                {filterType === 'custom' && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input type="date" value={customRange.from} onChange={e => setCustomRange({ ...customRange, from: e.target.value })} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }} />
                        <span style={{ color: '#94a3b8' }}>a</span>
                        <input type="date" value={customRange.to} onChange={e => setCustomRange({ ...customRange, to: e.target.value })} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }} />
                    </div>
                )}
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Busca por Pedido, Cliente, O.D.P o Factura"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.8rem', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.9rem' }}
                    />
                </div>
            </div>

            {/* KPI Dashboard */}
            <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.1fr 1.1fr', gap: '1rem', marginBottom: '2.5rem' }}>
                <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        <TrendingUp size={18} /> PEDIDOS / VALOR
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1a3636' }}>{kpis.totalOrders} <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>und</span></div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#059669' }}>${kpis.totalValue.toLocaleString()}</div>
                    </div>
                </div>

                <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        <Activity size={18} /> ESTADO PEDIDOS
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                        <div style={{ background: '#f0fdf4', padding: '0.5rem', borderRadius: '12px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: '800', whiteSpace: 'nowrap' }}>DESPACHADOS</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#16a34a' }}>{kpis.despachados}</div>
                        </div>
                        <div style={{ background: '#fffbeb', padding: '0.5rem', borderRadius: '12px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: '#d97706', fontWeight: '800', whiteSpace: 'nowrap' }}>DISPONIBLES</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#d97706' }}>{kpis.disponibles}</div>
                        </div>
                        <div style={{ background: '#fef2f2', padding: '0.5rem', borderRadius: '12px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: '#dc2626', fontWeight: '800', whiteSpace: 'nowrap' }}>NO DISP.</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#dc2626' }}>{kpis.noDisponibles}</div>
                        </div>
                    </div>
                </div>

                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        <Clock size={18} /> TIEMPO OPERACION
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                        <div style={{ background: '#fffbeb', padding: '0.5rem', borderRadius: '12px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: '#d97706', fontWeight: '800' }}>PROMEDIO</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#d97706' }}>{kpis.avg} <span style={{ fontSize: '0.6rem' }}>días</span></div>
                        </div>
                        <div style={{ background: '#fef2f2', padding: '0.5rem', borderRadius: '12px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: '#dc2626', fontWeight: '800' }}>MÁXIMO</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#dc2626' }}>{kpis.max}</div>
                        </div>
                        <div style={{ background: '#f0fdf4', padding: '0.5rem', borderRadius: '12px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: '800' }}>MÍNIMO</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#16a34a' }}>{kpis.min}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                            <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>PEDIDO</th>
                            <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>CLIENTE</th>
                            <th style={{ padding: '1.2rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>DIAS PEDIDO</th>
                            <th style={{ padding: '1.2rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>INV. DISPONIBLE</th>
                            <th style={{ padding: '1.2rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>CREAR FACTURA</th>
                            <th style={{ padding: '1.2rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>ETIQUETAS / DESPACHO</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.map(order => {
                            const isAvailable = checkAvailability(order.items || []);
                            const days = getDaysSince(order.date);

                            return (
                                <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '1.2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{order.id}</td>
                                    <td style={{ padding: '1.2rem' }}>
                                        <div style={{ fontWeight: '600' }}>{order.client}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{order.items.length} Referencias</div>
                                    </td>
                                    <td style={{ padding: '1.2rem', textAlign: 'center' }}>
                                        <div style={{ display: 'inline-flex', padding: '0.4rem 0.8rem', borderRadius: '12px', background: days > 5 ? '#fef2f2' : '#f8fafc', color: days > 5 ? '#dc2626' : '#64748b', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                            {days} Días
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.2rem', textAlign: 'center' }}>
                                        <div style={{ color: isAvailable ? '#16a34a' : '#dc2626', fontWeight: '800', fontSize: '0.7rem' }}>
                                            {isAvailable ? 'DISPONIBLE' : 'NO DISPONIBLE'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.2rem', textAlign: 'center' }}>
                                        {order.invoiceNum ? (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem' }}>
                                                <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{order.invoiceNum}</span>
                                                <button onClick={() => handleCreateInvoice(order)} style={{ background: '#f1f5f9', border: 'none', padding: '0.3rem', borderRadius: '6px', cursor: 'pointer', color: 'var(--color-primary)' }}><Download size={16} /></button>
                                            </div>
                                        ) : (
                                            <button disabled={!isAvailable} onClick={() => handleCreateInvoice(order)} style={{ background: isAvailable ? '#fff' : '#f8fafc', border: '1px solid #e2e8f0', padding: '0.5rem 0.8rem', borderRadius: '8px', cursor: isAvailable ? 'pointer' : 'not-allowed', color: isAvailable ? 'var(--color-primary)' : '#cbd5e1' }}>
                                                <FileText size={16} />
                                            </button>
                                        )}
                                    </td>
                                    <td style={{ padding: '1.2rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem' }}>
                                            <button onClick={() => handleGenerateLabel(order)} style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '0.5rem 0.8rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold' }}><Tags size={14} style={{ marginRight: '4px' }} /> ETIQUETA</button>
                                            {order.dispatchedAt && <span style={{ color: '#16a34a', fontWeight: '900', fontSize: '0.7rem' }}>DESPACHADO ✓</span>}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Shipping;
