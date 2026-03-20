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
    const { banks, setBanks, updateBankBalance, recalculatePTCosts } = useBusiness();
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

    return (
        <div className="purchases-module" style={{ padding: '0 1rem' }}>
            <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 className="font-serif" style={{ fontSize: '2.2rem', color: 'var(--color-primary)', margin: 0 }}>Gestión Lean de Compras (MP)</h2>
                    <p style={{ color: '#666', fontSize: '0.95rem', marginTop: '0.5rem' }}>Explosión de requerimientos y abastecimiento JIT basado en pedidos reales.</p>
                </div>
            </header>

            {/* Filters Bar */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', gap: '4px' }}>
                    <button
                        onClick={() => setFilterType('week')}
                        style={{
                            padding: '0.5rem 1rem',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            background: filterType === 'week' ? '#fff' : 'transparent',
                            color: filterType === 'week' ? 'var(--color-primary)' : '#64748b',
                            boxShadow: filterType === 'week' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                        }}
                    >Compras última Semana</button>
                    <button
                        onClick={() => setFilterType('month')}
                        style={{
                            padding: '0.5rem 1rem',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            background: filterType === 'month' ? '#fff' : 'transparent',
                            color: filterType === 'month' ? 'var(--color-primary)' : '#64748b',
                            boxShadow: filterType === 'month' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                        }}
                    >Compras Mes</button>
                    <button
                        onClick={() => setFilterType('custom')}
                        style={{
                            padding: '0.5rem 1rem',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            background: filterType === 'custom' ? '#fff' : 'transparent',
                            color: filterType === 'custom' ? 'var(--color-primary)' : '#64748b',
                            boxShadow: filterType === 'custom' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                        }}
                    >Personalizado</button>
                </div>

                {filterType === 'custom' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="date"
                            value={customRange.from}
                            onChange={(e) => setCustomRange({ ...customRange, from: e.target.value })}
                            style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                        />
                        <span style={{ color: '#94a3b8' }}>a</span>
                        <input
                            type="date"
                            value={customRange.to}
                            onChange={(e) => setCustomRange({ ...customRange, to: e.target.value })}
                            style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                        />
                    </div>
                )}

                <div style={{ flex: 1, position: 'relative', minWidth: '300px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Busca por Proveedor, OC ó Pedido relacionado"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.6rem 1rem 0.6rem 2.8rem',
                            borderRadius: '10px',
                            border: '1px solid #e2e8f0',
                            outline: 'none',
                            fontSize: '0.9rem'
                        }}
                    />
                </div>
            </div>

            {/* Metrics Dashboard */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
                {/* 1. Volumen de Compras */}
                <div style={{ background: 'linear-gradient(135deg, #1A3636 0%, #2D4F4F 100%)', padding: '1rem', borderRadius: '16px', color: '#fff', boxShadow: '0 8px 16px rgba(26, 54, 54, 0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <TrendingUp size={14} /> Volumen de Compras
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.3rem' }}>
                        ${purchaseStats.total.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
                        {purchaseStats.count} Órdenes creadas
                    </div>
                </div>

                {/* 2. Estado Tesorería */}
                <div style={{ background: '#fff', padding: '1rem', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <DollarSign size={14} color="#0f172a" /> Estado Tesorería
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdf4', padding: '0.5rem 0.8rem', borderRadius: '10px' }}>
                            <div>
                                <div style={{ fontSize: '0.65rem', color: '#166534', fontWeight: 'bold' }}>PAGADO ({treasuryStats.paidCount})</div>
                                <div style={{ fontSize: '1rem', fontWeight: '800', color: '#14532d' }}>${treasuryStats.paidTotal.toLocaleString()}</div>
                            </div>
                            <CheckCircle size={16} color="#16a34a" />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff7ed', padding: '0.5rem 0.8rem', borderRadius: '10px' }}>
                            <div>
                                <div style={{ fontSize: '0.65rem', color: '#9a3412', fontWeight: 'bold' }}>NO PAGADO ({treasuryStats.unpaidCount})</div>
                                <div style={{ fontSize: '1rem', fontWeight: '800', color: '#7c2d12' }}>${treasuryStats.unpaidTotal.toLocaleString()}</div>
                            </div>
                            <AlertCircle size={16} color="#ea580c" />
                        </div>
                    </div>
                </div>

                {/* 3. Ingreso a Inventario */}
                <div style={{ background: '#fff', padding: '1rem', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Package size={14} color="#0f172a" /> Ingreso a Inventario
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.5rem 0.8rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <div>
                                <div style={{ fontSize: '0.65rem', color: '#475569', fontWeight: 'bold' }}>INGRESADO ({inventoryKPIs.receivedCount})</div>
                                <div style={{ fontSize: '1rem', fontWeight: '800', color: '#1e293b' }}>${inventoryKPIs.receivedTotal.toLocaleString()}</div>
                            </div>
                            <Truck size={16} color="#64748b" />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fffbeb', padding: '0.5rem 0.8rem', borderRadius: '10px', border: '1px solid #fef3c7' }}>
                            <div>
                                <div style={{ fontSize: '0.65rem', color: '#92400e', fontWeight: 'bold' }}>PENDIENTE ({inventoryKPIs.pendingCount})</div>
                                <div style={{ fontSize: '1rem', fontWeight: '800', color: '#78350f' }}>${inventoryKPIs.pendingTotal.toLocaleString()}</div>
                            </div>
                            <Calendar size={16} color="#d97706" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Selection of Active Orders from Pedidos Module */}
            <section style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.2rem' }}>
                    <FileText size={20} color="var(--color-primary)" />
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#334155' }}>Pedidos en Cola para Abastecimiento</h3>
                </div>

                <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', padding: '0.5rem 0' }}>
                    {ordersInPurchaseChannel.length > 0 ? ordersInPurchaseChannel.map(order => (
                        <div
                            key={order.id}
                            onClick={() => {
                                const missing = order.items.filter(item => {
                                    const skuKey = Object.keys(recipes).find(k => k.toLowerCase() === item.name.toLowerCase()) || item.name;
                                    return !recipes[skuKey];
                                });
                                if (missing.length > 0) {
                                    alert(`Falta Receta de: ${missing.map(m => m.name).join(', ')}. \n\nEsto detendrá la acción hasta que se cree la receta o se elimine el SKU del pedido.`);
                                    return;
                                }
                                setSelectedOrderId(order.id);
                            }}
                            style={{
                                minWidth: '280px',
                                padding: '1.2rem',
                                background: selectedOrderId === order.id ? '#1A3636' : '#fff',
                                color: selectedOrderId === order.id ? '#fff' : '#334155',
                                borderRadius: '16px',
                                border: selectedOrderId === order.id ? 'none' : '1px solid #e2e8f0',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: selectedOrderId === order.id ? '0 10px 20px rgba(26, 54, 54, 0.15)' : '0 2px 4px rgba(0,0,0,0.02)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                                <span style={{ fontWeight: '800', fontSize: '0.9rem' }}>{order.id}</span>
                                <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{order.date}</span>
                            </div>
                            <div style={{ fontWeight: '600', fontSize: '1rem', marginBottom: '0.4rem' }}>{order.client}</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{order.items.length} productos terminados</div>
                            {selectedOrderId === order.id && (
                                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
                                    EXPLOSIONANDO REQUERIMIENTOS...
                                </div>
                            )}
                        </div>
                    )) : (
                        <div style={{ padding: '2rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#94a3b8', width: '100%', textAlign: 'center' }}>
                            No hay pedidos pendientes por abastecer. Envía pedidos desde el módulo de "Pedidos".
                        </div>
                    )}
                </div>
            </section>

            {/* Requirement Explosion & Supplier Assignment */}
            {selectedOrderId && (
                <section style={{
                    background: '#fff',
                    borderRadius: '24px',
                    border: '1px solid #e2e8f0',
                    padding: '2rem',
                    boxShadow: '0 4px 25px rgba(0,0,0,0.05)',
                    marginBottom: '3rem'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--color-primary)' }}>Análisis de Materiales JIT - {selectedOrderId}</h3>
                            <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>Explosión de BOM: Unidades x Receta - Stock Disponible = Cantidad a Comprar.</p>
                        </div>
                        <button
                            onClick={handleGenerateOC}
                            style={{
                                background: 'var(--color-primary)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '0.8rem 1.8rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem'
                            }}
                        >
                            <Truck size={18} /> Generar Órdenes de Compra
                        </button>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Materia Prima (MP)</th>
                                <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>MP Requerida</th>
                                <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>INV. Disponible</th>
                                <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Cant. a Comprar</th>
                                <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Proveedor Sugerido</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requirementExplosion.map(mp => (
                                <tr key={mp.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                    <td style={{ padding: '1.2rem 1rem' }}>
                                        <div style={{ fontWeight: '700', color: mp.isMissing ? '#e11d48' : '#334155' }}>{mp.name}</div>
                                        {mp.isMissing ? (
                                            <div style={{ fontSize: '0.65rem', color: '#e11d48', fontWeight: 'bold', background: '#fff1f2', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fecaca', display: 'inline-block', marginTop: '4px' }}>
                                                No existe en Módulo de Datos Maestros de Productos, Crealo primero
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ID: {mp.id}</div>
                                        )}
                                    </td>
                                    <td style={{ padding: '1.2rem 1rem', textAlign: 'right', fontWeight: '600' }}>{mp.totalNeeded} {mp.unit}</td>
                                    <td style={{ padding: '1.2rem 1rem', textAlign: 'right', color: '#64748b' }}>{mp.available} {mp.unit}</td>
                                    <td style={{
                                        padding: '1.2rem 1rem',
                                        textAlign: 'right',
                                        fontWeight: '800',
                                        color: mp.toBuy > 0 ? (supplierAssignments[mp.id] ? '#d97706' : '#ef4444') : '#10b981'
                                    }}>
                                        {mp.toBuy} {mp.unit}
                                    </td>
                                    <td style={{ padding: '1.2rem 1rem', textAlign: 'center' }}>
                                        {mp.toBuy > 0 ? (
                                            <select
                                                value={supplierAssignments[mp.id] || ''}
                                                onChange={(e) => handleAssignSupplier(mp.id, e.target.value)}
                                                style={{
                                                    padding: '0.5rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid #e2e8f0',
                                                    fontSize: '0.85rem',
                                                    width: '180px',
                                                    outline: 'none',
                                                    borderLeft: supplierAssignments[mp.id] ? '4px solid #10b981' : '4px solid #ef4444'
                                                }}
                                            >
                                                <option value="">Seleccionar Proveedor...</option>
                                                {suppliers.map(s => (
                                                    <option key={s.id} value={s.name}>{s.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold' }}>STOCK SUFICIENTE</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            )}

            {/* List of Generated Purchase Orders (OC) */}
            <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
                    <ShoppingCart size={20} color="var(--color-primary)" />
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#334155' }}>Historial de Órdenes de Compra (OC)</h3>
                </div>

                <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f8fafc' }}>
                            <tr>
                                <th style={{ padding: '1.2rem' }}>OC No.</th>
                                <th style={{ padding: '1.2rem' }}>Proveedor</th>
                                <th style={{ padding: '1.2rem' }}>Ref. Pedido</th>
                                <th style={{ padding: '1.2rem' }}>Fecha</th>
                                <th style={{ padding: '1.2rem' }}>Valor Total</th>
                                <th style={{ padding: '1.2rem' }}>Pagar</th>
                                <th style={{ padding: '1.2rem', textAlign: 'center', width: '100px' }}>Opciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPurchaseOrders.length > 0 ? filteredPurchaseOrders.map(oc => (
                                <tr
                                    key={oc.id}
                                    style={{ borderBottom: '1px solid #f8fafc', cursor: 'pointer', transition: 'background 0.2s' }}
                                    className="table-row-hover"
                                    onClick={() => setViewingOC(oc)}
                                >
                                    <td style={{ padding: '1.2rem', textAlign: 'center', fontWeight: '800', color: 'var(--color-primary)' }}>{oc.id}</td>
                                    <td style={{ padding: '1.2rem', textAlign: 'center', fontWeight: '600' }}>{oc.providerName || oc.supplier}</td>
                                    <td style={{ padding: '1.2rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
                                            {(Array.isArray(oc.relatedOrders) ? oc.relatedOrders : [oc.orderRef || 'N/A']).map(ref => (
                                                <div key={ref} style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>{ref}</div>
                                            ))}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.2rem', textAlign: 'center', fontSize: '0.85rem' }}>{oc.date}</td>
                                    <td style={{ padding: '1.2rem', textAlign: 'center', fontWeight: 'bold' }}>${(oc.total || 0).toLocaleString()}</td>
                                    <td style={{ padding: '1.2rem', textAlign: 'center' }}>
                                        {oc.paymentStatus !== 'Pagado' ? (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setPaymentModalOC(oc); }}
                                                style={{ background: '#ea580c', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: '0 auto', boxShadow: '0 4px 6px -1px rgba(234, 88, 12, 0.2)' }}
                                            >
                                                <DollarSign size={14} /> Pagar OC
                                            </button>
                                        ) : (
                                            <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                <CheckCircle size={14} /> PAGADO
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '1.2rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', alignItems: 'center' }}>
                                            {oc.status === 'Enviada' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleReceiveOC(oc.id); }}
                                                    style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.4rem 0.6rem', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                                    title="Recibir Inventario"
                                                >
                                                    <Package size={14} />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDownloadOCPDF(oc); }}
                                                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                title="Descargar PDF"
                                            >
                                                <Download size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No hay órdenes de compra generadas aún.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* OC Detail Modal */}
            {viewingOC && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem'
                }}>
                    <div style={{
                        background: '#fff',
                        width: '100%',
                        maxWidth: '800px',
                        maxHeight: '90vh',
                        borderRadius: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '1.5rem 2rem',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#f8fafc'
                        }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-primary)' }}>Orden de Compra</h2>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>Documento Interno - {viewingOC.id}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <button
                                    onClick={() => handleDownloadOCPDF(viewingOC)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        background: 'var(--color-primary)', color: '#fff',
                                        border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px',
                                        fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                >
                                    <Download size={16} /> Descargar PDF
                                </button>
                                <button
                                    onClick={() => setViewingOC(null)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '2rem', overflowY: 'auto' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px' }}>
                                    <h4 style={{ margin: '0 0 1rem', color: '#1A3636', fontSize: '0.85rem', textTransform: 'uppercase' }}>Comprador / Facturar a:</h4>
                                    <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#334155', marginBottom: '0.2rem' }}>Zeticas S.A.S.</div>
                                    <div style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                        NIT: 901.234.567-8<br />
                                        Bogotá, Colombia<br />
                                        Ref. Pedidos: {Array.isArray(viewingOC.relatedOrders) ? viewingOC.relatedOrders.join(', ') : (viewingOC.orderRef || 'N/A')}
                                    </div>
                                </div>
                                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1.5rem', borderRadius: '12px' }}>
                                    <h4 style={{ margin: '0 0 1rem', color: '#166534', fontSize: '0.85rem', textTransform: 'uppercase' }}>Datos del Proveedor:</h4>
                                    <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#15803d', marginBottom: '0.2rem' }}>{viewingOC.providerName || viewingOC.supplier}</div>
                                    <div style={{ color: '#166534', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                        NIT: {providers.find(s => s.name === (viewingOC.providerName || viewingOC.supplier))?.nit || '901.000.123-x'}<br />
                                        Tiempo de entrega: {providers.find(s => s.name === (viewingOC.providerName || viewingOC.supplier))?.lead_time || '2-3 días'}<br />
                                        Fecha OC: {viewingOC.date}
                                    </div>
                                </div>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
                                <thead>
                                    <tr style={{ background: 'var(--color-primary)', color: '#fff' }}>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', borderRadius: '8px 0 0 0' }}>Ref/Insumo</th>
                                        <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', fontSize: '0.85rem' }}>Cantidad</th>
                                        <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', fontSize: '0.85rem' }}>V. Unitario</th>
                                        <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', fontSize: '0.85rem' }}>IVA</th>
                                        <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', fontSize: '0.85rem', borderRadius: '0 8px 0 0' }}>V. Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {viewingOC.items.map((item, idx) => {
                                        const qtyValue = item.toBuy || item.quantity || 0;
                                        const unitValue = item.purchasePrice || item.price || item.unit_cost || 0;
                                        const total = unitValue * qtyValue;
                                        return (
                                            <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ fontWeight: '600', color: '#334155' }}>{item.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ID: {item.id}</div>
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>{qtyValue} {item.unit || ''}</td>
                                                <td style={{ padding: '1rem', textAlign: 'right', color: '#64748b' }}>${Math.round(unitValue).toLocaleString()}</td>
                                                <td style={{ padding: '1rem', textAlign: 'right', color: '#64748b' }}>19%</td>
                                                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>${Math.round(total).toLocaleString()}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <div style={{ width: '300px', background: '#f8fafc', padding: '1.5rem', borderRadius: '12px' }}>
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
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#64748b' }}>
                                                    <span>Subtotal:</span>
                                                    <span>${Math.round(sub).toLocaleString()}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: '#64748b' }}>
                                                    <span>Impuestos (19%):</span>
                                                    <span>${Math.round(iva).toLocaleString()}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '2px solid #e2e8f0', fontWeight: '800', fontSize: '1.2rem', color: 'var(--color-primary)' }}>
                                                    <span>TOTAL OC:</span>
                                                    <span>${Math.round(sub + iva).toLocaleString()}</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Payment Modal */}
            {paymentModalOC && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
                }}>
                    <div style={{ background: '#fff', padding: '2rem', borderRadius: '16px', width: '400px', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>Registrar Pago OC</h3>
                            <button onClick={() => setPaymentModalOC(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.4rem' }}>Orden de Compra:</div>
                            <div style={{ fontWeight: 'bold' }}>{paymentModalOC.id}</div>
                            <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '0.8rem', marginBottom: '0.4rem' }}>Valor a Pagar:</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#e11d48' }}>${(paymentModalOC.total || 0).toLocaleString()}</div>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#334155' }}>Seleccionar Banco / Caja:</label>
                            <select
                                value={paymentBankId}
                                onChange={(e) => setPaymentBankId(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                            >
                                <option value="">Seleccione un banco...</option>
                                {banks.map(bank => (
                                    <option key={bank.id} value={bank.id}>{bank.name} - Saldo: ${(bank.balance || 0).toLocaleString()}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => setPaymentModalOC(null)}
                                style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handlePaymentOC}
                                style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                Confirmar Pago
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Purchases;
