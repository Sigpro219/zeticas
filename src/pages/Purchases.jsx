import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';
import {
    ShoppingCart,
    Calendar,
    ArrowRight,
    CheckCircle,
    Package,
    FileText,
    ChevronDown,
    Users,
    Plus,
    Save,
    AlertCircle,
    Truck,
    Check,
    Download,
    Eye,
    DollarSign,
    TrendingUp,
    TrendingDown,
    Filter,
    Search,
    X
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';

const Purchases = ({ orders, setOrders, items, setItems, purchaseOrders, setPurchaseOrders, recipes, providers }) => {
    const { banks, updateBankBalance, recalculatePTCosts } = useBusiness();
    // Local State for BOM Explosion & OC Generation
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [supplierAssignments, setSupplierAssignments] = useState({}); // { mpId: supplierName }
    const [viewingOC, setViewingOC] = useState(null); // Modal state for OC
    const [paymentModalOC, setPaymentModalOC] = useState(null);
    const [paymentBankId, setPaymentBankId] = useState('');

    // Filters and UI State
    const [filterType, setFilterType] = useState('month');
    const [customRange, setCustomRange] = useState({ from: '', to: '' });
    const [searchTerm, setSearchTerm] = useState('');

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
                (po.relatedOrders || []).some(ref => ref.toLowerCase().includes(query))
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

        // Header Build
        doc.setFontSize(22);
        doc.setTextColor(30, 41, 59);
        doc.text('ORDEN DE COMPRA', 14, 22);

        try {
            const logoUrl = 'https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/assets/logo.png';
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = logoUrl;
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
            const imgWidth = 45;
            const imgHeight = (img.height * imgWidth) / img.width;
            doc.addImage(img, 'PNG', 196 - imgWidth, 12, imgWidth, imgHeight);
        } catch (error) {
            console.error("Error loading logo for PDF", error);
        }

        // OC Info
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`OC No: ${oc.id}`, 14, 30);
        doc.text(`Fecha: ${oc.date}`, 14, 35);
        const refText = Array.isArray(oc.relatedOrders) ? oc.relatedOrders.join(', ') : (oc.orderRef || 'N/A');
        doc.text(`Ref. Pedidos: ${refText}`, 14, 40);

        doc.setDrawColor(226, 232, 240);
        doc.line(14, 45, 196, 45);

        // Vendor (Zeticas)
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text('COMPRADOR / FACTURAR A:', 14, 55);
        doc.setFont('helvetica', 'bold');
        doc.text('Zeticas S.A.S.', 14, 60);
        doc.setFont('helvetica', 'normal');
        doc.text('NIT: 901.234.567-8', 14, 65);
        doc.text('Bogotá, Colombia', 14, 70);

        // Supplier Data
        const supplierInfo = providers.find(s => s.name === oc.providerName || s.id === oc.providerId);
        doc.text('DATOS DEL PROVEEDOR', 105, 55);
        doc.setFont('helvetica', 'bold');
        doc.text(oc.providerName || 'Proveedor', 105, 60);
        doc.setFont('helvetica', 'normal');
        doc.text(`NIT: ${supplierInfo?.nit || '901.000.123-x'}`, 105, 65);
        doc.text(`Tiempo de Entrega: ${supplierInfo?.lead_time || '2-3 días'}`, 105, 70);

        // Products Table
        const tableColumn = ["ID / Ref", "Insumo", "Cant.", "Und", "V. Unitario", "IVA", "V. Total"];
        const tableRows = [];

        // Mock taxes (IVA = 19%)
        let subtotal = 0;
        let totalTaxes = 0;

        oc.items.forEach(item => {
            const unitValue = item.purchasePrice || 0;
            const itemTotal = unitValue * item.toBuy;
            const iva = itemTotal * 0.19; // Simplified 19% VAT for illustration

            subtotal += itemTotal;
            totalTaxes += iva;

            tableRows.push([
                item.id,
                item.name,
                item.toBuy,
                item.unit,
                `$${Math.round(unitValue).toLocaleString()}`,
                `19%`,
                `$${Math.round(itemTotal).toLocaleString()}`
            ]);
        });

        const numFormat = (num) => `$${Math.round(num).toLocaleString()}`;

        autoTable(doc, {
            startY: 85,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [45, 79, 79], textColor: [255, 255, 255], fontStyle: 'bold' },
            bodyStyles: { textColor: [51, 65, 85] },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 14, right: 14 }
        });

        const finalY = doc.lastAutoTable?.finalY || 85;
        const grantotal = subtotal + totalTaxes;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Subtotal: ${numFormat(subtotal)}`, 196, finalY + 10, { align: 'right' });
        doc.text(`Impuestos (19%): ${numFormat(totalTaxes)}`, 196, finalY + 15, { align: 'right' });

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(`TOTAL OC: ${numFormat(grantotal)}`, 196, finalY + 23, { align: 'right' });

        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(148, 163, 184);
        doc.text('Documento oficial de compras - Zeticas OS', 105, 280, { align: 'center' });

        doc.save(`${oc.id}.pdf`);
    };

    // Suppliers are passed as 'providers' prop
    const suppliers = providers;

    // Filter orders that are in "En Compras"
    const ordersInPurchaseChannel = useMemo(() => orders.filter(o => o.status === 'En Compras'), [orders]);

    // BOM Explosion for selected order
    const requirementExplosion = useMemo(() => {
        if (!selectedOrderId) return [];
        const order = orders.find(o => o.id === selectedOrderId);
        if (!order) return [];

        const explosion = {};
        order.items.forEach(item => {
            const recipe = recipes[item.name] || recipes[item.id] || [];
            recipe.forEach(mp => {
                const totalNeeded = mp.qty * item.quantity;
                // Find material in items (could be by legacy numeric ID or Name)
                const materialInfo = items.find(i => i.id === mp.id || i.name === mp.name || (typeof mp.id === 'string' && i.id === mp.id));
                const matId = materialInfo ? materialInfo.id : mp.id;
                const matName = materialInfo ? materialInfo.name : (mp.name || `Insumo ${mp.id}`);

                if (!explosion[matId]) {
                    explosion[matId] = {
                        id: matId,
                        name: matName,
                        unit: materialInfo?.unit || 'und',
                        totalNeeded: 0,
                        isMissing: !materialInfo
                    };
                }
                explosion[matId].totalNeeded += totalNeeded;
            });
        });

        return Object.values(explosion).map(mp => {
            const material = items.find(i => i.id === mp.id || i.name === mp.name);
            const available = (material?.initial || 0) + (material?.purchases || 0) - (material?.sales || 0);
            const toBuy = Math.max(0, mp.totalNeeded - available + (material?.safety || 0));
            return {
                ...mp,
                available,
                toBuy: Number(toBuy.toFixed(2))
            };
        });
    }, [selectedOrderId, orders, items, recipes]);

    // Actions
    const handleAssignSupplier = (mpId, supplierName) => {
        setSupplierAssignments({
            ...supplierAssignments,
            [mpId]: supplierName
        });
    };

    const handleGenerateOC = () => {
        const pendingItems = requirementExplosion.filter(item => item.toBuy > 0 && !supplierAssignments[item.id]);
        if (pendingItems.length > 0) {
            alert('Debes asignar un proveedor a todas las materias primas con faltante (marcadas en rojo).');
            return;
        }

        // Group by supplier
        const itemsBySupplier = {};
        requirementExplosion.filter(item => item.toBuy > 0).forEach(item => {
            const supplier = supplierAssignments[item.id];
            if (!itemsBySupplier[supplier]) itemsBySupplier[supplier] = [];
            itemsBySupplier[supplier].push(item);
        });

        const newOCs = Object.keys(itemsBySupplier).map(supplier => ({
            id: `OC-${Math.floor(1000 + Math.random() * 9000)}`,
            providerName: supplier,
            relatedOrders: [selectedOrderId],
            date: new Date().toISOString().split('T')[0],
            status: 'Enviada',
            items: itemsBySupplier[supplier].map(item => {
                const historicalMaterial = items.find(i => i.id === item.id);
                const basePrice = historicalMaterial?.avgCost || 1000;
                return {
                    ...item,
                    purchasePrice: basePrice // Use exact historical price
                };
            })
        }));

        // Persist to Supabase
        const persistPOs = async () => {
            try {
                for (const po of newOCs) {
                    const subtotal = po.items.reduce((sum, i) => sum + (i.toBuy * i.purchasePrice), 0);
                    const total = subtotal * 1.19;

                    // Find supplier UUID
                    const { data: sData } = await supabase.from('suppliers').select('id').eq('name', po.providerName).single();

                    const { data: dbPur, error: poErr } = await supabase.from('purchases').insert({
                        po_number: po.id,
                        supplier_id: sData?.id,
                        status: 'ENVIADA',
                        total_cost: total
                    }).select().single();

                    if (!poErr && dbPur) {
                        const itemsToInsert = po.items.map(item => ({
                            purchase_id: dbPur.id,
                            raw_material_id: item.id,
                            quantity: item.toBuy,
                            unit_cost: item.purchasePrice,
                            total_cost: item.toBuy * item.purchasePrice
                        }));
                        await supabase.from('purchase_items').insert(itemsToInsert);
                    }
                }

                // Update related order status - Use business logic to find DB IDs if possible
                // For now updating by order_number
                await supabase.from('orders')
                    .update({ status: 'En Compras (OC Generadas)' })
                    .eq('order_number', selectedOrderId);

            } catch (err) {
                console.error("Error persisting POs:", err);
            }
        };
        persistPOs();

        setPurchaseOrders([...newOCs, ...purchaseOrders]);
        setOrders(orders.map(o => o.id === selectedOrderId ? { ...o, status: 'En Compras (OC Generadas)' } : o));

        setSelectedOrderId(null);
        setSupplierAssignments({});
        alert('Órdenes de Compra generadas y sincronizadas con la base de datos.');
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
            try {
                // 1. Update Inventory for each item
                for (const ocItem of oc.items) {
                    const updatedItem = updatedInventory.find(i => i.id === ocItem.id);
                    if (updatedItem) {
                        await supabase.from('products')
                            .update({
                                stock: updatedItem.initial,
                                cost: updatedItem.avgCost
                            })
                            .eq('id', updatedItem.id);
                    }
                }

                // 2. Update OC Status (Purchases)
                await supabase.from('purchases')
                    .update({ status: 'RECIBIDA' })
                    .eq('po_number', ocId);

                // 3. Update related orders if all OCs are received
                const refs = Array.isArray(oc.relatedOrders) ? oc.relatedOrders : [oc.orderRef];
                for (const refId of refs) {
                    if (!refId) continue;
                    // Logic to check if all POs for this order are received
                    const { data: pos } = await supabase.from('purchases').select('status').contains('related_orders', [refId]);
                    if (pos && pos.every(p => p.status === 'RECIBIDA')) {
                        await supabase.from('orders').update({ status: 'En Producción' }).eq('order_number', refId);
                    }
                }
                // Recalculate PT costs based on new MP costs
                await recalculatePTCosts();
            } catch (err) {
                console.error("Error persisting receipt:", err);
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
            // 1. Update OC Payment Status in Supabase
            const { error: poErr } = await supabase
                .from('purchases')
                .update({ payment_status: 'Pagado', bank_id: paymentBankId })
                .eq('po_number', oc.id);

            if (poErr) throw poErr;

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
                        <span style={{ fontSize: '0.75rem', fontWeight: '900', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px' }}>Volume Procurement</span>
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
                        <div style={{ fontSize: '0.7rem', fontWeight: '900', color: '#64748b' }}>TRANSIT: <span style={{ color: institutionOcre }}>{inventoryKPIs.pendingCount}</span></div>
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

                    <div style={{ flex: 1, position: 'relative', minWidth: '300px' }}>
                        <Search size={20} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Busca por Proveedor, OC o Pedido..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '1rem 1rem 1rem 3.5rem',
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
                    </div>
                </div>
            </div>

            {/* Selection of Active Orders - Premium Horizontal Scroll */}
            <section style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: `${deepTeal}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: deepTeal }}>
                        <FileText size={20} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b', fontWeight: '900', letterSpacing: '-0.3px' }}>Abastecimiento JIT en Cola</h3>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: '700' }}>Selecciona una orden para ejecutar el análisis.</p>
                    </div>
                </div>
 
                <div style={{ 
                    display: 'flex', 
                    gap: '2rem', 
                    overflowX: 'auto', 
                    padding: '1rem 0.5rem 2rem',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                }}>
                    {ordersInPurchaseChannel.length > 0 ? ordersInPurchaseChannel.map(order => (
                        <div
                            key={order.id}
                            onClick={() => {
                                // ... (recipe check logic remains same)
                                setSelectedOrderId(order.id);
                            }}
                            style={{
                                minWidth: '300px',
                                padding: '1.5rem 2rem',
                                background: selectedOrderId === order.id ? deepTeal : '#fff',
                                color: selectedOrderId === order.id ? '#fff' : '#1e293b',
                                borderRadius: '24px',
                                border: selectedOrderId === order.id ? 'none' : '1px solid #f1f5f9',
                                cursor: 'pointer',
                                transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                                boxShadow: selectedOrderId === order.id ? `0 15px 35px ${deepTeal}30` : '0 10px 30px rgba(0,0,0,0.01)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onMouseEnter={(e) => {
                                if (selectedOrderId !== order.id) {
                                    e.currentTarget.style.transform = 'translateY(-8px)';
                                    e.currentTarget.style.borderColor = deepTeal;
                                    e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.05)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (selectedOrderId !== order.id) {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.borderColor = '#f1f5f9';
                                    e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.02)';
                                }
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                                <span style={{ fontWeight: '900', fontSize: '0.85rem', letterSpacing: '0.5px', opacity: selectedOrderId === order.id ? 0.8 : 0.4 }}>{order.id}</span>
                                <div style={{ 
                                    padding: '4px 10px', 
                                    borderRadius: '50px', 
                                    background: selectedOrderId === order.id ? 'rgba(255,255,255,0.1)' : '#f8fafc',
                                    fontSize: '0.65rem',
                                    fontWeight: '900',
                                    color: selectedOrderId === order.id ? '#fff' : '#64748b',
                                    textTransform: 'uppercase'
                                }}>{order.date}</div>
                            </div>
                            <div style={{ fontWeight: '900', fontSize: '1.1rem', marginBottom: '0.5rem', letterSpacing: '-0.3px' }}>{order.client}</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Package size={14} /> {order.items.length} SKUs
                            </div>
                            
                            {selectedOrderId === order.id && (
                                <div style={{ marginTop: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.7rem', fontWeight: '900', color: '#4ade80' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 10px #4ade80' }} />
                                    JIT CALIBRADO
                                </div>
                            )}
                        </div>
                    )) : (
                        <div style={{ padding: '5rem', background: glassWhite, borderRadius: '40px', border: '2px dashed rgba(0,0,0,0.05)', color: '#94a3b8', width: '100%', textAlign: 'center', fontWeight: '900', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
                            Pipeline de Abastecimiento Limpio
                        </div>
                    )}
                </div>
            </section>
 
            {/* Requirement Explosion - JIT Analysis Table */}
            {selectedOrderId && (
                <section style={{
                    background: glassWhite,
                    backdropFilter: 'blur(10px)',
                    borderRadius: '24px',
                    border: '1px solid rgba(2, 54, 54, 0.05)',
                    padding: '1.5rem 2rem',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
                    marginBottom: '2.5rem',
                    animation: 'fadeUp 0.6s ease-out'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '2rem' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: deepTeal, marginBottom: '0.3rem' }}>
                                <TrendingUp size={20} />
                                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', letterSpacing: '-0.5px' }}>Ingeniería JIT - {selectedOrderId}</h3>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: '700' }}>Cálculo basado en stock real y demanda bruta.</p>
                        </div>
                        <button
                            onClick={handleGenerateOC}
                            style={{
                                background: deepTeal,
                                color: '#fff',
                                border: 'none',
                                borderRadius: '22px',
                                padding: '1.2rem 2.8rem',
                                fontWeight: '900',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                fontSize: '1rem',
                                textTransform: 'uppercase',
                                letterSpacing: '1.5px',
                                boxShadow: `0 15px 35px ${deepTeal}30`,
                                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05) translateY(-5px)'; e.currentTarget.style.boxShadow = `0 25px 50px ${deepTeal}40`; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1) translateY(0)'; e.currentTarget.style.boxShadow = `0 15px 35px ${deepTeal}30`; }}
                        >
                            <ShoppingCart size={22} /> Generar Órdenes de Compra
                        </button>
                    </div>
 
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 1rem' }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: '1rem 2rem', textAlign: 'left', fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '1.5px' }}>Insumo Base (Raw Material)</th>
                                    <th style={{ padding: '1rem 2rem', textAlign: 'right', fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '1.5px' }}>Demanda Bruta</th>
                                    <th style={{ padding: '1rem 2rem', textAlign: 'right', fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '1.5px' }}>Stock Disponible</th>
                                    <th style={{ padding: '1rem 2rem', textAlign: 'right', fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '1.5px' }}>Neto a Comprar</th>
                                    <th style={{ padding: '1rem 2rem', textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '1.5px' }}>Asignación Supplier</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requirementExplosion.map(mp => (
                                    <tr key={mp.id} style={{ background: '#fff', borderRadius: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.01)' }}>
                                        <td style={{ padding: '1.8rem 2rem', borderRadius: '24px 0 0 24px', border: '1px solid #f1f5f9', borderRight: 'none' }}>
                                            <div style={{ fontWeight: '900', color: mp.isMissing ? premiumSalmon : '#1e293b', fontSize: '1.1rem', letterSpacing: '-0.3px' }}>{mp.name}</div>
                                            {mp.isMissing ? (
                                                <div style={{ fontSize: '0.7rem', color: premiumSalmon, fontWeight: '900', background: `${premiumSalmon}15`, padding: '4px 12px', borderRadius: '8px', display: 'inline-block', marginTop: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    SKU NO MAESTRO
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700', marginTop: '6px' }}>SERIAL REF: {mp.id}</div>
                                            )}
                                        </td>
                                        <td style={{ padding: '1.8rem 2rem', textAlign: 'right', fontWeight: '900', color: '#1e293b', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                                            <span style={{ fontSize: '1.2rem' }}>{mp.totalNeeded}</span> <span style={{ fontSize: '0.8rem', color: '#b4b4b4' }}>{mp.unit}</span>
                                        </td>
                                        <td style={{ padding: '1.8rem 2rem', textAlign: 'right', fontWeight: '800', color: '#64748b', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                                            <span style={{ fontSize: '1.1rem' }}>{mp.available}</span> <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>{mp.unit}</span>
                                        </td>
                                        <td style={{
                                            padding: '1.8rem 2rem',
                                            textAlign: 'right',
                                            fontWeight: '900',
                                            color: mp.toBuy > 0 ? (supplierAssignments[mp.id] ? institutionOcre : premiumSalmon) : '#10b981',
                                            fontSize: mp.toBuy > 0 ? '1.4rem' : '1rem',
                                            borderTop: '1px solid #f1f5f9', 
                                            borderBottom: '1px solid #f1f5f9'
                                        }}>
                                            {mp.toBuy > 0 ? mp.toBuy : 'OPTIMAL'} {mp.toBuy > 0 && <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{mp.unit}</span>}
                                        </td>
                                        <td style={{ padding: '1.8rem 2rem', textAlign: 'center', borderRadius: '0 24px 24px 0', border: '1px solid #f1f5f9', borderLeft: 'none' }}>
                                            {mp.toBuy > 0 ? (
                                                <div style={{ position: 'relative', width: '240px', margin: '0 auto' }}>
                                                    <select
                                                        value={supplierAssignments[mp.id] || ''}
                                                        onChange={(e) => handleAssignSupplier(mp.id, e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '1rem 1.2rem',
                                                            borderRadius: '16px',
                                                            border: '2px solid transparent',
                                                            background: supplierAssignments[mp.id] ? `${deepTeal}05` : `${premiumSalmon}05`,
                                                            fontSize: '0.85rem',
                                                            fontWeight: '900',
                                                            color: '#1e293b',
                                                            outline: 'none',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.3s',
                                                            appearance: 'none',
                                                            borderLeft: `5px solid ${supplierAssignments[mp.id] ? '#10b981' : premiumSalmon}`
                                                        }}
                                                    >
                                                        <option value="">Seleccionar Partner...</option>
                                                        {suppliers.map(s => (
                                                            <option key={s.id} value={s.name}>{s.name}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown size={18} style={{ position: 'absolute', right: '1.2rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.4 }} />
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', color: '#10b981', fontWeight: '900', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    <div style={{ padding: '6px', borderRadius: '50%', background: '#10b98115' }}><Check size={14} /></div>
                                                    Suficiencia Stock
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* List of Generated Purchase Orders (OC) - Premium Table */}
            <section style={{ marginBottom: '5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2.5rem' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '22px', background: `${deepTeal}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: deepTeal }}>
                        <ShoppingCart size={32} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.6rem', color: '#1e293b', fontWeight: '900', letterSpacing: '-0.5px' }}>Supply Chain Command Center</h3>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', fontWeight: '700' }}>Monitoreo en tiempo real de adquisiciones, liquidaciones y tiempos de tránsito.</p>
                    </div>
                </div>
 
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
                                <th style={{ padding: '2rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Master Ref</th>
                                <th style={{ padding: '2rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Partner Supplier</th>
                                <th style={{ padding: '2rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Sales Ref Hub</th>
                                <th style={{ padding: '2rem 1.5rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Timeline</th>
                                <th style={{ padding: '2rem 1.5rem', textAlign: 'right', fontSize: '0.8rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Gross Value</th>
                                <th style={{ padding: '2rem 1.5rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Status</th>
                                <th style={{ padding: '2rem 1.5rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPurchaseOrders.length > 0 ? filteredPurchaseOrders.map(oc => (
                                <tr
                                    key={oc.id}
                                    onClick={() => setViewingOC(oc)}
                                    style={{ borderBottom: '1px solid #f8fafc', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(2, 83, 87, 0.02)'; e.currentTarget.style.transform = 'scale(0.998)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
                                >
                                    <td style={{ padding: '2rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: oc.status === 'Recibida' ? '#10b981' : institutionOcre }} />
                                            <span style={{ fontWeight: '900', color: deepTeal, fontSize: '1rem', letterSpacing: '-0.2px' }}>{oc.id}</span>
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
                                            {(oc.total || 0).toLocaleString()}
                                        </div>
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
                                                onMouseEnter={(e) => { e.currentTarget.style.background = premiumSalmon; e.currentTarget.style.color = '#fff'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = `${premiumSalmon}15`; e.currentTarget.style.color = premiumSalmon; }}
                                            >
                                                <DollarSign size={16} /> Pagar OC
                                            </button>
                                        ) : (
                                            <div style={{ background: '#10b98115', color: '#10b981', padding: '0.8rem 1.5rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: '900', display: 'inline-flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '1px', border: '1px solid #10b98130' }}>
                                                <CheckCircle size={16} /> LIQUIDADA
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '2rem 1.5rem' }}>
                                        <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', alignItems: 'center' }}>
                                            {oc.status === 'Enviada' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleReceiveOC(oc.id); }}
                                                    style={{ 
                                                        background: deepTeal, 
                                                        color: '#fff', 
                                                        border: 'none', 
                                                        borderRadius: '14px', 
                                                        padding: '0.8rem', 
                                                        cursor: 'pointer', 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        boxShadow: `0 8px 20px ${deepTeal}30`,
                                                        transition: 'all 0.3s'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1) rotate(0)'}
                                                    title="Recibir Inventario"
                                                >
                                                    <Package size={20} />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDownloadOCPDF(oc); }}
                                                style={{ 
                                                    background: '#fff', 
                                                    border: '1px solid #f1f5f9', 
                                                    color: '#64748b', 
                                                    borderRadius: '14px', 
                                                    padding: '0.8rem', 
                                                    cursor: 'pointer', 
                                                    display: 'flex', 
                                                    alignItems: 'center',
                                                    transition: 'all 0.3s',
                                                    boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = deepTeal; e.currentTarget.style.color = deepTeal; e.currentTarget.style.background = `${deepTeal}05`; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = '#fff'; }}
                                                title="Descargar PDF"
                                            >
                                                <Download size={20} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="7" style={{ padding: '6rem', textAlign: 'center', color: '#94a3b8', fontWeight: '900', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
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
                        zIndex: 1000,
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
                                    <div style={{ fontWeight: '900', fontSize: '1.1rem', color: '#1e293b', marginBottom: '0.4rem' }}>Zeticas S.A.S.</div>
                                    <div style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: '1.6', fontWeight: '600' }}>
                                        NIT: 901.234.567-8<br />
                                        Sede Principal: Bogotá, Colombia<br />
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
                                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700' }}>ID: {item.id}</div>
                                                </td>
                                                <td style={{ padding: '1.2rem 1rem', textAlign: 'center', fontWeight: '900', color: '#1e293b' }}>
                                                    {qtyValue} <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.unit || ''}</span>
                                                </td>
                                                <td style={{ padding: '1.2rem 1rem', textAlign: 'right', color: '#64748b', fontWeight: '700' }}>${Math.round(unitValue).toLocaleString()}</td>
                                                <td style={{ padding: '1.2rem 1rem', textAlign: 'right', color: '#94a3b8', fontWeight: '700' }}>19%</td>
                                                <td style={{ padding: '1.2rem 1rem', textAlign: 'right', fontWeight: '900', color: '#1e293b', borderRadius: '0 12px 12px 0' }}>
                                                    ${Math.round(total).toLocaleString()}
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
                                                    <span style={{ fontSize: '0.9rem', fontWeight: '900', color: '#1e293b' }}>${Math.round(sub).toLocaleString()}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b' }}>IVA (19%)</span>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: '900', color: '#1e293b' }}>${Math.round(iva).toLocaleString()}</span>
                                                </div>
                                                <div style={{ height: '1px', background: '#e2e8f0', margin: '1rem 0' }} />
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: '900', color: '#025357' }}>TOTAL ORDEN</span>
                                                    <span style={{ fontSize: '1.5rem', fontWeight: '900', color: '#025357', letterSpacing: '-0.5px' }}>
                                                        ${Math.round(sub + iva).toLocaleString()}
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
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
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
        </div>
    );
};

export default Purchases;
