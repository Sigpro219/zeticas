import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useBusiness } from '../context/BusinessContext';
import DocumentBuilder from '../components/DocumentBuilder';
// supabase import removed
import {
    ShoppingCart,
    Calendar,
    ArrowRight,
    CheckCircle,
    Package,
    Users,
    Plus,
    Save,
    AlertCircle,
    Truck,
    Download,
    Eye,
    DollarSign,
    TrendingDown,
    Filter,
    Search,
    FileText,
    CheckCircle2,
    X
} from 'lucide-react';

const Purchases = ({ items, setItems, purchaseOrders, setPurchaseOrders, providers }) => {
    const { setOrders, banks, updateBankBalance, recalculatePTCosts, receivePurchase, payPurchase, ownCompany, addPurchase, refreshData } = useBusiness();
    // Local State for BOM Explosion & OC Generation
    const [viewingOC, setViewingOC] = useState(null); // Modal state for OC
    const [invEntryOC, setInvEntryOC] = useState(null);
    const [paymentModalOC, setPaymentModalOC] = useState(null);
    const [paymentBankId, setPaymentBankId] = useState('');

    // Filters and UI State
    const [filterType, setFilterType] = useState('month');
    const [customRange, setCustomRange] = useState({ from: '', to: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreatingManualOC, setIsCreatingManualOC] = useState(false);
    const [manualOCData, setManualOCData] = useState({
        providerId: '',
        items: [],
        date: new Date().toISOString().split('T')[0]
    });
    const [newItem, setNewItem] = useState({ id: '', quantity: 1, unitCost: 0 });

    const handleAddManualItem = () => {
        const material = items.find(i => i.id === newItem.id);
        if (!material) return;

        const existing = manualOCData.items.find(i => i.id === material.id);
        if (existing) {
            setManualOCData({
                ...manualOCData,
                items: manualOCData.items.map(i => i.id === material.id ? { ...i, quantity: i.quantity + newItem.quantity } : i)
            });
        } else {
            setManualOCData({
                ...manualOCData,
                items: [...manualOCData.items, {
                    id: material.id,
                    name: material.name,
                    quantity: newItem.quantity,
                    unit: material.purchase_unit || material.unit_measure || material.unit || 'und',
                    unitCost: newItem.unitCost || material.avgCost || 0
                }]
            });
        }
        setNewItem({ id: '', quantity: 1, unitCost: 0 });
    };

    const handleSaveManualOC = async () => {
        if (!manualOCData.providerId || manualOCData.items.length === 0) {
            alert("Por favor selecciona un proveedor y añade al menos un material.");
            return;
        }

        const provider = providers.find(p => p.id === manualOCData.providerId);
        const subtotal = manualOCData.items.reduce((sum, i) => sum + (i.quantity * i.unitCost), 0);
        const iva = subtotal * 0.19;
        const total = subtotal + iva;

        const finalOC = {
            id: `OC-MANUAL-${Math.floor(1000 + Math.random() * 9000)}`,
            provider_id: provider.id,
            provider_name: provider.name,
            provider_phone: provider.phone || '',
            provider_email: provider.email || '',
            status: 'Enviada',
            payment_status: 'Pendiente',
            total_amount: total,
            order_date: manualOCData.date,
            related_orders: [],
            items: manualOCData.items.map(i => ({
                id: i.id,
                name: i.name,
                quantity: i.quantity,
                unit_cost: i.unitCost,
                unit: i.unit,
                total_cost: Number(i.unitCost) * Number(i.quantity)
            }))
        };

        const res = await addPurchase(finalOC);
        if (res.success) {
            alert("Orden de Compra manual creada con éxito.");
            setIsCreatingManualOC(false);
            setManualOCData({ providerId: '', items: [], date: new Date().toISOString().split('T')[0] });
            refreshData();
        } else {
            alert("Error al guardar la orden de compra.");
        }
    };

    // Filtering logic for Purchase Orders
    const filteredPurchaseOrders = useMemo(() => {
        let result = purchaseOrders;

        // Date filtering
        if (filterType === 'week') {
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            result = result.filter(po => new Date(po.date) >= lastWeek);
        } else if (filterType === 'month') {
            const thisMonth = new Date();
            thisMonth.setDate(1);
            result = result.filter(po => new Date(po.date) >= thisMonth);
        } else if (filterType === 'custom' && customRange.from && customRange.to) {
            result = result.filter(po => po.date >= customRange.from && po.date <= customRange.to);
        }

        // Search filtering
        if (searchTerm) {
            const query = searchTerm.toLowerCase();
            result = result.filter(po =>
                (po.providerName || '').toLowerCase().includes(query) ||
                (po.id || '').toLowerCase().includes(query) ||
                (po.status || '').toLowerCase().includes(query) ||
                (po.paymentStatus || '').toLowerCase().includes(query) ||
                (po.date || '').toLowerCase().includes(query) ||
                (po.total || 0).toString().includes(query) ||
                (po.relatedOrders || []).some(ref => ref.toLowerCase().includes(query)) ||
                (po.items || []).some(item => (item.name || '').toLowerCase().includes(query))
            );
        }

        return result;
    }, [purchaseOrders, filterType, customRange, searchTerm]);

    // KPI Calculations
    const purchaseStats = useMemo(() => {
        return {
            count: filteredPurchaseOrders.length,
            total: filteredPurchaseOrders.reduce((sum, po) => sum + (po.total || 0), 0)
        };
    }, [filteredPurchaseOrders]);

    const treasuryStats = useMemo(() => {
        const paid = filteredPurchaseOrders.filter(po => po.paymentStatus === 'Pagado');
        const unpaid = filteredPurchaseOrders.filter(po => po.paymentStatus !== 'Pagado');
        return {
            paidCount: paid.length,
            paidTotal: paid.reduce((sum, po) => sum + (po.total || 0), 0),
            unpaidCount: unpaid.length,
            unpaidTotal: unpaid.reduce((sum, po) => sum + (po.total || 0), 0)
        };
    }, [filteredPurchaseOrders]);

    const inventoryKPIs = useMemo(() => {
        const received = filteredPurchaseOrders.filter(po => po.status === 'Recibida');
        const pending = filteredPurchaseOrders.filter(po => po.status !== 'Recibida');
        return {
            receivedCount: received.length,
            receivedTotal: received.reduce((sum, po) => sum + (po.total || 0), 0),
            pendingCount: pending.length,
            pendingTotal: pending.reduce((sum, po) => sum + (po.total || 0), 0)
        };
    }, [filteredPurchaseOrders]);

    const handleDownloadOCPDF = async (oc) => {
        const doc = new jsPDF();
        const primaryColor = [2, 54, 54]; // #023636

        // 1. Logo "zeticas" in serif
        doc.setFont('times', 'bold');
        doc.setFontSize(30);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('zeticas', 14, 25);

        // 2. Document Title and Number
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(ownCompany.name, 14, 32);
        doc.text(`NIT: ${ownCompany.nit}`, 14, 36);
        doc.text(`${ownCompany.city || 'Bogotá D.C.'}, Colombia`, 14, 40);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(15, 23, 42); // #0f172a
        doc.text('ORDEN DE COMPRA', 196, 25, { align: 'right' });
        
        doc.setFontSize(14);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(oc.id, 196, 33, { align: 'right' });
        
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Fecha: ${oc.date}`, 196, 39, { align: 'right' });

        // Horizontal Rule
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.8);
        doc.line(14, 48, 196, 48);

        // 3. Info Cards (Box backgrounds)
        // Provider
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 55, 88, 30, 2, 2, 'F');
        doc.setDrawColor(241, 245, 249);
        doc.roundedRect(14, 55, 88, 30, 2, 2, 'S');

        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(148, 163, 184);
        doc.text('PROVEEDOR', 18, 60);

        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text(oc.providerName || 'Proveedor', 18, 66);
        
        const supInfo = providers.find(p => p.id === oc.providerId || p.name === oc.providerName);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`NIT: ${supInfo?.nit || 'N/A'}`, 18, 71);
        doc.text(`Tlf: ${oc.providerPhone || supInfo?.phone || 'N/A'}`, 18, 76);
        doc.text(`Email: ${oc.providerEmail || supInfo?.email || 'N/A'}`, 18, 81);

        // Shipping Info
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(108, 55, 88, 30, 2, 2, 'F');
        doc.setDrawColor(241, 245, 249);
        doc.roundedRect(108, 55, 88, 30, 2, 2, 'S');

        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(148, 163, 184);
        doc.text('ENVIAR A:', 112, 60);

        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text(ownCompany.delivery_address || ownCompany.address, 112, 66);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`${ownCompany.city || 'Bogotá D.C.'}, Colombia`, 112, 71);

        // 4. Items Table
        const tableColumn = ["DESCRIPCIÓN", "CANTIDAD", "V. UNITARIO", "V. TOTAL"];
        const tableRows = (oc.items || []).map(item => {
            const qty = item.quantity || item.toBuy || 0;
            const unit = item.unit_cost || item.purchasePrice || 0;
            const total = item.total_cost || (qty * unit);
            return [
                item.name || 'Material',
                qty.toLocaleString('es-CO'),
                `$${Math.round(unit).toLocaleString('es-CO')}`,
                `$${Math.round(total).toLocaleString('es-CO')}`
            ];
        });

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

        // 5. Totals
        const finalY = doc.lastAutoTable?.finalY || 100;
        const subtotal = (oc.items || []).reduce((sum, item) => sum + (item.total_cost || ((item.quantity || item.toBuy || 0) * (item.unit_cost || item.purchasePrice || 0))), 0);
        const tax = subtotal * 0.19;
        const total = subtotal + tax;

        const numFormat = (num) => `$${Math.round(num).toLocaleString('es-CO')}`;

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('Subtotal:', 145, finalY + 12, { align: 'right' });
        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'bold');
        doc.text(numFormat(subtotal), 196, finalY + 12, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('IVA (19%):', 145, finalY + 18, { align: 'right' });
        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'bold');
        doc.text(numFormat(tax), 196, finalY + 18, { align: 'right' });

        // Total badge in PDF
        doc.setFillColor(240, 253, 244); // #f0fdf4 (Light green)
        doc.roundedRect(125, finalY + 24, 71, 10, 2, 2, 'F');
        
        doc.setFontSize(11);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('TOTAL:', 145, finalY + 30, { align: 'right' });
        doc.setFontSize(13);
        doc.text(numFormat(total), 196, finalY + 30, { align: 'right' });

        doc.save(`${oc.id}.pdf`);
    };

    const handleReceiveOC = (ocId) => {
        if (!window.confirm("¿Estás seguro que quieres realizar esta acción? El inventario y los costos promedio se actualizarán automáticamente.")) {
            return;
        }
        const oc = purchaseOrders.find(o => o.id === ocId);

        // 1. Update Inventory MP (purchases column) AND Cost (Weighted Average)
        const updatedInventory = [...items];
        oc.items.forEach(ocItem => {
            const invItemIndex = updatedInventory.findIndex(i => i.id === ocItem.id || i.name === ocItem.name);
            if (invItemIndex !== -1) {
                const item = updatedInventory[invItemIndex];
                const currentStock = (item.initial || 0) + (item.purchases || 0) - (item.sales || 0);
                const currentTotalValue = currentStock * (item.avgCost || 0);
                const purchaseValue = ocItem.toBuy * ocItem.purchasePrice;

                const newTotalQty = currentStock + ocItem.toBuy;
                const newAvgCost = newTotalQty > 0 ? (currentTotalValue + purchaseValue) / newTotalQty : item.avgCost;

                updatedInventory[invItemIndex] = {
                    ...item,
                    purchases: (item.purchases || 0) + ocItem.toBuy,
                    avgCost: Math.round(newAvgCost)
                };
            }
        });
        // 2. Update OC status local
        const updatedOCs = purchaseOrders.map(o => {
            if (o.id === ocId) return { ...o, status: 'Recibida' };
            return o;
        });

        // Persist Inventory & OC changes to Supabase
        const persistReceipt = async () => {
            const res = await receivePurchase(ocId, oc.items, refs);
            if (!res.success) {
                console.error("Error persisting receipt:", res.error);
                alert("Error al guardar en la base de datos.");
            } else {
                await recalculatePTCosts();
                alert(`Ingreso registrado y base de datos actualizada.`);
            }
        };
        persistReceipt();

        setItems(updatedInventory);
        setPurchaseOrders(updatedOCs);

        // 3. Flow Check: If all OCs for a reference are received, move to production local
        const refs = Array.isArray(oc.relatedOrders) ? oc.relatedOrders : [oc.orderRef];

        refs.forEach(refId => {
            if (!refId) return;
            const allForRef = updatedOCs.filter(o => (o.relatedOrders && o.relatedOrders.includes(refId)) || o.orderRef === refId);
            const allReceived = allForRef.every(o => o.status === 'Recibida');

            if (allReceived) {
                setOrders(prevOrders => prevOrders.map(o => o.id === refId ? { ...o, status: 'En Producción' } : o));
            }
        });

        alert(`Ingreso registrado y base de datos actualizada.`);
    };

    const handlePaymentOC = async () => {
        if (!paymentBankId) {
            alert("Por favor selecciona un banco.");
            return;
        }

        const oc = paymentModalOC;
        const amount = oc.total || 0;

        try {
            // 1. Update OC Payment Status in Firestore
            const res = await payPurchase(oc.id, paymentBankId);
            if (!res.success) throw new Error(res.error);

            // 2. Update Bank Balance (Expense) using centralized function
            await updateBankBalance(paymentBankId, amount, 'expense', `Pago OC ${oc.id} a ${oc.providerName}`, oc.id);

            // 3. Update Local State (only purchase orders, bank state is updated by updateBankBalance)
            setPurchaseOrders(prev => prev.map(o => o.id === oc.id ? { ...o, paymentStatus: 'Pagado', bankId: paymentBankId } : o));

            alert(`Pago registrado exitosamente. Se descontaron $${amount.toLocaleString()} del banco seleccionado.`);
            setPaymentModalOC(null);
            setPaymentBankId('');
        } catch (err) {
            console.error("Error processing payment:", err);
            alert("Error al procesar el pago: " + err.message);
        }
    };

    const deepTeal = "#025357";
    const institutionOcre = "#D6BD98";
    const premiumSalmon = "#D4785A";
    const glassWhite = "rgba(255, 255, 255, 0.85)";

    return (
        <div className="purchases-module" style={{ 
            padding: '0 0.5rem',
            animation: 'fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
            {/* Gap for UI breathing room */}
            <div style={{ marginBottom: '1.5rem' }} />

            {/* Premium Supply Chain KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Procurement Volume - Main Card */}
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
                        <ShoppingCart size={150} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.4rem', borderRadius: '10px' }}><Package size={18} /></div>
                        <span style={{ fontSize: '0.75rem', fontWeight: '900', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px' }}>Volumen de Compras</span>
                    </div>
                    <div style={{ fontSize: '2.2rem', fontWeight: '900', letterSpacing: '-1.5px', lineHeight: 1 }}>
                        <span style={{ fontSize: '1.4rem', opacity: 0.6, marginRight: '4px', verticalAlign: 'middle' }}>$</span>
                        {purchaseStats.total.toLocaleString()}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '1.2rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.6rem 1.2rem', borderRadius: '14px', fontSize: '0.85rem', fontWeight: '900', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {purchaseStats.count} <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>ÓRDENES</span>
                        </div>
                    </div>
                </div>

                {/* Treasury Status - Glass Effect */}
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
                            <DollarSign size={20} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: '900', color: deepTeal, textTransform: 'uppercase', letterSpacing: '1px' }}>Tesorería (OCs)</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.2rem' }}>
                        {[
                            { label: 'Pagado', val: treasuryStats.paidTotal, count: treasuryStats.paidCount, color: '#10b981' },
                            { label: 'Pendiente', val: treasuryStats.unpaidTotal, count: treasuryStats.unpaidCount, color: premiumSalmon }
                        ].map(item => (
                            <div key={item.label} style={{ background: '#fcfcfc', padding: '0.8rem 1.2rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9', boxShadow: '0 4px 10px rgba(0,0,0,0.01)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>{item.label}</span>
                                    <span style={{ fontSize: '0.6rem', fontWeight: '800', color: '#cbd5e1' }}>{item.count} DOCS</span>
                                </div>
                                <span style={{ fontSize: '1.2rem', fontWeight: '900', color: item.color }}>${item.val.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Logistics Health - High Performance */}
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
                            <Truck size={20} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Ingreso Lead-Time</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                        <div style={{ fontSize: '2.5rem', fontWeight: '900', color: deepTeal, lineHeight: 1 }}>92<span style={{fontSize: '1.2rem', opacity: 0.5}}>%</span></div>
                    </div>
                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', background: '#fcfcfc', padding: '0.8rem 1.2rem', borderRadius: '14px', width: 'fit-content', border: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: '900', color: '#64748b' }}>RECIBIDO: <span style={{ color: '#10b981' }}>{inventoryKPIs.receivedCount}</span></div>
                        <div style={{ height: '10px', width: '1px', background: '#cbd5e1' }} />
                        <div style={{ fontSize: '0.7rem', fontWeight: '900', color: '#64748b' }}>EN TRÁNSITO: <span style={{ color: institutionOcre }}>{inventoryKPIs.pendingCount}</span></div>
                    </div>
                </div>
            </div>

            {/* Action Bar & Filter Section - Premium Glass Design */}
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1.5rem', 
                marginBottom: '2rem',
                background: glassWhite,
                backdropFilter: 'blur(10px)',
                padding: '1.2rem 2rem',
                borderRadius: '24px',
                border: '1px solid rgba(2, 54, 54, 0.05)',
                boxShadow: '0 10px 25px rgba(0,0,0,0.02)',
                animation: 'fadeUp 0.6s ease-out'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ display: 'flex', background: 'rgba(2, 83, 87, 0.05)', padding: '6px', borderRadius: '22px', border: '1px solid rgba(2, 83, 87, 0.08)' }}>
                            {['week', 'month', 'custom'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => setFilterType(type)}
                                    style={{
                                        padding: '0.7rem 1.5rem', 
                                        borderRadius: '12px', 
                                        border: 'none',
                                        fontSize: '0.75rem', 
                                        fontWeight: '900',
                                        cursor: 'pointer',
                                        background: filterType === type ? deepTeal : 'transparent',
                                        color: filterType === type ? '#fff' : '#64748b',
                                        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}
                                >{type === 'week' ? 'Semana' : type === 'month' ? 'Mes' : 'Personalizado'}</button>
                            ))}
                        </div>
        
                        {filterType === 'custom' && (
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '1rem', 
                                background: '#fcfcfc', 
                                padding: '0 1.2rem', 
                                height: '52px',
                                borderRadius: '14px', 
                                border: '1px solid #f1f5f9',
                                animation: 'slideInRight 0.4s ease-out'
                            }}>
                                <input
                                    type="date"
                                    value={customRange.from}
                                    onChange={(e) => setCustomRange({ ...customRange, from: e.target.value })}
                                    style={{ border: 'none', background: 'transparent', fontSize: '0.95rem', fontWeight: '800', color: deepTeal, outline: 'none' }}
                                />
                                <ArrowRight size={18} color="#94a3b8" />
                                <input
                                    type="date"
                                    value={customRange.to}
                                    onChange={(e) => setCustomRange({ ...customRange, to: e.target.value })}
                                    style={{ border: 'none', background: 'transparent', fontSize: '0.95rem', fontWeight: '800', color: deepTeal, outline: 'none' }}
                                />
                            </div>
                        )}
                    </div>

                    <div style={{ flex: 1, position: 'relative', minWidth: '300px', display: 'flex', gap: '1rem' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={20} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text"
                                placeholder="Busca por Proveedor, OC, Fecha, Valor o Pedido..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '1rem 3.5rem 1rem 3.5rem',
                                    borderRadius: '16px',
                                    border: '1px solid #f1f5f9',
                                    outline: 'none',
                                    fontSize: '0.95rem',
                                    fontWeight: '600',
                                    background: '#fcfcfc',
                                    color: '#1e293b',
                                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                                }}
                                onFocus={(e) => { e.target.style.borderColor = deepTeal; e.target.style.boxShadow = `0 12px 40px ${deepTeal}10`; }}
                                onBlur={(e) => { e.target.style.borderColor = '#f1f5f9'; e.target.style.boxShadow = 'none'; }}
                            />
                            {searchTerm && (
                                <button 
                                    onClick={() => setSearchTerm('')}
                                    style={{ position: 'absolute', right: '1.2rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setIsCreatingManualOC(true)}
                            style={{
                                background: deepTeal,
                                color: 'white',
                                padding: '0 1.5rem',
                                borderRadius: '16px',
                                border: 'none',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                boxShadow: '0 4px 12px rgba(2, 83, 87, 0.2)',
                                transition: 'all 0.3s',
                                whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <Plus size={18} /> Orden de Compra
                        </button>
                    </div>
                </div>
            </div>


            {/* List of Generated Purchase Orders (OC) - Premium Table */}
            <section style={{ marginBottom: '5rem' }}>
                <div style={{ marginBottom: '2rem' }} />
 
                <div style={{ 
                    background: glassWhite,
                    backdropFilter: 'blur(10px)',
                    borderRadius: '45px', 
                    border: '1px solid rgba(255, 255, 255, 0.5)', 
                    overflow: 'hidden', 
                    boxShadow: '0 20px 50px rgba(0,0,0,0.03)' 
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(2, 83, 87, 0.03)', borderBottom: '1px solid #f1f5f9' }}>
                                <th style={{ padding: '2rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Referencia OC</th>
                                <th style={{ padding: '2rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Proveedor</th>
                                <th style={{ padding: '2rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Pedidos Relacionados</th>
                                <th style={{ padding: '2rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Fecha</th>
                                <th style={{ padding: '2rem 1.5rem', textAlign: 'right', fontSize: '0.8rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Valor Total</th>
                                <th style={{ padding: '2rem 1.5rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Ingreso Inv.</th>
                                <th style={{ padding: '2rem 1.5rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Acciones</th>
                                <th style={{ padding: '2rem 1.5rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPurchaseOrders.length > 0 ? filteredPurchaseOrders.map(oc => (
                                <tr
                                    key={oc.id}
                                    style={{ borderBottom: '1px solid #f8fafc', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(2, 83, 87, 0.02)'; e.currentTarget.style.transform = 'scale(0.998)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
                                >
                                    <td style={{ padding: '2rem 1.5rem' }}>
                                        <div 
                                            onClick={(e) => { e.stopPropagation(); setViewingOC(oc); }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }}
                                        >
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: oc.status === 'Recibida' ? '#10b981' : institutionOcre }} />
                                            <span style={{ fontWeight: '900', color: deepTeal, fontSize: '1rem', letterSpacing: '-0.2px', textDecoration: 'underline' }}>{oc.id}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '2rem 1.5rem', fontWeight: '800', color: '#1e293b', fontSize: '0.95rem' }}>{oc.providerName || oc.supplier}</td>
                                    <td style={{ padding: '2rem 1.5rem' }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {(Array.isArray(oc.relatedOrders) ? oc.relatedOrders : [oc.orderRef || 'N/A']).map(ref => (
                                                <div key={ref} style={{ fontSize: '0.7rem', background: '#f1f5f9', color: '#64748b', padding: '4px 10px', borderRadius: '8px', fontWeight: '900', border: '1px solid #e2e8f0' }}>{ref}</div>
                                            ))}
                                        </div>
                                    </td>
                                    <td style={{ padding: '2rem 1.5rem', fontSize: '0.9rem', color: '#64748b', fontWeight: '700' }}>{oc.date}</td>
                                    <td style={{ padding: '2rem 1.5rem', textAlign: 'right' }}>
                                        <div style={{ fontWeight: '900', color: '#1e293b', fontSize: '1.2rem', letterSpacing: '-0.5px' }}>
                                            <span style={{ fontSize: '0.8rem', opacity: 0.4, marginRight: '4px' }}>$</span>
                                            {(oc.total || 0).toLocaleString('es-CO')}
                                        </div>
                                    </td>
                                    <td style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
                                        {oc.status === 'Recibida' ? (
                                            <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                                <CheckCircle2 size={24} /> INGRESADO
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setInvEntryOC(oc); }}
                                                style={{
                                                    background: '#fff', border: '1px solid #e2e8f0', padding: '0.6rem 1rem', borderRadius: '10px',
                                                    fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', cursor: 'pointer', transition: '0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                                            >
                                                INGRESAR...
                                            </button>
                                        )}
                                    </td>
                                    <td style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
                                        {oc.paymentStatus !== 'Pagado' ? (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setPaymentModalOC(oc); }}
                                                style={{ 
                                                    background: `${premiumSalmon}15`, 
                                                    color: premiumSalmon, 
                                                    border: `1px solid ${premiumSalmon}30`, 
                                                    borderRadius: '12px', 
                                                    padding: '0.8rem 1.5rem', 
                                                    fontSize: '0.75rem', 
                                                    fontWeight: '900', 
                                                    cursor: 'pointer', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '0.6rem',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '1px',
                                                    transition: 'all 0.3s'
                                                }}
                                            >
                                                PAGAR
                                            </button>
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#10b981' }}>LIQUIDADO</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
                                        <span style={{ 
                                            padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '900',
                                            background: oc.status === 'Recibida' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(214, 189, 152, 0.2)',
                                            color: oc.status === 'Recibida' ? '#10b981' : '#B8A07E',
                                            border: '1px solid currentColor'
                                        }}>
                                            {oc.status.toUpperCase()}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="8" style={{ padding: '6rem', textAlign: 'center', color: '#94a3b8', fontWeight: '900', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
                                        No se encontraron registros de compra.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* OC Detail Modal - Premium Style */}
            {viewingOC && (
                <div 
                    onClick={() => setViewingOC(null)}
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(15, 23, 42, 0.4)',
                        backdropFilter: 'blur(12px)',
                        zIndex: 3000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2rem',
                        animation: 'fadeIn 0.3s'
                    }}
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#fff',
                            width: '100%',
                            maxWidth: '900px',
                            maxHeight: '90vh',
                            borderRadius: '32px',
                            boxShadow: '0 30px 60px rgba(0,0,0,0.2)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.2)'
                        }}
                    >
                        {/* Modal Header */}
                        <div style={{
                            padding: '2rem 2.5rem',
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'linear-gradient(to right, #f8fafc, #fff)'
                        }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: '#025357', marginBottom: '0.4rem' }}>
                                    <FileText size={24} />
                                    <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', letterSpacing: '-0.5px' }}>Orden de Compra</h2>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: '700' }}>REGISTRO OFICIAL - {viewingOC.id}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <button
                                    onClick={() => handleDownloadOCPDF(viewingOC)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                                        background: '#025357', color: '#fff',
                                        border: 'none', padding: '0.8rem 1.5rem', borderRadius: '12px',
                                        fontWeight: '900', cursor: 'pointer', transition: 'all 0.2s',
                                        fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px'
                                    }}
                                >
                                    <Download size={18} /> Exportar PDF
                                </button>
                                <button
                                    onClick={() => setViewingOC(null)}
                                    style={{ 
                                        width: '40px', height: '40px', borderRadius: '50%',
                                        background: '#fee2e2', border: 'none', cursor: 'pointer', 
                                        color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <X size={20} weight="bold" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '2.5rem', overflowY: 'auto' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
                                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                                    <h4 style={{ margin: '0 0 1rem', color: '#94a3b8', fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Comprador / Facturar a:</h4>
                                    <div style={{ fontWeight: '900', fontSize: '1.1rem', color: '#1e293b', marginBottom: '0.4rem' }}>{ownCompany.name}</div>
                                    <div style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: '1.6', fontWeight: '600' }}>
                                        NIT: {ownCompany.nit}<br />
                                        {ownCompany.address || ''}<br />
                                        Ref. Ventas Relacionadas: <span style={{ color: '#025357' }}>{Array.isArray(viewingOC.relatedOrders) ? viewingOC.relatedOrders.join(', ') : (viewingOC.orderRef || 'N/A')}</span>
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)', padding: '1.5rem', borderRadius: '20px' }}>
                                    <h4 style={{ margin: '0 0 1rem', color: '#10b981', fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Datos del Proveedor:</h4>
                                    <div style={{ fontWeight: '900', fontSize: '1.1rem', color: '#1e293b', marginBottom: '0.4rem' }}>{viewingOC.providerName || viewingOC.supplier}</div>
                                    <div style={{ color: '#1e293b', fontSize: '0.85rem', lineHeight: '1.6', fontWeight: '600', opacity: 0.8 }}>
                                        NIT: {providers.find(s => s.name === (viewingOC.providerName || viewingOC.supplier))?.nit || '901.000.123-x'}<br />
                                        Logística: {providers.find(s => s.name === (viewingOC.providerName || viewingOC.supplier))?.lead_time || '2-3 días'} entrega<br />
                                        Emisión Documento: {viewingOC.date}
                                    </div>
                                </div>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem', marginBottom: '2.5rem' }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '900', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Insumo Materia Prima</th>
                                        <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '900', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Unidades</th>
                                        <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '900', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Costo Unit.</th>
                                        <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '900', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>IVA</th>
                                        <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '900', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {viewingOC.items.map((item, idx) => {
                                        const qtyValue = item.toBuy || item.quantity || 0;
                                        const unitValue = item.purchasePrice || item.price || item.unit_cost || 0;
                                        const total = unitValue * qtyValue;
                                        return (
                                            <tr key={idx} style={{ background: '#f8fafc' }}>
                                                <td style={{ padding: '1.2rem 1rem', borderRadius: '12px 0 0 12px' }}>
                                                    <div style={{ fontWeight: '900', color: '#1e293b' }}>{item.name}</div>
                                                </td>
                                                <td style={{ padding: '1.2rem 1rem', textAlign: 'center', fontWeight: '900', color: '#1e293b' }}>
                                                    {qtyValue.toLocaleString('es-CO')} <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.unit || ''}</span>
                                                </td>
                                                <td style={{ padding: '1.2rem 1rem', textAlign: 'right', color: '#64748b', fontWeight: '700' }}>${Math.round(unitValue).toLocaleString('es-CO')}</td>
                                                <td style={{ padding: '1.2rem 1rem', textAlign: 'right', color: '#94a3b8', fontWeight: '700' }}>19%</td>
                                                <td style={{ padding: '1.2rem 1rem', textAlign: 'right', fontWeight: '900', color: '#1e293b', borderRadius: '0 12px 12px 0' }}>
                                                    ${Math.round(total).toLocaleString('es-CO')}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <div style={{ width: '320px', background: '#f8fafc', padding: '2rem', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
                                    {(() => {
                                        let sub = 0;
                                        let iva = 0;
                                        viewingOC.items.forEach(i => {
                                            const subQty = i.toBuy || i.quantity || 0;
                                            const subPrice = i.purchasePrice || i.price || i.unit_cost || 0;
                                            const v = subPrice * subQty;
                                            sub += v;
                                            iva += v * 0.19;
                                        });
                                        return (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b' }}>SUBTOTAL NETO</span>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: '900', color: '#1e293b' }}>${Math.round(sub).toLocaleString('es-CO')}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b' }}>IVA (19%)</span>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: '900', color: '#1e293b' }}>${Math.round(iva).toLocaleString('es-CO')}</span>
                                                </div>
                                                <div style={{ height: '1px', background: '#e2e8f0', margin: '1rem 0' }} />
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: '900', color: '#025357' }}>TOTAL ORDEN</span>
                                                    <span style={{ fontSize: '1.5rem', fontWeight: '900', color: '#025357', letterSpacing: '-0.5px' }}>
                                                        ${Math.round(sub + iva).toLocaleString('es-CO')}
                                                    </span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', paddingBottom: '2.5rem' }}>
                                <button
                                    onClick={() => setViewingOC(null)}
                                    style={{
                                        padding: '1rem 3rem',
                                        background: '#f1f5f9',
                                        color: '#64748b',
                                        border: 'none',
                                        borderRadius: '16px',
                                        fontWeight: '900',
                                        fontSize: '0.9rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#1e293b'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
                                >
                                    Listo, Cerrar Vista
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal - Premium Style */}
            {paymentModalOC && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000,
                    padding: '1.5rem', animation: 'fadeIn 0.3s'
                }}>
                    <div style={{ 
                        background: '#fff', 
                        padding: '2.5rem', 
                        borderRadius: '32px', 
                        width: '450px', 
                        boxShadow: '0 30px 60px rgba(0,0,0,0.2)',
                        position: 'relative',
                        border: '1px solid rgba(255,255,255,0.2)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: '#D4785A' }}>
                                <DollarSign size={24} />
                                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900', letterSpacing: '-0.5px' }}>Registrar Pago OC</h3>
                            </div>
                            <button onClick={() => setPaymentModalOC(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={24} /></button>
                        </div>

                        <div style={{ background: '#fff7ed', padding: '1.5rem', borderRadius: '20px', marginBottom: '2rem', border: '1px solid #ffedd5' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#c2410c' }}>ORDEN DE COMPRA</span>
                                <span style={{ fontSize: '0.8rem', fontWeight: '900', color: '#1e293b' }}>{paymentModalOC.id}</span>
                            </div>
                            <div style={{ height: '1px', background: '#ffedd5', margin: '1rem 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#c2410c' }}>VALOR A LIQUIDAR</span>
                                <span style={{ fontSize: '1.6rem', fontWeight: '900', color: '#c2410c', letterSpacing: '-0.5px' }}>
                                    ${(paymentModalOC.total || 0).toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '900', color: '#64748b', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Origen de los Fondos (Banco)
                            </label>
                            <select
                                value={paymentBankId}
                                onChange={(e) => setPaymentBankId(e.target.value)}
                                style={{ 
                                    width: '100%', 
                                    padding: '1rem', 
                                    borderRadius: '16px', 
                                    border: '1px solid #f1f5f9', 
                                    background: '#f8fafc',
                                    fontSize: '0.9rem',
                                    fontWeight: '700',
                                    color: '#1e293b',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                    cursor: 'pointer'
                                }}
                                onFocus={(e) => { e.target.style.background = '#fff'; e.target.style.borderColor = '#025357'; }}
                                onBlur={(e) => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#f1f5f9'; }}
                            >
                                <option value="">Seleccione una cuenta...</option>
                                {banks.map(bank => (
                                    <option key={bank.id} value={bank.id}>{bank.name} (${(bank.balance || 0).toLocaleString()})</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => setPaymentModalOC(null)}
                                style={{ 
                                    flex: 1, 
                                    padding: '1rem', 
                                    borderRadius: '16px', 
                                    border: '1px solid #f1f5f9', 
                                    background: '#fff', 
                                    color: '#64748b',
                                    fontWeight: '900', 
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                            >
                                DESCARTAR
                            </button>
                            <button
                                onClick={handlePaymentOC}
                                style={{ 
                                    flex: 1, 
                                    padding: '1rem', 
                                    borderRadius: '16px', 
                                    border: 'none', 
                                    background: '#025357', 
                                    color: '#fff', 
                                    fontWeight: '900', 
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    boxShadow: '0 10px 20px rgba(2, 83, 87, 0.2)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => { e.target.style.transform = 'scale(1.02)'; e.target.style.boxShadow = '0 15px 30px rgba(2, 83, 87, 0.3)'; }}
                                onMouseLeave={(e) => { e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = '0 10px 20px rgba(2, 83, 87, 0.2)'; }}
                            >
                                CONFIRMAR PAGO
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* MANUAL OC CREATION MODAL */}
            {isCreatingManualOC && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000,
                    padding: '2rem'
                }}>
                    <div style={{ 
                        background: '#f8fafc', width: '100%', maxWidth: '1000px', maxHeight: '90vh', 
                        borderRadius: '32px', boxShadow: '0 50px 100px -20px rgba(0,0,0,0.5)', 
                        display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        {/* Header */}
                        <div style={{ padding: '1.5rem 2.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.5rem', color: deepTeal, display: 'flex', alignItems: 'center', gap: '0.8rem', fontWeight: '900' }}>
                                    <ShoppingCart size={28} /> Nueva Orden de Compra Manual
                                </h3>
                                <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>Crea una OC directamente sin explosionar pedidos.</p>
                            </div>
                            <button onClick={() => setIsCreatingManualOC(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '0.6rem', cursor: 'pointer', color: '#64748b', display: 'flex' }}><X size={24} /></button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 1.2fr', flex: 1, overflow: 'hidden' }}>
                            {/* Left Panel: Selection & Inputs */}
                            <div style={{ padding: '2rem', borderRight: '1px solid #e2e8f0', overflowY: 'auto', background: '#fff' }}>
                                
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '1px' }}>1. Seleccionar Proveedor</label>
                                    <select
                                        value={manualOCData.providerId}
                                        onChange={(e) => setManualOCData({ ...manualOCData, providerId: e.target.value })}
                                        style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: '1px solid #f1f5f9', background: '#f8fafc', fontSize: '0.95rem', fontWeight: '700', color: deepTeal, outline: 'none' }}
                                    >
                                        <option value="">Buscar proveedor...</option>
                                        {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>

                                <div style={{ marginBottom: '2rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '1px' }}>2. Agregar Materias Primas / Insumos</label>
                                    <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '24px', border: '1px dashed #cbd5e1' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <select
                                                value={newItem.id}
                                                onChange={(e) => {
                                                    const mat = items.find(i => i.id === e.target.value);
                                                    setNewItem({ ...newItem, id: e.target.value, unitCost: mat?.avgCost || 0 });
                                                }}
                                                style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.9rem', fontWeight: '600' }}
                                            >
                                                <option value="">Seleccionar material...</option>
                                                {items.filter(i => i.type !== 'product' && i.type !== 'PT').map(i => (
                                                    <option key={i.id} value={i.id}>{i.name} ({i.purchase_unit || i.unit || 'und'})</option>
                                                ))}
                                            </select>
                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                <div style={{ flex: 1 }}>
                                                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: '800' }}>CANTIDAD</span>
                                                    <input 
                                                        type="number" 
                                                        value={newItem.quantity}
                                                        onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', fontWeight: '800', textAlign: 'center' }}
                                                    />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: '800' }}>COSTO UNIT ($)</span>
                                                    <input 
                                                        type="number" 
                                                        value={newItem.unitCost}
                                                        onChange={(e) => setNewItem({ ...newItem, unitCost: parseFloat(e.target.value) || 0 })}
                                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', fontWeight: '800', textAlign: 'right' }}
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleAddManualItem}
                                                disabled={!newItem.id || newItem.quantity <= 0}
                                                style={{ 
                                                    width: '100%', 
                                                    padding: '1rem', 
                                                    background: newItem.id ? deepTeal : '#f1f5f9', 
                                                    color: newItem.id ? '#fff' : '#cbd5e1', 
                                                    border: 'none', 
                                                    borderRadius: '16px', 
                                                    fontWeight: '900', 
                                                    cursor: newItem.id ? 'pointer' : 'not-allowed',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.5rem',
                                                    transition: 'all 0.3s'
                                                }}
                                            >
                                                <Plus size={20} /> AGREGAR A LA LISTA
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Items List for Deletion */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    {manualOCData.items.map((item, idx) => (
                                        <div key={idx} style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center', 
                                            background: '#f8fafc', 
                                            padding: '1rem 1.5rem', 
                                            borderRadius: '16px',
                                            border: '1px solid #f1f5f9'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: '800', color: deepTeal, fontSize: '0.9rem' }}>{item.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>{item.quantity} {item.unit} x ${item.unitCost.toLocaleString()}</div>
                                            </div>
                                            <button 
                                                onClick={() => setManualOCData({ ...manualOCData, items: manualOCData.items.filter((_, i) => i !== idx) })}
                                                style={{ padding: '0.5rem', background: '#fef2f2', border: 'none', borderRadius: '8px', color: '#ef4444', cursor: 'pointer' }}
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right Panel: Live Preview */}
                            <div style={{ padding: '2rem', background: '#f1f5f9', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                <div style={{ transform: 'scale(0.95)', transformOrigin: 'top center' }}>
                                    <DocumentBuilder 
                                        type="ORDEN DE COMPRA MANUAL"
                                        docId="BORRADOR-AUTO"
                                        date={manualOCData.date}
                                        client={{
                                             name: ownCompany.name,
                                             detail1: ownCompany.name,
                                             detail2: `NIT: ${ownCompany.nit}`,
                                             address: ownCompany.address,
                                             phone: ownCompany.phone
                                        }}
                                        shippingInfo={{
                                             title: 'Lugar de Entrega',
                                             location: ownCompany.name,
                                             address: ownCompany.delivery_address || ownCompany.address
                                        }}
                                        provider={{
                                             name: providers.find(p => p.id === manualOCData.providerId)?.name || 'Selecciona un proveedor',
                                             nit: providers.find(p => p.id === manualOCData.providerId)?.nit || '',
                                             phone: providers.find(p => p.id === manualOCData.providerId)?.phone || '',
                                             email: providers.find(p => p.id === manualOCData.providerId)?.email || ''
                                        }}
                                        items={manualOCData.items.map(i => ({
                                            name: i.name,
                                            quantity: i.quantity,
                                            unit: i.unit,
                                            unitCost: i.unitCost,
                                            totalCost: i.quantity * i.unitCost
                                        }))}
                                        totals={{
                                            subtotal: manualOCData.items.reduce((s, i) => s + (i.quantity * i.unitCost), 0),
                                            taxLabel: 'IVA (19%)',
                                            taxValue: manualOCData.items.reduce((s, i) => s + (i.quantity * i.unitCost), 0) * 0.19,
                                            total: manualOCData.items.reduce((s, i) => s + (i.quantity * i.unitCost), 0) * 1.19
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div style={{ padding: '1.5rem 2.5rem', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '1.5rem' }}>
                            <button
                                onClick={() => setIsCreatingManualOC(false)}
                                style={{ padding: '1rem 2.5rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '16px', color: '#64748b', fontWeight: '900', fontSize: '0.9rem', cursor: 'pointer' }}
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={handleSaveManualOC}
                                disabled={manualOCData.items.length === 0 || !manualOCData.providerId}
                                style={{ 
                                    padding: '1rem 3rem', 
                                    background: (manualOCData.items.length > 0 && manualOCData.providerId) ? '#16a34a' : '#f1f5f9', 
                                    color: (manualOCData.items.length > 0 && manualOCData.providerId) ? '#fff' : '#cbd5e1', 
                                    border: 'none', 
                                    borderRadius: '16px', 
                                    fontWeight: '900', 
                                    fontSize: '0.9rem', 
                                    cursor: (manualOCData.items.length > 0 && manualOCData.providerId) ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.8rem',
                                    boxShadow: (manualOCData.items.length > 0 && manualOCData.providerId) ? '0 10px 30px rgba(22,163,74,0.3)' : 'none',
                                    transition: 'all 0.3s'
                                }}
                            >
                                <CheckCircle size={20} /> GUARDAR Y SINCRONIZAR OC
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {invEntryOC && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3100,
                    padding: '2rem', animation: 'fadeIn 0.3s'
                }}>
                    <div style={{ 
                        background: '#fff', padding: '2.5rem', borderRadius: '32px', width: '550px', 
                        boxShadow: '0 30px 60px rgba(0,0,0,0.2)', position: 'relative'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: '#16a34a' }}>
                                <Package size={24} />
                                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900' }}>Ingreso de Materias Primas</h3>
                            </div>
                            <button onClick={() => setInvEntryOC(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={24} /></button>
                        </div>
                        
                        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            Confirma la recepción física de los siguientes insumos de la <strong>OC {invEntryOC.id}</strong> para que ingresen al inventario:
                        </p>

                        <div style={{ maxHeight: '300px', overflowY: 'auto', background: '#f8fafc', borderRadius: '16px', padding: '1.2rem', marginBottom: '2rem' }}>
                            {invEntryOC.items.map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0', borderBottom: i === invEntryOC.items.length - 1 ? 'none' : '1px solid #e2e8f0' }}>
                                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1e293b' }}>{item.name}</div>
                                    <div style={{ fontWeight: '900', color: '#023636' }}>{item.toBuy || item.quantity} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{item.unit}</span></div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => { handleReceiveOC(invEntryOC.id); setInvEntryOC(null); }}
                            style={{
                                width: '100%', padding: '1.2rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '16px',
                                fontWeight: '900', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem'
                            }}
                        >
                            <Save size={20} /> INGRESO MP A INV.
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Purchases;
