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
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);
    const { orders, items, refreshData } = useBusiness();
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
    const checkAvailability = React.useCallback((orderItems) => {
        for (const item of orderItems) {
            const inventoryItem = items.find(i => i.name === item.name || i.id === item.id);
            if (!inventoryItem) return false;
            const currentStock = (inventoryItem.initial || 0) + (inventoryItem.purchases || 0) - (inventoryItem.sales || 0);
            if (currentStock < item.quantity) return false;
        }
        return true;
    }, [items]);

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
    }, [filteredOrders, checkAvailability]);

    // Premium Style Constants
    const deepTeal = "#025357";
    const institutionOcre = "#D6BD98";
    const premiumSalmon = "#D4785A";
    const glassWhite = "rgba(255, 255, 255, 0.85)";

    return (
        <div style={{ 
            padding: '0 0.5rem', 
            background: 'transparent', 
            minHeight: '100vh',
            animation: 'fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
            {/* Header Section Removed - Handled by Gestion.jsx */}
            <div style={{ marginBottom: '2rem' }} />

            {/* Filter Section - Premium Glass Search & Dates */}
            <div style={{ 
                display: 'flex', 
                gap: '2rem', 
                marginBottom: '4rem', 
                alignItems: 'center',
                background: glassWhite,
                backdropFilter: 'blur(10px)',
                padding: '1.8rem 2.5rem',
                borderRadius: '40px',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.03)',
                animation: 'fadeUp 0.6s ease-out'
            }}>
                <div style={{ display: 'flex', background: 'rgba(2, 83, 87, 0.05)', padding: '6px', borderRadius: '22px', border: '1px solid rgba(2, 83, 87, 0.08)' }}>
                    {['week', 'month', 'custom'].map(t => (
                        <button
                            key={t}
                            onClick={() => setFilterType(t)}
                            style={{ 
                                padding: '0.9rem 2rem', 
                                border: 'none', 
                                borderRadius: '18px', 
                                fontSize: '0.8rem', 
                                fontWeight: '900', 
                                cursor: 'pointer', 
                                background: filterType === t ? deepTeal : 'transparent', 
                                color: filterType === t ? '#fff' : '#64748b', 
                                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                boxShadow: filterType === t ? '0 8px 20px rgba(2, 83, 87, 0.2)' : 'none'
                            }}>
                            {t === 'week' ? 'Semana' : t === 'month' ? 'Mes' : 'Personalizado'}
                        </button>
                    ))}
                </div>
                
                {filterType === 'custom' && (
                    <div style={{ 
                        display: 'flex', 
                        gap: '1.2rem', 
                        alignItems: 'center', 
                        background: '#fff', 
                        padding: '0 1.8rem', 
                        height: '64px',
                        borderRadius: '24px', 
                        border: '1px solid #f1f5f9',
                        animation: 'slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.03)'
                    }}>
                        <input type="date" value={customRange.from} onChange={e => setCustomRange({ ...customRange, from: e.target.value })} style={{ border: 'none', background: 'transparent', fontSize: '0.95rem', fontWeight: '900', color: deepTeal, outline: 'none', cursor: 'pointer' }} />
                        <ArrowRight size={18} color="#94a3b8" />
                        <input type="date" value={customRange.to} onChange={e => setCustomRange({ ...customRange, to: e.target.value })} style={{ border: 'none', background: 'transparent', fontSize: '0.95rem', fontWeight: '900', color: deepTeal, outline: 'none', cursor: 'pointer' }} />
                    </div>
                )}

                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={24} style={{ position: 'absolute', left: '1.8rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', opacity: 0.6 }} />
                    <input
                        type="text"
                        placeholder="Buscar por cliente, pedido o referencia de despacho..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ 
                            width: '100%', 
                            padding: '1.8rem 1.8rem 1.8rem 4.5rem', 
                            borderRadius: '30px', 
                            border: '1px solid #f1f5f9', 
                            background: '#fff',
                            outline: 'none', 
                            fontSize: '1rem',
                            fontWeight: '900',
                            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                            color: '#1e293b',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
                            letterSpacing: '-0.2px'
                        }}
                        onFocus={e => { e.target.style.borderColor = deepTeal; e.target.style.boxShadow = `0 15px 40px ${deepTeal}10`; e.target.style.transform = 'translateY(-2px)'; }}
                        onBlur={e => { e.target.style.borderColor = '#f1f5f9'; e.target.style.boxShadow = '0 10px 30px rgba(0,0,0,0.02)'; e.target.style.transform = 'translateY(0)'; }}
                    />
                </div>
            </div>

            {/* Premium Logistic Command KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.1fr 1fr', gap: '2.5rem', marginBottom: '4rem' }}>
                {/* Global Volume - Logistics Master Card */}
                <div style={{ 
                    background: `linear-gradient(135deg, ${deepTeal} 0%, #037075 100%)`, 
                    padding: '3rem', 
                    borderRadius: '45px', 
                    color: '#fff',
                    boxShadow: `0 30px 60px ${deepTeal}30`,
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    animation: 'fadeUp 0.6s ease-out'
                }}>
                    <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05 }}>
                        <Truck size={250} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.6rem', borderRadius: '15px' }}><Activity size={24} /></div>
                        <span style={{ fontSize: '0.9rem', fontWeight: '900', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '2px' }}>Salidas Totales</span>
                    </div>
                    <div style={{ fontSize: '4.5rem', fontWeight: '900', letterSpacing: '-3px', lineHeight: 1 }}>{kpis.totalOrders}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '2rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.8rem 1.8rem', borderRadius: '20px', fontSize: '1.1rem', fontWeight: '900', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <span style={{opacity: 0.6, fontSize: '0.8rem', marginRight: '4px'}}>$</span>
                            {kpis.totalValue.toLocaleString()}
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: '900', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px' }}>Valoración Logística</span>
                    </div>
                </div>

                {/* Accuracy/Stock KPIs - Glass Effect */}
                <div style={{ 
                    background: glassWhite,
                    backdropFilter: 'blur(10px)',
                    padding: '3rem', 
                    borderRadius: '45px', 
                    border: '1px solid rgba(255,255,255,0.5)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    animation: 'fadeUp 0.7s ease-out'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '20px', background: `${institutionOcre}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: institutionOcre }}>
                            <Package size={26} />
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: '900', color: deepTeal, textTransform: 'uppercase', letterSpacing: '1px' }}>Fulfillment & Stock</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div style={{ background: '#fff', padding: '1.8rem', borderRadius: '28px', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid #f1f5f9', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#10b981', lineHeight: 1 }}>{kpis.disponibles}</div>
                            <div style={{ fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginTop: '0.5rem' }}>Surtido OK</div>
                        </div>
                        <div style={{ background: '#fff', padding: '1.8rem', borderRadius: '28px', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid #f1f5f9', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: premiumSalmon, lineHeight: 1 }}>{kpis.noDisponibles}</div>
                            <div style={{ fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginTop: '0.5rem' }}>En Quiebre</div>
                        </div>
                    </div>
                </div>

                {/* Lead Time - Advanced Analytics View */}
                <div style={{ 
                    background: glassWhite,
                    backdropFilter: 'blur(10px)',
                    padding: '3rem', 
                    borderRadius: '45px', 
                    border: '1px solid rgba(255,255,255,0.5)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    animation: 'fadeUp 0.8s ease-out'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                         <div style={{ width: '56px', height: '56px', borderRadius: '20px', background: 'rgba(2, 54, 54, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: deepTeal }}>
                            <Clock size={26} />
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Eficiencia (Lead Time)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.8rem' }}>
                        <div style={{ fontSize: '4.5rem', fontWeight: '900', color: deepTeal, lineHeight: 1 }}>{kpis.avg}</div>
                        <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Días Prom.</span>
                    </div>
                    <div style={{ marginTop: '2rem', display: 'flex', gap: '1.5rem', background: '#f8fafc', padding: '1rem 1.5rem', borderRadius: '20px', width: 'fit-content' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: '900', color: '#64748b' }}>OPTIMO: <span style={{ color: '#10b981' }}>{kpis.min}d</span></div>
                        <div style={{ fontSize: '0.8rem', fontWeight: '900', color: '#64748b' }}>TECHO: <span style={{ color: premiumSalmon }}>{kpis.max}d</span></div>
                    </div>
                </div>
            </div>

            {/* Main Operational Logistics Table */}
            <div style={{ 
                background: glassWhite, 
                backdropFilter: 'blur(10px)',
                borderRadius: '45px', 
                border: '1px solid rgba(255, 255, 255, 0.5)', 
                overflow: 'hidden', 
                boxShadow: '0 20px 60px rgba(0,0,0,0.03)',
                animation: 'fadeUp 0.9s ease-out'
            }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead>
                        <tr style={{ background: 'rgba(2, 83, 87, 0.02)' }}>
                            <th style={{ padding: '2rem 2.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', borderBottom: '1px solid rgba(2, 83, 87, 0.05)' }}>ID Despacho</th>
                            <th style={{ padding: '2rem 2.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', borderBottom: '1px solid rgba(2, 83, 87, 0.05)' }}>Cliente Consignatario</th>
                            <th style={{ padding: '2rem 1.5rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', borderBottom: '1px solid rgba(2, 83, 87, 0.05)' }}>Lead Time</th>
                            <th style={{ padding: '2rem 1.5rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', borderBottom: '1px solid rgba(2, 83, 87, 0.05)' }}>Disponibilidad</th>
                            <th style={{ padding: '2rem 1.5rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', borderBottom: '1px solid rgba(2, 83, 87, 0.05)' }}>Admin & Facturación</th>
                            <th style={{ padding: '2rem 2.5rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', borderBottom: '1px solid rgba(2, 83, 87, 0.05)' }}>Acción Logística</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ padding: '10rem', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', opacity: 0.15 }}>
                                        <Truck size={100} />
                                        <div style={{ fontSize: '1.4rem', fontWeight: '900', letterSpacing: '1px' }}>SIN OPERACIONES PENDIENTES</div>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredOrders.map(order => {
                            const isAvailable = checkAvailability(order.items || []);
                            const days = getDaysSince(order.date);

                            return (
                                <tr key={order.id} style={{ 
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    animation: 'fadeUp 0.5s ease-out',
                                    cursor: 'default'
                                }} className="ship-row-premium">
                                    <td style={{ padding: '2.5rem 2.5rem' }}>
                                        <div style={{ fontWeight: '900', color: deepTeal, fontSize: '1.2rem', letterSpacing: '-0.5px' }}>#{order.id}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.5rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>REF: LOG-{order.id.slice(-4).toUpperCase()}</div>
                                    </td>
                                    <td style={{ padding: '2.5rem 2.5rem' }}>
                                        <div style={{ fontSize: '1.25rem', color: '#1e293b', fontWeight: '900', letterSpacing: '-0.3px' }}>{order.client}</div>
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '0.6rem' }}>
                                            <span style={{ fontSize: '0.7rem', color: institutionOcre, fontWeight: '900', background: `${institutionOcre}15`, padding: '4px 10px', borderRadius: '8px', textTransform: 'uppercase' }}>
                                                {order.items.length} Referencias
                                            </span>
                                            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '900', background: 'rgba(2, 83, 87, 0.04)', padding: '4px 10px', borderRadius: '8px' }}>
                                                ${order.amount.toLocaleString()}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
                                        <div style={{ 
                                            display: 'inline-flex', 
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            padding: '0.8rem 1.2rem', 
                                            borderRadius: '20px', 
                                            background: days > 5 ? `${premiumSalmon}10` : 'rgba(16, 185, 129, 0.05)', 
                                            color: days > 5 ? premiumSalmon : '#10b981',
                                            border: days > 5 ? `1px solid ${premiumSalmon}20` : '1px solid rgba(16, 185, 129, 0.1)',
                                            minWidth: '70px'
                                        }}>
                                            <div style={{ fontSize: '1.3rem', fontWeight: '900', lineHeight: 1 }}>{days}</div>
                                            <div style={{ fontSize: '0.6rem', fontWeight: '900', textTransform: 'uppercase', marginTop: '4px' }}>Días</div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
                                        <div style={{ 
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.6rem',
                                            color: isAvailable ? '#10b981' : premiumSalmon, 
                                            fontWeight: '900', 
                                            fontSize: '0.75rem',
                                            textTransform: 'uppercase',
                                            padding: '0.6rem 1.2rem',
                                            borderRadius: '15px',
                                            background: isAvailable ? 'rgba(16, 185, 129, 0.05)' : `${premiumSalmon}05`,
                                            border: `1px solid ${isAvailable ? 'rgba(16, 185, 129, 0.1)' : `${premiumSalmon}15`}`
                                        }}>
                                            <div style={{ width: '10px', height: '100%', minHeight: '10px', borderRadius: '50%', background: isAvailable ? '#10b981' : premiumSalmon, boxShadow: `0 0 12px ${isAvailable ? '#10b981' : premiumSalmon}` }} />
                                            {isAvailable ? 'Surtido OK' : 'Quiebre Stock'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
                                        {order.invoiceNum ? (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem' }}>
                                                <div style={{ 
                                                    background: '#fff', 
                                                    padding: '0.8rem 1.5rem', 
                                                    borderRadius: '18px', 
                                                    fontWeight: '900', 
                                                    fontSize: '0.9rem',
                                                    color: deepTeal,
                                                    border: '1px solid #f1f5f9',
                                                    boxShadow: '0 4px 10px rgba(0,0,0,0.02)'
                                                }}>
                                                    {order.invoiceNum}
                                                </div>
                                                <button 
                                                    onClick={() => handleCreateInvoice(order)} 
                                                    style={{ 
                                                        width: '48px',
                                                        height: '48px',
                                                        borderRadius: '15px',
                                                        background: '#fff',
                                                        border: '1px solid #f1f5f9',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer', 
                                                        color: institutionOcre,
                                                        transition: 'all 0.3s' 
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.borderColor = institutionOcre; e.currentTarget.style.transform = 'translateY(-2px) scale(1.1)'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}
                                                >
                                                    <Download size={22} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button 
                                                disabled={!isAvailable} 
                                                onClick={() => handleCreateInvoice(order)} 
                                                style={{ 
                                                    background: isAvailable ? '#fff' : 'rgba(241, 245, 249, 0.5)', 
                                                    border: `2px solid ${isAvailable ? institutionOcre : '#f1f5f9'}`, 
                                                    padding: '0.9rem 2rem', 
                                                    borderRadius: '20px', 
                                                    cursor: isAvailable ? 'pointer' : 'not-allowed', 
                                                    color: isAvailable ? institutionOcre : '#cbd5e1',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '1rem',
                                                    fontSize: '0.85rem',
                                                    fontWeight: '900',
                                                    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '1px'
                                                }}
                                                onMouseEnter={(e) => { if(isAvailable) { e.currentTarget.style.background = institutionOcre; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 10px 25px ${institutionOcre}30`; } }}
                                                onMouseLeave={(e) => { if(isAvailable) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = institutionOcre; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; } }}
                                            >
                                                <Printer size={18} /> Emitir Factura
                                            </button>
                                        )}
                                    </td>
                                    <td style={{ padding: '2.5rem 2.5rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                            <button 
                                                onClick={() => handleGenerateLabel(order)} 
                                                style={{ 
                                                    background: `linear-gradient(135deg, ${deepTeal} 0%, #037075 100%)`, 
                                                    color: '#fff', 
                                                    border: 'none', 
                                                    padding: '1rem 2.2rem', 
                                                    borderRadius: '20px', 
                                                    cursor: 'pointer', 
                                                    fontSize: '0.85rem', 
                                                    fontWeight: '900',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '1rem',
                                                    boxShadow: `0 12px 25px ${deepTeal}30`,
                                                    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '1px'
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'; e.currentTarget.style.boxShadow = `0 20px 40px ${deepTeal}40`; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = `0 12px 25px ${deepTeal}30`; }}
                                            >
                                                <Tags size={20} /> Despachar
                                            </button>
                                            {order.dispatchedAt && (
                                                <div style={{ color: '#10b981', fontWeight: '900', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                    <CheckCircle2 size={16} /> Tracking Activo
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <style>{`
                @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
                @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                
                .ship-row-premium:hover {
                    background-color: rgba(2, 83, 87, 0.02) !important;
                }
                .ship-row-premium td {
                    border-bottom: 1px solid rgba(2, 83, 87, 0.03);
                }
                .ship-row-premium:last-child td {
                    border-bottom: none;
                }
            `}</style>
        </div>
    );
};

export default Shipping;
