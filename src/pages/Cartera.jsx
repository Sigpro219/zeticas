import React, { useState, useMemo } from 'react';
import { FileText, AlertTriangle, Clock, AlertCircle, ChevronDown, ChevronUp, DollarSign, Search, Filter, Settings, Plus, Trash2, X, Download, Eye, TrendingUp, ShieldCheck } from 'lucide-react';
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
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [paymentData, setPaymentData] = useState({
        paymentDate: new Date().toISOString().split('T')[0],
        bank: '',
        observations: ''
    });

    // Date Filter State
    const [filterType, setFilterType] = useState('month');
    const [customRange, setCustomRange] = useState({ from: '', to: '' });

    const deepTeal = "#023636";
    const institutionOcre = "#D4785A";
    const premiumSalmon = "#E29783";
    const glassWhite = "rgba(255, 255, 255, 0.85)";

    // Map real orders to Cartera rows
    const invoicesList = useMemo(() => {
        if (!orders) return [];
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
            const aPaid = a.isPaid;
            const bPaid = b.isPaid;
            if (aPaid && !bPaid) return 1;
            if (!aPaid && bPaid) return -1;
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
        doc.setFontSize(22);
        doc.setTextColor(2, 54, 54);
        doc.text('REPORTE DE FACTURACIÓN', 14, 25);
        doc.setFontSize(10);
        doc.text(`ID: ${invNum}`, 14, 35);
        doc.text(`Cliente: ${order.client}`, 14, 40);
        doc.text(`Fecha: ${order.date}`, 14, 45);

        autoTable(doc, {
            startY: 55,
            head: [['REF / SKU', 'DESCRIPCIÓN', 'CANTIDAD', 'UNITARIO', 'TOTAL']],
            body: (order.items || []).map(item => [
                item.sku || '-',
                item.name,
                item.quantity,
                `$${(item.price || 0).toLocaleString()}`,
                `$${((item.price || 0) * (item.quantity || 0)).toLocaleString()}`
            ]),
            theme: 'grid',
            headStyles: { fillColor: [2, 54, 54] }
        });

        if (mode === 'download') doc.save(`Factura_${invNum}.pdf`);
        else window.open(doc.output('bloburl'), '_blank');
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        const amount = selectedInvoice.amount;
        const selectedBank = banks.find(b => b.name === paymentData.bank || b.id === paymentData.bank);
        if (!selectedBank) return alert("Selecciona un banco");

        try {
            await supabase.from('orders').update({ status: 'Pagado', payment_bank_id: selectedBank.id }).eq('order_number', selectedInvoice.orderId);
            await updateBankBalance(selectedBank.id, amount, 'income', `Pago Recibido - Factura ${selectedInvoice.id}`, selectedInvoice.orderId);
            setIsPaymentModalOpen(false);
            setSelectedInvoice(null);
            alert("Pago aplicado exitosamente");
        } catch (err) { alert("Error al procesar el pago"); }
    };

    return (
        <div style={{ padding: '2rem', minHeight: '100vh', background: '#f8fafc', animation: 'fadeUp 0.6s ease-out' }}>
            
            {/* Header - Revenue recovery */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '4rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: deepTeal, marginBottom: '0.4rem' }}>
                        <TrendingUp size={32} />
                        <h2 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1.8px' }}>Revenue Recovery & Aging</h2>
                    </div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '1.1rem', fontWeight: '700' }}>Control estratégico de flujos por cobrar y análisis de antigüedad de cartera.</p>
                </div>
                <div style={{ background: glassWhite, backdropFilter: 'blur(10px)', padding: '0.8rem 1.8rem', borderRadius: '22px', border: '1px solid rgba(255, 255, 255, 0.5)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: institutionOcre, boxShadow: `0 0 10px ${institutionOcre}` }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: '900', color: deepTeal, textTransform: 'uppercase', letterSpacing: '1px' }}>Aging Protocol Active</span>
                </div>
            </header>

            {/* Aging Matrix KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem', marginBottom: '4rem' }}>
                {[
                    { label: 'Corriente / < 30D', val: stats.under30, color: '#10b981' },
                    { label: 'Vencido > 30D', val: stats.over30, color: institutionOcre },
                    { label: 'Crítico > 60D', val: stats.over60, color: premiumSalmon },
                    { label: 'Total Cartera', val: stats.total, color: deepTeal, isMain: true }
                ].map((kpi, idx) => (
                    <div key={idx} style={{ 
                        background: kpi.isMain ? deepTeal : '#fff', 
                        padding: '2rem', 
                        borderRadius: '35px', 
                        color: kpi.isMain ? '#fff' : deepTeal,
                        boxShadow: '0 15px 35px rgba(0,0,0,0.03)',
                        border: kpi.isMain ? 'none' : '1px solid #f1f5f9',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {!kpi.isMain && <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: kpi.color }} />}
                        <span style={{ fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6 }}>{kpi.label}</span>
                        <div style={{ fontSize: '2.2rem', fontWeight: '900', marginTop: '1rem', letterSpacing: '-1px' }}>${kpi.val.toLocaleString()}</div>
                    </div>
                ))}
            </div>

            {/* Filter Hub */}
            <div style={{ 
                display: 'flex', 
                gap: '2rem', 
                marginBottom: '3rem', 
                alignItems: 'center',
                background: glassWhite,
                backdropFilter: 'blur(10px)',
                padding: '1.5rem 2.5rem',
                borderRadius: '32px',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.03)'
            }}>
                <div style={{ display: 'flex', background: 'rgba(2, 83, 87, 0.05)', padding: '5px', borderRadius: '18px' }}>
                    {['week', 'month', 'custom'].map(t => (
                        <button key={t} onClick={() => setFilterType(t)} style={{ padding: '0.8rem 1.5rem', border: 'none', borderRadius: '14px', fontSize: '0.75rem', fontWeight: '900', cursor: 'pointer', background: filterType === t ? deepTeal : 'transparent', color: filterType === t ? '#fff' : '#64748b', transition: 'all 0.3s', textTransform: 'uppercase' }}>{t}</button>
                    ))}
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '1.5rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Rastrear factura, cliente o valor..." style={{ width: '100%', padding: '1rem 1rem 1rem 3.5rem', borderRadius: '20px', border: '1px solid #f1f5f9', outline: 'none', fontSize: '0.95rem', fontWeight: '700' }} />
                </div>
            </div>

            {/* Ledger Table */}
            <div style={{ background: glassWhite, backdropFilter: 'blur(10px)', borderRadius: '40px', border: '1px solid rgba(255, 255, 255, 0.5)', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.03)' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead>
                        <tr style={{ background: 'rgba(2, 83, 87, 0.02)' }}>
                            <th style={{ padding: '1.5rem 2rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Factura No.</th>
                            <th style={{ padding: '1.5rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Cliente</th>
                            <th style={{ padding: '1.5rem 1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Monto Cxc</th>
                            <th style={{ padding: '1.5rem 1rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Antigüedad</th>
                            <th style={{ padding: '1.5rem 1rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Protocolo</th>
                            <th style={{ padding: '1.5rem 2rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoicesList.filter(inv => inv.client.toLowerCase().includes(searchTerm.toLowerCase())).map((inv) => (
                            <tr key={inv.id} style={{ borderBottom: '1px solid #f8fafc', transition: 'all 0.3s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(2, 83, 87, 0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <td style={{ padding: '1.8rem 2rem' }}><div style={{ fontWeight: '900', fontSize: '1.1rem', color: deepTeal }}>{inv.id}</div><div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700' }}>Emisión: {inv.date}</div></td>
                                <td style={{ padding: '1.8rem 1rem' }}><div style={{ fontWeight: '900', color: '#1e293b' }}>{inv.client.toUpperCase()}</div></td>
                                <td style={{ padding: '1.8rem 1rem', textAlign: 'right' }}><div style={{ fontSize: '1.2rem', fontWeight: '900', color: deepTeal }}>${inv.amount.toLocaleString()}</div></td>
                                <td style={{ padding: '1.8rem 1rem', textAlign: 'center' }}><div style={{ fontSize: '0.9rem', fontWeight: '900', color: inv.dueDays > 30 ? institutionOcre : '#64748b' }}>{inv.dueDays} Días</div></td>
                                <td style={{ padding: '1.8rem 1rem', textAlign: 'center' }}>
                                    <span style={{ 
                                        padding: '6px 14px', 
                                        borderRadius: '12px', 
                                        fontSize: '0.7rem', 
                                        fontWeight: '900', 
                                        background: inv.isPaid ? 'rgba(16, 185, 129, 0.1)' : (inv.dueDays > 60 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(212, 120, 90, 0.1)'),
                                        color: inv.isPaid ? '#10b981' : (inv.dueDays > 60 ? '#ef4444' : institutionOcre)
                                    }}>{inv.isPaid ? 'CONCILIADA' : 'PENDIENTE'}</span>
                                </td>
                                <td style={{ padding: '1.8rem 2rem', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                                        <button onClick={() => handleViewInvoice(inv, 'preview')} style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fff', border: '1px solid #f1f5f9', cursor: 'pointer', color: deepTeal }}><Eye size={18} /></button>
                                        {!inv.isPaid && <button onClick={() => { setSelectedInvoice(inv); setIsPaymentModalOpen(true); }} style={{ padding: '0 1.5rem', borderRadius: '12px', background: deepTeal, color: '#fff', fontWeight: '900', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>PAGAR</button>}
                                        <button onClick={() => handleViewInvoice(inv, 'download')} style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${institutionOcre}10`, border: 'none', cursor: 'pointer', color: institutionOcre }}><Download size={18} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Payment Modal Refined */}
            {isPaymentModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(2, 54, 54, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
                    <div style={{ background: '#fff', padding: '3.5rem', borderRadius: '45px', width: '450px', boxShadow: '0 30px 60px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                            <h3 style={{ margin: 0, fontWeight: '900', color: deepTeal, fontSize: '1.8rem' }}>Conciliación Directa</h3>
                            <button onClick={() => setIsPaymentModalOpen(false)} style={{ border: 'none', background: '#f8fafc', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer' }}><X size={20}/></button>
                        </div>
                        <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>Banco Recaudador</label>
                                <select required value={paymentData.bank} onChange={e => setPaymentData({...paymentData, bank: e.target.value})} style={{ width: '100%', padding: '1.2rem', borderRadius: '18px', border: '1px solid #f1f5f9', background: '#fcfcfc', fontWeight: '700' }}>
                                    <option value="">Seleccione canal...</option>
                                    {banks.map(b => <option key={b.id} value={b.id}>{b.name} (${b.balance.toLocaleString()})</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>Observación Contable</label>
                                <textarea placeholder="Opcional: Detalle de transferencia..." style={{ width: '100%', padding: '1.2rem', borderRadius: '18px', border: '1px solid #f1f5f9', background: '#fcfcfc', fontWeight: '700', minHeight: '100px', outline: 'none' }} />
                            </div>
                            <button type="submit" style={{ width: '100%', padding: '1.2rem', borderRadius: '20px', background: `linear-gradient(90deg, ${deepTeal}, #014346)`, color: '#fff', fontWeight: '900', border: 'none', cursor: 'pointer', boxShadow: '0 10px 25px rgba(2, 54, 54, 0.2)' }}>FINALIZAR CONCILIACIÓN</button>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.005); } 100% { transform: scale(1); } }
            `}</style>
        </div>
    );
};

export default Cartera;
