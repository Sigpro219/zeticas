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
    Clock,
    X,
    Save
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
// supabase import removed

import logo from '../assets/logo.png';

const Shipping = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);
    const { orders, items, refreshData, updateOrder, ownCompany, clients, banks, updateBankBalance } = useBusiness();
    const [downloadedDocs, setDownloadedDocs] = useState({}); // { [orderId]: { invoice: boolean, labels: boolean } }
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('month');
    const [viewMode, setViewMode] = useState('active'); // 'active' or 'history'
    const [customRange, setCustomRange] = useState({ from: '', to: '' });
    const [viewingOrder, setViewingOrder] = useState(null);
    const [confirmModal, setConfirmModal] = useState({
        show: false,
        step: 1,
        type: 'item',
        target: null,
        title: '',
        message: ''
    });
    const [labelModal, setLabelModal] = useState({ show: false, order: null, jarsPerBox: 12 });
    const [dispatchModal, setDispatchModal] = useState({ 
        show: false, 
        order: null, 
        trackingNumber: '', 
        date: new Date().toLocaleDateString('en-CA'), // Correct YYYY-MM-DD local format
        time: new Date().toLocaleTimeString('es-CO', { hour12: false, hour: '2-digit', minute: '2-digit' }) 
    });
    const [paymentGateModal, setPaymentGateModal] = useState({ show: false, order: null, bankId: '' });


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

    // Calculate Lead Time (Dynamic from DB or Real-time)
    const getLeadTime = (order) => {
        if (order.delivered_at || order.lead_time_days !== undefined) {
            // Conversión de histórico de días a horas si es necesario
            return (order.lead_time_days || 0) * 24;
        }
        const today = new Date();
        const created = new Date(order.realDate || order.created_at || order.date);
        const diffTime = Math.abs(today - created);
        const hours = diffTime / (1000 * 60 * 60);
        return parseFloat(hours.toFixed(1));
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
        
        // CRM Lookup for accurate Invoice Data
        const cleanName = (name) => (name || '').toLowerCase().trim();
        const targetName = cleanName(order.client);
        const recipient = (clients || []).find(c => cleanName(c.name) === targetName);

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Dirección: ${order.shipping_address || recipient?.address || order.address || 'N/A'}`, 18, 70);
        doc.text(`Ciudad: ${order.shipping_city || recipient?.city || order.city || 'Bogotá, Col'}`, 18, 75);
        doc.text(`Teléfono: ${order.shipping_phone || recipient?.phone || order.phone || 'N/A'}`, 18, 80);
        
        if (recipient?.nit) {
            doc.text(`NIT/CC: ${recipient.nit}`, 18, 85);
        }
        
        // Right side info (Order reference)
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(148, 163, 184);
        doc.text('REFERENCIA PEDIDO:', 140, 57);
        doc.setFontSize(12);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(order.id || 'N/A', 140, 65);

        if (order.purchase_order) {
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(148, 163, 184);
            doc.text('ORDEN DE COMPRA:', 140, 72);
            doc.setFontSize(10);
            doc.setTextColor(30, 41, 59);
            doc.text(order.purchase_order.toUpperCase(), 140, 79);
        }

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

        finalY += 7;
        doc.setTextColor(100, 116, 139);
        doc.text(`Envío:`, labelX, finalY, { align: 'right' });
        doc.setTextColor(51, 65, 85);
        doc.text(`$${(shippingCost || 0).toLocaleString()}`, valueX, finalY, { align: 'right' });

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

        // Update locally for UI guardrails
        setDownloadedDocs(prev => ({
            ...prev,
            [order.dbId]: { ...prev[order.dbId], invoice: true }
        }));

        // Update in Firestore with link table logic (Metadata on order)
        await updateOrder(order.dbId, {
            invoice_number: invNum,
            invoice_date: new Date().toISOString(),
            status: 'Facturado'
        });

        await refreshData();
    };

    const handleDownloadLabels = (order, jarsPerBox = 12) => {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'letter'
        });

        const totalJars = (order.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        const numLabels = Math.ceil(totalJars / jarsPerBox);
        const primaryColor = [2, 83, 87]; // Deep Teal Zeticas

        // Lookup Sender (Zeticas) in clients or use ownCompany fallback
        const zeticas = (clients || []).find(c => (c.name || '').toLowerCase().includes('zetica'));
        const senderInfo = {
            name: 'ZETICAS SAS BIC',
            nit: '901.531.875-4',
            address: zeticas?.address || ownCompany?.address || 'Guasca, Cundinamarca',
            city: zeticas?.city || ownCompany?.city || 'Guasca',
            phone: zeticas?.phone || ownCompany?.phone || '3001234567',
            email: zeticas?.email || ownCompany?.email || 'admin@zeticas.com'
        };

        // Lookup Recipient in CRM
        const cleanName = (name) => (name || '').toLowerCase().trim();
        const targetName = cleanName(order.client);
        const recipient = (clients || []).find(c => cleanName(c.name) === targetName);
        const destInfo = {
            name: order.client || recipient?.name || 'Cliente por confirmar',
            address: order.shipping_address || recipient?.address || order.address || 'Dirección por confirmar',
            city: order.shipping_city || recipient?.city || order.city || 'Ciudad por confirmar',
            phone: order.shipping_phone || recipient?.phone || order.phone || 'Teléfono no registrado',
            nit: recipient?.nit || recipient?.id_number || ''
        };

        // Dimensions for 6 labels per Letter page (2 cols x 3 rows)
        const pageWidth = 215.9; // mm
        const pageHeight = 279.4; // mm
        const labelWidth = (pageWidth - 20) / 2; // ~98mm
        const labelHeight = (pageHeight - 30) / 3; // ~83mm
        const marginX = 10;
        const marginY = 10;

        for (let i = 0; i < numLabels; i++) {
            if (i > 0 && i % 6 === 0) doc.addPage();
            
            const col = i % 2;
            const row = Math.floor((i % 6) / 2);
            const x = marginX + col * labelWidth;
            const y = marginY + row * labelHeight;

            // Label border
            doc.setDrawColor(203, 213, 225);
            doc.setLineWidth(0.3);
            doc.rect(x + 2, y + 2, labelWidth - 4, labelHeight - 4);

            // Header - SENDER
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.text('REMITENTE:', x + 8, y + 10);
            
            doc.setFontSize(9);
            doc.text(senderInfo.name, x + 8, y + 14);
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text(`NIT: ${senderInfo.nit} | Tel: ${senderInfo.phone}`, x + 8, y + 18);
            doc.text(`${senderInfo.address} - ${senderInfo.city}`, x + 8, y + 21);

            // Caja indicator
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text(`Caja ${i + 1} de ${numLabels}`, x + labelWidth - 8, y + 10, { align: 'right' });

            // Line
            doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setLineWidth(0.5);
            doc.line(x + 8, y + 22.5, x + labelWidth - 8, y + 22.5);

            // Branding Section (NEW)
            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.rect(x + 2, y + 24, labelWidth - 4, 5, 'F');
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text('CONSERVAS ARTESANALES - PRODUCTO FRÁGIL', x + labelWidth / 2, y + 27.5, { align: 'center' });

            // DESTINATARIO
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text('DESTINATARIO:', x + 10, y + 34);
            
            doc.setFontSize(12);
            doc.text(destInfo.name.toUpperCase(), x + 10, y + 40);
            
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            
            const addrLines = doc.splitTextToSize(destInfo.address, labelWidth - 25);
            doc.text(addrLines, x + 10, y + 45);
            
            const nextY = y + 45 + (addrLines.length * 4.5);
            doc.setFontSize(9.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(destInfo.city.toUpperCase(), x + 10, nextY);
            
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            const contactText = `Tel: ${destInfo.phone}${destInfo.nit ? ` | NIT: ${destInfo.nit}` : ''}`;
            doc.text(contactText, x + 10, nextY + 4);

            // LOGISTICS WARNINGS (NEW)
            const warningY = y + labelHeight - 20;
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.2);
            doc.line(x + 10, warningY, x + labelWidth - 10, warningY);
            
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            
            // Fragile Icons Logic (Step-by-step to avoid ghosting/overlaps)
            doc.text('[!!] FRÁGIL', x + 12, warningY + 3.5);
            doc.text('[^] ESTE LADO ARRIBA', x + labelWidth / 2, warningY + 3.5, { align: 'center' });
            doc.text('[*] AMBIENTE FRESCO', x + labelWidth - 12, warningY + 3.5, { align: 'right' });

            // Footer / Order Info
            doc.setFillColor(248, 250, 252);
            doc.rect(x + 5, y + labelHeight - 12, labelWidth - 10, 8, 'F');
            doc.setFontSize(5.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(148, 163, 184);
            doc.text('PEDIDO:', x + 10, y + labelHeight - 7);
            doc.setFontSize(9.5);
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.text(`#${order.id}`, x + 23, y + labelHeight - 6.5);

            // Purchase Order (NEW)
            if (order.purchase_order) {
                doc.setFontSize(5.5);
                doc.setTextColor(148, 163, 184);
                doc.text('OC:', x + labelWidth / 2 - 10, y + labelHeight - 7);
                doc.setFontSize(8.5);
                doc.setTextColor(15, 23, 42);
                doc.text(order.purchase_order.toUpperCase(), x + labelWidth / 2 - 2, y + labelHeight - 6.5);
            }
            
            if (order.invoice_number) {
                doc.setFontSize(5.5);
                doc.setTextColor(148, 163, 184);
                doc.text('FACTURA:', x + labelWidth - 45, y + labelHeight - 7);
                doc.setFontSize(8.5);
                doc.setTextColor(15, 23, 42);
                doc.text(order.invoice_number, x + labelWidth - 10, y + labelHeight - 6.5, { align: 'right' });
            }
        }

        doc.save(`Etiquetas_${order.id}_${numLabels}_bultos.pdf`);
        
        // Update local state for UI guardrails
        setDownloadedDocs(prev => ({
            ...prev,
            [order.dbId]: { ...prev[order.dbId], labels: true }
        }));

        setLabelModal({ show: false, order: null, jarsPerBox: 12 });
    };

    const handleConfirmDispatch = async () => {
        if (!dispatchModal.trackingNumber) {
            alert("Por favor ingrese el número de guía.");
            return;
        }

        try {
            await updateOrder(dispatchModal.order.dbId, {
                status: 'Despachado',
                tracking_number: dispatchModal.trackingNumber,
                dispatched_at: `${dispatchModal.date}T${dispatchModal.time}:00Z`,
                dispatch_metadata: {
                    guide: dispatchModal.trackingNumber,
                    date: dispatchModal.date,
                    time: dispatchModal.time,
                    registered_at: new Date().toISOString()
                }
            });

            await refreshData();
            setDispatchModal({ ...dispatchModal, show: false, order: null, trackingNumber: '' });
            alert("¡Pedido despachado exitosamente!");
        } catch (error) {
            console.error("Error confirmando despacho:", error);
            alert("No se pudo registrar el despacho.");
        }
    };

    const handleLiquidateAndDispatch = async () => {
        if (!paymentGateModal.bankId) {
            alert("Por favor selecciona un banco.");
            return;
        }

        const order = paymentGateModal.order;
        try {
            // 1. Update bank balance
            await updateBankBalance(
                paymentGateModal.bankId,
                order.amount,
                'income',
                `Pago Recibido (Despachos) - Pedido ${order.id}`,
                'Venta Directa'
            );

            // 2. Update order status to Pagado
            await updateOrder(order.dbId, { 
                payment_status: 'Pagado',
                payment_bank_id: paymentGateModal.bankId 
            });

            // 3. Clear gate modal and open dispatch modal
            setPaymentGateModal({ show: false, order: null, bankId: '' });
            setDispatchModal({ 
                show: true, 
                order: order, 
                trackingNumber: '', 
                date: new Date().toLocaleDateString('en-CA'),
                time: new Date().toLocaleTimeString('es-CO', { hour12: false, hour: '2-digit', minute: '2-digit' })
            });

            await refreshData();
            alert("¡Pago liquidado! Ahora puedes completar el despacho.");
        } catch (error) {
            console.error("Error liquidating payment:", error);
            alert("Error al procesar el pago.");
        }
    };



    const handleUpdateViewedOrder = async () => {
        if (!viewingOrder) return;
        const total = (viewingOrder.items || []).reduce((sum, i) => sum + ((i.price || 0) * (i.quantity || 0)), 0);
        const updated = { ...viewingOrder, amount: total };

        try {
            const res = await updateOrder(updated.dbId, {
                amount: updated.amount,
                status: updated.status,
                items: updated.items
            });
            if (!res.success) throw new Error(res.error);
            await refreshData();
        } catch (e) {
            console.error("Error updating order in Firestore:", e);
        }

        setViewingOrder(null);
    };

    // Filter Logic
    const filteredOrders = useMemo(() => {
        // 1. First Priority: View Mode Separation (Active vs History)
        const historyStatuses = ['entregado', 'finalizado', 'cobrado'];
        let result = orders.filter(o => {
            const isHistorical = historyStatuses.includes((o.status || '').toLowerCase().trim());
            return viewMode === 'history' ? isHistorical : !isHistorical;
        });

        // 2. Date Selection (On top of current view)
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

        // 3. Search multitem
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
            const fulfillA = getStockFulfillment(a.items);
            const fulfillB = getStockFulfillment(b.items);
            
            const isReadyA = fulfillA >= 100 ? 1 : 0;
            const isReadyB = fulfillB >= 100 ? 1 : 0;
            
            if (isReadyA !== isReadyB) {
                return isReadyB - isReadyA; // 1 (Ready) comes before 0 (Partial)
            }
            
            return new Date(b.date || b.created_at) - new Date(a.date || a.created_at);
        });
    }, [orders, searchTerm, filterType, customRange, viewMode]);

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

            // Calculate Lead Time (Dynamic from DB or Real-time)
            const days = getLeadTime(o);
            stats.times.push(days);
        });

        const avg = stats.times.length > 0 ? (stats.times.reduce((a, b) => a + b, 0) / stats.times.length).toFixed(2) : 0;
        const max = stats.times.length > 0 ? Math.max(...stats.times).toFixed(1) : 0;
        const min = stats.times.length > 0 ? Math.min(...stats.times).toFixed(1) : 0;

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

                {/* New Active/History Filter */}
                <div style={{ display: 'flex', background: 'rgba(214, 120, 90, 0.05)', padding: '6px', borderRadius: '22px', border: '1px solid rgba(214, 120, 90, 0.1)' }}>
                    {[
                        { id: 'active', label: 'Activos', icon: <Activity size={14} /> },
                        { id: 'history', label: 'Historial', icon: <Clock size={14} /> }
                    ].map(v => (
                        <button
                            key={v.id}
                            onClick={() => setViewMode(v.id)}
                            style={{ 
                                padding: '0.6rem 1.5rem', 
                                border: 'none', 
                                borderRadius: '12px', 
                                fontSize: '0.75rem', 
                                fontWeight: '900', 
                                cursor: 'pointer', 
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: viewMode === v.id ? premiumSalmon : 'transparent', 
                                color: viewMode === v.id ? '#fff' : premiumSalmon, 
                                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                            {v.icon} {v.label}
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
                        <span style={{ fontSize: '0.85rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Horas Prom.</span>
                    </div>
                    <div style={{ marginTop: '1.2rem', display: 'flex', gap: '1rem', background: '#fcfcfc', padding: '0.7rem 1.2rem', borderRadius: '14px', width: 'fit-content', border: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: '900', color: '#64748b' }}>MIN: <span style={{ color: '#10b981' }}>{kpis.min}h</span></div>
                        <div style={{ fontSize: '0.65rem', fontWeight: '900', color: '#64748b' }}>MAX: <span style={{ color: premiumSalmon }}>{kpis.max}h</span></div>
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
                            <th style={{ padding: '1.2rem 1.5rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(2, 83, 87, 0.05)' }}>Gestión Logística</th>
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

                            return (
                                <tr key={order.id} style={{ 
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    animation: 'fadeUp 0.5s ease-out',
                                    cursor: 'default'
                                }} className="ship-row-premium">
                                    <td 
                                        onClick={() => setViewingOrder(order)}
                                        style={{ padding: '1.2rem 1.5rem', cursor: 'pointer' }}
                                    >
                                        <div style={{ fontWeight: '900', color: deepTeal, fontSize: '1.1rem', letterSpacing: '-0.3px' }}>#{order.id}</div>
                                    </td>
                                    <td 
                                        onClick={() => setViewingOrder(order)}
                                        style={{ padding: '1.2rem 1.5rem', cursor: 'pointer' }}
                                    >
                                        <div style={{ fontSize: '1.2rem', color: '#1e293b', fontWeight: '900', letterSpacing: '-0.2px' }}>{order.client}</div>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                                            <span style={{ fontSize: '0.85rem', color: institutionOcre, fontWeight: '900', background: `${institutionOcre}10`, padding: '4px 10px', borderRadius: '8px' }}>
                                                {order.items?.length || 0} SKUs
                                            </span>
                                            <span style={{ fontSize: '0.85rem', color: deepTeal, fontWeight: '900', background: 'rgba(2, 100, 110, 0.08)', padding: '4px 10px', borderRadius: '8px' }}>
                                                {(order.items || []).reduce((acc, i) => acc + (Number(i.quantity) || 0), 0)} Unidades
                                            </span>
                                            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '900', background: 'rgba(2, 83, 87, 0.04)', padding: '4px 10px', borderRadius: '8px' }}>
                                                {order.id?.toString().startsWith('WEB-') ? 'WEB' : 'MANUAL'}
                                            </span>
                                            {order.purchase_order && (
                                                <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: '900', background: 'rgba(16, 185, 129, 0.08)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                                                    OC: {order.purchase_order}
                                                </span>
                                            )}
                                            {order.payment_status === 'Pagado' ? (
                                                <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: '900', background: 'rgba(16, 185, 129, 0.08)', padding: '4px 10px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <CheckCircle2 size={12} /> PAGADO
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '0.85rem', color: premiumSalmon, fontWeight: '900', background: `${premiumSalmon}12`, padding: '4px 10px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px', border: `1px solid ${premiumSalmon}20` }}>
                                                    <AlertCircle size={12} /> BLOQUEADO: PAGO PENDIENTE
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td 
                                        onClick={() => setViewingOrder(order)}
                                        style={{ padding: '1.2rem 1rem', textAlign: 'center', cursor: 'pointer' }}
                                    >
                                        {(() => {
                                            const hours = getLeadTime(order);
                                            const isDone = order.status === 'Entregado' || order.status === 'Finalizado';
                                            return (
                                                <div style={{ 
                                                    display: 'inline-flex', 
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    padding: '0.5rem 0.8rem', 
                                                    borderRadius: '12px', 
                                                    background: isDone ? 'rgba(16, 185, 129, 0.05)' : (hours > 120 ? `${premiumSalmon}10` : 'rgba(2, 83, 87, 0.03)'), 
                                                    color: isDone ? '#10b981' : (hours > 120 ? premiumSalmon : deepTeal),
                                                    border: isDone ? '1px solid rgba(16, 185, 129, 0.1)' : (hours > 120 ? `1px solid ${premiumSalmon}20` : '1px solid rgba(2, 83, 87, 0.05)'),
                                                    minWidth: '50px'
                                                }}>
                                                    <div style={{ fontSize: '1.2rem', fontWeight: '900', lineHeight: 1 }}>{Math.round(hours)}</div>
                                                    <div style={{ fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase' }}>{isDone ? 'L. Time' : 'HRS'}</div>
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td 
                                        onClick={() => setViewingOrder(order)}
                                        style={{ padding: '1.2rem 1rem', textAlign: 'center', minWidth: '160px', cursor: 'pointer' }}
                                    >
                                        {(() => {
                                            const fulfillment = getStockFulfillment(order.items || []);
                                            const isDone = fulfillment >= 100;
                                            return (
                                                <div style={{ padding: '0 1rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '900', color: isDone ? '#10b981' : (fulfillment > 0 ? institutionOcre : premiumSalmon) }}>
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
                                     <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem' }}>
                                            {/* Documentation Block */}
                                            <div style={{ display: 'flex', gap: '4px', background: '#f8fafc', padding: '4px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                                                {/* Invoice Button */}
                                                <button 
                                                    onClick={() => handleCreateInvoice(order)} 
                                                    style={{ 
                                                        background: order.invoiceNum || downloadedDocs[order.dbId]?.invoice ? 'rgba(16, 185, 129, 0.1)' : '#fff', 
                                                        border: `1px solid ${order.invoiceNum || downloadedDocs[order.dbId]?.invoice ? '#10b981' : '#e2e8f0'}`, 
                                                        padding: '0.6rem 1rem', 
                                                        borderRadius: '12px', 
                                                        cursor: isAvailable ? 'pointer' : 'not-allowed', 
                                                        color: order.invoiceNum || downloadedDocs[order.dbId]?.invoice ? '#10b981' : institutionOcre,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        fontSize: '0.7rem',
                                                        fontWeight: '950',
                                                        transition: 'all 0.3s',
                                                        opacity: !isAvailable ? 0.5 : 1
                                                    }}
                                                    disabled={!isAvailable}
                                                >
                                                    <Printer size={14} /> 
                                                    {order.invoiceNum || downloadedDocs[order.dbId]?.invoice ? (order.invoiceNum || 'FE') : 'FACTURA'}
                                                </button>
                                                
                                                {/* Labels Button */}
                                                <button 
                                                    onClick={() => setLabelModal({ show: true, order, jarsPerBox: 12 })} 
                                                    style={{ 
                                                        background: downloadedDocs[order.dbId]?.labels ? 'rgba(2, 54, 54, 0.1)' : '#fff', 
                                                        border: `1px solid ${downloadedDocs[order.dbId]?.labels ? deepTeal : '#e2e8f0'}`, 
                                                        padding: '0.6rem 1rem', 
                                                        borderRadius: '12px', 
                                                        cursor: 'pointer', 
                                                        color: downloadedDocs[order.dbId]?.labels ? deepTeal : '#64748b',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        fontSize: '0.7rem',
                                                        fontWeight: '950',
                                                        transition: 'all 0.3s'
                                                    }}
                                                >
                                                    <Tags size={14} /> ETIQUETAS
                                                </button>
                                            </div>

                                            {/* Separator / Arrow */}
                                            <ArrowRight size={16} color="#cbd5e1" />

                                            {/* Dispatch Block */}
                                            {order.status === 'Despachado' ? (
                                                <button 
                                                    onClick={() => updateOrder(order.dbId, { status: 'Entregado' })} 
                                                    style={{ 
                                                        background: deepTeal, 
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
                                                    <CheckCircle2 size={16} /> Confirmar Entrega
                                                </button>
                                            ) : (order.status === 'Entregado' || order.status === 'Finalizado' ) ? (
                                                <div style={{ color: '#10b981', fontWeight: '900', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', background: 'rgba(16, 185, 129, 0.08)', padding: '6px 12px', borderRadius: '10px' }}>
                                                    <CheckCircle2 size={14} /> Entregado
                                                </div>
                                            ) : (() => {
                                                const hasInvoice = order.invoiceNum || downloadedDocs[order.dbId]?.invoice;
                                                const hasLabels = downloadedDocs[order.dbId]?.labels;
                                                const canDispatch = hasInvoice && hasLabels;

                                                return (
                                                    <div title={!canDispatch ? "Genera Factura y Etiquetas para habilitar el despacho" : ""}>
                                                        <button 
                                                            disabled={!canDispatch}
                                                            onClick={() => {
                                                                if (order.payment_status !== 'Pagado') {
                                                                    setPaymentGateModal({ show: true, order, bankId: '' });
                                                                } else {
                                                                    setDispatchModal({ 
                                                                        ...dispatchModal, 
                                                                        show: true, 
                                                                        order,
                                                                        date: new Date().toLocaleDateString('en-CA'),
                                                                        time: new Date().toLocaleTimeString('es-CO', { hour12: false, hour: '2-digit', minute: '2-digit' })
                                                                    });
                                                                }
                                                            }} 
                                                            style={{ 
                                                                background: canDispatch ? `linear-gradient(135deg, ${deepTeal} 0%, #037075 100%)` : '#f1f5f9', 
                                                                color: canDispatch ? '#fff' : '#cbd5e1', 
                                                                border: 'none', 
                                                                padding: '0.8rem 1.8rem', 
                                                                borderRadius: '16px', 
                                                                cursor: canDispatch ? 'pointer' : 'not-allowed', 
                                                                fontSize: '0.75rem', 
                                                                fontWeight: '950',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '0.6rem',
                                                                boxShadow: canDispatch ? `0 8px 20px ${deepTeal}30` : 'none',
                                                                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                                                textTransform: 'uppercase'
                                                            }}
                                                        >
                                                            <Truck size={16} /> Despachar
                                                        </button>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                </div>
            </div>

            {/* Refined Order Detail Modal — Consistent with Sales.jsx */}
            {viewingOrder && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '2rem' }}>
                    <div style={{ background: '#fff', width: '100%', maxWidth: '800px', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                        <div style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                <FileText size={28} color={deepTeal} />
                                <div>
                                    <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', fontWeight: '950' }}>#{viewingOrder.id} - {viewingOrder.client}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', color: '#64748b', fontWeight: '700', marginTop: '0.4rem' }}>
                                        <span>🗓️ {viewingOrder.date}</span>
                                        <span>|</span>
                                        <span>🏢 {viewingOrder.source}</span>
                                        <span>|</span>
                                        {(() => {
                                            const clean = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                                            const target = clean(viewingOrder.client);
                                            const match = (clients || []).find(c => clean(c.name) === target);
                                            return (
                                                <span style={{ color: match ? '#10b981' : '#94a3b8', fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase' }}>
                                                    {match ? '● CRM Vinculado' : '● Sin Perfil'}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.6rem', fontWeight: '900', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>Estado Pedido</div>
                                    <span style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', background: `${deepTeal}15`, color: deepTeal, fontSize: '0.75rem', fontWeight: '950' }}>{(viewingOrder.status || 'Pendiente').toUpperCase()}</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.6rem', fontWeight: '900', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>Estado Pago</div>
                                    {(() => {
                                        const isPaid = viewingOrder.payment_status === 'Pagado' || viewingOrder.paymentStatus === 'Pagado' || viewingOrder.source === 'Pagina WEB';
                                        return (
                                            <span style={{ 
                                                padding: '0.4rem 0.8rem', 
                                                borderRadius: '8px', 
                                                background: isPaid ? '#f0fdf4' : '#fffbeb', 
                                                color: isPaid ? '#166534' : '#92400e', 
                                                fontSize: '0.75rem', 
                                                fontWeight: '950'
                                            }}>
                                                {isPaid ? 'PAGADO' : 'PENDIENTE'}
                                            </span>
                                        );
                                    })()}
                                </div>
                                <button onClick={() => setViewingOrder(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '0.6rem', cursor: 'pointer', color: '#64748b', display: 'flex', marginLeft: '0.5rem' }}><X size={20} /></button>
                            </div>
                        </div>

                        <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '2px dashed #e2e8f0' }}>
                                <div>
                                    <h4 style={{ margin: '0 0 1rem 0', color: '#334155', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Datos Vendedor</h4>
                                    <div style={{ color: '#0f172a', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.2rem' }}>{ownCompany?.name}</div>
                                    <div style={{ color: '#64748b', fontSize: '0.9rem' }}>NIT: {ownCompany?.nit}</div>
                                    <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{ownCompany?.city || 'Bogotá'}, Colombia</div>
                                </div>
                                <div>
                                    <h4 style={{ margin: '0 0 1rem 0', color: '#334155', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Datos Cliente</h4>
                                    <div style={{ color: '#0f172a', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.4rem' }}>{viewingOrder.client}</div>
                                    <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{viewingOrder.shipping_address || viewingOrder.address}</div>
                                    <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{viewingOrder.shipping_city || viewingOrder.city}</div>
                                    <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.2rem' }}>Tel: {viewingOrder.shipping_phone || viewingOrder.phone}</div>
                                </div>
                            </div>

                            <h4 style={{ margin: '0 0 1rem 0', color: '#334155', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detalle de Productos</h4>
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: '#f8fafc' }}>
                                        <tr>
                                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem' }}>Producto</th>
                                            <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem' }}>Cant.</th>
                                            <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem' }}>Unitario</th>
                                            <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {viewingOrder.items?.map((item, index) => (
                                            <tr key={index}>
                                                <td style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', fontWeight: '600', color: '#0f172a' }}>{item.name}</td>
                                                <td style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                                                    <input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const newQ = parseInt(e.target.value) || 1;
                                                            const newItems = [...viewingOrder.items];
                                                            newItems[index].quantity = newQ < 1 ? 1 : newQ;
                                                            setViewingOrder({ ...viewingOrder, items: newItems });
                                                        }}
                                                        style={{ width: '60px', padding: '0.4rem', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                                        min="1"
                                                    />
                                                </td>
                                                <td style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right', color: '#64748b' }}>${(item.price || 0).toLocaleString()}</td>
                                                <td style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 'bold' }}>${((item.price * item.quantity) || 0).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px' }}>
                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>* Puedes editar las cantidades de los productos solicitados. Los totales se recalcularán al guardar.</div>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{ color: '#475569', fontSize: '0.9rem', fontWeight: 'bold' }}>TOTAL A PAGAR:</div>
                                    <div style={{ color: deepTeal, fontSize: '1.5rem', fontWeight: '800' }}>
                                        ${(viewingOrder.items?.reduce((sum, i) => sum + (i.price * i.quantity), 0) || 0).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button
                                onClick={() => setViewingOrder(null)}
                                style={{ padding: '0.8rem 2rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '10px', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleUpdateViewedOrder}
                                style={{ padding: '0.8rem 2.5rem', background: deepTeal, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: `0 4px 12px ${deepTeal}30` }}
                            >
                                <Save size={18} /> Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}



            {/* Label Configuration Modal */}
            {labelModal.show && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '2rem' }}>
                    <div style={{ background: '#fff', width: '100%', maxWidth: '400px', borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
                        <div style={{ padding: '2rem', textAlign: 'center' }}>
                            <div style={{ background: `${deepTeal}10`, width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                <Tags size={30} color={deepTeal} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '950', color: '#0f172a', marginBottom: '0.5rem' }}>Configuración de Etiquetas</h3>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>¿Cuántos frascos vas a empacar por caja?</p>
                            
                            <input 
                                type="number" 
                                value={labelModal.jarsPerBox} 
                                onChange={(e) => setLabelModal({ ...labelModal, jarsPerBox: parseInt(e.target.value) || 1 })}
                                style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '2px solid #e2e8f0', textAlign: 'center', fontSize: '1.2rem', fontWeight: '900', color: deepTeal, outline: 'none', marginBottom: '2rem' }}
                                min="1"
                            />

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button onClick={() => setLabelModal({ show: false, order: null, jarsPerBox: 12 })} style={{ flex: 1, padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', fontWeight: '700', cursor: 'pointer' }}>Cancelar</button>
                                <button onClick={() => handleDownloadLabels(labelModal.order, labelModal.jarsPerBox)} style={{ flex: 1, padding: '1rem', borderRadius: '12px', border: 'none', background: deepTeal, color: '#fff', fontWeight: '900', cursor: 'pointer' }}>Generar PDF</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tracking / Dispatch Modal */}
            {dispatchModal.show && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '2rem' }}>
                    <div style={{ background: '#fff', width: '100%', maxWidth: '450px', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
                        <div style={{ padding: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                    <div style={{ background: '#f0fdf4', padding: '0.6rem', borderRadius: '10px' }}>
                                        <Truck size={24} color="#166534" />
                                    </div>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: '950', color: '#0f172a', margin: 0 }}>Registrar Despacho</h3>
                                </div>
                                <button onClick={() => setDispatchModal({ ...dispatchModal, show: false, order: null, trackingNumber: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.2rem', padding: '1rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                                <div>
                                    <label style={{ fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Ref. Pedido</label>
                                    <div style={{ fontSize: '1rem', fontWeight: '900', color: deepTeal }}>#{dispatchModal.order?.id}</div>
                                </div>
                                {dispatchModal.order?.purchase_order && (
                                    <div>
                                        <label style={{ fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Orden de Compra</label>
                                        <div style={{ fontSize: '1rem', fontWeight: '900', color: '#0f172a' }}>{dispatchModal.order.purchase_order}</div>
                                    </div>
                                )}
                            </div>

                            {/* Informative Client Data */}
                            {dispatchModal.order && (() => {
                                const clean = (name) => (name || '').toLowerCase().trim();
                                const target = clean(dispatchModal.order.client);
                                const recipient = (clients || []).find(c => clean(c.name) === target);
                                
                                return (
                                    <div style={{ marginBottom: '1.5rem', padding: '1.2rem', background: 'rgba(2, 83, 87, 0.03)', borderRadius: '18px', border: `1px dashed ${deepTeal}30` }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', color: deepTeal }}>
                                            <Package size={18} />
                                            <span style={{ fontSize: '0.75rem', fontWeight: '950', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Datos de Entrega</span>
                                        </div>
                                        
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.8rem' }}>
                                            <div>
                                                <div style={{ fontSize: '0.6rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Cliente</div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>{dispatchModal.order.client}</div>
                                            </div>
                                            
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.6rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Dirección</div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155' }}>
                                                        {dispatchModal.order.shipping_address || recipient?.address || dispatchModal.order.address || 'N/A'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.6rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Ciudad</div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155' }}>
                                                        {dispatchModal.order.shipping_city || recipient?.city || dispatchModal.order.city || 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
    
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.6rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Teléfono</div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155' }}>
                                                        {dispatchModal.order.shipping_phone || recipient?.phone || dispatchModal.order.phone || 'N/A'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.6rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Email</div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {dispatchModal.order.email || recipient?.email || 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Número de Guía (Interapidísimo)</label>
                                <input 
                                    type="text" 
                                    value={dispatchModal.trackingNumber}
                                    onChange={(e) => setDispatchModal({ ...dispatchModal, trackingNumber: e.target.value.toUpperCase() })}
                                    placeholder="EJ: 70001234567"
                                    style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '1.1rem', fontWeight: '900', outline: 'none', transition: 'all 0.3s' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Fecha</label>
                                    <input 
                                        type="date" 
                                        value={dispatchModal.date}
                                        onChange={(e) => setDispatchModal({ ...dispatchModal, date: e.target.value })}
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Hora</label>
                                    <input 
                                        type="time" 
                                        value={dispatchModal.time}
                                        onChange={(e) => setDispatchModal({ ...dispatchModal, time: e.target.value })}
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={handleConfirmDispatch}
                                style={{ width: '100%', padding: '1.2rem', borderRadius: '16px', border: 'none', background: `linear-gradient(135deg, ${deepTeal} 0%, #037075 100%)`, color: '#fff', fontWeight: '950', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 10px 20px rgba(2, 83, 87, 0.2)' }}
                            >
                                CONFIRMAR ENVÍO
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {paymentGateModal.show && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(2, 54, 54, 0.4)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11000, padding: '1.5rem' }}>
                    <div style={{ background: '#fff', padding: '3.5rem', borderRadius: '45px', width: '100%', maxWidth: '480px', boxShadow: '0 30px 60px rgba(0,0,0,0.15)', animation: 'scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                            <div style={{ background: `${premiumSalmon}15`, width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: premiumSalmon }}>
                                <AlertCircle size={40} />
                            </div>
                            <h3 style={{ margin: 0, fontWeight: '950', color: deepTeal, fontSize: '2rem', letterSpacing: '-1px' }}>¡ALTO! PAGO PENDIENTE</h3>
                            <p style={{ marginTop: '0.8rem', color: '#64748b', fontSize: '1rem', fontWeight: '700' }}>Este pedido no puede ser despachado hasta que se confirme el ingreso del dinero.</p>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '24px', marginBottom: '2rem', border: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Consignatario</span>
                                <span style={{ fontSize: '0.75rem', fontWeight: '900', color: deepTeal }}>{paymentGateModal.order?.client}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Total a cobrar</span>
                                <span style={{ fontSize: '1.2rem', fontWeight: '900', color: premiumSalmon }}>${paymentGateModal.order?.amount?.toLocaleString()}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: '900', color: institutionOcre, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.8rem' }}>Canal de Recibo (Banco)</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.8rem' }}>
                                    {(banks || []).filter(b => b.type === 'cta de ahorros').map(b => (
                                        <button
                                            key={b.id}
                                            onClick={() => setPaymentGateModal({ ...paymentGateModal, bankId: b.id })}
                                            style={{
                                                padding: '1rem',
                                                borderRadius: '16px',
                                                border: (paymentGateModal.bankId === b.id) ? `2.5px solid ${deepTeal}` : '1px solid #e2e8f0',
                                                background: (paymentGateModal.bankId === b.id) ? `${deepTeal}08` : '#fff',
                                                color: (paymentGateModal.bankId === b.id) ? deepTeal : '#64748b',
                                                fontWeight: '900',
                                                fontSize: '0.8rem',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s'
                                            }}
                                        >
                                            {b.name.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button
                                    onClick={() => setPaymentGateModal({ show: false, order: null, bankId: '' })}
                                    style={{ flex: 1, padding: '1.2rem', borderRadius: '20px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: '900', cursor: 'pointer' }}
                                >
                                    VOLVER
                                </button>
                                <button
                                    disabled={!paymentGateModal.bankId}
                                    onClick={handleLiquidateAndDispatch}
                                    style={{ flex: 2, padding: '1.2rem', borderRadius: '20px', border: 'none', background: !paymentGateModal.bankId ? '#cbd5e1' : `linear-gradient(90deg, ${deepTeal}, #037075)`, color: '#fff', fontWeight: '950', cursor: paymentGateModal.bankId ? 'pointer' : 'not-allowed', boxShadow: paymentGateModal.bankId ? `0 10px 25px ${deepTeal}30` : 'none' }}
                                >
                                    LIQUIDAR Y LIBERAR
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {confirmModal.show && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: '2rem' }}>
                    <div style={{ background: '#fff', width: '100%', maxWidth: '400px', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
                        <div style={{ padding: '2rem', textAlign: 'center' }}>
                            <div style={{ background: '#fef2f2', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                <AlertTriangle size={30} color="#ef4444" />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1A3636', marginBottom: '0.8rem' }}>{confirmModal.title}</h3>
                            <p style={{ fontSize: '0.95rem', color: '#64748b', lineHeight: '1.6', marginBottom: '2rem' }}>{confirmModal.message}</p>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                                    style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: '700', cursor: 'pointer' }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirmModal.type === 'item' && confirmModal.target) {
                                            const newItems = [...viewingOrder.items];
                                            newItems.splice(confirmModal.target.index, 1);
                                            setViewingOrder({ ...viewingOrder, items: newItems });
                                        }
                                        setConfirmModal({ ...confirmModal, show: false });
                                    }}
                                    style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', border: 'none', background: '#ea580c', color: '#fff', fontWeight: '700', cursor: 'pointer' }}
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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

