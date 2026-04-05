import React, { useState, useMemo, useEffect } from 'react';
import { useBusiness } from '../context/BusinessContext';
import DocumentBuilder from '../components/DocumentBuilder';
// import { products } from '../data/products'; // Removed unused import
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RefreshCw, FileText, Download, TrendingUp, Calendar, Plus, Trash2, Filter, ShoppingCart, Globe, Users, Briefcase, Search, ChevronDown, X, Save, AlertTriangle, ArrowRight, Mail, Phone, CheckCircle, ChefHat, DollarSign } from 'lucide-react';
const CheckCircle2 = CheckCircle;

const Orders = ({ orders }) => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);
    const {
        items,
        recipes,
        providers,
        addOrder,
        deleteOrders,
        updateOrder,
        addPurchase,
        refreshData,
        clients,
        ownCompany
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
    const [ptExplosionData, setPtExplosionData] = useState([]);
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
        step: 1,          // 1 = primera advertencia, 2 = confirmación final
        type: 'single',   // 'single', 'bulk', 'viewed', 'item'
        target: null,
        title: '',
        message: ''
    });
    const [confirmText, setConfirmText] = useState('');

    // Available Products (PT) - Sync with context items
    const availableProducts = useMemo(() => {
        return (items || []).filter(i => i.type === 'product' || i.type === 'PT').map(p => ({
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
        let result = orders || [];

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
                (o.client || '').toLowerCase().includes(query) ||
                String(o.id || '').toLowerCase().includes(query) ||
                (o.items || []).some(item => (item.name || '').toLowerCase().includes(query))
            );
        }

        return result;
    }, [orders, filterType, customRange, searchTerm]);


    // Metrics
    const totalSales = (filteredOrders || []).reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
    const orderCount = (filteredOrders || []).length;

    // Breakdown by source
    const sourceBreakdown = useMemo(() => {
        const counts = { Web: 0, Clientes: 0, Distribuidores: 0, Recurrentes: 0 };
        (filteredOrders || []).forEach(o => {
            if (o.source === 'Web' || o.source === 'Pagina WEB') counts.Web++;
            else if (o.source === 'Clientes') counts.Clientes++;
            else if (o.source === 'Distribuidores') counts.Distribuidores++;
            else if (o.source === 'Recurrentes') counts.Recurrentes++;
        });
        return counts;
    }, [filteredOrders]);

    // Actions
    const handleDeleteOrder = (id) => {
        setConfirmModal({
            show: true,
            step: 1,
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
            step: 1,
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

            const selectedOrderObjects = (orders || []).filter(o => selectedOrders.includes(o.id));
            const missingRecipes = [];

            // ── Paso 1: Agrupar demanda total por PT en todos los pedidos ──────────────
            const demandByProduct = {};
            selectedOrderObjects.forEach(order => {
                order.items.forEach(item => {
                    const pt = items.find(i =>
                        i.name === item.name ||
                        i.name?.toLowerCase() === item.name?.toLowerCase()
                    );
                    if (!pt) {
                        if (!missingRecipes.includes(item.name)) missingRecipes.push(item.name);
                        return;
                    }
                    const recipe = recipes[pt.id];
                    if (!recipe || recipe.length === 0) {
                        if (!missingRecipes.includes(item.name)) missingRecipes.push(item.name);
                        return;
                    }
                    if (!demandByProduct[pt.id]) {
                        demandByProduct[pt.id] = { pt, recipe, totalDemand: 0, label: item.name };
                    }
                    demandByProduct[pt.id].totalDemand += Number(item.quantity) || 0;
                });
            });

            const uniqueMissing = [...new Set(missingRecipes)].filter(Boolean);
            if (uniqueMissing.length > 0) {
                alert(`⚠️ Atención: No se han configurado las recetas para los siguientes productos: ${uniqueMissing.join(', ')}. No es posible realizar la explosión de materia prima sin estas fórmulas. Por favor, diríjase al módulo de Recetas y regístrelas para continuar.`);
                if (Object.keys(demandByProduct).length === 0) return;
            }

            const ptData = Object.values(demandByProduct).map(({ pt, recipe, totalDemand, label }) => {
                const initialVal = pt.initial !== undefined ? Number(pt.initial) : (Number(pt.stock) || 0);
                const inventoryPT = initialVal; // Use exact initial stock mapping
                const safety = Number(pt.min_stock_level) || Number(pt.safety) || 0;
                const batchSize = pt.batch_size || 1;

                // Pedidos - Inv + Safety
                const suggestedProduce = Math.max(0, totalDemand - inventoryPT + safety);

                return {
                    ptId: pt.id,
                    pt,
                    label,
                    recipe,
                    totalDemand,
                    inventoryPT,
                    safety,
                    batchSize,
                    suggestedProduce,
                    manualProduce: suggestedProduce
                };
            });

            setPtExplosionData(ptData);
            runBOMExplosion(ptData);
            setIsExplosionModalOpen(true);
        } catch (error) {
            console.error("Error during explosion calculation:", error);
            alert("Ocurrió un error al calcular la explosión. Por favor revisa los datos de los pedidos.");
        }
    };

    const runBOMExplosion = (pts) => {
        const requiredRawMaterials = {};

        // ── Paso 2: Por cada PT, aplicar multiplicador exacto y explosionar ingredientes ──
        pts.forEach(p => {
            if (p.manualProduce <= 0) return;

            // Multiplicador exacto sobre el tamaño de lote (ej: si lote es 5 y producen 18 => 3.6 veces la receta)
            const multiplier = p.manualProduce / p.batchSize;

            p.recipe.forEach(ing => {
                const matInfo = items.find(i => i.id === ing.rm_id || i.id === ing.id || i.name === ing.name);
                const matId = matInfo?.id || ing.rm_id || ing.id || `temp-${ing.name}`;

                if (!requiredRawMaterials[matId]) {
                    const convFactor = matInfo?.conversion_factor ? Number(matInfo.conversion_factor) : 1;
                    const initialUsageVal = matInfo?.initial !== undefined ? Number(matInfo.initial) : (Number(matInfo?.stock) || 0);
                    requiredRawMaterials[matId] = {
                        id: matId,
                        name: matInfo?.name || ing.name,
                        requiredQtyUsage: 0, // En unidad de uso
                        bomBreakdown: [],
                        currentInvUsage: matInfo ? initialUsageVal : 0, // Use exact initial stock mapping
                        safetyUsage: Number(matInfo?.min_stock_level) || Number(matInfo?.safety) || 0,
                        unitUse: matInfo?.unit_measure || matInfo?.unit || ing.unit || 'und', // Unidad de uso
                        unitPurchase: matInfo?.purchase_unit || matInfo?.unit_measure || 'und', // Unidad de compra
                        conversionFactor: convFactor,
                        isMissing: !matInfo
                    };
                }

                // La receta define la cantidad por lote de PT.
                const qtyForTotal = Math.round((Number(ing.qty) || 0) * multiplier * 1e6) / 1e6;
                requiredRawMaterials[matId].requiredQtyUsage += qtyForTotal;

                requiredRawMaterials[matId].bomBreakdown.push(
                    `${p.label}: prod=${p.manualProduce} / lote=${p.batchSize} (${multiplier.toFixed(2)}x) → req: ${qtyForTotal.toFixed(4).replace(/\.?0+$/, '')} ${ing.unit || ''}`
                );
            });
        });

        // ── Paso 3: Aplicar fórmula para materia prima y convertir a Unidad de Compra ──
        const previewItems = Object.values(requiredRawMaterials).map(mat => {
            // Uso Neto Necesario = Max(0,  Requerimiento - Inventario + Seguridad)  (todo en Unidades de USO)
            const netUsageNeeds = Math.max(0, mat.requiredQtyUsage - mat.currentInvUsage + mat.safetyUsage);

            // Convertir a unidad de compra usando el factor de conversión
            // Asumiendo que Unidad Compra = Unidad Uso / conversionFactor (ej: kg a gramos => factor 1000)
            const toBuyExact = netUsageNeeds / mat.conversionFactor;
            const suggestedBuy = Math.ceil(toBuyExact);

            const matInfo = items.find(i => i.id === mat.id || i.name === mat.name);
            return {
                ...mat,
                requiredQty: parseFloat(mat.requiredQtyUsage.toFixed(4)), // fallback visual compatibility
                currentInv: parseFloat(mat.currentInvUsage.toFixed(4)), // fallback visual compatibility
                safety: mat.safetyUsage,
                unit: mat.unitPurchase,
                bomBreakdown: mat.bomBreakdown.join(' | '),
                quantityToBuy: suggestedBuy,
                exactQuantityToBuy: parseFloat(toBuyExact.toFixed(4)),
                unitCost: matInfo?.purchase_cost || matInfo?.avgCost || 0, // ensure using purchase_cost
                providerId: '',
                providerName: '',
                providerPhone: '',
                providerEmail: '',
            };
        });

        setExplosionPreview(previewItems);
    };

    const handleUpdatePtProduction = (ptId, newValue) => {
        const updatedPts = ptExplosionData.map(pt =>
            pt.ptId === ptId ? { ...pt, manualProduce: newValue } : pt
        );
        setPtExplosionData(updatedPts);
        runBOMExplosion(updatedPts);
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
                    purchasePrice: m.unitCost,
                    unit: m.unit
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
        setIsLoading(true);
        try {
            // 1. Better mapping of selected orders to their Database UUIDs
            const selectedDbIds = orders
                .filter(o => selectedOrders.includes(o.id))
                .map(o => o.dbId)
                .filter(Boolean);

            if (selectedDbIds.length === 0) {
                console.warn("No valid DB IDs found for selected orders.");
            }

            // 1. Update orders status
            for (const dbId of selectedDbIds) {
                await updateOrder(dbId, { status: 'En Compras' });
            }

            // 2. Persist each Purchase Order
            for (const po of poPreviewList) {
                const purchaseData = {
                    id: po.id,
                    provider_id: po.providerId,
                    provider_name: po.providerName,
                    status: 'Enviada',
                    payment_status: 'Pendiente',
                    total_amount: po.total,
                    order_date: po.date,
                    related_orders: po.relatedOrders || [],
                    items: po.items.map(i => ({
                        id: i.id,
                        name: i.name,
                        quantity: i.toBuy,
                        unit_cost: i.purchasePrice,
                        unit: i.unit,
                        total_cost: Number(i.purchasePrice) * Number(i.toBuy)
                    }))
                };
                const res = await addPurchase(purchaseData);
                if (!res.success) {
                    console.error("Error creating PO in Firestore:", res.error);
                }
            }

            // 3. Success Feedback and state reset
            await refreshData();
            setSelectedOrders([]);
            setIsPoModalOpen(false);
            setPoPreviewList([]);
            alert('¡Éxito! Se han generado las órdenes de compra y los pedidos han pasado al estado "En Compras".');

        } catch (e) {
            console.error("Critical error in PO Save cycle:", e);
            alert("Ocurrió un error crítico durante el guardado. Revisa la consola para más detalles.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleMoveToProduction = async (orderId) => {
        try {
            setIsLoading(true);
            const orderDoc = orders.find(o => o.id === orderId);
            if (orderDoc?.dbId) {
                await updateOrder(orderDoc.dbId, { status: 'En Producción' });
                await refreshData();
                alert('¡Listo! El pedido ha sido movido exitosamente al tablero de Producción.');
            }
        } catch (error) {
            console.error("Error moving to production:", error);
            alert("No se pudieron mover los pedidos a producción.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendWhatsApp = (po) => {
        const text = `Hola ${po.providerName}, somos ${ownCompany.name}. Adjuntamos nuestra orden de compra ${po.id} por un total de $${(po.total || 0).toLocaleString('es-CO')}. Quedamos atentos a confirmación.`;
        window.open(`https://wa.me/57${po.providerPhone}?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleSendEmail = (po) => {
        const subject = `Orden de Compra ${ownCompany.name} - ${po.id}`;
        const body = `Señores ${po.providerName},\n\nAdjuntamos orden de compra ${po.id}.\nTotal a pagar: $${(po.total || 0).toLocaleString('es-CO')}.\n\nPara ver los detalles por favor revisar el sistema o contactarnos.\n\nAtentamente,\n${ownCompany.name}`;
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
        // Persist change to Firestore
        try {
            const res = await updateOrder(updated.dbId, {
                amount: updated.amount,
                status: updated.status,
                items: updated.items
            });
            if (!res.success) throw new Error(res.error);
        } catch (e) {
            console.error("Error updating order in Firestore:", e);
        }

        setViewingOrder(null);
    };

    const handleDeleteViewedOrder = () => {
        setConfirmModal({
            show: true,
            step: 1,
            type: 'viewed',
            target: viewingOrder.id,
            title: '¿Eliminar Pedido Actual?',
            message: `¿Estás seguro que quieres eliminar este pedido de ${viewingOrder.client}? Esta acción lo borrará permanentemente de la base de datos.`
        });
    };

    const handleDownloadPDF = async (order) => {
        const doc = new jsPDF();
        const clientInfo = clients.find(c => c.name === order.client);

        // Header Build (DocumentBuilder Style)
        doc.setFont('times', 'bold');
        doc.setFontSize(30);
        doc.setTextColor(2, 54, 54);
        doc.text('zeticas', 14, 25);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(ownCompany.name, 14, 32);
        doc.text(`NIT: ${ownCompany.nit}`, 14, 36);
        doc.text(`${ownCompany.city || 'Bogotá D.C.'}, Colombia`, 14, 40);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(15, 23, 42);
        doc.text('NOTA DE PEDIDO', 196, 25, { align: 'right' });

        doc.setFontSize(14);
        doc.setTextColor(2, 54, 54);
        doc.text(order.id, 196, 33, { align: 'right' });

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Fecha: ${order.date}`, 196, 39, { align: 'right' });

        // Horizontal Rule
        doc.setDrawColor(2, 54, 54);
        doc.setLineWidth(0.8);
        doc.line(14, 48, 196, 48);

        // Info Cards (Box backgrounds)
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 55, 88, 30, 2, 2, 'F');
        doc.setDrawColor(241, 245, 249);
        doc.roundedRect(14, 55, 88, 30, 2, 2, 'S');

        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(148, 163, 184);
        doc.text('VENDEDOR / EMISOR', 18, 60);

        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text('Zeticas S.A.S.', 18, 66);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('NIT: 901.321.456-7', 18, 71);
        doc.text('comercial@zeticas.com', 18, 76);

        // Client Data
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(108, 55, 88, 30, 2, 2, 'F');
        doc.setDrawColor(241, 245, 249);
        doc.roundedRect(108, 55, 88, 30, 2, 2, 'S');

        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(148, 163, 184);
        doc.text('DATOS DEL CLIENTE', 112, 60);

        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text(order.client, 112, 66);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(clientInfo?.nit || 'NIT: No registrado', 112, 71);
        doc.text(clientInfo?.address || 'Destino por confirmar', 112, 76);
        doc.text(`Origen: ${order.source}`, 112, 81);

        // Items Table
        const tableColumn = ["DESCRIPCIÓN", "CANTIDAD", "V. UNITARIO", "V. TOTAL"];
        const tableRows = order.items.map(item => [
            item.name,
            item.quantity.toLocaleString('es-CO'),
            `$${Math.round(item.price || 0).toLocaleString('es-CO')}`,
            `$${Math.round((item.price * item.quantity) || 0).toLocaleString('es-CO')}`
        ]);

        autoTable(doc, {
            startY: 95,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            styles: { fontSize: 8.5, cellPadding: 4, textColor: [30, 41, 59] },
            headStyles: { fillColor: [2, 54, 54], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { halign: 'center', cellWidth: 30 },
                2: { halign: 'right', cellWidth: 35 },
                3: { halign: 'right', cellWidth: 35 }
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 14, right: 14 }
        });

        // Totals
        const finalY = doc.lastAutoTable?.finalY || 100;
        const totalAmount = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        doc.setFillColor(240, 253, 244);
        doc.roundedRect(125, finalY + 10, 71, 12, 2, 2, 'F');

        doc.setFontSize(11);
        doc.setTextColor(2, 54, 54);
        doc.text('TOTAL PEDIDO:', 145, finalY + 18, { align: 'right' });
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`$${Math.round(totalAmount).toLocaleString('es-CO')}`, 196, finalY + 18, { align: 'right' });

        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(148, 163, 184);
        doc.text('Este documento es una nota de pedido oficial generada por Zeticas OS.', 105, 280, { align: 'center' });

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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Total Revenue - Main Card */}
                <div style={{
                    background: `linear-gradient(135deg, ${deepTeal} 0%, #037075 100%)`,
                    padding: '1.5rem 2rem',
                    borderRadius: '24px',
                    color: '#fff',
                    boxShadow: `0 15px 35px ${deepTeal}25`,
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    animation: 'fadeUp 0.6s ease-out'
                }}>
                    <div style={{ position: 'absolute', right: '-20px', top: '-10px', opacity: 0.1, transform: 'rotate(-10deg)' }}>
                        <TrendingUp size={240} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.4rem', borderRadius: '10px' }}><DollarSign size={16} /></div>
                        <span style={{ fontSize: '0.7rem', fontWeight: '900', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px' }}>Ventas Totales</span>
                    </div>
                    <div style={{ fontSize: '2.2rem', fontWeight: '900', letterSpacing: '-1.5px', lineHeight: 1 }}>
                        <span style={{ fontSize: '1.4rem', opacity: 0.6, marginRight: '4px', verticalAlign: 'middle' }}>$</span>
                        {(totalSales || 0).toLocaleString()}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '1.2rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.6rem 1.2rem', borderRadius: '14px', fontSize: '0.85rem', fontWeight: '900', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {orderCount} <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>PEDIDOS</span>
                        </div>
                    </div>
                </div>

                {/* Source Breakdown - Glass Effect */}
                <div style={{
                    background: glassWhite,
                    backdropFilter: 'blur(10px)',
                    padding: '1.5rem 2rem',
                    borderRadius: '24px',
                    border: '1px solid rgba(2, 83, 87, 0.05)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    animation: 'fadeUp 0.7s ease-out'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1.25rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${institutionOcre}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: institutionOcre }}>
                            <Filter size={18} />
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: '900', color: deepTeal, textTransform: 'uppercase', letterSpacing: '1px' }}>Canales</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                        {[
                            { label: 'Web', count: sourceBreakdown.Web, color: deepTeal },
                            { label: 'B2B/Cli', count: sourceBreakdown.Clientes, color: institutionOcre },
                            { label: 'Distro', count: sourceBreakdown.Distribuidores, color: premiumSalmon },
                            { label: 'Recurr', count: sourceBreakdown.Recurrentes, color: '#64748b' }
                        ].map(item => (
                            <div key={item.label} style={{ background: '#fcfcfc', padding: '0.7rem 1rem', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9' }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>{item.label}</span>
                                <span style={{ fontSize: '1.1rem', fontWeight: '900', color: item.color }}>{item.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Cycle Time / Health - High Performance */}
                <div style={{
                    background: glassWhite,
                    backdropFilter: 'blur(10px)',
                    padding: '1.5rem 2rem',
                    borderRadius: '24px',
                    border: '1px solid rgba(2, 83, 87, 0.05)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    animation: 'fadeUp 0.8s ease-out'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(2, 54, 54, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: deepTeal }}>
                            <CheckCircle2 size={18} />
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Efectividad</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                        <div style={{ fontSize: '2.2rem', fontWeight: '900', color: deepTeal, lineHeight: 1 }}>98<span style={{ fontSize: '1.2rem', opacity: 0.5 }}>%</span></div>
                    </div>
                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.8rem', background: '#f8fafc', padding: '0.7rem 1.2rem', borderRadius: '14px', width: 'fit-content', border: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: '900', color: '#64748b' }}>SLA: <span style={{ color: '#10b981' }}>OK</span></div>
                        <div style={{ height: '10px', width: '1px', background: '#cbd5e1' }} />
                        <div style={{ fontSize: '0.7rem', fontWeight: '900', color: '#64748b' }}>ERR: <span style={{ color: premiumSalmon }}>0.2%</span></div>
                    </div>
                </div>
            </div>

            {/* Action Bar & Filter Section - Premium Glass Design */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                marginBottom: '1.5rem',
                background: glassWhite,
                backdropFilter: 'blur(10px)',
                padding: window.innerWidth < 768 ? '1rem' : '1.5rem 2rem',
                borderRadius: '24px',
                border: '1px solid rgba(2, 83, 87, 0.05)',
                boxShadow: '0 10px 25px rgba(0,0,0,0.01)',
                animation: 'fadeUp 0.6s ease-out'
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: window.innerWidth < 1024 ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: window.innerWidth < 1024 ? 'stretch' : 'center',
                    gap: '1.5rem'
                }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: window.innerWidth < 500 ? 'column' : 'row',
                        gap: '1rem'
                    }}>
                        <div style={{
                            display: 'flex',
                            background: 'rgba(2, 83, 87, 0.05)',
                            padding: '6px',
                            borderRadius: '22px',
                            border: '1px solid rgba(2, 83, 87, 0.08)',
                            overflowX: 'auto',
                            scrollbarWidth: 'none'
                        }}>
                            {['week', 'month', 'custom'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => setFilterType(type)}
                                    style={{
                                        padding: '0.8rem 1.8rem',
                                        borderRadius: '14px',
                                        border: 'none',
                                        fontSize: '0.75rem',
                                        fontWeight: '900',
                                        cursor: 'pointer',
                                        background: filterType === type ? deepTeal : 'transparent',
                                        color: filterType === type ? '#fff' : '#64748b',
                                        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px',
                                        boxShadow: filterType === type ? '0 8px 15px rgba(2, 83, 87, 0.15)' : 'none'
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
                                borderRadius: '16px',
                                border: '1px solid #f1f5f9',
                                animation: 'slideInRight 0.4s ease-out',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.01)'
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

                    <div style={{
                        display: 'flex',
                        gap: '1rem',
                        justifyContent: window.innerWidth < 768 ? 'space-between' : 'flex-end'
                    }}>
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
                                width: '52px',
                                height: '52px',
                                borderRadius: '16px',
                                border: '1px solid #f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.01)'
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
                                padding: '0 2rem',
                                height: '52px',
                                borderRadius: '18px',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                fontWeight: '900',
                                fontSize: '0.85rem',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                boxShadow: `0 8px 20px ${deepTeal}20`,
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
                    <Search size={20} style={{ position: 'absolute', left: '1.5rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Buscar por cliente, pedido, referencia o producto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '1.2rem 3.5rem 1.2rem 4rem',
                            borderRadius: '18px',
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
                            style={{
                                position: 'absolute',
                                right: '1.5rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Selection Operative Bar - Floating Style */}
            <div style={{
                background: institutionOcre,
                padding: '1.5rem 3rem',
                borderRadius: '30px',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: `0 20px 40px ${institutionOcre}30`,
                marginBottom: '2.5rem',
                transform: selectedOrders.length > 0 ? 'translateY(0)' : 'translateY(20px)',
                opacity: selectedOrders.length > 0 ? 1 : 0,
                pointerEvents: selectedOrders.length > 0 ? 'auto' : 'none',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                border: '1px solid rgba(255,255,255,0.2)',
                display: selectedOrders.length > 0 ? 'flex' : 'none'
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
            <div style={{
                background: '#fff',
                borderRadius: '24px',
                border: '1px solid #f1f5f9',
                boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
                overflow: 'hidden'
            }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse' }}>
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
                                    <td style={{ padding: '1.2rem 1.5rem', textAlign: 'right', fontWeight: '900', color: '#0f172a', fontSize: '1rem' }}>${(order.amount || 0).toLocaleString('es-CO')}</td>
                                    <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '6px 14px',
                                            borderRadius: '12px',
                                            fontSize: '0.65rem',
                                            fontWeight: '900',
                                            letterSpacing: '0.5px',
                                            whiteSpace: 'nowrap',
                                            display: 'inline-block',
                                            background:
                                                order.status === 'Pagado' || order.status === 'Entregado' ? 'rgba(22, 163, 74, 0.1)' :
                                                    order.status === 'PENDIENTE' ? 'rgba(214, 189, 152, 0.15)' : 'rgba(2, 83, 87, 0.05)',
                                            color:
                                                order.status === 'Pagado' || order.status === 'Entregado' ? '#16a34a' :
                                                    order.status === 'PENDIENTE' ? '#B8A07E' : deepTeal,
                                            border: '1px solid currentColor'
                                        }}>
                                            {(order.status || 'PENDIENTE').toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
                                            {order.status === 'En Compras' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleMoveToProduction(order.id); }}
                                                    style={{
                                                        background: deepTeal,
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        padding: '6px 12px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.65rem',
                                                        fontWeight: 'bold',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.4rem'
                                                    }}
                                                    title="Mover a Producción"
                                                >
                                                    <ChefHat size={14} /> PRODUCCIÓN
                                                </button>
                                            )}
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
            </div>

            {/* Modal for New Order - PT (Producto Terminado) */}
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
                    padding: '0'
                }}>
                    <div style={{
                        background: '#fff',
                        width: '100%',
                        maxWidth: window.innerWidth < 768 ? '100%' : '900px',
                        height: window.innerWidth < 768 ? '100%' : 'auto',
                        maxHeight: window.innerWidth < 768 ? '100%' : '90vh',
                        borderRadius: window.innerWidth < 768 ? '0' : '24px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        {/* Modal Header */}
                        <div style={{ padding: '1.5rem 2.5rem', borderBottom: '1px solid rgba(2, 83, 87, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F9FBFA' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.4rem', color: deepTeal, fontWeight: '900' }}>CREAR NUEVO PEDIDO PT</h3>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Configura el despacho de Producto Terminado para cliente final.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: '50%', padding: '0.6rem', cursor: 'pointer', color: '#cbd5e1', display: 'flex', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = premiumSalmon} onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}><X size={20} /></button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: window.innerWidth < 768 ? '1.5rem' : '2.5rem', overflowY: 'auto', flex: 1 }}>
                            <div style={{
                                display: 'flex',
                                flexDirection: window.innerWidth < 768 ? 'column' : 'row',
                                gap: window.innerWidth < 768 ? '1.5rem' : '3rem'
                            }}>
                                {/* Left side: Order Info & Items */}
                                <div style={{ flex: 1.4, animation: 'fadeUp 0.4s ease-out' }}>
                                    <div style={{ marginBottom: '2.5rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: '900', color: institutionOcre, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.8rem' }}>Selección de Cliente (Data Maestra)</label>
                                        <div style={{ position: 'relative' }}>
                                            <Users size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', zIndex: 1 }} />
                                            <select
                                                value={newOrder.clientId || ''}
                                                onChange={(e) => {
                                                    const selectedClientId = e.target.value;
                                                    const client = (clients || []).find(c => String(c.id) === selectedClientId);
                                                    if (client) {
                                                        setNewOrder({
                                                            ...newOrder,
                                                            client: client.name,
                                                            clientId: client.id,
                                                            source: client.source || 'CRM'
                                                        });
                                                    } else {
                                                        setNewOrder({ ...newOrder, client: '', clientId: '' });
                                                    }
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '1.1rem 1rem 1.1rem 3rem',
                                                    borderRadius: '18px',
                                                    border: '1px solid #f1f5f9',
                                                    fontSize: '0.95rem',
                                                    fontWeight: '800',
                                                    outline: 'none',
                                                    background: '#fff',
                                                    color: '#1e293b',
                                                    appearance: 'none',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
                                                }}
                                            >
                                                <option value="">Seleccionar cliente del directorio...</option>
                                                {(clients || [])
                                                    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                                                    .map(c => (
                                                        <option key={c.id} value={c.id}>
                                                            {c.name} {c.nit ? `(${c.nit})` : ''}
                                                        </option>
                                                    ))
                                                }
                                            </select>
                                            <ChevronDown size={18} style={{ position: 'absolute', right: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1', pointerEvents: 'none' }} />
                                        </div>
                                    </div>

                                    {/* Products in the order */}
                                    <div style={{ marginTop: '2.5rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: '900', color: institutionOcre, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>Productos en el Pedido</label>
                                        {newOrder.items.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                                {newOrder.items.map(item => (
                                                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '1rem 1.2rem', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#1e293b' }}>{item.name}</div>
                                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>Precio Unit: <span style={{ color: deepTeal }}>${(item.price || 0).toLocaleString()}</span></div>
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
                                                            <div style={{ fontWeight: '900', width: '90px', textAlign: 'right', color: '#0f172a', fontSize: '0.95rem' }}>${(((item.price || 0) * (item.quantity || 0)) || 0).toLocaleString()}</div>
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
                                                        ${((newOrder.items.reduce((sum, i) => sum + ((i.price || 0) * (i.quantity || 0)), 0)) || 0).toLocaleString()}
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
                                <div style={{
                                    flex: 1,
                                    borderLeft: window.innerWidth < 768 ? 'none' : '1px solid rgba(2, 83, 87, 0.05)',
                                    paddingLeft: window.innerWidth < 768 ? '0' : '2.5rem',
                                    borderTop: window.innerWidth < 768 ? '1px solid rgba(2, 83, 87, 0.05)' : 'none',
                                    paddingTop: window.innerWidth < 768 ? '1.5rem' : '0'
                                }}>
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
                                                padding: '0.7rem 2.8rem 0.7rem 2.8rem',
                                                borderRadius: '12px',
                                                border: '1px solid #f1f5f9',
                                                fontSize: '0.85rem',
                                                fontWeight: '800',
                                                outline: 'none',
                                                background: '#fcfcfc',
                                                color: deepTeal
                                            }}
                                        />
                                        {productSearchTerm && (
                                            <button
                                                onClick={() => setProductSearchTerm('')}
                                                style={{
                                                    position: 'absolute',
                                                    right: '0.8rem',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#cbd5e1',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '450px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                        {filteredCatalog.length > 0 ? (
                                            filteredCatalog.map(prod => (
                                                <div key={prod.id} style={{ padding: '1rem', border: '1px solid #f1f5f9', borderRadius: '16px', background: '#fff', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.01)' }}>
                                                    <div style={{ fontWeight: '800', fontSize: '0.85rem', marginBottom: '0.4rem', color: '#1e293b' }}>{prod.name}</div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.9rem', color: deepTeal, fontWeight: '900' }}>${(prod.price || 0).toLocaleString()}</span>
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

                        {/* Modal Footer */}
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
                    zIndex: 3000,
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
                            {/* PT Requirement Adjustments */}
                            <div style={{ marginBottom: '2rem', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <div style={{ padding: '1rem 1.5rem', background: '#fef3c7', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                    <ChefHat size={20} color="#d97706" />
                                    <h4 style={{ margin: 0, color: '#b45309', fontSize: '1rem', fontWeight: '900' }}>SKUs a Fabricar (Demanda Neta)</h4>
                                </div>
                                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {ptExplosionData.map(pt => (
                                        <div key={pt.ptId} style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) auto', gap: '2rem', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px dashed #e2e8f0' }}>
                                            <div>
                                                <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '1.05rem', marginBottom: '0.3rem' }}>{pt.label}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                    Pedidos (<span style={{ fontWeight: 'bold' }}>{pt.totalDemand}</span>)
                                                    - Inv (<span style={{ fontWeight: 'bold' }}>{pt.inventoryPT}</span>)
                                                    + Saf (<span style={{ fontWeight: 'bold' }}>{pt.safety}</span>)
                                                    = Fórmula (<span style={{ fontWeight: 'bold', color: '#0f172a' }}>{pt.suggestedProduce}</span>)
                                                    | <span style={{ opacity: 0.8 }}>Lote PT: {pt.batchSize}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                                                    <label style={{ fontSize: '0.7rem', fontWeight: '800', color: deepTeal, textTransform: 'uppercase' }}>A PRODUCIR</label>
                                                    <input
                                                        type="number"
                                                        value={pt.manualProduce}
                                                        onChange={(e) => handleUpdatePtProduction(pt.ptId, Number(e.target.value))}
                                                        style={{
                                                            width: '100px',
                                                            padding: '0.6rem',
                                                            borderRadius: '10px',
                                                            border: `2px solid ${pt.manualProduce !== pt.suggestedProduce ? '#ea580c' : '#cbd5e1'}`,
                                                            outline: 'none',
                                                            textAlign: 'center',
                                                            fontWeight: '900',
                                                            fontSize: '1rem',
                                                            color: pt.manualProduce !== pt.suggestedProduce ? '#ea580c' : '#0f172a'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ padding: '0 0 1rem 0' }}>
                                <h4 style={{ margin: 0, color: '#334155', fontSize: '1rem', fontWeight: '900', letterSpacing: '-0.5px' }}>Materias Primas Requeridas</h4>
                                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 0 0' }}>Se aplica conversión dinámica a <strong>Unidad de Compra</strong>.</p>
                            </div>

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
                                                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                                            Uso Total: <span style={{ fontWeight: 'bold' }}>{parseFloat(item.requiredQtyUsage.toFixed(4))} {item.unitUse}</span> |
                                                            Inv: <span style={{ fontWeight: 'bold' }}>{parseFloat((item.currentInvUsage || 0).toFixed(4))} {item.unitUse}</span> |
                                                            Safety: <span style={{ fontWeight: 'bold' }}>{item.safetyUsage} {item.unitUse}</span>
                                                            <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#ea580c', marginLeft: '0.8rem' }}>
                                                                = {Math.max(0, item.requiredQtyUsage - item.currentInvUsage + item.safetyUsage).toFixed(4).replace(/\.?0+$/, '')} {item.unitUse}
                                                            </span>
                                                            <div style={{ marginTop: '0.5rem', padding: '0.4rem 0.8rem', background: '#fff7ed', borderRadius: '6px', borderLeft: '4px solid #ea580c', color: '#9a3412', fontWeight: '800' }}>
                                                                = {item.exactQuantityToBuy} <span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>{item.unit}</span> a comprar
                                                                <span style={{ margin: '0 0.5rem', color: '#c2410c' }}>→</span>
                                                                <span style={{ fontSize: '1.05rem' }}>{item.quantityToBuy}</span> <span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>{item.unit}</span> (Redondeado)
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                                <div style={{
                                                    background: (item.providerId && item.unitCost > 0) ? '#16a34a' : (item.quantityToBuy > 0 ? '#ea580c' : '#fff7ed'),
                                                    border: (item.providerId && item.unitCost > 0) ? '1px solid #16a34a' : (item.quantityToBuy > 0 ? '1px solid #ea580c' : '1px solid #fed7aa'),
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
                                                            Sugerido Neto de Uso ({item.requiredQtyUsage.toFixed(4)} - {item.currentInvUsage} + {item.safetyUsage} = <span style={{ color: '#ea580c' }}>{Math.max(0, item.requiredQtyUsage - item.currentInvUsage + item.safetyUsage).toFixed(4)} {item.unitUse}</span>)
                                                            <br />
                                                            Conversión: ÷ {item.conversionFactor} = <span style={{ color: '#16a34a' }}>{item.exactQuantityToBuy} {item.unit} a comprar</span>
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
                                                                {providers.filter(p => !(p.is_own_company === true || (p.name || '').toLowerCase().includes('zeticas'))).map(p => (
                                                                    <option key={p.id} value={p.id}>{p.name} ({p.group || ''})</option>
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
                                Total Estimado OCs: <span style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--color-primary)' }}>${((explosionPreview.reduce((sum, item) => sum + ((item.quantityToBuy || 0) * (item.unitCost || 0)), 0) || 0) || 0).toLocaleString()}</span>
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
                                    style={{
                                        padding: '0.8rem 2.5rem',
                                        borderRadius: '12px',
                                        border: 'none',
                                        background: (explosionPreview || []).every(i => i.providerId && i.unitCost > 0) ? '#16a34a' : '#ea580c',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.6rem',
                                        boxShadow: (explosionPreview || []).every(i => i.providerId && i.unitCost > 0) ? '0 4px 12px rgba(22, 163, 74, 0.3)' : '0 4px 12px rgba(234, 88, 12, 0.3)'
                                    }}
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
                                <DocumentBuilder
                                    key={po.id}
                                    type="ORDEN DE COMPRA"
                                    docId={po.id}
                                    date={po.date}
                                    client={{
                                        name: ownCompany.name,
                                        detail1: ownCompany.name,
                                        detail2: `NIT: ${ownCompany.nit}`,
                                        address: ownCompany.address,
                                        phone: ownCompany.phone
                                    }}
                                    shippingInfo={{
                                        title: 'Enviar a',
                                        location: ownCompany.name,
                                        address: ownCompany.delivery_address || ownCompany.address
                                    }}
                                    provider={{
                                        name: po.providerName,
                                        nit: providers.find(p => p.id === po.providerId)?.nit,
                                        phone: po.providerPhone,
                                        email: po.providerEmail
                                    }}
                                    items={po.items.map(item => ({
                                        name: item.name,
                                        quantity: item.toBuy,
                                        unit: item.unit,
                                        unitCost: item.purchasePrice,
                                        totalCost: item.toBuy * item.purchasePrice
                                    }))}
                                    totals={{
                                        subtotal: po.subtotal,
                                        taxLabel: 'IVA (19%)',
                                        taxValue: po.iva,
                                        total: po.total
                                    }}
                                    actions={[
                                        {
                                            label: 'WhatsApp',
                                            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.052 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>,
                                            onClick: () => handleSendWhatsApp(po),
                                            background: '#25D366'
                                        },
                                        {
                                            label: 'Correo',
                                            icon: <Mail size={18} />,
                                            onClick: () => handleSendEmail(po),
                                            background: '#1e293b'
                                        },
                                        {
                                            label: 'Eliminar OC',
                                            icon: <Trash2 size={18} />,
                                            onClick: () => {
                                                if (window.confirm('¿Estás seguro que quieres eliminar esta Orden de Compra de la previsualización?')) {
                                                    setPoPreviewList(prev => prev.filter(p => p.id !== po.id));
                                                }
                                            },
                                            background: '#ef4444'
                                        }
                                    ]}
                                />
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
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '2rem' }}>
                    <div style={{ background: '#fff', width: '100%', maxWidth: '800px', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                        <div style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <FileText size={24} color="var(--color-primary)" />
                                <div>
                                    <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem' }}>NOTA DE PEDIDO: {viewingOrder.id}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                                        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Fecha: {viewingOrder.date} &nbsp;|&nbsp; Origen: {viewingOrder.source}</span>
                                        <select
                                            value={viewingOrder.status || 'Pendiente'}
                                            onChange={(e) => setViewingOrder({ ...viewingOrder, status: e.target.value })}
                                            style={{
                                                padding: '3px 10px',
                                                borderRadius: '20px',
                                                border: '1.5px solid',
                                                fontSize: '0.75rem',
                                                fontWeight: '800',
                                                cursor: 'pointer',
                                                outline: 'none',
                                                appearance: 'none',
                                                paddingRight: '24px',
                                                backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")',
                                                backgroundRepeat: 'no-repeat',
                                                backgroundPosition: 'right 6px center',
                                                ...(
                                                    viewingOrder.status === 'Pagado' || viewingOrder.status === 'Entregado'
                                                        ? { background: 'rgba(22,163,74,0.08)', color: '#16a34a', borderColor: '#16a34a' }
                                                        : viewingOrder.status === 'Pendiente' || viewingOrder.status === 'PENDIENTE'
                                                            ? { background: 'rgba(214,189,152,0.15)', color: '#B8A07E', borderColor: '#B8A07E' }
                                                            : viewingOrder.status === 'En Producción'
                                                                ? { background: 'rgba(234,88,12,0.08)', color: '#ea580c', borderColor: '#ea580c' }
                                                                : viewingOrder.status === 'En Compras'
                                                                    ? { background: 'rgba(37,99,235,0.08)', color: '#2563eb', borderColor: '#2563eb' }
                                                                    : { background: 'rgba(2,83,87,0.05)', color: '#023636', borderColor: '#023636' }
                                                )
                                            }}
                                        >
                                            {['Pendiente', 'En Compras', 'En Producción', 'Listo para Despacho', 'Despachado', 'Pagado', 'Entregado', 'Cancelado'].map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
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
                                    <div style={{ color: '#0f172a', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.2rem' }}>{ownCompany.name}</div>
                                    <div style={{ color: '#64748b', fontSize: '0.9rem' }}>NIT: {ownCompany.nit}</div>
                                    <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{ownCompany.city || 'Bogotá'}, Colombia</div>
                                </div>
                                <div>
                                    <h4 style={{ margin: '0 0 1rem 0', color: '#334155', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Datos Cliente</h4>
                                    {/* Nombre */}
                                    <div style={{ color: '#0f172a', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.4rem' }}>
                                        {viewingOrder.client || 'Consumidor Final'}
                                    </div>
                                    {/* Identificación: NIT del cliente CRM, o ID de pedido web */}
                                    {(() => {
                                        const clientRecord = (clients || []).find(c => c.id === viewingOrder.clientId || c.name === viewingOrder.client);
                                        const nit = clientRecord?.nit;
                                        // Solo mostrar NIT si es un valor real (no un teléfono de 10 dígitos)
                                        const isRealNit = nit && !/^\d{10}$/.test(nit.replace(/\D/g, ''));
                                        if (isRealNit) return <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{nit}</div>;
                                        if (viewingOrder.customer_id) return <div style={{ color: '#64748b', fontSize: '0.9rem' }}>ID: {viewingOrder.customer_id}</div>;
                                        return <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>Identificación no registrada</div>;
                                    })()}
                                    {/* Dirección */}
                                    {(viewingOrder.shipping_address || (clients || []).find(c => c.id === viewingOrder.clientId || c.name === viewingOrder.client)?.address) && (
                                        <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                                            {viewingOrder.shipping_address || (clients || []).find(c => c.id === viewingOrder.clientId || c.name === viewingOrder.client)?.address}
                                        </div>
                                    )}
                                    {/* Municipio / Ciudad */}
                                    {(viewingOrder.shipping_city || (clients || []).find(c => c.id === viewingOrder.clientId || c.name === viewingOrder.client)?.city) && (
                                        <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
                                            {viewingOrder.shipping_city || (clients || []).find(c => c.id === viewingOrder.clientId || c.name === viewingOrder.client)?.city}
                                        </div>
                                    )}
                                    {/* Teléfono — una sola vez, priorizando shipping_phone */}
                                    {(() => {
                                        const phone = viewingOrder.shipping_phone
                                            || (clients || []).find(c => c.id === viewingOrder.clientId || c.name === viewingOrder.client)?.phone;
                                        return phone ? <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.2rem' }}>Tel: {phone}</div> : null;
                                    })()}
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
                                                <td style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right', color: '#64748b' }}>${(item.price || 0).toLocaleString()}</td>
                                                <td style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 'bold' }}>${((item.price * item.quantity) || 0).toLocaleString()}</td>
                                                <td style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => setConfirmModal({
                                                            show: true,
                                                            step: 1,
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
                                                        <option key={p.id} value={p.id}>{p.name} - ${(p.price || 0).toLocaleString()}</option>
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
                                                ${(newViewedItem.price || 0).toLocaleString()}
                                            </td>
                                            <td style={{ padding: '0.8rem 1rem', borderBottom: '1px solid #e2e8f0', borderTop: '2px solid #e2e8f0', textAlign: 'right', fontWeight: 'bold' }}>
                                                ${((newViewedItem.price * newViewedItem.quantity) || 0).toLocaleString()}
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
                                        ${(viewingOrder.items.reduce((sum, i) => sum + (i.price * i.quantity), 0) || 0).toLocaleString()}
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

            {/* Custom Confirmation Modal — 2 pasos */}
            {confirmModal.show && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '460px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'modalSlideUp 0.3s ease-out' }}>

                        {/* ── PASO 1: Advertencia inicial ── */}
                        {confirmModal.step === 1 && (
                            <div style={{ padding: '2rem', textAlign: 'center' }}>
                                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid #fed7aa' }}>
                                    <AlertTriangle size={32} color="#ea580c" />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1A3636', marginBottom: '0.8rem' }}>{confirmModal.title}</h3>
                                <p style={{ fontSize: '0.95rem', color: '#64748b', lineHeight: '1.6', marginBottom: '2rem' }}>{confirmModal.message}</p>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button
                                        onClick={() => { setConfirmModal({ ...confirmModal, show: false, step: 1 }); setConfirmText(''); }}
                                        style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: '700', cursor: 'pointer' }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => setConfirmModal({ ...confirmModal, step: 2 })}
                                        style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', border: 'none', background: '#ea580c', color: '#fff', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                    >
                                        Sí, continuar →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── PASO 2: Confirmación final — escribir ELIMINAR ── */}
                        {confirmModal.step === 2 && (
                            <div style={{ padding: '2rem', textAlign: 'center' }}>
                                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.2rem', border: '2px solid #fca5a5' }}>
                                    <AlertTriangle size={32} color="#ef4444" />
                                </div>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#ef4444', marginBottom: '0.5rem' }}>⚠️ Confirmación final</h3>
                                <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                                    Esta acción es <strong>permanente e irreversible</strong>.<br />
                                    Para confirmar, escribe <strong style={{ color: '#ef4444' }}>ELIMINAR</strong> en el campo de abajo.
                                </p>
                                <input
                                    type="text"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder="Escribe ELIMINAR para confirmar"
                                    style={{
                                        width: '100%',
                                        padding: '0.9rem 1rem',
                                        borderRadius: '12px',
                                        border: `2px solid ${confirmText === 'ELIMINAR' ? '#ef4444' : '#e2e8f0'}`,
                                        fontSize: '0.95rem',
                                        fontWeight: '700',
                                        textAlign: 'center',
                                        outline: 'none',
                                        marginBottom: '1.5rem',
                                        color: '#1e293b',
                                        transition: 'border-color 0.2s',
                                        letterSpacing: '1px'
                                    }}
                                    autoFocus
                                />
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button
                                        onClick={() => { setConfirmModal({ ...confirmModal, step: 1 }); setConfirmText(''); }}
                                        style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: '700', cursor: 'pointer' }}
                                    >
                                        ← Atrás
                                    </button>
                                    <button
                                        onClick={() => { if (confirmText === 'ELIMINAR') { executeDeletion(); setConfirmText(''); } }}
                                        disabled={confirmText !== 'ELIMINAR' || isDeleting}
                                        style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', border: 'none', background: confirmText === 'ELIMINAR' ? '#ef4444' : '#e2e8f0', color: confirmText === 'ELIMINAR' ? '#fff' : '#94a3b8', fontWeight: '700', cursor: confirmText === 'ELIMINAR' ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.3s', boxShadow: confirmText === 'ELIMINAR' ? '0 4px 12px rgba(239,68,68,0.3)' : 'none' }}
                                    >
                                        {isDeleting ? 'Eliminando...' : '🗑 Eliminar definitivamente'}
                                    </button>
                                </div>
                            </div>
                        )}
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
        @keyframes fadeUp {
            from { opacity: 0; transform: translateY(30px); }
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
        </div>
    );
};

export default Orders;
