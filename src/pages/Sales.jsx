import React, { useState, useMemo, useEffect } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { supabase } from '../lib/supabase';
// import { products } from '../data/products'; // Removed unused import
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RefreshCw, FileText, Download, TrendingUp, Calendar, Plus, Trash2, Filter, ShoppingCart, Globe, Users, Briefcase, Search, ChevronDown, X, Save, AlertTriangle, ArrowRight, Mail, Phone, CheckCircle2, ChefHat } from 'lucide-react';

const Orders = ({ orders, setOrders }) => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);
    const {
        items,
        recipes,
        providers,
        purchaseOrders,
        setPurchaseOrders,
        addOrder,
        deleteOrders,
        refreshData,
        clients
    } = useBusiness();

    // Selection state
    const [selectedOrders, setSelectedOrders] = useState([]);

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
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [newOrder, setNewOrder] = useState({
        client: '',
        source: 'Clientes',
        items: []
    });

    const [isLoading, setIsLoading] = useState(false);

    // UI Feedback
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmModal, setConfirmModal] = useState({
        show: false,
        type: 'single', // 'single', 'bulk', 'viewed', 'item'
        target: null,
        title: '',
        message: ''
    });

    // Available Products (PT) - Sync with context items
    const availableProducts = useMemo(() => {
        return items.filter(i => i.type === 'product' || i.type === 'PT').map(p => ({
            id: p.id,
            name: p.name,
            price: p.price || 0
        }));
    }, [items]);

    const filteredCatalog = useMemo(() => {
        if (!productSearchTerm) return availableProducts;
        const q = productSearchTerm.toLowerCase();
        return availableProducts.filter(p => p.name.toLowerCase().includes(q));
    }, [availableProducts, productSearchTerm]);

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
            const query = searchTerm.toLowerCase();
            result = result.filter(o =>
                o.client.toLowerCase().includes(query) ||
                o.id.toLowerCase().includes(query) ||
                o.items.some(item => item.name.toLowerCase().includes(query))
            );
        }

        return result;
    }, [orders, filterType, customRange, searchTerm]);

    // Metrics
    const totalSales = filteredOrders.reduce((sum, o) => sum + o.amount, 0);
    const orderCount = filteredOrders.length;

    // Breakdown by source
    const sourceBreakdown = useMemo(() => {
        const counts = { Web: 0, Clientes: 0, Distribuidores: 0, Recurrentes: 0 };
        filteredOrders.forEach(o => {
            if (o.source === 'Pagina WEB') counts.Web++;
            else if (o.source === 'Clientes') counts.Clientes++;
            else if (o.source === 'Distribuidores') counts.Distribuidores++;
            else if (o.source === 'Recurrentes' || o.source === 'Cliente Recurrente') counts.Recurrentes++;
        });
        return counts;
    }, [filteredOrders]);

    // Actions
    const handleDeleteOrder = (id) => {
        setConfirmModal({
            show: true,
            type: 'single',
            target: id,
            title: '¿Eliminar Pedido?',
            message: `¿Estás seguro que quieres eliminar el pedido ${id}? Esta acción no se puede deshacer.`
        });
    };

    const handleBulkDelete = () => {
        if (!selectedOrders.length) return;
        setConfirmModal({
            show: true,
            type: 'bulk',
            target: selectedOrders,
            title: '¿Eliminar Pedidos Seleccionados?',
            message: `¿Estás seguro que quieres eliminar los ${selectedOrders.length} pedidos seleccionados? Esta acción eliminará permanentemente los datos en la nube.`
        });
    };

    const executeDeletion = async () => {
        setIsDeleting(true);
        const { type, target } = confirmModal;
        let successResult = false;

        try {
            if (type === 'single' || type === 'bulk') {
                const idsToDelete = Array.isArray(target) ? target : [target];
                const dbIds = orders
                    .filter(o => idsToDelete.includes(o.id))
                    .map(o => o.dbId)
                    .filter(Boolean);

                if (dbIds.length > 0) {
                    const { success } = await deleteOrders(dbIds);
                    successResult = success;
                    if (successResult && type === 'bulk') setSelectedOrders([]);
                }
            } else if (type === 'viewed') {
                if (viewingOrder.dbId) {
                    const { success } = await deleteOrders(viewingOrder.dbId);
                    successResult = success;
                    if (successResult) setViewingOrder(null);
                }
            } else if (type === 'item') {
                const { index } = target;
                setViewingOrder({
                    ...viewingOrder,
                    items: viewingOrder.items.filter((_, i) => i !== index)
                });
                successResult = true;
            }
        } catch (error) {
            console.error("Deletion error:", error);
        }

        setIsDeleting(false);
        if (successResult) {
            setConfirmModal({ ...confirmModal, show: false });
        } else if (type !== 'item') {
            alert('Error al eliminar. Por favor verifica tu conexión.');
            setConfirmModal({ ...confirmModal, show: false });
        }
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
        try {
            if (selectedOrders.length === 0) {
                alert('Selecciona al menos un pedido para explosionar materias primas.');
                return;
            }

            if (!recipes || !items) {
                alert("Los datos maestros (Recetas o Insumos) aún se están cargando. Reintenta en un momento.");
                return;
            }

            const selectedOrderObjects = orders.filter(o => selectedOrders.includes(o.id));
            const requiredRawMaterials = {}; // { materialId: { id, name, requiredQty, ... } }
            const missingRecipes = [];

            selectedOrderObjects.forEach(order => {
                order.items.forEach(item => {
                    const recipe = recipes[item.name];
                    if (!recipe) {
                        if (!missingRecipes.includes(item.name)) missingRecipes.push(item.name);
                        return;
                    }

                    recipe.forEach(ing => {
                        // Use ing.id if available, or find it in items by name
                        const matInfo = items.find(i => i.id === ing.id || i.name === ing.name);
                        const matId = matInfo?.id || ing.id || `temp-${ing.name}`;

                        if (!requiredRawMaterials[matId]) {
                            requiredRawMaterials[matId] = {
                                id: matId,
                                name: matInfo?.name || ing.name,
                                requiredQty: 0,
                                bomBreakdown: [],
                                currentInv: matInfo ? (matInfo.initial + (matInfo.purchases || 0) - (matInfo.sales || 0)) : 0,
                                safety: matInfo?.safety || 0,
                                unit: matInfo?.unit || 'und'
                            };
                        }
                        const qtyEffect = (Number(ing.qty) || 0) * (Number(item.quantity) || 0);
                        requiredRawMaterials[matId].requiredQty += qtyEffect;
                        requiredRawMaterials[matId].bomBreakdown.push(`${item.name} (${item.quantity} und) -> ${qtyEffect.toFixed(2)} ${ing.name}`);
                    });
                });
            });

            if (missingRecipes.length > 0) {
                alert(`Atención: Faltan recetas configuradas para: ${missingRecipes.join(', ')}. Estos ítems no se incluyeron en la explosión.`);
            }

            const previewItems = Object.values(requiredRawMaterials).map(mat => {
                const suggestedBuy = Math.max(0, Math.ceil(mat.requiredQty - mat.currentInv + mat.safety));
                const matInfo = items.find(i => i.id === mat.id || i.name === mat.name);
                return {
                    ...mat,
                    bomBreakdown: mat.bomBreakdown.join(' | '),
                    quantityToBuy: suggestedBuy,
                    unitCost: matInfo?.avgCost || 0,
                    providerId: '',
                    providerName: '',
                    providerPhone: '',
                    providerEmail: '',
                    isMissing: !matInfo
                };
            });

            if (previewItems.length > 0) {
                setExplosionPreview(previewItems);
                setIsExplosionModalOpen(true);
            } else if (missingRecipes.length === 0) {
                alert('No se encontraron materiales para explosionar en los pedidos seleccionados.');
            }
        } catch (error) {
            console.error("Error during explosion calculation:", error);
            alert("Ocurrió un error al calcular la explosión. Por favor revisa los datos de los pedidos.");
        }
    };

    const handleGeneratePOPreviews = () => {
        const newPurchaseOrders = [];
        const byProvider = {};

        for (let item of explosionPreview) {
            if (item.quantityToBuy <= 0) continue;
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
                    toBuy: m.quantityToBuy,
                    purchasePrice: m.unitCost
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
        // 1. Persist POs to Supabase and update order status
        try {
            // Update orders table - Use order_number since selectedOrders contains IDs like 'WEB-251'
            const { error: errorOrders } = await supabase
                .from('orders')
                .update({ status: 'En Compras' })
                .in('order_number', selectedOrders);

            if (errorOrders) console.error("Error updating orders in DB:", errorOrders);

            for (const po of poPreviewList) {
                // Find supplier UUID
                const { data: sData } = await supabase.from('suppliers').select('id').eq('name', po.providerName).single();

                const { data: dbPur, error: poError } = await supabase.from('purchases').insert({
                    po_number: po.id,
                    supplier_id: sData?.id,
                    status: 'ENVIADA',
                    total_cost: po.total,
                    associated_orders: po.relatedOrders ? po.relatedOrders.join(', ') : null
                }).select().single();

                if (!poError && dbPur && po.items.length > 0) {
                    const mappedItems = po.items.map(i => ({
                        purchase_id: dbPur.id,
                        raw_material_id: i.id,
                        quantity: i.toBuy,
                        unit_cost: i.purchasePrice,
                        total_cost: i.purchasePrice * i.toBuy
                    }));
                    await supabase.from('purchase_items').insert(mappedItems);
                }
            }
        } catch (e) {
            console.error("Error persisting POs to Supabase:", e);
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

    const handleMoveToProduction = async () => {
        try {
            setIsLoading(true);
            const { error } = await supabase
                .from('orders')
                .update({ status: 'En Producción' })
                .in('order_number', selectedOrders);

            if (error) throw error;

            // Update local state
            setOrders(prev => prev.map(o =>
                selectedOrders.includes(o.id) ? { ...o, status: 'En Producción' } : o
            ));

            setIsExplosionModalOpen(false);
            setSelectedOrders([]);
            alert('Pedidos movidos a Producción correctamente.');
        } catch (error) {
            console.error("Error moving to production:", error);
            alert("No se pudieron mover los pedidos a producción.");
        } finally {
            setIsLoading(false);
        }
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
                const updated = { ...item, [field]: value };
                // If a provider is chosen, automatically fill name, phone and email
                if (field === 'providerId' && value) {
                    const provider = providers.find(p => p.id === value);
                    if (provider) {
                        updated.providerName = provider.name;
                        updated.providerPhone = provider.phone || '';
                        updated.providerEmail = provider.email || '';
                    }
                }
                return updated;
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
            clientId: newOrder.clientId,
            amount: total,
            date: new Date().toISOString().split('T')[0],
            status: 'Pendiente',
            source: newOrder.source,
            items: newOrder.items
        };

        // Persist to Supabase
        addOrder(preparedOrder);

        setIsModalOpen(false);
        setNewOrder({ client: '', source: 'Clientes', items: [] });
    };

    const handleUpdateViewedOrder = async () => {
        const total = viewingOrder.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        const updated = { ...viewingOrder, amount: total };

        // Persist change to Supabase
        try {
            await supabase.from('orders').update({
                total_amount: updated.amount,
                status: updated.status
            }).eq('order_number', updated.id);

            // Update items if modified - need to handle product UUIDs
            if (updated.items && updated.dbId) {
                await supabase.from('order_items').delete().eq('order_id', updated.dbId);
                const itemsToInsert = updated.items.map(item => ({
                    order_id: updated.dbId,
                    product_id: item.id,
                    quantity: item.quantity,
                    unit_price: item.price,
                    total_price: item.price * item.quantity
                }));
                await supabase.from('order_items').insert(itemsToInsert);
            }
        } catch (e) {
            console.error("Error updating order in Supabase:", e);
        }

        setOrders(orders.map(o => o.id === updated.id ? updated : o));
        setViewingOrder(null);
    };

    const handleDeleteViewedOrder = () => {
        setConfirmModal({
            show: true,
            type: 'viewed',
            target: viewingOrder.id,
            title: '¿Eliminar Pedido Actual?',
            message: `¿Estás seguro que quieres eliminar este pedido de ${viewingOrder.client}? Esta acción lo borrará permanentemente de la base de datos.`
        });
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

    const deepTeal = "#023636";
    const institutionOcre = "#D4785A";
    const premiumSalmon = "#E29783";
    const glassWhite = "rgba(255, 255, 255, 0.9)";

    const getSourceIcon = (source) => {
        switch (source) {
            case 'Pagina WEB': return <Globe size={18} color={deepTeal} />;
            case 'Distribuidores': return <Briefcase size={18} color={deepTeal} />;
            case 'Recurrentes':
            case 'Cliente Recurrente': return <Users size={18} color={deepTeal} />;
            default: return <ShoppingCart size={18} color={deepTeal} />;
        }
    };

    return (
        <div className="orders-module" style={{ 
            padding: '0 0.5rem',
            animation: 'fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
            {/* Gap for UI breathing room */}
            <div style={{ marginBottom: '2.5rem' }} />

            {/* Premium Commerce KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.1fr 1fr', gap: '2.5rem', marginBottom: '4rem' }}>
                {/* Total Revenue - Main Card */}
                <div style={{ 
                    background: `linear-gradient(135deg, ${deepTeal} 0%, #037075 100%)`, 
                    padding: '3rem', 
                    borderRadius: '45px', 
                    color: '#fff',
                    boxShadow: `0 30px 60px ${deepTeal}40`,
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    animation: 'fadeUp 0.6s ease-out'
                }}>
                    <div style={{ position: 'absolute', right: '-20px', top: '-20px', opacity: 0.1, transform: 'rotate(-10deg)' }}>
                        <TrendingUp size={280} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.6rem', borderRadius: '15px' }}><DollarSign size={24} /></div>
                        <span style={{ fontSize: '0.9rem', fontWeight: '900', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '2px' }}>Ventas Totales</span>
                    </div>
                    <div style={{ fontSize: '5rem', fontWeight: '900', letterSpacing: '-4px', lineHeight: 1 }}>
                        <span style={{ fontSize: '2.5rem', opacity: 0.6, marginRight: '12px', verticalAlign: 'middle' }}>$</span>
                        {totalSales.toLocaleString()}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '2.5rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem 2rem', borderRadius: '22px', fontSize: '1.25rem', fontWeight: '900', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                            {orderCount} <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>UNIDADES DE NEGOCIO</span>
                        </div>
                    </div>
                </div>

                {/* Source Breakdown - Glass Effect */}
                <div style={{ 
                    background: glassWhite,
                    backdropFilter: 'blur(10px)',
                    padding: '3rem', 
                    borderRadius: '45px', 
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    animation: 'fadeUp 0.7s ease-out'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '20px', background: `${institutionOcre}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: institutionOcre }}>
                            <Filter size={26} />
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: '900', color: deepTeal, textTransform: 'uppercase', letterSpacing: '1px' }}>Distribución de Canales</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                        {[
                            { label: 'Web', count: sourceBreakdown.Web, color: deepTeal },
                            { label: 'B2B/Cli', count: sourceBreakdown.Clientes, color: institutionOcre },
                            { label: 'Distro', count: sourceBreakdown.Distribuidores, color: premiumSalmon },
                            { label: 'Recurr', count: sourceBreakdown.Recurrentes, color: '#64748b' }
                        ].map(item => (
                            <div key={item.label} style={{ background: '#fff', padding: '1.2rem 1.5rem', borderRadius: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>{item.label}</span>
                                <span style={{ fontSize: '1.4rem', fontWeight: '900', color: item.color }}>{item.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Cycle Time / Health - High Performance */}
                <div style={{ 
                    background: glassWhite,
                    backdropFilter: 'blur(10px)',
                    padding: '3rem', 
                    borderRadius: '45px', 
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    animation: 'fadeUp 0.8s ease-out'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                         <div style={{ width: '56px', height: '56px', borderRadius: '20px', background: 'rgba(2, 54, 54, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: deepTeal }}>
                            <CheckCircle2 size={26} />
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Salud Operativa</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.8rem' }}>
                        <div style={{ fontSize: '4.5rem', fontWeight: '900', color: deepTeal, lineHeight: 1 }}>98<span style={{fontSize: '2rem', opacity: 0.5}}>%</span></div>
                    </div>
                    <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1.5rem', background: '#f8fafc', padding: '1.2rem 1.8rem', borderRadius: '22px', width: 'fit-content' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: '900', color: '#64748b' }}>SLA: <span style={{ color: '#10b981' }}>COMPLETO</span></div>
                        <div style={{ height: '14px', width: '1px', background: '#cbd5e1' }} />
                        <div style={{ fontSize: '0.8rem', fontWeight: '900', color: '#64748b' }}>ERR: <span style={{ color: premiumSalmon }}>0.2%</span></div>
                    </div>
                </div>
            </div>

            {/* Action Bar & Filter Section - Premium Glass Design */}
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '2rem', 
                marginBottom: '4rem',
                background: glassWhite,
                backdropFilter: 'blur(10px)',
                padding: '2.5rem 3rem',
                borderRadius: '45px',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.03)',
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
                                        padding: '1.1rem 2.2rem', 
                                        borderRadius: '18px', 
                                        border: 'none',
                                        fontSize: '0.85rem', 
                                        fontWeight: '900',
                                        cursor: 'pointer',
                                        background: filterType === type ? deepTeal : 'transparent',
                                        color: filterType === type ? '#fff' : '#64748b',
                                        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1.2px',
                                        boxShadow: filterType === type ? '0 12px 25px rgba(2, 83, 87, 0.25)' : 'none'
                                    }}
                                >{type === 'week' ? 'Semana' : type === 'month' ? 'Mes' : 'Personalizado'}</button>
                            ))}
                        </div>
        
                        {filterType === 'custom' && (
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '1.2rem', 
                                background: '#fff', 
                                padding: '0 1.8rem', 
                                height: '62px',
                                borderRadius: '22px', 
                                border: '1px solid #f1f5f9',
                                animation: 'slideInRight 0.4s ease-out',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
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

                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <button
                            onClick={async () => {
                                setIsLoading(true);
                                await refreshData();
                                setIsLoading(false);
                            }}
                            disabled={isLoading}
                            style={{ 
                                background: '#fff', 
                                color: deepTeal, 
                                width: '62px',
                                height: '62px',
                                borderRadius: '22px', 
                                border: '1px solid #f1f5f9', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = deepTeal; e.currentTarget.style.transform = 'rotate(180deg) scale(1.1)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.transform = 'rotate(0deg) scale(1)'; }}
                        >
                            <RefreshCw size={26} className={isLoading ? 'spin' : ''} />
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            style={{
                                background: `linear-gradient(135deg, ${deepTeal}, #037075)`,
                                color: 'white',
                                padding: '0 3rem',
                                height: '62px',
                                borderRadius: '24px',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1.2rem',
                                fontWeight: '900',
                                fontSize: '0.95rem',
                                textTransform: 'uppercase',
                                letterSpacing: '1.5px',
                                boxShadow: `0 15px 30px ${deepTeal}30`,
                                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 25px 45px ${deepTeal}45`; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 15px 30px ${deepTeal}30`; }}
                        >
                            <Plus size={24} /> Nuevo Pedido
                        </button>
                    </div>
                </div>

                <div style={{ position: 'relative' }}>
                    <Search size={24} style={{ position: 'absolute', left: '1.8rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Buscar por cliente, pedido, referencia o producto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '1.8rem 1.8rem 1.8rem 5rem',
                            borderRadius: '28px',
                            border: '1px solid #f1f5f9',
                            outline: 'none',
                            fontSize: '1.1rem',
                            fontWeight: '600',
                            background: '#fff',
                            color: '#1e293b',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: '0 4px 25px rgba(0,0,0,0.01)'
                        }}
                        onFocus={(e) => { e.target.style.borderColor = deepTeal; e.target.style.boxShadow = `0 12px 40px ${deepTeal}10`; }}
                        onBlur={(e) => { e.target.style.borderColor = '#f1f5f9'; e.target.style.boxShadow = 'none'; }}
                    />
                </div>
            </div>

            {/* Selection Operative Bar - Floating Style */}
            <div style={{ 
                background: institutionOcre, 
                padding: '1.5rem 3rem', 
                borderRadius: '30px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                boxShadow: `0 20px 40px ${institutionOcre}30`,
                marginBottom: '4rem',
                transform: selectedOrders.length > 0 ? 'translateY(0)' : 'translateY(20px)',
                opacity: selectedOrders.length > 0 ? 1 : 0,
                pointerEvents: selectedOrders.length > 0 ? 'auto' : 'none',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                border: '1px solid rgba(255,255,255,0.2)'
            }}>
                <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: '900', color: '#fff', textTransform: 'uppercase', opacity: 0.9, letterSpacing: '1.5px' }}>Comando de Lote</span>
                    <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#fff', marginTop: '0.3rem' }}>{selectedOrders.length} <span style={{ fontSize: '1rem', opacity: 0.7 }}>PEDIDOS EN COLA</span></div>
                </div>
                <div style={{ display: 'flex', gap: '1.2rem' }}>
                    <button 
                        onClick={handleExplosion}
                        style={{ 
                            padding: '1rem 2.2rem', 
                            background: '#fff', 
                            color: institutionOcre, 
                            border: 'none', 
                            borderRadius: '18px', 
                            cursor: 'pointer',
                            fontWeight: '900',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.8rem',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                        <ShoppingCart size={20} /> EXPLOSIONAR MP
                    </button>
                    <button 
                        onClick={handleBulkDelete}
                        style={{ 
                            padding: '1rem', 
                            background: 'rgba(255,255,255,0.25)', 
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: '18px', 
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.35)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                    >
                        <Trash2 size={24} />
                    </button>
                </div>
            </div>


            {/* Orders Table Container */}
            <div style={{ background: '#fff', borderRadius: '32px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#F9FBFA', borderBottom: '1px solid #f1f5f9' }}>
                        <tr>
                            <th style={{ padding: '1.2rem 1.5rem', textAlign: 'left', width: '40px' }}>
                                <input
                                    type="checkbox"
                                    onChange={handleSelectAll}
                                    checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: deepTeal }}
                                />
                            </th>
                            <th style={{ padding: '1.2rem 0.5rem', textAlign: 'center', width: '10%', fontWeight: '900', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>ID</th>
                            <th style={{ padding: '1.2rem 1.5rem', textAlign: 'left', width: '30%', fontWeight: '900', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Cliente</th>
                            <th style={{ padding: '1.2rem 1.5rem', textAlign: 'left', fontWeight: '900', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Origen</th>
                            <th style={{ padding: '1.2rem 1.5rem', textAlign: 'left', fontWeight: '900', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Fecha</th>
                            <th style={{ padding: '1.2rem 1.5rem', textAlign: 'right', fontWeight: '900', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Total</th>
                            <th style={{ padding: '1.2rem 1.5rem', textAlign: 'center', fontWeight: '900', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Estado</th>
                            <th style={{ padding: '1.2rem 1.5rem', textAlign: 'center', fontWeight: '900', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.length > 0 ? filteredOrders.map(order => (
                            <tr
                                key={order.id}
                                style={{
                                    borderBottom: '1px solid #f8fafc',
                                    transition: 'all 0.2s',
                                    background: selectedOrders.includes(order.id) ? 'rgba(2, 83, 87, 0.03)' : 'transparent',
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
                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: deepTeal }}
                                    />
                                </td>
                                <td style={{ padding: '1.2rem 0.5rem', textAlign: 'center', fontWeight: '900', fontSize: '0.85rem', color: deepTeal }}>#{order.id}</td>
                                <td style={{ padding: '1.2rem 1.5rem' }}>
                                    <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.95rem' }}>{order.client}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '600', marginTop: '2px' }}>
                                        {order.items?.length || 0} SKUs • {order.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0} UNIDADES
                                    </div>
                                </td>
                                <td style={{ padding: '1.2rem 1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.75rem', fontWeight: '800', color: '#475569', background: '#f8fafc', padding: '6px 12px', borderRadius: '10px', width: 'fit-content', border: '1px solid #f1f5f9' }}>
                                        {getSourceIcon(order.source)}
                                        {order.source?.toUpperCase()}
                                    </div>
                                </td>
                                <td style={{ padding: '1.2rem 1.5rem', fontSize: '0.8rem', color: '#64748b', fontWeight: '700' }}>{order.date}</td>
                                <td style={{ padding: '1.2rem 1.5rem', textAlign: 'right', fontWeight: '900', color: '#0f172a', fontSize: '1rem' }}>${order.amount.toLocaleString()}</td>
                                <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                                    <span style={{
                                        padding: '6px 14px',
                                        borderRadius: '12px',
                                        fontSize: '0.65rem',
                                        fontWeight: '900',
                                        letterSpacing: '0.5px',
                                        background: 
                                            order.status === 'Pagado' || order.status === 'Entregado' ? 'rgba(22, 163, 74, 0.1)' : 
                                            order.status === 'PENDIENTE' ? 'rgba(214, 189, 152, 0.15)' : 'rgba(2, 83, 87, 0.05)',
                                        color: 
                                            order.status === 'Pagado' || order.status === 'Entregado' ? '#16a34a' : 
                                            order.status === 'PENDIENTE' ? '#B8A07E' : deepTeal,
                                        border: '1px solid currentColor'
                                    }}>
                                        {order.status.toUpperCase()}
                                    </span>
                                </td>
                                <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                                        <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(order); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#cbd5e1' }} title="Descargar"><Download size={20} /></button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }}
                                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(212, 120, 90, 0.3)' }}
                                            title="Eliminar"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="8" style={{ padding: '6rem', textAlign: 'center', color: '#cbd5e1' }}>
                                    <div style={{ marginBottom: '1.5rem', opacity: 0.3 }}><ShoppingCart size={60} strokeWidth={1} /></div>
                                    <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#94a3b8' }}>SISTEMA VACÍO</div>
                                    <div style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>No hay registros comerciales en este periodo.</div>
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
                        <div style={{ padding: '1.5rem 2.5rem', borderBottom: '1px solid rgba(2, 83, 87, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F9FBFA' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.4rem', color: deepTeal, fontWeight: '900' }}>CREAR NUEVO PEDIDO PT</h3>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Configura el despacho de Producto Terminado para cliente final.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: '50%', padding: '0.6rem', cursor: 'pointer', color: '#cbd5e1', display: 'flex', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = premiumSalmon} onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}><X size={20} /></button>
                        </div>

                        <div style={{ padding: '2.5rem', overflowY: 'auto', flex: 1 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '3rem' }}>
                                {/* Left side: Order Info & Items */}
                                <div style={{ animation: 'fadeUp 0.4s ease-out' }}>
                                    <div style={{ marginBottom: '2rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: '900', color: institutionOcre, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.8rem' }}>Origen de la Venta</label>
                                        <div style={{ display: 'flex', gap: '0.8rem' }}>
                                            {['Distribuidores', 'Clientes', 'Recurrentes'].map(source => (
                                                <button
                                                    key={source}
                                                    type="button"
                                                    onClick={() => setNewOrder({ ...newOrder, source, client: '', clientId: '' })}
                                                    style={{
                                                        flex: 1,
                                                        padding: '0.9rem',
                                                        borderRadius: '14px',
                                                        border: newOrder.source === source ? `2px solid ${deepTeal}` : '1px solid #f1f5f9',
                                                        background: newOrder.source === source ? 'rgba(2, 83, 87, 0.03)' : '#fff',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '900',
                                                        cursor: 'pointer',
                                                        color: newOrder.source === source ? deepTeal : '#94a3b8',
                                                        transition: 'all 0.2s',
                                                        textTransform: 'uppercase'
                                                    }}
                                                >
                                                    {source}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '2rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: '900', color: institutionOcre, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.8rem' }}>Selección de Cliente</label>
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
                                            style={{ 
                                                width: '100%', 
                                                padding: '1rem', 
                                                borderRadius: '16px', 
                                                border: '1px solid #f1f5f9', 
                                                fontSize: '0.95rem', 
                                                fontWeight: '800',
                                                outline: 'none', 
                                                background: '#fcfcfc',
                                                color: '#1e293b',
                                                appearance: 'none',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <option value="">Buscar en CRM...</option>
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
                                                <option value="" disabled>No hay clientes registrados</option>
                                            )}
                                        </select>
                                    </div>

                                    <div style={{ marginTop: '2.5rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: '900', color: institutionOcre, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>Productos en el Pedido</label>
                                        {newOrder.items.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                                {newOrder.items.map(item => (
                                                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '1rem 1.2rem', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#1e293b' }}>{item.name}</div>
                                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>Precio Unit: <span style={{ color: deepTeal }}>${item.price.toLocaleString()}</span></div>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                                            <div style={{ 
                                                                background: 'rgba(2, 83, 87, 0.05)', 
                                                                color: deepTeal, 
                                                                padding: '4px 10px', 
                                                                borderRadius: '8px', 
                                                                fontWeight: '900', 
                                                                fontSize: '0.8rem' 
                                                            }}>x{item.quantity}</div>
                                                            <div style={{ fontWeight: '900', width: '90px', textAlign: 'right', color: '#0f172a', fontSize: '0.95rem' }}>${(item.price * item.quantity).toLocaleString()}</div>
                                                            <button
                                                                onClick={() => setNewOrder({ ...newOrder, items: newOrder.items.filter(i => i.id !== item.id) })}
                                                                style={{ border: 'none', background: 'transparent', color: 'rgba(212, 120, 90, 0.4)', cursor: 'pointer', transition: 'all 0.2s' }}
                                                                onMouseEnter={e => e.currentTarget.style.color = premiumSalmon}
                                                                onMouseLeave={e => e.currentTarget.style.color = 'rgba(212, 120, 90, 0.4)'}
                                                            ><Trash2 size={18} /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div style={{ marginTop: '1.5rem', borderTop: '2px dashed #f1f5f9', paddingTop: '1.5rem', textAlign: 'right' }}>
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Consolidado</div>
                                                    <div style={{ fontSize: '2.2rem', fontWeight: '900', color: deepTeal, marginTop: '0.2rem' }}>
                                                        ${newOrder.items.reduce((sum, i) => sum + (i.price * i.quantity), 0).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '3rem 2rem', background: '#fcfcfc', border: '2px dashed #f1f5f9', borderRadius: '20px', color: '#cbd5e1' }}>
                                                <ShoppingCart size={40} style={{ opacity: 0.3, marginBottom: '0.8rem' }} />
                                                <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>El carrito de pedido está vacío</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right side: Product Catalog */}
                                <div style={{ borderLeft: '1px solid rgba(2, 83, 87, 0.05)', paddingLeft: '2.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                                        <label style={{ fontSize: '0.65rem', fontWeight: '900', color: institutionOcre, textTransform: 'uppercase', letterSpacing: '1px' }}>Catálogo de Despacho</label>
                                    </div>

                                    <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                                        <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1' }} />
                                        <input
                                            type="text"
                                            placeholder="Buscar productos..."
                                            value={productSearchTerm}
                                            onChange={(e) => setProductSearchTerm(e.target.value)}
                                            style={{ 
                                                width: '100%', 
                                                padding: '0.7rem 0.7rem 0.7rem 2.8rem', 
                                                borderRadius: '12px', 
                                                border: '1px solid #f1f5f9', 
                                                fontSize: '0.85rem', 
                                                fontWeight: '800',
                                                outline: 'none',
                                                background: '#fcfcfc',
                                                color: deepTeal
                                            }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '450px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                        {filteredCatalog.length > 0 ? (
                                            filteredCatalog.map(prod => (
                                                <div key={prod.id} style={{ padding: '1rem', border: '1px solid #f1f5f9', borderRadius: '16px', background: '#fff', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.01)' }}>
                                                    <div style={{ fontWeight: '800', fontSize: '0.85rem', marginBottom: '0.4rem', color: '#1e293b' }}>{prod.name}</div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.9rem', color: deepTeal, fontWeight: '900' }}>${prod.price.toLocaleString()}</span>
                                                        <button
                                                            onClick={() => handleAddProductToOrder(prod.id)}
                                                            style={{ 
                                                                background: `linear-gradient(135deg, ${deepTeal}, #014346)`, 
                                                                color: '#fff', 
                                                                border: 'none', 
                                                                borderRadius: '10px', 
                                                                padding: '0.5rem 1rem', 
                                                                fontSize: '0.7rem', 
                                                                fontWeight: '900', 
                                                                cursor: 'pointer',
                                                                textTransform: 'uppercase',
                                                                boxShadow: '0 4px 10px rgba(2, 83, 87, 0.1)'
                                                            }}
                                                        >
                                                            + Añadir
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', background: 'rgba(212, 120, 90, 0.03)', borderRadius: '20px', border: '1px solid rgba(212, 120, 90, 0.1)', color: premiumSalmon }}>
                                                <AlertTriangle size={24} style={{ marginBottom: '0.8rem' }} />
                                                <div style={{ fontSize: '0.8rem', fontWeight: '800', lineHeight: '1.4' }}>No se encontraron productos en Datos Maestros</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '1.5rem 2.5rem', borderTop: '1px solid rgba(2, 83, 87, 0.05)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: '#F9FBFA' }}>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{ padding: '0.8rem 2rem', borderRadius: '14px', border: '1px solid #f1f5f9', background: '#fff', cursor: 'pointer', fontWeight: '900', fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveOrder}
                                style={{ 
                                    padding: '0.8rem 2.5rem', 
                                    borderRadius: '14px', 
                                    border: 'none', 
                                    background: `linear-gradient(135deg, ${deepTeal}, #014346)`, 
                                    color: '#fff', 
                                    cursor: 'pointer', 
                                    fontWeight: '900', 
                                    fontSize: '0.8rem',
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.6rem', 
                                    textTransform: 'uppercase',
                                    boxShadow: '0 8px 20px rgba(2, 83, 87, 0.15)' 
                                }}
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
                                                    <div style={{ fontWeight: '800', fontSize: '1.1rem', color: item.isMissing ? '#e11d48' : 'var(--color-primary)' }}>{item.name}</div>
                                                    {item.isMissing ? (
                                                        <div style={{ fontSize: '0.75rem', color: '#e11d48', fontWeight: 'bold', background: '#fff1f2', padding: '2px 8px', borderRadius: '4px', border: '1px solid #fecaca', display: 'inline-block', marginTop: '4px' }}>
                                                            No existe en Módulo de Datos Maestros de Productos, Crealo primero
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Requerido: <span style={{ fontWeight: 'bold' }}>{item.requiredQty} {item.unit}</span> | Stock: <span style={{ fontWeight: 'bold' }}>{item.currentInv} {item.unit}</span> | Safety: <span style={{ fontWeight: 'bold' }}>{item.safety} {item.unit}</span></div>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                                <div style={{
                                                    background: item.quantityToBuy > 0 ? '#ea580c' : '#fff7ed',
                                                    border: item.quantityToBuy > 0 ? '1px solid #ea580c' : '1px solid #fed7aa',
                                                    padding: '0.8rem 1.2rem',
                                                    borderRadius: '10px',
                                                    textAlign: 'center',
                                                    transition: 'all 0.3s'
                                                }}>
                                                    <div style={{ fontSize: '0.7rem', color: item.quantityToBuy > 0 ? '#fff' : '#ea580c', fontWeight: 'bold', textTransform: 'uppercase' }}>A Comprar</div>
                                                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: item.quantityToBuy > 0 ? '#fff' : '#c2410c' }}>{item.quantityToBuy} <span style={{ fontSize: '0.8rem' }}>{item.unit}</span></div>
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
                                    onClick={handleMoveToProduction}
                                    style={{ padding: '0.8rem 2rem', borderRadius: '12px', border: '1px solid var(--color-primary)', background: '#fff', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.6rem' }}
                                >
                                    <ChefHat size={18} /> Mover a Producción
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
                                                    <td style={{ padding: '1rem 0.8rem', textAlign: 'center', color: '#475569' }}>{item.toBuy}</td>
                                                    <td style={{ padding: '1rem 0.8rem', textAlign: 'right', color: '#475569' }}>${item.purchasePrice.toLocaleString()}</td>
                                                    <td style={{ padding: '1rem 0.8rem', textAlign: 'right', fontWeight: '600', color: '#0f172a' }}>${(item.toBuy * item.purchasePrice).toLocaleString()}</td>
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
                                                        onClick={() => setConfirmModal({
                                                            show: true,
                                                            type: 'item',
                                                            target: { index },
                                                            title: '¿Quitar Producto?',
                                                            message: '¿Estás seguro que quieres eliminar este producto del pedido?'
                                                        })}
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

            {/* Custom Confirmation Modal */}
            {confirmModal.show && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '450px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'modalSlideUp 0.3s ease-out' }}>
                        <div style={{ padding: '2rem', textAlign: 'center' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid #fee2e2' }}>
                                <AlertTriangle size={32} color="#ef4444" />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1A3636', marginBottom: '0.8rem' }}>{confirmModal.title}</h3>
                            <p style={{ fontSize: '0.95rem', color: '#64748b', lineHeight: '1.6', marginBottom: '2rem' }}>{confirmModal.message}</p>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                                    disabled={isDeleting}
                                    style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={executeDeletion}
                                    disabled={isDeleting}
                                    style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)' }}
                                >
                                    {isDeleting ? 'Eliminando...' : 'Eliminar Ahora'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes modalSlideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
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
