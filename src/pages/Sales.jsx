import React, { useState, useMemo, useEffect } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { supabase } from '../lib/supabase';
import { products } from '../data/products';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    FileText,
    Download,
    TrendingUp,
    Calendar,
    Plus,
    Trash2,
    Filter,
    ShoppingCart,
    Globe,
    Users,
    Briefcase,
    Search,
    ChevronDown,
    X,
    Save,
    AlertTriangle,
    ArrowRight,
    Mail,
    Phone,
    CheckCircle2
} from 'lucide-react';

const Orders = ({ orders, setOrders }) => {
    const { items, recipes, providers, purchaseOrders, setPurchaseOrders } = useBusiness();

    // Selection state
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [clients, setClients] = useState([]);

    useEffect(() => {
        const savedClients = localStorage.getItem('zeticas_clients_data');
        if (savedClients) {
            setClients(JSON.parse(savedClients).filter(c => c.status === 'Active'));
        }
    }, []);

    // Filters and UI State
    const [filterType, setFilterType] = useState('month');
    const [customRange, setCustomRange] = useState({ from: '', to: '' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isExplosionModalOpen, setIsExplosionModalOpen] = useState(false);
    const [isPoModalOpen, setIsPoModalOpen] = useState(false);
    const [viewingOrder, setViewingOrder] = useState(null);
    const [newViewedItem, setNewViewedItem] = useState({ id: '', quantity: 1, name: '', price: 0 });
    const [explosionPreview, setExplosionPreview] = useState([]);
    const [poPreviewList, setPoPreviewList] = useState([]);
    const [expandedExplosionItem, setExpandedExplosionItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [newOrder, setNewOrder] = useState({
        client: '',
        source: 'Clientes',
        items: []
    });

    // Available Products (PT) - In a real app this would come from a database/API
    const availableProducts = products.map((p, index) => ({
        id: p.id || 100 + index,
        name: p.nombre,
        price: p.precio
    }));

    // Filtering logic
    const filteredOrders = useMemo(() => {
        let result = orders;

        // Date filtering
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

        // Search filtering
        if (searchTerm) {
            result = result.filter(o =>
                o.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                o.id.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        return result;
    }, [orders, filterType, customRange, searchTerm]);

    // Metrics
    const totalSales = filteredOrders.reduce((sum, o) => sum + o.amount, 0);
    const orderCount = filteredOrders.length;

    // Actions
    const handleDeleteOrder = (id) => {
        if (!window.confirm("¿Estás seguro que quieres eliminar este pedido?")) {
            return;
        }
        setOrders(orders.filter(o => o.id !== id));
        setSelectedOrders(selectedOrders.filter(sid => sid !== id));
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedOrders(filteredOrders.map(o => o.id));
        } else {
            setSelectedOrders([]);
        }
    };

    const handleSelectOrder = (id) => {
        if (selectedOrders.includes(id)) {
            setSelectedOrders(selectedOrders.filter(sid => sid !== id));
        } else {
            setSelectedOrders([...selectedOrders, id]);
        }
    };

    const handleExplosion = () => {
        if (selectedOrders.length === 0) {
            alert('Selecciona al menos un pedido para explosionar materias primas.');
            return;
        }

        const selectedOrderObjects = orders.filter(o => selectedOrders.includes(o.id));

        // 1. Calculate required quantities per SKU
        const requiredSkus = {};
        selectedOrderObjects.forEach(order => {
            order.items.forEach(item => {
                requiredSkus[item.name] = (requiredSkus[item.name] || 0) + item.quantity;
            });
        });

        // 2. Calculate required Raw Materials based on BOM
        const requiredRawMaterials = {};
        const bomDetails = {};
        Object.entries(requiredSkus).forEach(([skuName, totalQty]) => {
            const recipe = recipes[skuName];
            if (recipe) {
                recipe.forEach(mat => {
                    requiredRawMaterials[mat.id] = (requiredRawMaterials[mat.id] || 0) + (mat.qty * totalQty);

                    if (!bomDetails[mat.id]) bomDetails[mat.id] = [];
                    bomDetails[mat.id].push(`${skuName} (x${totalQty}) req: ${(mat.qty * totalQty).toFixed(2)}`);
                });
            } else {
                console.warn(`No recipe found for SKU: ${skuName}`);
            }
        });

        // 3. Assemble the preview list
        const previewItems = [];

        Object.entries(requiredRawMaterials).forEach(([matIdStr, requiredQty]) => {
            const matId = Number(matIdStr);
            const material = items.find(i => i.id === matId);

            if (material) {
                const currentInv = material.initial + material.purchases - material.sales;
                const neededToBuy = requiredQty - currentInv + material.safety;

                if (neededToBuy > 0) {
                    const group = material.group || 'General';
                    const recommendedProvider = providers.find(p => p.group === group);

                    previewItems.push({
                        ...material,
                        requiredQty: Number(requiredQty.toFixed(2)),
                        currentInv,
                        safety: material.safety,
                        bomBreakdown: bomDetails[matId].join(' | '),
                        quantityToBuy: Math.ceil(neededToBuy),
                        unitCost: material.avgCost && material.avgCost > 0 ? material.avgCost : 1000, // Garantizar precio histórico o base
                        providerId: recommendedProvider ? recommendedProvider.id : ''
                    });
                }
            }
        });

        if (previewItems.length > 0) {
            setExplosionPreview(previewItems);
            setIsExplosionModalOpen(true);
        } else {
            alert('El inventario actual es suficiente para cubrir estos pedidos.');
        }
    };

    const handleGeneratePOPreviews = () => {
        const newPurchaseOrders = [];
        const byProvider = {};

        for (let item of explosionPreview) {
            if (!item.providerId) {
                alert(`Por favor, selecciona un proveedor válido para: ${item.name}`);
                return;
            }
            if (!byProvider[item.providerId]) byProvider[item.providerId] = [];
            byProvider[item.providerId].push(item);
        }

        Object.entries(byProvider).forEach(([providerId, mats]) => {
            const provider = providers.find(p => p.id === providerId) || { id: providerId, name: 'Proveedor Asignado' };
            const subtotal = mats.reduce((sum, m) => sum + (m.quantityToBuy * m.unitCost), 0);
            const iva = subtotal * 0.19; // IVA del 19%
            const totalOC = subtotal + iva;

            newPurchaseOrders.push({
                id: `OC-${Math.floor(1000 + Math.random() * 9000)}`,
                providerId: provider.id,
                providerName: provider.name,
                providerPhone: provider.phone || '3000000000',
                providerEmail: provider.email || 'ventas@proveedor.com',
                date: new Date().toISOString().split('T')[0],
                items: mats.map(m => ({
                    id: m.id, // reference to material ID
                    name: m.name,
                    quantity: m.quantityToBuy,
                    price: m.unitCost
                })),
                subtotal,
                iva,
                total: totalOC,
                status: 'Enviada',
                relatedOrders: [...selectedOrders]
            });
        });

        setPoPreviewList(newPurchaseOrders);
        setIsExplosionModalOpen(false);
        setIsPoModalOpen(true);
    };

    const handleSendAndSavePOs = async () => {
        // 1. Persistir las OCs en Supabase y actualizar órdenes a "En Compras"
        try {
            // Actualizar tabla orders
            const { error: errorOrders } = await supabase
                .from('orders')
                .update({ status: 'En Compras' })
                .in('id', selectedOrders);

            if (errorOrders) console.error("Error al actualizar orders en BD:", errorOrders);

            // Intentar registrar OCs en Supabase si las tablas existen
            for (const po of poPreviewList) {
                const { error: poError } = await supabase.from('purchase_orders').insert({
                    id: po.id,
                    provider_id: po.providerId,
                    provider_name: po.providerName,
                    order_date: po.date,
                    total_amount: po.total,
                    status: po.status,
                    related_orders: po.relatedOrders
                });

                if (!poError && po.items.length > 0) {
                    const mappedItems = po.items.map(i => ({
                        purchase_order_id: po.id,
                        material_id: i.id,
                        material_name: i.name,
                        quantity: i.quantity,
                        unit_price: i.price
                    }));
                    await supabase.from('purchase_order_items').insert(mappedItems);
                }
            }
        } catch (e) {
            console.warn("Faltan las tablas purchase_orders o no se pudo persistir en la BD online:", e);
        }

        // 2. State updates
        setPurchaseOrders([...poPreviewList, ...purchaseOrders]);

        setOrders(orders.map(o => {
            if (selectedOrders.includes(o.id)) {
                return { ...o, status: 'En Compras' };
            }
            return o;
        }));

        setSelectedOrders([]);
        setIsPoModalOpen(false);
        setPoPreviewList([]);
        alert('Se generaron y enviaron las ordenes de compra con exito, los pedidos pasaron a Compras en el tablero.');
    };

    const handleSendWhatsApp = (po) => {
        const text = `Hola ${po.providerName}, somos ZETICAS SAS. Adjuntamos nuestra orden de compra ${po.id} por un total de $${po.total.toLocaleString()}. Quedamos atentos a confirmación.`;
        window.open(`https://wa.me/57${po.providerPhone}?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleSendEmail = (po) => {
        const subject = `Orden de Compra ZETICAS SAS - ${po.id}`;
        const body = `Señores ${po.providerName},\n\nAdjuntamos orden de compra ${po.id}.\nTotal a pagar: $${po.total.toLocaleString()}.\n\nPara ver los detalles por favor revisar el sistema o contactarnos.\n\nAtentamente,\nZETICAS SAS`;
        window.open(`mailto:${po.providerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    };

    const handleUpdatePreviewItem = (id, field, value) => {
        setExplosionPreview(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    const handleAddProductToOrder = (productId) => {
        const product = availableProducts.find(p => p.id === productId);
        const existingItem = newOrder.items.find(i => i.id === productId);

        if (existingItem) {
            setNewOrder({
                ...newOrder,
                items: newOrder.items.map(i => i.id === productId ? { ...i, quantity: i.quantity + 1 } : i)
            });
        } else {
            setNewOrder({
                ...newOrder,
                items: [...newOrder.items, { ...product, quantity: 1 }]
            });
        }
    };

    const handleSaveOrder = (e) => {
        e.preventDefault();
        if (!newOrder.client || newOrder.items.length === 0) {
            alert('Por favor completa el cliente y añade al menos un producto.');
            return;
        }

        const total = newOrder.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        let prefix = 'WEB-';
        if (newOrder.source === 'Clientes') prefix = 'CLI-';
        if (newOrder.source === 'Distribuidores') prefix = 'DIS-';
        if (newOrder.source === 'Recurrentes') prefix = 'REC-';

        const orderId = `${prefix}${Math.floor(100 + Math.random() * 900)}`;

        const preparedOrder = {
            id: orderId,
            client: newOrder.client,
            amount: total,
            date: new Date().toISOString().split('T')[0],
            status: 'Pendiente',
            source: newOrder.source,
            items: newOrder.items
        };

        setOrders([preparedOrder, ...orders]);
        setIsModalOpen(false);
        setNewOrder({ client: '', source: 'Clientes', items: [] });
    };

    const handleUpdateViewedOrder = () => {
        const total = viewingOrder.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        const updated = { ...viewingOrder, amount: total };
        setOrders(orders.map(o => o.id === updated.id ? updated : o));
        setViewingOrder(null);
    };

    const handleDeleteViewedOrder = () => {
        if (!window.confirm("¿Estás seguro que quieres eliminar este pedido?")) {
            return;
        }
        setOrders(orders.filter(o => o.id !== viewingOrder.id));
        setSelectedOrders(selectedOrders.filter(sid => sid !== viewingOrder.id));
        setViewingOrder(null);
    };

    const handleDownloadPDF = async (order) => {
        const doc = new jsPDF();
        const clientInfo = clients.find(c => c.name === order.client);

        // Header Title
        doc.setFontSize(22);
        doc.setTextColor(30, 41, 59); // Slate 800
        doc.text('NOTA DE PEDIDO', 14, 22);

        // Load Logo Asynchronously
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

        // Order Info Box
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // Slate 500
        doc.text(`ID del Pedido: ${order.id}`, 14, 30);
        doc.text(`Fecha: ${order.date}`, 14, 35);
        doc.text(`Origen: ${order.source}`, 14, 40);

        // Divider
        doc.setDrawColor(226, 232, 240); // Slate 200
        doc.line(14, 45, 196, 45);

        // Zeticas / Vendor Data
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text('DATOS DEL VENDEDOR', 14, 55);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Zeticas S.A.S.', 14, 60);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('NIT: 901.234.567-8', 14, 65);
        doc.text('Bogotá, Colombia', 14, 70);

        // Client Data
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text('DATOS DEL CLIENTE', 120, 55);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(order.client, 120, 60);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(clientInfo?.nit || 'NIT: No reportado', 120, 65);
        doc.text(clientInfo?.address || 'Bogotá, Colombia', 120, 70);

        // Items Table
        const tableColumn = ["Producto", "Cantidad", "V. Unitario", "V. Total"];
        const tableRows = [];

        order.items.forEach(item => {
            const rowData = [
                item.name,
                item.quantity.toString(),
                `$${item.price.toLocaleString()}`,
                `$${(item.price * item.quantity).toLocaleString()}`
            ];
            tableRows.push(rowData);
        });

        autoTable(doc, {
            startY: 85,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [248, 250, 252], textColor: [100, 116, 139], fontStyle: 'bold', halign: 'center' },
            bodyStyles: { textColor: [51, 65, 85] },
            columnStyles: {
                0: { halign: 'left' },
                1: { halign: 'center' },
                2: { halign: 'right' },
                3: { halign: 'right', fontStyle: 'bold' }
            },
            styles: { fontSize: 9, cellPadding: 5 }
        });

        // Total
        const total = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        const finalY = doc.lastAutoTable?.finalY || 85;
        doc.text(`TOTAL A PAGAR: $${total.toLocaleString()}`, 196, finalY + 15, { align: 'right' });

        // Footer disclaimer
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text('Documento generado automáticamente por Zeticas OS', 105, 280, { align: 'center' });

        // Save
        doc.save(`Pedido_${order.id}.pdf`);
    };

    const getSourceIcon = (source) => {
        switch (source) {
            case 'Pagina WEB': return <Globe size={14} />;
            case 'Distribuidores': return <Briefcase size={14} />;
            case 'Recurrentes':
            case 'Cliente Recurrente': return <Users size={14} />;
            default: return <ShoppingCart size={14} />;
        }
    };

    return (
        <div className="orders-module" style={{ padding: '0 1rem' }}>
            <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2 className="font-serif" style={{ fontSize: '2.2rem', color: 'var(--color-primary)', margin: 0 }}>Pedidos de PT</h2>
                    <p style={{ color: '#666', fontSize: '0.95rem', marginTop: '0.5rem' }}>Inicio del flujo Lean / Kanban para producción JIT.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {selectedOrders.length > 0 && (
                        <button
                            onClick={handleExplosion}
                            style={{
                                background: '#e67e22',
                                color: 'white',
                                padding: '0.8rem 1.5rem',
                                borderRadius: '10px',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                fontWeight: '600',
                                boxShadow: '0 4px 12px rgba(230, 126, 34, 0.2)'
                            }}
                        >
                            <ShoppingCart size={18} /> Explosionar Órdenes de Compra ({selectedOrders.length})
                        </button>
                    )}
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="btn-premium"
                        style={{
                            background: 'var(--color-primary)',
                            color: 'white',
                            padding: '0.8rem 1.5rem',
                            borderRadius: '10px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            fontWeight: '600',
                            boxShadow: '0 4px 12px rgba(26, 54, 54, 0.2)'
                        }}
                    >
                        <Plus size={18} /> Cargar Nuevo Pedido
                    </button>
                </div>
            </header>

            {/* Filter Bar */}
            <div style={{
                background: '#fff',
                padding: '1.2rem',
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                border: '1px solid #f1f5f9',
                marginBottom: '2rem',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1.5rem',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.3rem', borderRadius: '10px' }}>
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
                    >Ventas última Semana</button>
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
                    >Ventas Mes</button>
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

                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Buscar por cliente o número de factura..."
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ background: 'linear-gradient(135deg, #1A3636 0%, #2D4F4F 100%)', padding: '1.2rem', borderRadius: '16px', color: '#fff', boxShadow: '0 8px 16px rgba(26, 54, 54, 0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        Total Ventas en Período
                        <TrendingUp size={14} color="#4ade80" />
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800' }}>${totalSales.toLocaleString()}</div>
                </div>

                <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.3rem' }}>Volumen de Pedidos</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--color-primary)' }}>{orderCount} <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#94a3b8' }}>pedidos</span></div>
                </div>

                <div style={{ background: '#fff9f2', padding: '1rem 1.2rem', borderRadius: '16px', border: '1px solid #ffedd5', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: '#ea580c', marginBottom: '0.4rem', fontWeight: 'bold' }}>Acción Recomendada</div>
                    <button
                        onClick={handleExplosion}
                        style={{
                            background: '#ea580c',
                            color: 'white',
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem',
                            fontWeight: '700',
                            fontSize: '0.8rem',
                            boxShadow: '0 4px 10px rgba(234, 88, 12, 0.3)',
                            width: '100%',
                            transition: 'all 0.2s',
                            opacity: selectedOrders.length > 0 ? 1 : 0.5
                        }}
                    >
                        <ShoppingCart size={16} /> Explosionar Órdenes
                    </button>
                    <div style={{ fontSize: '0.65rem', color: '#9a3412', marginTop: '0.4rem', lineHeight: '1.2' }}>
                        Selecciona pedidos abajo para calcular compras
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                        <tr>
                            <th style={{ padding: '1.2rem 1.5rem', textAlign: 'left' }}>
                                <input
                                    type="checkbox"
                                    onChange={handleSelectAll}
                                    checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                            </th>
                            <th style={{ padding: '1.2rem 0.5rem', textAlign: 'center', width: '9%', fontWeight: '700', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>
                                <div style={{ lineHeight: '1.2' }}>Factura<br />Pedido</div>
                            </th>
                            <th style={{ padding: '1.2rem 1.5rem', textAlign: 'left', width: '31%', fontWeight: '700', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Cliente</th>
                            <th style={{ padding: '1.2rem 1.5rem', textAlign: 'left', fontWeight: '700', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Origen</th>
                            <th style={{ padding: '1.2rem 1.5rem', textAlign: 'left', fontWeight: '700', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Fecha</th>
                            <th style={{ padding: '1.2rem 1.5rem', textAlign: 'right', fontWeight: '700', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Total</th>
                            <th style={{ padding: '1.2rem 1.5rem', textAlign: 'center', fontWeight: '700', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Estado</th>
                            <th style={{ padding: '1.2rem 1.5rem', textAlign: 'center', fontWeight: '700', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Descargar</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.length > 0 ? filteredOrders.map(order => (
                            <tr
                                key={order.id}
                                style={{
                                    borderBottom: '1px solid #f8fafc',
                                    transition: 'background 0.2s',
                                    background: selectedOrders.includes(order.id) ? '#f0f9ff' : 'transparent',
                                    cursor: 'pointer'
                                }}
                                className="table-row-hover"
                                onClick={() => setViewingOrder(JSON.parse(JSON.stringify(order)))}
                            >
                                <td style={{ padding: '1.2rem 1.5rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedOrders.includes(order.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => { e.stopPropagation(); handleSelectOrder(order.id); }}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                </td>
                                <td style={{ padding: '1.2rem 0.5rem', textAlign: 'center', fontWeight: '700', fontSize: '0.9rem', color: 'var(--color-primary)' }}>{order.id}</td>
                                <td style={{ padding: '1.2rem 1.5rem' }}>
                                    <div style={{ fontWeight: '600', color: '#334155', fontSize: '0.95rem' }}>{order.client}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{order.items.length} productos</div>
                                </td>
                                <td style={{ padding: '1.2rem 1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#475569', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', width: 'fit-content' }}>
                                        {getSourceIcon(order.source)}
                                        {order.source}
                                    </div>
                                </td>
                                <td style={{ padding: '1.2rem 1.5rem', fontSize: '0.85rem', color: '#64748b' }}>{order.date}</td>
                                <td style={{ padding: '1.2rem 1.5rem', textAlign: 'right', fontWeight: '800', color: '#0f172a' }}>${order.amount.toLocaleString()}</td>
                                <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                                    <span style={{
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        fontSize: '0.7rem',
                                        fontWeight: '700',
                                        background:
                                            order.status === 'Pagado' || order.status === 'Entregado' ? '#ecfdf5' :
                                                order.status === 'En Compras' ? '#fffbeb' : '#fff7ed',
                                        color:
                                            order.status === 'Pagado' || order.status === 'Entregado' ? '#059669' :
                                                order.status === 'En Compras' ? '#d97706' : '#ea580c'
                                    }}>
                                        {order.status.toUpperCase()}
                                    </span>
                                </td>
                                <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.8rem' }}>
                                        <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(order); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }} title="Descargar"><Download size={18} /></button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }}
                                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fca5a5' }}
                                            title="Eliminar"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="8" style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                                    <div style={{ marginBottom: '1rem' }}><ShoppingCart size={40} strokeWidth={1} /></div>
                                    No se encontraron pedidos en este período.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal for New Order */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.4)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    padding: '2rem'
                }}>
                    <div style={{
                        background: '#fff',
                        width: '100%',
                        maxWidth: '900px',
                        maxHeight: '90vh',
                        borderRadius: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--color-primary)' }}>Nuevo Pedido de PT</h3>
                                <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>Ingresa los detalles del pedido y productos a despachar.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', color: '#64748b', display: 'flex' }}><X size={20} /></button>
                        </div>

                        <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
                                {/* Left side: Order Info & Items */}
                                <div>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '0.5rem' }}>ORIGEN DE VENTA</label>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {['Distribuidores', 'Clientes', 'Recurrentes'].map(source => (
                                                <button
                                                    key={source}
                                                    type="button"
                                                    onClick={() => setNewOrder({ ...newOrder, source, client: '', clientId: '' })}
                                                    style={{
                                                        flex: 1,
                                                        padding: '0.6rem',
                                                        borderRadius: '8px',
                                                        border: newOrder.source === source ? '2px solid var(--color-primary)' : '1px solid #e2e8f0',
                                                        background: newOrder.source === source ? '#f0f4f4' : '#fff',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        color: newOrder.source === source ? 'var(--color-primary)' : '#64748b'
                                                    }}
                                                >
                                                    {source}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '0.5rem' }}>CLIENTE / RAZÓN SOCIAL</label>
                                        <select
                                            value={newOrder.clientId || ''}
                                            onChange={(e) => {
                                                const selectedClientId = e.target.value;
                                                const client = clients.find(c => c.id.toString() === selectedClientId);
                                                if (client) {
                                                    setNewOrder({ ...newOrder, client: client.name, clientId: client.id });
                                                } else {
                                                    setNewOrder({ ...newOrder, client: '', clientId: '' });
                                                }
                                            }}
                                            style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', background: '#fff' }}
                                        >
                                            <option value="">Selecciona un cliente...</option>
                                            {clients.length > 0 ? (
                                                (() => {
                                                    const filteredDropdownClients = clients.filter(c => {
                                                        const matchSource = c.source ? c.source.toLowerCase() : '';
                                                        if (newOrder.source === 'Distribuidores') {
                                                            return matchSource.includes('distribuidor');
                                                        } else if (newOrder.source === 'Clientes') {
                                                            return matchSource.includes('cliente') || matchSource.includes('web') || matchSource.includes('cargue manual');
                                                        } else if (newOrder.source === 'Recurrentes') {
                                                            return matchSource.includes('recurrente') || matchSource.includes('suscrip');
                                                        }
                                                        return true;
                                                    });

                                                    if (filteredDropdownClients.length === 0) {
                                                        return <option value="" disabled>No hay clientes en esta categoría</option>;
                                                    }

                                                    return filteredDropdownClients.map(c => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ));
                                                })()
                                            ) : (
                                                <option value="" disabled>Crea primero clientes</option>
                                            )}
                                        </select>
                                    </div>

                                    <div style={{ marginTop: '2.5rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '1rem' }}>PRODUCTOS EN EL PEDIDO</label>
                                        {newOrder.items.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {newOrder.items.map(item => (
                                                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.8rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{item.name}</div>
                                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Precio unit: ${item.price.toLocaleString()}</div>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                            <div style={{ fontWeight: '700', color: 'var(--color-primary)' }}>x{item.quantity}</div>
                                                            <div style={{ fontWeight: '800', width: '80px', textAlign: 'right' }}>${(item.price * item.quantity).toLocaleString()}</div>
                                                            <button
                                                                onClick={() => setNewOrder({ ...newOrder, items: newOrder.items.filter(i => i.id !== item.id) })}
                                                                style={{ border: 'none', background: 'transparent', color: '#fca5a5', cursor: 'pointer' }}
                                                            ><Trash2 size={16} /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div style={{ marginTop: '1rem', borderTop: '2px dashed #e2e8f0', paddingTop: '1rem', textAlign: 'right' }}>
                                                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Pedido:</div>
                                                    <div style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--color-primary)' }}>
                                                        ${newOrder.items.reduce((sum, i) => sum + (i.price * i.quantity), 0).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '2rem', background: '#fcfcfc', border: '1px dashed #cbd5e1', borderRadius: '12px', color: '#94a3b8' }}>
                                                <ShoppingCart size={30} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                                                <div style={{ fontSize: '0.85rem' }}>Aún no hay productos en este pedido.</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right side: Product Catalog */}
                                <div style={{ borderLeft: '1px solid #f1f5f9', paddingLeft: '2rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '1rem' }}>CATÁLOGO PRODUCTO TERMINADO</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                        {availableProducts.map(prod => (
                                            <div key={prod.id} style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fff' }}>
                                                <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.2rem' }}>{prod.name}</div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.9rem', color: '#059669', fontWeight: '700' }}>${prod.price.toLocaleString()}</span>
                                                    <button
                                                        onClick={() => handleAddProductToOrder(prod.id)}
                                                        style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.4rem 0.8rem', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                                                    >
                                                        + Añadir
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: '#f8fafc' }}>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{ padding: '0.8rem 2rem', borderRadius: '12px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontWeight: '600', color: '#475569' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveOrder}
                                style={{ padding: '0.8rem 2.5rem', borderRadius: '12px', border: 'none', background: 'var(--color-primary)', color: '#fff', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 4px 12px rgba(26, 54, 54, 0.2)' }}
                            >
                                <Save size={18} /> Procesar Pedido
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Explosion Preview Modal */}
            {isExplosionModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.4)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    padding: '2rem'
                }}>
                    <div style={{
                        background: '#fff',
                        width: '100%',
                        maxWidth: '1000px',
                        maxHeight: '90vh',
                        borderRadius: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff9f2' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#ea580c', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <ShoppingCart size={24} />
                                    Previsualización de Órdenes (BOM)
                                </h3>
                                <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: '#9a3412' }}>Revisa, ajusta cantidades y proveedores antes de generar las Órdenes de Compra.</p>
                            </div>
                            <button onClick={() => setIsExplosionModalOpen(false)} style={{ background: '#fff', border: '1px solid #fed7aa', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', color: '#ea580c', display: 'flex' }}><X size={20} /></button>
                        </div>

                        <div style={{ padding: '2rem', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {explosionPreview.map(item => (
                                    <div key={item.id} style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                        <div
                                            onClick={() => setExpandedExplosionItem(expandedExplosionItem === item.id ? null : item.id)}
                                            style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: expandedExplosionItem === item.id ? '1px solid #f1f5f9' : 'none' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                                <div style={{ background: '#f0fdf4', padding: '0.8rem', borderRadius: '12px', color: '#16a34a' }}>
                                                    <Briefcase size={20} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '800', fontSize: '1.1rem', color: 'var(--color-primary)' }}>{item.name}</div>
                                                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Requerido: <span style={{ fontWeight: 'bold' }}>{item.requiredQty} {item.unit}</span> | Stock: <span style={{ fontWeight: 'bold' }}>{item.currentInv} {item.unit}</span> | Safety: <span style={{ fontWeight: 'bold' }}>{item.safety} {item.unit}</span></div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', padding: '0.8rem 1.2rem', borderRadius: '10px', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '0.7rem', color: '#ea580c', fontWeight: 'bold', textTransform: 'uppercase' }}>A Comprar</div>
                                                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#c2410c' }}>{item.quantityToBuy} <span style={{ fontSize: '0.8rem' }}>{item.unit}</span></div>
                                                </div>
                                                <ChevronDown size={20} color="#94a3b8" style={{ transform: expandedExplosionItem === item.id ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                                            </div>
                                        </div>

                                        {expandedExplosionItem === item.id && (
                                            <div style={{ padding: '1.5rem', background: '#fcfcfc' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) 1fr', gap: '2rem' }}>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Fórmula de Cálculo (BOM)</label>
                                                        <div style={{ fontSize: '0.85rem', color: '#475569', background: '#f1f5f9', padding: '1rem', borderRadius: '8px', lineHeight: '1.6' }}>
                                                            {item.bomBreakdown.split(' | ').map((line, idx) => <div key={idx}>• {line}</div>)}
                                                        </div>
                                                        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#0f172a', fontWeight: 'bold' }}>
                                                            Total Requerido ({item.requiredQty}) - Inv Final ({item.currentInv}) + Safety ({item.safety}) = <span style={{ color: '#ea580c' }}>Sugerido: {Math.ceil(item.requiredQty - item.currentInv + item.safety)}</span>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                                            <div style={{ flex: 1 }}>
                                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Cant. Final</label>
                                                                <input
                                                                    type="number"
                                                                    value={item.quantityToBuy}
                                                                    onChange={(e) => handleUpdatePreviewItem(item.id, 'quantityToBuy', Number(e.target.value))}
                                                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                                                                />
                                                            </div>
                                                            <div style={{ flex: 1 }}>
                                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Precio Sug. ($)</label>
                                                                <input
                                                                    type="number"
                                                                    value={item.unitCost}
                                                                    onChange={(e) => handleUpdatePreviewItem(item.id, 'unitCost', Number(e.target.value))}
                                                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Asignar Proveedor</label>
                                                            <select
                                                                value={item.providerId}
                                                                onChange={(e) => handleUpdatePreviewItem(item.id, 'providerId', e.target.value)}
                                                                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff' }}
                                                            >
                                                                <option value="">Selecciona un proveedor...</option>
                                                                {providers.map(p => (
                                                                    <option key={p.id} value={p.id}>{p.name} ({p.group})</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
                            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                                Total Estimado OCs: <span style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--color-primary)' }}>${explosionPreview.reduce((sum, item) => sum + (item.quantityToBuy * item.unitCost), 0).toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={() => setIsExplosionModalOpen(false)}
                                    style={{ padding: '0.8rem 2rem', borderRadius: '12px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontWeight: '600', color: '#475569' }}
                                >
                                    Cerrar y Cancelar
                                </button>
                                <button
                                    onClick={handleGeneratePOPreviews}
                                    style={{ padding: '0.8rem 2.5rem', borderRadius: '12px', border: 'none', background: '#ea580c', color: '#fff', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)' }}
                                >
                                    <ShoppingCart size={18} /> Previsualizar OC y Enviar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PO Formatting Modal */}
            {isPoModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.8)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    padding: '2rem'
                }}>
                    <div style={{
                        background: '#f8fafc',
                        width: '100%',
                        maxWidth: '900px',
                        maxHeight: '90vh',
                        borderRadius: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <FileText size={24} color="var(--color-primary)" />
                                    Órdenes de Compra a Generar
                                </h3>
                                <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>Formato formal de OC listo para envío a proveedores.</p>
                            </div>
                            <button onClick={() => setIsPoModalOpen(false)} style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', color: '#64748b', display: 'flex' }}><X size={20} /></button>
                        </div>

                        <div style={{ padding: '2rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {poPreviewList.map(po => (
                                <div key={po.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '2.5rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--color-primary)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                                        <div>
                                            <h1 style={{ margin: 0, fontFamily: 'serif', color: 'var(--color-primary)', fontSize: '2.5rem' }}>zeticas</h1>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
                                                <strong>ZETICAS SAS</strong><br />
                                                NIT: 901.321.456-7<br />
                                                Bogotá D.C., Colombia
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-0.5px' }}>ORDEN DE COMPRA</h2>
                                            <div style={{ fontSize: '1.2rem', color: 'var(--color-primary)', fontWeight: 'bold', marginTop: '0.5rem' }}>{po.id}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>Fecha: {po.date}</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                            <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Proveedor</div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#1e293b' }}>{po.providerName}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.3rem' }}>NIT: {providers.find(p => p.id === po.providerId)?.nit || '901.000.123-x'}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Phone size={14} /> {po.providerPhone}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Mail size={14} /> {po.providerEmail}
                                            </div>
                                        </div>
                                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                            <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Enviar a</div>
                                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#1e293b' }}>Bodega Zeticas</div>
                                            <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.2rem' }}>Calle 123 #45-67, Zona Industrial</div>
                                        </div>
                                    </div>

                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--color-primary)', color: '#fff', fontSize: '0.8rem' }}>
                                                <th style={{ padding: '0.8rem', textAlign: 'left', fontWeight: '600', borderRadius: '6px 0 0 6px' }}>ITEM / MATERIAL</th>
                                                <th style={{ padding: '0.8rem', textAlign: 'center', fontWeight: '600' }}>CANTIDAD</th>
                                                <th style={{ padding: '0.8rem', textAlign: 'right', fontWeight: '600' }}>V. UNITARIO</th>
                                                <th style={{ padding: '0.8rem', textAlign: 'right', fontWeight: '600', borderRadius: '0 6px 6px 0' }}>V. TOTAL</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {po.items.map((item, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}>
                                                    <td style={{ padding: '1rem 0.8rem', color: '#334155', fontWeight: '500' }}>{item.name}</td>
                                                    <td style={{ padding: '1rem 0.8rem', textAlign: 'center', color: '#475569' }}>{item.quantity}</td>
                                                    <td style={{ padding: '1rem 0.8rem', textAlign: 'right', color: '#475569' }}>${item.price.toLocaleString()}</td>
                                                    <td style={{ padding: '1rem 0.8rem', textAlign: 'right', fontWeight: '600', color: '#0f172a' }}>${(item.quantity * item.price).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colSpan="2"></td>
                                                <td style={{ padding: '1rem 0.8rem', textAlign: 'right', fontSize: '0.85rem', color: '#64748b' }}>Subtotal:</td>
                                                <td style={{ padding: '1rem 0.8rem', textAlign: 'right', fontWeight: '600', color: '#334155' }}>${po.subtotal.toLocaleString()}</td>
                                            </tr>
                                            <tr>
                                                <td colSpan="2"></td>
                                                <td style={{ padding: '0.5rem 0.8rem', textAlign: 'right', fontSize: '0.85rem', color: '#64748b' }}>IVA (19%):</td>
                                                <td style={{ padding: '0.5rem 0.8rem', textAlign: 'right', fontWeight: '600', color: '#334155' }}>${po.iva.toLocaleString()}</td>
                                            </tr>
                                            <tr>
                                                <td colSpan="2"></td>
                                                <td style={{ padding: '1rem 0.8rem', textAlign: 'right', fontSize: '1.1rem', fontWeight: '900', color: 'var(--color-primary)' }}>TOTAL:</td>
                                                <td style={{ padding: '1rem 0.8rem', textAlign: 'right', fontSize: '1.3rem', fontWeight: '900', color: 'var(--color-primary)', background: '#f0fdf4', borderRadius: '4px' }}>${po.total.toLocaleString()}</td>
                                            </tr>
                                        </tfoot>
                                    </table>

                                    {/* Action Buttons inside PO Format for communications */}
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                                        <button onClick={() => handleSendWhatsApp(po)} style={{ padding: '0.8rem 1.5rem', background: '#25D366', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.052 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
                                            Enviar por WhatsApp
                                        </button>
                                        <button onClick={() => handleSendEmail(po)} style={{ padding: '0.8rem 1.5rem', background: '#1e293b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                                            <Mail size={18} /> Enviar por Correo
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ padding: '1.5rem 2rem', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '1rem', boxShadow: '0 -4px 10px rgba(0,0,0,0.02)' }}>
                            <button
                                onClick={() => setIsPoModalOpen(false)}
                                style={{ padding: '0.8rem 2rem', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                Atrás
                            </button>
                            <button
                                onClick={handleSendAndSavePOs}
                                style={{ padding: '0.8rem 2.5rem', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(26,54,54,0.3)' }}
                            >
                                <CheckCircle2 size={18} /> Confirmar y Enviar de Definitivo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Viewing/Editing Specific Order Modal */}
            {viewingOrder && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
                    <div style={{ background: '#fff', width: '100%', maxWidth: '800px', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                        <div style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <FileText size={24} color="var(--color-primary)" />
                                <div>
                                    <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem' }}>NOTA DE PEDIDO: {viewingOrder.id}</h3>
                                    <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Fecha: {viewingOrder.date} &nbsp; | &nbsp; Origen: {viewingOrder.source}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <button
                                    onClick={handleDeleteViewedOrder}
                                    style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.6rem', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                    title="Eliminar Pedido"
                                >
                                    <Trash2 size={18} />
                                </button>
                                <button onClick={() => setViewingOrder(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '0.6rem', cursor: 'pointer', color: '#64748b', display: 'flex' }}><X size={20} /></button>
                            </div>
                        </div>

                        <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
                            {/* Zeticas Header Info */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '2px dashed #e2e8f0' }}>
                                <div>
                                    <h4 style={{ margin: '0 0 1rem 0', color: '#334155', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Datos Vendedor</h4>
                                    <div style={{ color: '#0f172a', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.2rem' }}>Zeticas S.A.S.</div>
                                    <div style={{ color: '#64748b', fontSize: '0.9rem' }}>NIT: 901.234.567-8</div>
                                    <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Bogotá, Colombia</div>
                                </div>
                                <div>
                                    <h4 style={{ margin: '0 0 1rem 0', color: '#334155', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Datos Cliente</h4>
                                    <div style={{ color: '#0f172a', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.2rem' }}>{viewingOrder.client}</div>
                                    <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{clients.find(c => c.name === viewingOrder.client)?.nit || 'Sin NIT reportado'}</div>
                                    <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{clients.find(c => c.name === viewingOrder.client)?.address || 'Sin Dirección reportada'}</div>
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
                                            <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {viewingOrder.items.map((item, index) => (
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
                                                <td style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right', color: '#64748b' }}>${item.price.toLocaleString()}</td>
                                                <td style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 'bold' }}>${(item.price * item.quantity).toLocaleString()}</td>
                                                <td style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => {
                                                            setViewingOrder({
                                                                ...viewingOrder,
                                                                items: viewingOrder.items.filter((_, i) => i !== index)
                                                            });
                                                        }}
                                                        style={{ border: 'none', background: 'transparent', color: '#fca5a5', cursor: 'pointer' }}
                                                        title="Eliminar producto"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        <tr style={{ background: '#f8fafc' }}>
                                            <td style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #e2e8f0', borderTop: '2px solid #e2e8f0' }}>
                                                <select
                                                    value={newViewedItem.id}
                                                    onChange={(e) => {
                                                        const pId = e.target.value;
                                                        const p = availableProducts.find(prod => prod.id.toString() === pId);
                                                        if (p) {
                                                            setNewViewedItem({ ...newViewedItem, id: p.id, name: p.name, price: p.price });
                                                        } else {
                                                            setNewViewedItem({ ...newViewedItem, id: '', name: '', price: 0 });
                                                        }
                                                    }}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                                >
                                                    <option value="">Seleccionar producto para agregar...</option>
                                                    {availableProducts.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name} - ${p.price.toLocaleString()}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #e2e8f0', borderTop: '2px solid #e2e8f0', textAlign: 'center' }}>
                                                <input
                                                    type="number"
                                                    value={newViewedItem.quantity}
                                                    onChange={(e) => setNewViewedItem({ ...newViewedItem, quantity: parseInt(e.target.value) || 1 })}
                                                    style={{ width: '60px', padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                                    min="1"
                                                />
                                            </td>
                                            <td style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #e2e8f0', borderTop: '2px solid #e2e8f0', textAlign: 'right', color: '#64748b' }}>
                                                ${newViewedItem.price.toLocaleString()}
                                            </td>
                                            <td style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #e2e8f0', borderTop: '2px solid #e2e8f0', textAlign: 'right', fontWeight: 'bold' }}>
                                                ${(newViewedItem.price * newViewedItem.quantity).toLocaleString()}
                                            </td>
                                            <td style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #e2e8f0', borderTop: '2px solid #e2e8f0', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => {
                                                        if (!newViewedItem.id) return;
                                                        setViewingOrder({
                                                            ...viewingOrder,
                                                            items: [...viewingOrder.items, { id: newViewedItem.id, name: newViewedItem.name, quantity: newViewedItem.quantity, price: newViewedItem.price }]
                                                        });
                                                        setNewViewedItem({ id: '', quantity: 1, name: '', price: 0 });
                                                    }}
                                                    style={{ border: 'none', background: 'var(--color-primary)', color: '#fff', borderRadius: '8px', cursor: newViewedItem.id ? 'pointer' : 'not-allowed', opacity: newViewedItem.id ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', margin: '0 auto' }}
                                                    title="Agregar Producto"
                                                    disabled={!newViewedItem.id}
                                                >
                                                    <Plus size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px' }}>
                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>* Puedes editar las cantidades o eliminar productos. Los totales se recalcularán al guardar.</div>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{ color: '#475569', fontSize: '0.9rem', fontWeight: 'bold' }}>TOTAL A PAGAR:</div>
                                    <div style={{ color: 'var(--color-primary)', fontSize: '1.5rem', fontWeight: '800' }}>
                                        ${viewingOrder.items.reduce((sum, i) => sum + (i.price * i.quantity), 0).toLocaleString()}
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
                                style={{ padding: '0.8rem 2.5rem', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(26,54,54,0.3)' }}
                            >
                                <Save size={18} /> Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .table-row-hover:hover {
            background-color: #f8fafc !important;
        }
        .btn-premium:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 15px rgba(26, 54, 54, 0.3) !important;
            transition: all 0.2s;
        }
    `}</style>
        </div >
    );
};

export default Orders;
