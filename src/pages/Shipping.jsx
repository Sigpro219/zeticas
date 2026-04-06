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
// supabase import removed

import logo from '../assets/logo.png';

const Shipping = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);
    const { orders, items, refreshData, updateOrder, ownCompany } = useBusiness();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('month');
    const [customRange, setCustomRange] = useState({ from: '', to: '' });

    // Calculate stock fulfillment percentage
    const getStockFulfillment = React.useCallback((orderItems) => {
        if (!orderItems?.length) return 0;
        let totalNeeded = 0;
        let totalReady = 0;
        for (const item of orderItems) {
            totalNeeded += (Number(item.quantity) || 0);
            const inventoryItem = items.find(i => i.name === item.name || i.id === item.id);
            const currentStock = inventoryItem ? ((inventoryItem.initial || 0) + (inventoryItem.purchases || 0) - (inventoryItem.sales || 0)) : 0;
            totalReady += Math.min((Number(item.quantity) || 0), Math.max(0, currentStock));
        }
        return (totalReady / totalNeeded) * 100;
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
        const doc = new jsPDF();
        const primaryColor = [2, 54, 54]; // Deep Teal Zeticas

        // 1. Header & ID
        // Official Logo Injection
        try {
            doc.addImage(logo, 'PNG', 14, 12, 40, 15);
        } catch {
            doc.setFont('times', 'bold');
            doc.setFontSize(24);
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.text('zeticas', 14, 22);
        }
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(ownCompany?.name || 'ZETICAs SAS BIC', 14, 32);
        doc.text(`NIT: ${ownCompany?.nit || '901.531.875-4'}`, 14, 36);
        doc.text(ownCompany?.address || 'Guasca', 14, 40);
        if (ownCompany?.phone || ownCompany?.email) {
            doc.text(`${ownCompany.phone || ''} ${ownCompany.email ? '| ' + ownCompany.email : ''}`, 14, 44);
        }


        // 3. Document Title and Reference (Right Aligned)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(15, 23, 42);
        doc.text('FACTURA DE VENTA', 196, 25, { align: 'right' });

        doc.setFontSize(14);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(invNum, 196, 33, { align: 'right' });

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Fecha Emisión: ${new Date().toLocaleDateString()}`, 196, 39, { align: 'right' });

        // Horizontal Separator
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.8);
        doc.line(14, 45, 196, 45);

        // 4. Client Info Card (Using Rounded Rect like OC)
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 52, 182, 35, 2, 2, 'F');
        doc.setDrawColor(241, 245, 249);
        doc.roundedRect(14, 52, 182, 35, 2, 2, 'S');

        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(148, 163, 184);
        doc.text('FACTURAR A:', 18, 57);

        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.text(order.client?.toUpperCase() || 'CLIENTE', 18, 64);
        
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Dirección: ${order.shipping_address || order.address || 'N/A'}`, 18, 70);
        doc.text(`Ciudad: ${order.shipping_city || order.city || 'Bogotá, Col'}`, 18, 75);
        doc.text(`Teléfono: ${order.shipping_phone || order.phone || 'N/A'}`, 18, 80);
        
        // Right side info (Order reference)
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(148, 163, 184);
        doc.text('REFERENCIA PEDIDO:', 140, 57);
        doc.setFontSize(12);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(order.id || 'N/A', 140, 65);

        // 5. Items Table (No SKU, centered/right aligned columns)
        const tableColumn = ["DESCRIPCIÓN", "CANTIDAD", "VALOR UNIT.", "TOTAL"];
        const tableRows = (order.items || []).map(item => [
            item.name?.toUpperCase(),
            item.quantity,
            `$${(item.price || 0).toLocaleString()}`,
            `$${((item.price || 0) * (item.quantity || 0)).toLocaleString()}`
        ]);

        autoTable(doc, {
            startY: 95,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            styles: { fontSize: 8.5, cellPadding: 4, textColor: [30, 41, 59] },
            headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { halign: 'center', cellWidth: 30 },
                2: { halign: 'right', cellWidth: 35 },
                3: { halign: 'right', cellWidth: 35 }
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 14, right: 14 }
        });

        // 6. Totals & Tax Detail
        const subtotal = order.amount || 0;
        const shippingCost = order.shipping_cost || 0;
        const iva = subtotal * 0.19;
        const total = subtotal + iva + shippingCost;

        let finalY = (doc).lastAutoTable.finalY + 12;
        const labelX = 145;
        const valueX = 196;

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Subtotal:`, labelX, finalY, { align: 'right' });
        doc.setTextColor(51, 65, 85);
        doc.text(`$${subtotal.toLocaleString()}`, valueX, finalY, { align: 'right' });

        if (shippingCost > 0) {
            finalY += 7;
            doc.setTextColor(100, 116, 139);
            doc.text(`Envío:`, labelX, finalY, { align: 'right' });
            doc.setTextColor(51, 65, 85);
            doc.text(`$${shippingCost.toLocaleString()}`, valueX, finalY, { align: 'right' });
        }

        finalY += 7;
        doc.setTextColor(100, 116, 139);
        doc.text(`IVA (19%):`, labelX, finalY, { align: 'right' });
        doc.setTextColor(51, 65, 85);
        doc.text(`$${iva.toLocaleString()}`, valueX, finalY, { align: 'right' });

        finalY += 12;
        // Clean Total View (No background box, just Bold & High contrast)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(`TOTAL FACTURA:`, labelX, finalY, { align: 'right' });
        doc.text(`$${total.toLocaleString()}`, valueX, finalY, { align: 'right' });

        // Footer Legal
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'italic');
        doc.text('Esta factura se asimila en todos sus efectos a una letra de cambio según el Art. 774 del Código de Comercio.', 105, 280, { align: 'center' });

        doc.save(`Factura_${invNum}_${order.client}.pdf`);

        // Update in Firestore with link table logic (Metadata on order)
        await updateOrder(order.dbId, {
            invoice_number: invNum,
            invoice_date: new Date().toISOString(),
            status: 'Facturado'
        });

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
        doc.text(ownCompany?.address || 'Guasca', 10, 30);

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

        // Update in Firestore
        await updateOrder(order.dbId, {
            dispatched_at: new Date().toISOString(),
            status: 'Despachado'
        });

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
            if (o.dispatchedAt || o.status === 'Despachado') stats.despachados++;

            const isAvail = getStockFulfillment(o.items || []) >= 100;
            if (isAvail) stats.disponibles++;
            else stats.noDisponibles++;

            // Calculate Lead Time for all active orders in this module
            const days = Math.ceil(Math.abs(new Date() - new Date(o.date)) / (1000 * 60 * 60 * 24));
            stats.times.push(days);
        });

        const avg = stats.times.length > 0 ? (stats.times.reduce((a, b) => a + b, 0) / stats.times.length).toFixed(1) : 0;
        const max = stats.times.length > 0 ? Math.max(...stats.times) : 0;
        const min = stats.times.length > 0 ? Math.min(...stats.times) : 0;

        return { ...stats, avg, max, min };
    }, [filteredOrders, getStockFulfillment]);

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
                flexDirection: window.innerWidth < 1024 ? 'column' : 'row',
                gap: '1.2rem', 
                marginBottom: '2rem', 
                alignItems: window.innerWidth < 1024 ? 'stretch' : 'center',
                background: glassWhite,
                backdropFilter: 'blur(10px)',
                padding: '1rem 1.5rem',
                borderRadius: '24px',
                border: '1px solid rgba(2, 54, 54, 0.05)',
                boxShadow: '0 10px 25px rgba(0,0,0,0.02)',
                animation: 'fadeUp 0.6s ease-out'
            }}>
                <div style={{ display: 'flex', background: 'rgba(2, 83, 87, 0.05)', padding: '6px', borderRadius: '22px', border: '1px solid rgba(2, 83, 87, 0.08)' }}>
                    {['week', 'month', 'custom'].map(t => (
                        <button
                            key={t}
                            onClick={() => setFilterType(t)}
                            style={{ 
                                padding: '0.6rem 1.5rem', 
                                border: 'none', 
                                borderRadius: '12px', 
                                fontSize: '0.75rem', 
                                fontWeight: '900', 
                                cursor: 'pointer', 
                                background: filterType === t ? deepTeal : 'transparent', 
                                color: filterType === t ? '#fff' : '#64748b', 
                                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                            {t === 'week' ? 'Semana' : t === 'month' ? 'Mes' : 'Personalizado'}
                        </button>
                    ))}
                </div>
                
                {filterType === 'custom' && (
                    <div style={{ 
                        display: 'flex', 
                        gap: '0.8rem', 
                        alignItems: 'center', 
                        background: '#fff', 
                        padding: '0 1.2rem', 
                        height: '50px',
                        borderRadius: '14px', 
                        border: '1px solid #f1f5f9',
                        animation: 'slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                        <input type="date" value={customRange.from} onChange={e => setCustomRange({ ...customRange, from: e.target.value })} style={{ border: 'none', background: 'transparent', fontSize: '0.85rem', fontWeight: '900', color: deepTeal, outline: 'none', cursor: 'pointer' }} />
                        <ArrowRight size={16} color="#94a3b8" />
                        <input type="date" value={customRange.to} onChange={e => setCustomRange({ ...customRange, to: e.target.value })} style={{ border: 'none', background: 'transparent', fontSize: '0.85rem', fontWeight: '900', color: deepTeal, outline: 'none', cursor: 'pointer' }} />
                    </div>
                )}

                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={20} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', opacity: 0.6 }} />
                    <input
                        type="text"
                        placeholder="Buscar por cliente, pedido o despacho..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ 
                            width: '100%', 
                            padding: '1.2rem 1.2rem 1.2rem 3.5rem', 
                            borderRadius: '16px', 
                            border: '1px solid #f1f5f9', 
                            background: '#fff',
                            outline: 'none', 
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                            color: '#1e293b'
                        }}
                        onFocus={e => { e.target.style.borderColor = deepTeal; e.target.style.boxShadow = `0 15px 40px ${deepTeal}10`; e.target.style.transform = 'translateY(-2px)'; }}
                        onBlur={e => { e.target.style.borderColor = '#f1f5f9'; e.target.style.boxShadow = '0 10px 30px rgba(0,0,0,0.02)'; e.target.style.transform = 'translateY(0)'; }}
                    />
                </div>
            </div>

            {/* Premium Logistic Command KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Global Volume - Logistics Master Card */}
                <div style={{ 
                    background: `linear-gradient(135deg, ${deepTeal} 0%, #037075 100%)`, 
                    padding: '1.5rem 2rem', 
                    borderRadius: '24px', 
                    color: '#fff',
                    boxShadow: `0 15px 35px ${deepTeal}20`,
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    animation: 'fadeUp 0.6s ease-out'
                }}>
                    <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.1, transform: 'rotate(-10deg)' }}>
                        <Truck size={150} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.4rem', borderRadius: '10px' }}><Activity size={18} /></div>
                        <span style={{ fontSize: '0.75rem', fontWeight: '900', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px' }}>Salidas Totales</span>
                    </div>
                    <div style={{ fontSize: '2.2rem', fontWeight: '900', letterSpacing: '-1.5px', lineHeight: 1 }}>{kpis.totalOrders}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '1.2rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.6rem 1.2rem', borderRadius: '14px', fontSize: '0.85rem', fontWeight: '900', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <span style={{opacity: 0.6, fontSize: '0.7rem', marginRight: '4px'}}>$</span>
                            {kpis.totalValue.toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* Accuracy/Stock KPIs - Glass Effect */}
                <div style={{ 
                    background: glassWhite,
                    backdropFilter: 'blur(10px)',
                    padding: '1.5rem 2rem', 
                    borderRadius: '24px', 
                    border: '1px solid rgba(2, 54, 54, 0.05)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    animation: 'fadeUp 0.7s ease-out'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1.5rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${institutionOcre}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: institutionOcre }}>
                            <Package size={20} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: '900', color: deepTeal, textTransform: 'uppercase', letterSpacing: '1px' }}>Fulfillment & Stock</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ background: '#fcfcfc', padding: '1rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#10b981', lineHeight: 1 }}>{kpis.disponibles}</div>
                            <div style={{ fontSize: '0.6rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginTop: '0.3rem' }}>Surtido OK</div>
                        </div>
                        <div style={{ background: '#fcfcfc', padding: '1rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: '1.6rem', fontWeight: '900', color: premiumSalmon, lineHeight: 1 }}>{kpis.noDisponibles}</div>
                            <div style={{ fontSize: '0.6rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginTop: '0.3rem' }}>En Quiebre</div>
                        </div>
                    </div>
                </div>

                {/* Lead Time - Advanced Analytics View */}
                <div style={{ 
                    background: glassWhite,
                    backdropFilter: 'blur(10px)',
                    padding: '1.5rem 2rem', 
                    borderRadius: '24px', 
                    border: '1px solid rgba(2, 54, 54, 0.05)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    animation: 'fadeUp 0.8s ease-out'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1rem' }}>
                         <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(2, 54, 54, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: deepTeal }}>
                            <Clock size={20} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Eficiencia (Lead Time)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                        <div style={{ fontSize: '2.5rem', fontWeight: '900', color: deepTeal, lineHeight: 1 }}>{kpis.avg}</div>
                        <span style={{ fontSize: '0.85rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Días Prom.</span>
                    </div>
                    <div style={{ marginTop: '1.2rem', display: 'flex', gap: '1rem', background: '#fcfcfc', padding: '0.7rem 1.2rem', borderRadius: '14px', width: 'fit-content', border: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: '900', color: '#64748b' }}>MIN: <span style={{ color: '#10b981' }}>{kpis.min}d</span></div>
                        <div style={{ fontSize: '0.65rem', fontWeight: '900', color: '#64748b' }}>MAX: <span style={{ color: premiumSalmon }}>{kpis.max}d</span></div>
                    </div>
                </div>
            </div>

            {/* Main Operational Logistics Table */}
            <div style={{ 
                background: glassWhite, 
                backdropFilter: 'blur(10px)',
                borderRadius: '24px', 
                border: '1px solid rgba(2, 54, 54, 0.05)', 
                overflow: 'hidden', 
                boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
                animation: 'fadeUp 0.9s ease-out'
            }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead>
                        <tr style={{ background: 'rgba(2, 83, 87, 0.02)' }}>
                            <th style={{ padding: '1.2rem 1.5rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(2, 83, 87, 0.05)' }}>ID</th>
                            <th style={{ padding: '1.2rem 1.5rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(2, 83, 87, 0.05)' }}>Consignatario</th>
                            <th style={{ padding: '1.2rem 1rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(2, 83, 87, 0.05)' }}>L. Time</th>
                            <th style={{ padding: '1.2rem 1rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(2, 83, 87, 0.05)' }}>Stock</th>
                            <th style={{ padding: '1.2rem 1rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(2, 83, 87, 0.05)' }}>Facturación</th>
                            <th style={{ padding: '1.2rem 1.5rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(2, 83, 87, 0.05)' }}>Acción</th>
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
                            const isAvailable = getStockFulfillment(order.items || []) >= 100;
                            const days = getDaysSince(order.date);

                            return (
                                <tr key={order.id} style={{ 
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    animation: 'fadeUp 0.5s ease-out',
                                    cursor: 'default'
                                }} className="ship-row-premium">
                                    <td style={{ padding: '1.2rem 1.5rem' }}>
                                        <div style={{ fontWeight: '900', color: deepTeal, fontSize: '0.95rem', letterSpacing: '-0.3px' }}>#{order.id}</div>
                                        <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: '0.2rem', fontWeight: '900', textTransform: 'uppercase' }}>LOG-{order.id.slice(-4)}</div>
                                    </td>
                                    <td style={{ padding: '1.2rem 1.5rem' }}>
                                        <div style={{ fontSize: '1rem', color: '#1e293b', fontWeight: '900', letterSpacing: '-0.2px' }}>{order.client}</div>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                                            <span style={{ fontSize: '0.65rem', color: institutionOcre, fontWeight: '900', background: `${institutionOcre}10`, padding: '2px 8px', borderRadius: '6px' }}>
                                                {order.items?.length || 0} SKUs
                                            </span>
                                            <span style={{ fontSize: '0.65rem', color: deepTeal, fontWeight: '900', background: 'rgba(2, 100, 110, 0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                                                {(order.items || []).reduce((acc, i) => acc + (Number(i.quantity) || 0), 0)} Unidades
                                            </span>
                                            <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '900', background: 'rgba(2, 83, 87, 0.04)', padding: '2px 8px', borderRadius: '6px' }}>
                                                {order.id?.toString().startsWith('WEB-') ? 'WEB' : 'MANUAL'}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.2rem 1rem', textAlign: 'center' }}>
                                        <div style={{ 
                                            display: 'inline-flex', 
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            padding: '0.5rem 0.8rem', 
                                            borderRadius: '12px', 
                                            background: days > 5 ? `${premiumSalmon}10` : 'rgba(16, 185, 129, 0.05)', 
                                            color: days > 5 ? premiumSalmon : '#10b981',
                                            border: days > 5 ? `1px solid ${premiumSalmon}20` : '1px solid rgba(16, 185, 129, 0.1)',
                                            minWidth: '50px'
                                        }}>
                                            <div style={{ fontSize: '1rem', fontWeight: '900', lineHeight: 1 }}>{days}</div>
                                            <div style={{ fontSize: '0.55rem', fontWeight: '900', textTransform: 'uppercase' }}>Días</div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.2rem 1rem', textAlign: 'center', minWidth: '160px' }}>
                                        {(() => {
                                            const fulfillment = getStockFulfillment(order.items || []);
                                            const isDone = fulfillment >= 100;
                                            return (
                                                <div style={{ padding: '0 1rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.6rem', fontWeight: '900', color: isDone ? '#10b981' : (fulfillment > 0 ? institutionOcre : premiumSalmon) }}>
                                                        <span>{isDone ? 'LISTO' : (fulfillment > 0 ? 'PARCIAL' : 'SIN STOCK')}</span>
                                                        <span>{Math.round(fulfillment)}%</span>
                                                    </div>
                                                    <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                                        <div style={{ 
                                                            width: `${fulfillment}%`, 
                                                            height: '100%', 
                                                            background: isDone ? '#10b981' : (fulfillment > 0 ? institutionOcre : premiumSalmon),
                                                            boxShadow: isDone ? '0 0 10px rgba(16, 185, 129, 0.2)' : 'none',
                                                            transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)'
                                                        }} />
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td style={{ padding: '1.2rem 1rem', textAlign: 'center' }}>
                                        {order.invoiceNum ? (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                                <div style={{ 
                                                    background: '#fcfcfc', 
                                                    padding: '0.5rem 0.8rem', 
                                                    borderRadius: '10px', 
                                                    fontWeight: '900', 
                                                    fontSize: '0.8rem',
                                                    color: deepTeal,
                                                    border: '1px solid #f1f5f9'
                                                }}>
                                                    {order.invoiceNum}
                                                </div>
                                                <button 
                                                    onClick={() => handleCreateInvoice(order)} 
                                                    style={{ 
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '10px',
                                                        background: '#fff',
                                                        border: '1px solid #f1f5f9',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer', 
                                                        color: institutionOcre,
                                                        transition: 'all 0.3s' 
                                                    }}
                                                >
                                                    <Download size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button 
                                                disabled={!isAvailable} 
                                                onClick={() => handleCreateInvoice(order)} 
                                                style={{ 
                                                    background: isAvailable ? '#fff' : 'rgba(241, 245, 249, 0.5)', 
                                                    border: `2px solid ${isAvailable ? institutionOcre : '#f1f5f9'}`, 
                                                    padding: '0.6rem 1.2rem', 
                                                    borderRadius: '14px', 
                                                    cursor: isAvailable ? 'pointer' : 'not-allowed', 
                                                    color: isAvailable ? institutionOcre : '#cbd5e1',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.7rem',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '900',
                                                    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                                    textTransform: 'uppercase'
                                                }}
                                            >
                                                <Printer size={16} /> Factura
                                            </button>
                                        )}
                                    </td>
                                    <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                            <button 
                                                onClick={() => handleGenerateLabel(order)} 
                                                style={{ 
                                                    background: `linear-gradient(135deg, ${deepTeal} 0%, #037075 100%)`, 
                                                    color: '#fff', 
                                                    border: 'none', 
                                                    padding: '0.6rem 1.5rem', 
                                                    borderRadius: '14px', 
                                                    cursor: 'pointer', 
                                                    fontSize: '0.75rem', 
                                                    fontWeight: '900',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.6rem',
                                                    boxShadow: `0 8px 15px ${deepTeal}20`,
                                                    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                                    textTransform: 'uppercase'
                                                }}
                                            >
                                                <Tags size={16} /> Despachar
                                            </button>
                                            {order.dispatchedAt && (
                                                <div style={{ color: '#10b981', fontWeight: '900', fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase' }}>
                                                    <CheckCircle2 size={12} /> OK
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
