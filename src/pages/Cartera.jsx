import React, { useState, useMemo } from 'react';
import { FileText, AlertTriangle, Clock, AlertCircle, ChevronDown, ChevronUp, DollarSign, Search, Filter, Settings, Plus, Trash2, X, Download, Eye } from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const Cartera = () => {
    const { banks, setBanks, orders, setOrders, updateBankBalance } = useBusiness();
    const [expandedInvoice, setExpandedInvoice] = useState(null);


    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isBankManagerOpen, setIsBankManagerOpen] = useState(false);
    const [newBankName, setNewBankName] = useState('');
    const [bankToDelete, setBankToDelete] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
    const [paymentData, setPaymentData] = useState({
        paymentDate: new Date().toISOString().split('T')[0],
        bank: '',
        observations: ''
    });

    const zeticasInfo = {
        name: 'ZETICAs S.A.S.',
        nit: '901.234.567-8',
        address: 'Carrera 45 # 100-24, Bogotá, Colombia',
        phone: '312 456 7890',
        email: 'ventas@zeticas.com'
    };

    // Date Filter State
    const [filterType, setFilterType] = useState('month');
    const [customRange, setCustomRange] = useState({ from: '', to: '' });

    // Map real orders to Cartera rows
    const invoicesList = useMemo(() => {
        if (!orders) return [];

        // 1. Filter by Date
        let filteredByDate = orders;
        if (filterType === 'week') {
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            filteredByDate = filteredByDate.filter(o => new Date(o.date) >= lastWeek);
        } else if (filterType === 'month') {
            const thisMonth = new Date();
            thisMonth.setDate(1);
            filteredByDate = filteredByDate.filter(o => new Date(o.date) >= thisMonth);
        } else if (filterType === 'custom' && customRange.from && customRange.to) {
            filteredByDate = filteredByDate.filter(o => o.date >= customRange.from && o.date <= customRange.to);
        }

        return filteredByDate.map(order => {
            if (!order) return null;
            const invoiceDate = order.dispatchedAt ? new Date(order.dispatchedAt) : (order.date ? new Date(order.date) : new Date());
            const diffTime = Math.abs(new Date() - invoiceDate);
            const dueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let status = 'Por Facturar';
            if (order.status === 'Pagado') status = 'Pagada';
            else if (order.invoiceNum) {
                if (dueDays > 60) status = 'Vencida > 60 días';
                else if (dueDays > 30) status = 'Vencida > 30 días';
                else status = 'Vencida < 30 días';
            }

            return {
                id: order.invoiceNum || `P-${order.id || 'err'}`,
                orderId: order.id,
                client: order.client || 'Cliente Sin Nombre',
                amount: order.amount || 0,
                date: order.date || '',
                dueDays: order.status === 'Pagado' ? '-' : dueDays,
                status: status,
                isPaid: order.status === 'Pagado',
                orders: [order.id].filter(Boolean),
                bank: order.bankId
            };
        }).filter(Boolean).sort((a, b) => {
            // 1. Paid invoices to bottom
            const aPaid = a.isPaid;
            const bPaid = b.isPaid;
            if (aPaid && !bPaid) return 1;
            if (!aPaid && bPaid) return -1;

            // 2. Newest first
            return new Date(b.date) - new Date(a.date);
        });
    }, [orders, filterType, customRange]);

    const stats = useMemo(() => {
        const pending = invoicesList.filter(i => !i.isPaid);
        return {
            under30: pending.filter(i => i.status === 'Vencida < 30 días' || i.status === 'Por Facturar').reduce((acc, curr) => acc + curr.amount, 0),
            over30: pending.filter(i => i.status === 'Vencida > 30 días').reduce((acc, curr) => acc + curr.amount, 0),
            over60: pending.filter(i => i.status === 'Vencida > 60 días').reduce((acc, curr) => acc + curr.amount, 0),
            total: pending.reduce((acc, curr) => acc + curr.amount, 0),
        };
    }, [invoicesList]);

    const handleViewInvoice = (orderRow, mode = 'download') => {
        const order = orders.find(o => o.id === orderRow.orderId);
        if (!order) return;

        const doc = new jsPDF();
        const invNum = order.invoiceNum || orderRow.id;

        // Header
        doc.setFontSize(20);
        doc.setTextColor(26, 54, 54);
        doc.text('FACTURA DE VENTA', 14, 20);
        doc.setFontSize(10);
        doc.text(`No. ${invNum}`, 14, 28);
        doc.text(`Fecha Emisión: ${order.date || new Date().toLocaleDateString()}`, 14, 33);

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
        const tableColumn = ["Ref / SKU", "Descripción", "Cantidad", "Valor Unit.", "Total"];
        const tableRows = (order.items || []).map(item => [
            item.sku || item.id || 'N/A', // Use human-readable SKU
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

        // Use a consistent x-pos and align to right for values
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

        if (mode === 'download') {
            doc.save(`Factura_${invNum}_${order.client}.pdf`);
        } else {
            const blobUrl = doc.output('bloburl');
            window.open(blobUrl, '_blank');
        }
    };

    const toggleExpand = (id) => {
        setExpandedInvoice(expandedInvoice === id ? null : id);
    };

    const openPaymentModal = (invoice) => {
        setSelectedInvoice(invoice);
        setIsPaymentModalOpen(true);
        setIsBankManagerOpen(false);
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();

        const amount = selectedInvoice.amount;
        const selectedBank = banks.find(b => b.name === paymentData.bank || b.id === paymentData.bank);

        if (!selectedBank) {
            alert("Selecciona un banco válido");
            return;
        }

        try {
            // Persist to Supabase
            await supabase.from('orders').update({
                status: 'Pagado',
                payment_bank_id: selectedBank.id
            }).eq('order_number', selectedInvoice.orderId);

            // Update Bank Balance (Income) using centralized function
            const result = await updateBankBalance(
                selectedBank.id,
                amount,
                'income',
                `Pago Recibido - Factura ${selectedInvoice.id}`,
                selectedInvoice.orderId
            );

            setIsPaymentModalOpen(false);
            setSelectedInvoice(null);
            setPaymentData({
                paymentDate: new Date().toISOString().split('T')[0],
                bank: '',
                observations: ''
            });

            if (result.success) {
                alert(`Pago de $${amount.toLocaleString()} registrado en ${selectedBank.name}.`);
            }

        } catch (err) {
            console.error("Error processing delivery payment:", err);
            alert("Error al procesar el pago");
        }
    };

    const addBank = () => {
        if (newBankName.trim() && !banks.some(b => b.name === newBankName.trim())) {
            const newBank = {
                id: Date.now().toString(),
                name: newBankName.trim(),
                balance: 0,
                type: 'cta de ahorros'
            };
            setBanks([...banks, newBank]);
            setNewBankName('');
        }
    };

    const confirmRemoveBank = (bankToRemoveId) => {
        if (!window.confirm("¿Estás seguro que quieres eliminar este banco?")) {
            return;
        }
        // Banks should be managed in the Banks module, but if we allow it here:
        setBanks(banks.filter(b => b.id !== bankToRemoveId));
        if (paymentData.bank === bankToRemoveId) {
            setPaymentData({ ...paymentData, bank: '' });
        }
    };

    const StatusCard = ({ label, amount, color, icon: Icon }) => (
        <div style={{
            background: '#fff',
            padding: '1.5rem',
            borderRadius: '12px',
            borderLeft: `6px solid ${color}`,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            flex: 1,
            minWidth: '200px',
            transition: 'all 0.3s ease'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ color: color }}>{Icon && <Icon size={20} />}</div>
                <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: '500' }}>{label}</span>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#333' }}>
                ${amount.toLocaleString()}
            </div>
        </div>
    );

    const filteredInvoices = invoicesList.filter(inv => {
        const s = searchTerm.toLowerCase().trim();
        if (!s) return true;

        const amountStr = inv.amount.toString();
        const amountFormatted = inv.amount.toLocaleString();
        const cleanS = s.replace(/[.,$]/g, '');

        return (
            inv.id.toLowerCase().includes(s) ||
            inv.client.toLowerCase().includes(s) ||
            inv.date.includes(s) ||
            (cleanS && amountStr.includes(cleanS)) ||
            amountFormatted.toLowerCase().includes(s)
        );
    });

    const sortedInvoices = filteredInvoices;

    return (
        <div className="cartera-module">
            <header style={{ marginBottom: '2rem' }}>
                <h2 className="font-serif" style={{ fontSize: '1.8rem', color: 'var(--color-primary)' }}>Gestión de Cartera</h2>
                <p style={{ color: '#666', fontSize: '0.9rem' }}>Control de cuentas por cobrar y conciliación de facturas.</p>
            </header>

            {/* Filter Bar */}
            <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '16px', border: '1px solid #f1f5f9', marginBottom: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.3rem', borderRadius: '10px' }}>
                    {['week', 'month', 'custom'].map(t => (
                        <button
                            key={t}
                            onClick={() => setFilterType(t)}
                            style={{
                                padding: '0.5rem 1rem',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                background: filterType === t ? '#fff' : 'transparent',
                                color: filterType === t ? 'var(--color-primary)' : '#64748b',
                                boxShadow: filterType === t ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                            }}>
                            {t === 'week' ? 'Cartera Semana' : t === 'month' ? 'Cartera Mes' : 'Personalizado'}
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
                    <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
                    <input
                        type="text"
                        placeholder="Buscar por factura, cliente, fecha o valor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '0.6rem 2.5rem 0.6rem 2.5rem', borderRadius: '8px', border: '1px solid #ddd', outline: 'none' }}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: '#aaa', cursor: 'pointer' }}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
                <StatusCard label="Vencida < 30 días" amount={stats.under30} color="#f6cc4d" icon={Clock} />
                <StatusCard label="Vencida > 30 días" amount={stats.over30} color="#f39c12" icon={AlertTriangle} />
                <StatusCard label="Vencida > 60 días" amount={stats.over60} color="#e74c3c" icon={AlertCircle} />
                <StatusCard label="Total Cartera $" amount={stats.total} color="var(--color-primary)" icon={DollarSign} />
            </div>

            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #eee', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#fafafa', borderBottom: '2px solid #eee' }}>
                            <th style={{ padding: '1.2rem', fontSize: '0.85rem', color: '#666' }}>FECHA</th>
                            <th style={{ padding: '1.2rem', fontSize: '0.85rem', color: '#666' }}>FACTURA</th>
                            <th style={{ padding: '1.2rem', fontSize: '0.85rem', color: '#666' }}>CLIENTE</th>
                            <th style={{ padding: '1.2rem', fontSize: '0.85rem', color: '#666' }}>VALOR</th>
                            <th style={{ padding: '1.2rem', fontSize: '0.85rem', color: '#666' }}>DÍAS</th>
                            <th style={{ padding: '1.2rem', fontSize: '0.85rem', color: '#666' }}>ESTADO</th>
                            <th style={{ padding: '1.2rem', fontSize: '0.85rem', color: '#666' }}>ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedInvoices.map(inv => (
                            <React.Fragment key={inv.id}>
                                <tr style={{
                                    borderBottom: expandedInvoice === inv.id ? 'none' : '1px solid #f5f5f5',
                                    backgroundColor: inv.isPaid ? '#fafafa' : 'transparent',
                                    opacity: inv.isPaid ? 0.8 : 1
                                }}>
                                    <td style={{ padding: '1.2rem', fontSize: '0.9rem' }}>{inv.date}</td>
                                    <td style={{ padding: '1.2rem', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--color-primary)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                            <span
                                                onClick={() => handleViewInvoice(inv, 'preview')}
                                                style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                title="Previsualizar Factura"
                                            >
                                                {inv.id}
                                            </span>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button
                                                    onClick={() => handleViewInvoice(inv, 'preview')}
                                                    style={{ border: 'none', background: '#f1f5f9', padding: '4px', borderRadius: '4px', cursor: 'pointer', color: 'var(--color-primary)' }}
                                                    title="Previsualizar"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleViewInvoice(inv, 'download')}
                                                    style={{ border: 'none', background: '#f1f5f9', padding: '4px', borderRadius: '4px', cursor: 'pointer', color: 'var(--color-primary)' }}
                                                    title="Descargar"
                                                >
                                                    <Download size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.2rem', fontSize: '0.9rem' }}>{inv.client}</td>
                                    <td style={{ padding: '1.2rem', fontSize: '0.9rem', fontWeight: '600' }}>${inv.amount.toLocaleString()}</td>
                                    <td style={{ padding: '1.2rem', fontSize: '0.9rem' }}>{inv.isPaid ? '-' : inv.dueDays}</td>
                                    <td style={{ padding: '1.2rem' }}>
                                        <span style={{
                                            fontSize: '0.7rem',
                                            padding: '4px 10px',
                                            borderRadius: '20px',
                                            fontWeight: 'bold',
                                            background: inv.isPaid ? '#e6fffa' : (inv.dueDays > 60 ? '#fdecea' : inv.dueDays > 30 ? '#fff3e0' : '#fff9c4'),
                                            color: inv.isPaid ? '#2c7a7b' : (inv.dueDays > 60 ? '#e74c3c' : inv.dueDays > 30 ? '#f39c12' : '#fbc02d')
                                        }}>
                                            {inv.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1.2rem' }}>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <button
                                                onClick={() => toggleExpand(inv.id)}
                                                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#888', display: 'flex', alignItems: 'center', gap: '4px' }}
                                            >
                                                {expandedInvoice === inv.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                <span style={{ fontSize: '0.8rem' }}>Detalle</span>
                                            </button>
                                            {!inv.isPaid && (
                                                <button
                                                    onClick={() => openPaymentModal(inv)}
                                                    style={{
                                                        padding: '4px 12px',
                                                        borderRadius: '4px',
                                                        border: '1px solid var(--color-primary)',
                                                        background: 'transparent',
                                                        color: 'var(--color-primary)',
                                                        fontSize: '0.75rem',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseOver={(e) => { e.target.style.background = 'var(--color-primary)'; e.target.style.color = '#fff'; }}
                                                    onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--color-primary)'; }}
                                                >
                                                    Pagar
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                {expandedInvoice === inv.id && (
                                    <tr style={{ background: '#fcfcfc', borderBottom: '1px solid #f5f5f5' }}>
                                        <td colSpan="7" style={{ padding: '1rem 3rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <div style={{ borderLeft: '3px solid var(--color-sage)', paddingLeft: '1.5rem' }}>
                                                    <h4 style={{ fontSize: '0.85rem', color: '#444', marginBottom: '0.8rem', fontWeight: 'bold' }}>Pedidos Relacionados:</h4>
                                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                                        {inv.orders.map(order => (
                                                            <div key={order} style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.5rem',
                                                                padding: '0.4rem 0.8rem',
                                                                background: '#fff',
                                                                border: '1px solid #ddd',
                                                                borderRadius: '4px',
                                                                fontSize: '0.75rem',
                                                                color: '#555'
                                                            }}>
                                                                <FileText size={12} color="var(--color-sage)" /> {order}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                {inv.isPaid && (
                                                    <div style={{ borderLeft: '3px solid #2c7a7b', paddingLeft: '1.5rem', background: '#e6fffa', padding: '1rem', borderRadius: '4px' }}>
                                                        <h4 style={{ fontSize: '0.85rem', color: '#2c7a7b', marginBottom: '0.5rem', fontWeight: 'bold' }}>Información de Pago:</h4>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', fontSize: '0.8rem' }}>
                                                            <div><strong>Fecha:</strong> {inv.paymentDate}</div>
                                                            <div><strong>Banco:</strong> {inv.bank}</div>
                                                            <div><strong>Obs:</strong> {inv.observations || 'N/A'}</div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {isPaymentModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: '#fff',
                        padding: '2rem',
                        borderRadius: '12px',
                        width: '420px',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 className="font-serif" style={{ color: 'var(--color-primary)', margin: 0 }}>Registrar Pago - {selectedInvoice?.id}</h3>
                            <button onClick={() => setIsPaymentModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#888' }}><X size={20} /></button>
                        </div>

                        {!isBankManagerOpen ? (
                            <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginBottom: '0.4rem' }}>Fecha de Pago</label>
                                    <input
                                        type="date"
                                        required
                                        value={paymentData.paymentDate}
                                        onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
                                    />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                        <label style={{ fontSize: '0.8rem', color: '#666' }}>Banco</label>
                                        <button
                                            type="button"
                                            onClick={() => setIsBankManagerOpen(true)}
                                            style={{ border: 'none', background: 'none', color: 'var(--color-primary)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            <Settings size={12} /> Gestionar Bancos
                                        </button>
                                    </div>
                                    <select
                                        required
                                        value={paymentData.bank}
                                        onChange={(e) => setPaymentData({ ...paymentData, bank: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd' }}
                                    >
                                        <option value="">Seleccione un banco...</option>
                                        {banks.map(bank => <option key={bank.id} value={bank.id}>{bank.name} - Saldo: ${(bank.balance || 0).toLocaleString()}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginBottom: '0.4rem' }}>Observaciones</label>
                                    <textarea
                                        rows="3"
                                        value={paymentData.observations}
                                        onChange={(e) => setPaymentData({ ...paymentData, observations: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ddd', resize: 'none' }}
                                        placeholder="Detalles adicionales del pago..."
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setIsPaymentModalOpen(false)}
                                        style={{ flex: 1, padding: '0.75rem', borderRadius: '6px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        style={{ flex: 1, padding: '0.75rem', borderRadius: '6px', border: 'none', background: 'var(--color-primary)', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        Confirmar Pago
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#444' }}>Gestión Maestra de Bancos</h4>
                                    <button onClick={() => setIsBankManagerOpen(false)} style={{ border: 'none', background: 'none', color: 'var(--color-primary)', fontSize: '0.8rem', cursor: 'pointer' }}>Volver al pago</button>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="text"
                                        value={newBankName}
                                        onChange={(e) => setNewBankName(e.target.value)}
                                        placeholder="Nuevo banco..."
                                        style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                                    />
                                    <button
                                        onClick={addBank}
                                        style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.5rem', cursor: 'pointer' }}
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#f9f9f9', padding: '0.75rem', borderRadius: '6px', border: '1px solid #eee', position: 'relative' }}>
                                    {banks.map(bank => (
                                        <div key={bank.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid #eee' }}>
                                            <span style={{ fontSize: '0.85rem', color: '#555' }}>{bank.name}</span>
                                            <button
                                                onClick={() => confirmRemoveBank(bank.id)}
                                                style={{ border: 'none', background: 'none', color: '#ff4d4f', cursor: 'pointer', padding: '4px' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cartera;
