import React, { useState, useMemo, useEffect } from 'react';
import { useBusiness } from '../context/BusinessContext';
import DocumentBuilder from '../components/DocumentBuilder';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RefreshCw, FileText, Download, TrendingUp, Calendar, Plus, Trash2, Filter, ShoppingCart, Globe, Users, Briefcase, Search, ChevronDown, X, Save, AlertTriangle, ArrowRight, Mail, Phone, MapPin, Hash, Sparkles, CheckCircle, ChefHat, DollarSign, PenTool, CheckCircle2, AlertCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { colombia_cities } from '../data/colombia_cities';

const PENDING_STATUSES = ['Pendiente', 'PENDIENTE'];
const PROCESSED_AND_ROUTED_STATUSES = ['Facturado', 'En Producción', 'En Despacho', 'En Compras', 'Finalizado', 'Entregado', 'Cobrado', 'Cancelado'];

const Orders = ({ orders }) => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const {
        items,
        recipes,
        providers,
        deleteOrders,
        updateOrder,
        addPurchase,
        refreshData,
        clients,
        ownCompany,
        addClient,
        saveOdp,
        banks,
        updateBankBalance,
        addOrder
    } = useBusiness();

    // Selection state
    const [selectedOrders, setSelectedOrders] = useState([]);

    // Filters and UI State
    const [viewMode, setViewMode] = useState('Pending'); // 'Pending' or 'Processed'
    const [timeRange, setTimeRange] = useState('week'); // 'week', 'month', 'all', 'custom'
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isExplosionModalOpen, setIsExplosionModalOpen] = useState(false);
    const [isPoModalOpen, setIsPoModalOpen] = useState(false);
    const [viewingOrder, setViewingOrder] = useState(null);
    const [downloadedIds, setDownloadedIds] = useState([]); // Track which POs have been downloaded
    const [newViewedItem, setNewViewedItem] = useState({ id: '', quantity: 1, name: '', price: 0 });
    const [explosionPreview, setExplosionPreview] = useState([]);
    const [poPreviewList, setPoPreviewList] = useState([]);
    const [expandedExplosionItem, setExpandedExplosionItem] = useState(null);
    const [ptExplosionData, setPtExplosionData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [newOrder, setNewOrder] = useState({
        client: '',
        clientId: '',
        source: 'Entrada Manual',
        payment_status: 'Pendiente',
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

    // New Client Quick Add State
    const [showNewClientForm, setShowNewClientForm] = useState(false);
    const [newClientData, setNewClientData] = useState({
        name: '',
        nit: '',
        phone: '',
        address: '',
        city: 'Bogotá D.C.',
        email: '',
        type: 'Natural'
    });
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const [selectedBankId, setSelectedBankId] = useState('');

    // City Selection State
    const [citySearch, setCitySearch] = useState('');
    const [showCityDropdown, setShowCityDropdown] = useState(false);

    const filteredCities = useMemo(() => {
        if (!citySearch || citySearch.length < 2) return [];
        const q = citySearch.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return colombia_cities.filter(c => {
            const cityNorm = c.city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const stateNorm = c.state.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return cityNorm.includes(q) || stateNorm.includes(q);
        }).slice(0, 10);
    }, [citySearch]);

    const filteredClients = useMemo(() => {
        let list = clients || [];
        if (clientSearchTerm) {
            const q = clientSearchTerm.toLowerCase();
            list = list.filter(c => 
                (c.name || '').toLowerCase().includes(q) || 
                (c.nit || '').toLowerCase().includes(q) ||
                (c.phone || '').toLowerCase().includes(q)
            );
        }
        // Prioritize members (subscribers)
        return [...list].sort((a, b) => {
            if (a.is_member && !b.is_member) return -1;
            if (!a.is_member && b.is_member) return 1;
            return (a.name || '').localeCompare(b.name || '');
        });
    }, [clients, clientSearchTerm]);

    const handleCreateQuickClient = async () => {
        if (!newClientData.name || !newClientData.nit) {
            alert("El nombre y NIT/ID son obligatorios.");
            return;
        }
        setIsLoading(true);
        const res = await addClient(newClientData);
        if (res.success) {
            setNewOrder({ ...newOrder, client: newClientData.name, clientId: res.id });
            setShowNewClientForm(false);
            setClientSearchTerm(newClientData.name);
            setShowClientDropdown(false);
            setNewClientData({ name: '', nit: '', phone: '', address: '', city: 'Bogotá D.C.', email: '', type: 'Natural' });
        } else {
            alert(`Error: ${res.error}`);
        }
        setIsLoading(false);
    };

    const handleCancelNewClient = () => {
        setShowNewClientForm(false);
        setClientSearchTerm('');
        setCitySearch('');
        setShowCityDropdown(false);
        setNewClientData({
            name: '',
            nit: '',
            phone: '',
            address: '',
            city: '',
            email: '',
            type: 'Natural'
        });
    };

    const handleAddProductToOrder = (product) => {
        const existing = newOrder.items.find(i => i.id === product.id);
        if (existing) {
            setNewOrder({
                ...newOrder,
                items: newOrder.items.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
            });
        } else {
            setNewOrder({
                ...newOrder,
                items: [...newOrder.items, {
                    id: product.id,
                    name: product.name,
                    price: product.price || 0,
                    quantity: 1
                }]
            });
        }
    };

    const handleUpdateQuantity = (id, delta) => {
        setNewOrder(prev => ({
            ...prev,
            items: prev.items.map(i => {
                if (id === i.id) {
                    const newQty = Math.max(1, i.quantity + delta);
                    return { ...i, quantity: newQty };
                }
                return i;
            })
        }));
    };

    const handleRemoveItem = (id) => {
        setNewOrder(prev => ({
            ...prev,
            items: prev.items.filter(i => i.id !== id)
        }));
    };

    const handleSaveOrder = async () => {
        if (!newOrder.clientId || newOrder.items.length === 0) {
            alert('Por favor selecciona un cliente y añade productos.');
            return;
        }

        if (newOrder.payment_status === 'Pagado' && !selectedBankId) {
            alert('Por favor selecciona el banco donde se recibió el pago.');
            return;
        }

        setIsLoading(true);
        const total = newOrder.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        
        try {
            const orderDoc = {
                client: newOrder.client,
                clientId: newOrder.clientId,
                source: 'Manual',
                items: newOrder.items.map(item => ({...item})),
                amount: total,
                total_amount: total,
                status: 'Pendiente', 
                payment_status: newOrder.payment_status || 'Pendiente',
                payment_bank_id: selectedBankId || null,
                date: new Date().toLocaleDateString('en-CA'),
                purchase_order: newOrder.purchase_order || null
            };

            const res = await addOrder(orderDoc);

            if (res.success) {
                alert(`¡Pedido ${res.displayId} creado y contabilizado exitosamente!`);
                setIsModalOpen(false);
                setNewOrder({ 
                    client: '', 
                    clientId: '', 
                    source: 'Entrada Manual', 
                    payment_status: 'Pendiente', 
                    items: [] 
                });
                setSelectedBankId(''); // Reset bank
                if (typeof refreshData === 'function') await refreshData();
            } else {
                console.error("Error adding order:", res.error);
                alert(`Error al crear pedido: ${res.error}`);
            }
        } catch (e) {
            console.error("Detailed critical error:", e);
            alert(`Error crítico al guardar: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

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


    // Tab Filtering Logic (Pendientes vs Procesados)
    const filteredOrders = useMemo(() => {
        let baseFiltered = orders || [];

        // Date filtering (Time Range)
        if (timeRange === 'week') {
            const lastWeekLimit = new Date();
            lastWeekLimit.setDate(lastWeekLimit.getDate() - 7);
            lastWeekLimit.setHours(0, 0, 0, 0);

            baseFiltered = baseFiltered.filter(o => {
                const orderDate = new Date(o.date + 'T00:00:00');
                return !isNaN(orderDate) && orderDate >= lastWeekLimit;
            });
        } else if (timeRange === 'month') {
            const thisMonthLimit = new Date();
            thisMonthLimit.setDate(1);
            thisMonthLimit.setHours(0, 0, 0, 0);

            baseFiltered = baseFiltered.filter(o => {
                const orderDate = new Date(o.date + 'T00:00:00');
                return !isNaN(orderDate) && orderDate >= thisMonthLimit;
            });
        }
        // 'all' doesn't need additional filtering on orders list

        // Search filtering
        if (searchTerm) {
            const query = searchTerm.toLowerCase();
            baseFiltered = baseFiltered.filter(o =>
                (o.client || '').toLowerCase().includes(query) ||
                String(o.id || '').toLowerCase().includes(query) ||
                (o.items || []).some(i => (i.name || '').toLowerCase().includes(query))
            );
        }

        // Tab Filtering (Final Separation)
        // Tab Filtering (Final Separation) - STRICT PENDING LOGIC
        if (viewMode === 'Pending') {
            return baseFiltered.filter(o => (o.status || 'Pendiente').toLowerCase() === 'pendiente');
        } else {
            // EVERYTHING ELSE is considered Processed or Routed to other modules
            return baseFiltered.filter(o => (o.status || 'Pendiente').toLowerCase() !== 'pendiente');
        }
    }, [orders, viewMode, searchTerm, timeRange]);



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

    const handleResetStatus = async () => {
        if (selectedOrders.length === 0) {
            alert('Selecciona los pedidos que deseas resetear a Pendiente.');
            return;
        }
        setIsLoading(true);
        try {
            const dbIds = orders
                .filter(o => selectedOrders.includes(o.id))
                .map(o => o.dbId)
                .filter(Boolean);
            
            for (const dbId of dbIds) {
                await updateOrder(dbId, { status: 'Pendiente' });
            }
            await refreshData();
            setSelectedOrders([]);
            alert('¡Estados reseteados! Todos los pedidos seleccionados están ahora en PENDIENTE.');
        } catch (e) {
            console.error("Error resetting orders:", e);
        } finally {
            setIsLoading(false);
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

            setDownloadedIds([]); // Reset for safety check on each explosion batch

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

                // FÓRMULA: Necesidad de Fabricación = (Pedido - Existencia) + Nivel de Seguridad
                // Esto asegura que tras producir, quedemos exactamente en el Nivel de Seguridad.
                const neededToReachSafety = (totalDemand - inventoryPT) + safety;
                const suggestedProduce = Math.max(0, neededToReachSafety);

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

            // LÓGICA DE BATCHES ENTEROS (n): 
            // n = redondeo.arriba( Unidades a Fabricar / Tamaño del Batch )
            const nBatches = Math.ceil(p.manualProduce / p.batchSize);
            const multiplier = nBatches;

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
                let qtyForTotal = Math.round((Number(ing.qty) || 0) * multiplier * 1e6) / 1e6;
                
                // --- Normalización Inteligente de Unidades ---
                // Si la unidad de la receta (ing.unit) es diferente a la del inventario (matInfo.unit_measure), convertimos.
                const ingUnit = (ing.unit || '').toLowerCase().trim();
                const matUnit = (requiredRawMaterials[matId].unitUse || '').toLowerCase().trim();

                if (ingUnit !== matUnit) {
                    if (ingUnit === 'gr' && matUnit === 'lb') qtyForTotal = qtyForTotal / 453.6;
                    else if (ingUnit === 'gr' && matUnit === 'kg') qtyForTotal = qtyForTotal / 1000;
                    else if (ingUnit === 'kg' && matUnit === 'gr') qtyForTotal = qtyForTotal * 1000;
                    else if (ingUnit === 'lb' && matUnit === 'gr') qtyForTotal = qtyForTotal * 453.6;
                    else if (ingUnit === 'lb' && matUnit === 'kg') qtyForTotal = qtyForTotal / 2.2046;
                    else if (ingUnit === 'kg' && matUnit === 'lb') qtyForTotal = qtyForTotal * 2.2046;
                }

                requiredRawMaterials[matId].requiredQtyUsage += qtyForTotal;

                requiredRawMaterials[matId].bomBreakdown.push(
                    `${p.label}: prod=${p.manualProduce} → n=${nBatches} batches (lote ${p.batchSize}) → req: ${qtyForTotal.toFixed(4).replace(/\.?0+$/, '')} ${matUnit}`
                );
            });
        });

        // ── Paso 3: Aplicar fórmula para materia prima y convertir a Unidad de Compra ──
        const previewItems = Object.values(requiredRawMaterials).map(mat => {
            // Lógica de Reorden Kanban:
            // 1. Calculamos cómo quedará el stock físico al terminar la producción de estos lotes.
            const projectedStockAfterProd = mat.currentInvUsage - mat.requiredQtyUsage;
            
            // 2. Umbral Dinámico: Usamos el configurado en el Dashboard (siteContent.inventory.config.redThreshold)
            // Si el stock cae por debajo de este % de la meta, se dispara la OC.
            const configThreshold = siteContent?.inventory?.config?.redThreshold !== undefined 
                ? Number(siteContent.inventory.config.redThreshold) 
                : 0.5; // default 50%
            
            const reorderThreshold = mat.safetyUsage * configThreshold;
            
            // 3. REPOSICIÓN TOTAL: Si cruzamos el umbral, compramos para volver al 100% de la Meta.
            let netUsageNeeds = 0;
            if (projectedStockAfterProd <= reorderThreshold) {
                // Compramos para cubrir el hueco y quedar en el Nivel de Seguridad exacto
                netUsageNeeds = Math.max(0, mat.safetyUsage - projectedStockAfterProd);
            }

            // Convertir de unidades de USO a unidades de COMPRA usando el factor de conversión
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

        // Ordenar por cantidad a comprar (los que necesitan compra arriba)
        const sortedPreview = [...previewItems].sort((a, b) => b.quantityToBuy - a.quantityToBuy);
        setExplosionPreview(sortedPreview);
    };

    const handleUpdatePtProduction = (ptId, newValue) => {
        const updatedPts = ptExplosionData.map(pt =>
            pt.ptId === ptId ? { ...pt, manualProduce: newValue } : pt
        );
        setPtExplosionData(updatedPts);
        runBOMExplosion(updatedPts);
    };

    const handleGeneratePOPreviews = () => {
        // 1. Determinar el camino inteligente
        const needsProduction = ptExplosionData.some(pt => pt.manualProduce > 0);
        const needsPurchases = explosionPreview.some(i => i.quantityToBuy > 0);

        if (!needsProduction) {
            // CAMINO A: Producto ya en estantería
            handleAutomaticTransition('Listo para Despacho', '📦 ¡Stock suficiente! Los pedidos han sido movidos directamente a "Listo para Despacho".');
            return;
        }

        if (needsProduction && !needsPurchases) {
            // CAMINO B: Producir con insumos existentes
            handleAutomaticTransition('En Producción', '🏭 Insumos disponibles. Los pedidos han sido movidos directamente a "En Producción".');
            return;
        }

        // CAMINO C: Flujo tradicional de compras
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

        Object.entries(byProvider).forEach(([providerId, mats], idx) => {
            const provider = providers.find(p => p.id === providerId) || { id: providerId, name: 'Proveedor Asignado' };
            const subtotal = mats.reduce((sum, m) => sum + (m.quantityToBuy * m.unitCost), 0);
            const iva = subtotal * 0.19; // IVA del 19%
            const totalOC = subtotal + iva;

            newPurchaseOrders.push({
                id: `(Borrador OC-${idx + 1})`,
                providerId: provider.id,
                providerName: provider.name,
                providerPhone: provider.phone || '3000000000',
                providerEmail: provider.email || 'ventas@proveedor.com',
                date: new Date().toLocaleDateString('en-CA'),
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

    const handleAutomaticTransition = async (newStatus, successMessage) => {
        setIsLoading(true);
        try {
            const selectedDbIds = orders
                .filter(o => selectedOrders.includes(o.id))
                .map(o => o.dbId)
                .filter(Boolean);

            for (const dbId of selectedDbIds) {
                await updateOrder(dbId, { status: newStatus });
            }

            // ── Disparar ODPs Automáticas por Explosión ──
            if (ptExplosionData.length > 0) {
                for (const pt of ptExplosionData) {
                    if (pt.manualProduce > 0) {
                        const odpId = `ODP-REF-${Math.floor(Date.now() / 1000).toString().slice(-4)}`;
                        await saveOdp(pt.label, {
                            odp_number: odpId,
                            qty: pt.manualProduce,
                            status: 'TO_DO',
                            created_at: new Date().toISOString()
                        });
                    }
                }
            }

            await refreshData();
            setSelectedOrders([]);
            setIsExplosionModalOpen(false);
            alert(successMessage);
        } catch (error) {
            console.error(`Error automating transition to ${newStatus}:`, error);
            alert(`No se pudieron actualizar los pedidos.`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendAndSavePOs = async () => {
        setIsLoading(true);
        try {
            // 1. Capture current list and clear state immediately to prevent re-runs
            const listToSave = [...poPreviewList];
            setPoPreviewList([]);
            
            // 2. Map selected orders to their Database IDs
            const selectedDbIds = orders
                .filter(o => selectedOrders.includes(o.id))
                .map(o => o.dbId)
                .filter(Boolean);

            // 3. Persist each Purchase Order - Mandatory Success Check
            let savedCount = 0;
            for (const po of listToSave) {
                const purchaseData = {
                    id: po.id || `OC-ERR-${Date.now()}`,
                    provider_id: po.providerId || 'no-id',
                    provider_name: po.providerName || 'Proveedor Desconocido',
                    status: 'Enviada',
                    payment_status: 'Pendiente',
                    total_amount: Number(po.total) || 0,
                    order_date: po.date || new Date().toLocaleDateString('en-CA'),
                    related_orders: po.relatedOrders || [],
                    items: (po.items || []).map(i => ({
                        id: i.id || 'no-item-id',
                        name: i.name || 'Insumo sin nombre',
                        quantity: Number(i.toBuy) || 0,
                        unit_cost: Number(i.purchasePrice) || 0,
                        unit: i.unit || 'und',
                        total_cost: (Number(i.purchasePrice) || 0) * (Number(i.toBuy) || 0)
                    }))
                };

                const res = await addPurchase(purchaseData);
                if (!res.success) {
                    throw new Error(`Error en Firestore (OC ${po.id}): ${res.error}`);
                }
                savedCount++;
            }

            // 4. Update related orders status ONLY if POs were saved
            for (const dbId of selectedDbIds) {
                await updateOrder(dbId, { status: 'En Compras' });
            }

            // ── Disparar ODPs Automáticas (Estado Programada) ──
            if (ptExplosionData.length > 0) {
                for (const pt of ptExplosionData) {
                    if (pt.manualProduce > 0) {
                        const odpId = "(Programada)"; // Sequential ID handled by Context

                        await saveOdp(pt.label, {
                            odp_number: odpId,
                            qty: pt.manualProduce,
                            status: 'TO_DO',
                            created_at: new Date().toISOString()
                        });
                    }
                }
            }

            // 5. Success Feedback and state reset
            await refreshData();
            setSelectedOrders([]);
            setIsPoModalOpen(false);
            setDownloadedIds([]);
            alert(`¡Éxito! Se han generado ${savedCount} órdenes de compra y los pedidos han pasado a "En Compras".`);

        } catch (e) {
            console.error("Critical error in PO Save cycle:", e);
            alert(`Error crítico: No se pudieron guardar las órdenes de compra. Detalle: ${e.message}`);
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

    const handleDownloadPO = async (po) => {
        const doc = new jsPDF();
        setDownloadedIds(prev => [...new Set([...prev, po.id])]);
        
        // Header Build (Institutional Style)
        doc.setFont('times', 'bold');
        doc.setFontSize(30);
        doc.setTextColor(2, 54, 54);
        doc.text('zeticas', 14, 25);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(ownCompany.name, 14, 32);
        doc.text(`NIT: ${ownCompany.nit}`, 14, 36);
        doc.text(`${ownCompany.city || 'Guasca'}, Colombia`, 14, 40);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(15, 23, 42);
        doc.text('ORDEN DE COMPRA', 196, 25, { align: 'right' });

        doc.setFontSize(14);
        doc.setTextColor(2, 54, 54);
        doc.text(po.id, 196, 33, { align: 'right' });

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Fecha: ${po.date}`, 196, 39, { align: 'right' });

        // Horizontal Rule
        doc.setDrawColor(2, 54, 54);
        doc.setLineWidth(0.8);
        doc.line(14, 48, 196, 48);

        // Merchant / Seller (Zeticas)
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 55, 88, 30, 2, 2, 'F');
        doc.setDrawColor(241, 245, 249);
        doc.roundedRect(14, 55, 88, 30, 2, 2, 'S');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(148, 163, 184);
        doc.text('COMPRADOR / EMISOR', 18, 60);
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text(ownCompany.name, 18, 66);
        doc.setFontSize(8);
        doc.text(`NIT: ${ownCompany.nit}`, 18, 71);
        doc.text(ownCompany.address || '', 18, 76);

        // Provider
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(108, 55, 88, 30, 2, 2, 'F');
        doc.setDrawColor(241, 245, 249);
        doc.roundedRect(108, 55, 88, 30, 2, 2, 'S');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('PROVEEDOR', 112, 60);
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text(po.providerName, 112, 66);
        doc.setFontSize(8);
        doc.text(po.providerPhone || '', 112, 71);
        doc.text(po.providerEmail || '', 112, 76);

        // Items Table
        const tableColumn = ["INSUMO", "CANTIDAD", "UNIDAD", "VALOR UNIT.", "SUBTOTAL"];
        const tableRows = po.items.map(item => [
            item.name,
            item.toBuy.toLocaleString('es-CO'),
            item.unit || 'und',
            `$${Math.round(item.purchasePrice || 0).toLocaleString('es-CO')}`,
            `$${Math.round((item.purchasePrice * item.toBuy) || 0).toLocaleString('es-CO')}`
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
                1: { halign: 'center', cellWidth: 20 },
                2: { halign: 'center', cellWidth: 20 },
                3: { halign: 'right', cellWidth: 30 },
                4: { halign: 'right', cellWidth: 30 }
            },
            margin: { left: 14, right: 14 }
        });

        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.setTextColor(2, 54, 54);
        doc.setFont('helvetica', 'bold');
        const totalText = `TOTAL ORDEN: $${Math.round(po.total).toLocaleString('es-CO')}`;
        doc.text(totalText, 196, finalY, { align: 'right' });

        doc.save(`OC_${po.id}_${po.providerName.replace(/\s+/g, '_')}.pdf`);
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

            {/* TAB SELECTOR - PENDIENTES VS PROCESADOS */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', background: '#F1F5F9', padding: '0.4rem', borderRadius: '14px', width: 'fit-content' }}>
                <button
                    onClick={() => setViewMode('Pending')}
                    style={{
                        padding: '0.7rem 1.8rem',
                        borderRadius: '10px',
                        border: 'none',
                        background: viewMode === 'Pending' ? '#fff' : 'transparent',
                        color: viewMode === 'Pending' ? deepTeal : '#64748b',
                        fontWeight: '800',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        boxShadow: viewMode === 'Pending' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem'
                    }}
                >
                    <AlertCircle size={16} /> 
                    PENDIENTES 
                    <span style={{ 
                        background: viewMode === 'Pending' ? deepTeal : '#cbd5e1', 
                        color: '#fff', 
                        padding: '2px 8px', 
                        borderRadius: '20px', 
                        fontSize: '0.7rem' 
                    }}>
                        {orders.filter(o => (o.status || 'Pendiente').toLowerCase() === 'pendiente').length}
                    </span>
                </button>
                <button
                    onClick={() => setViewMode('Processed')}
                    style={{
                        padding: '0.7rem 1.8rem',
                        borderRadius: '10px',
                        border: 'none',
                        background: viewMode === 'Processed' ? '#fff' : 'transparent',
                        color: viewMode === 'Processed' ? deepTeal : '#64748b',
                        fontWeight: '800',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        boxShadow: viewMode === 'Processed' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem'
                    }}
                >
                    <CheckCircle2 size={16} /> 
                    PROCESADOS / HISTÓRICO
                </button>
            </div>

            {/* UI Actions & Search Toolbar */}
            <div style={{
                display: 'flex',
                flexDirection: window.innerWidth < 1024 ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1.5rem',
                marginBottom: '1.5rem',
                background: glassWhite,
                padding: '1rem 2rem',
                borderRadius: '24px',
                border: '1px solid rgba(2, 83, 87, 0.05)',
                boxShadow: '0 10px 25px rgba(0,0,0,0.01)'
            }}>
                <div style={{ display: 'flex', background: 'rgba(2, 83, 87, 0.05)', padding: '6px', borderRadius: '22px', border: '1px solid rgba(2, 83, 87, 0.08)' }}>
                    {['week', 'month', 'all', 'custom'].map(type => (
                        <button
                            key={type}
                            onClick={() => setTimeRange(type)}
                            style={{
                                padding: '0.6rem 1.4rem', borderRadius: '14px', border: 'none', fontSize: '0.75rem', fontWeight: '950',
                                cursor: 'pointer', background: timeRange === type ? deepTeal : 'transparent',
                                color: timeRange === type ? '#fff' : '#64748b', transition: 'all 0.3s', textTransform: 'uppercase'
                            }}
                        >{type === 'week' ? 'Semana' : type === 'month' ? 'Mes' : type === 'all' ? 'Todos' : 'Rango'}</button>
                    ))}
                </div>

                <div style={{ position: 'relative', flex: 1, px: '1rem' }}>
                    <Search size={20} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Buscar cliente, pedido o producto..."
                        style={{ width: '100%', padding: '0.9rem 1rem 0.9rem 3.5rem', borderRadius: '16px', border: '1px solid #f1f5f9', outline: 'none', fontSize: '0.95rem', fontWeight: '600' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <button onClick={refreshData} style={{ background: '#fff', border: '1px solid #f1f5f9', padding: '12px', borderRadius: '16px', color: deepTeal, cursor: 'pointer' }}>
                        <RefreshCw size={22} className={isLoading ? 'spin' : ''} />
                    </button>
                    <button onClick={() => { 
                        setNewOrder({ client: '', source: 'Clientes', items: [] }); 
                        setClientSearchTerm('');
                        setCitySearch('');
                        setNewClientData({ name: '', nit: '', phone: '', address: '', city: '', email: '', type: 'Natural' });
                        setShowNewClientForm(false);
                        setIsModalOpen(true); 
                    }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 1.5rem', height: '52px', borderRadius: '16px', background: deepTeal, color: '#fff', border: 'none', fontWeight: '950', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <Plus size={20} /> NUEVO PEDIDO
                    </button>
                </div>
            </div>

            {/* Comando de Lote Flotante - Aparece al seleccionar órdenes */}
            <div style={{
                background: institutionOcre,
                padding: '1.2rem 2.5rem',
                borderRadius: '24px',
                display: selectedOrders.length > 0 ? 'flex' : 'none',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: `0 20px 40px ${institutionOcre}30`,
                marginBottom: '2rem',
                animation: 'fadeUp 0.4s ease-out',
                border: '2px solid rgba(255,255,255,0.2)'
            }}>
                <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: '950', color: '#fff', textTransform: 'uppercase', opacity: 0.8, letterSpacing: '1px' }}>Gestión Masiva</span>
                    <div style={{ fontSize: '1.3rem', fontWeight: '950', color: '#fff' }}>{selectedOrders.length} PEDIDOS SELECCIONADOS</div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={handleResetStatus} style={{ padding: '0.8rem 1.5rem', background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', borderRadius: '14px', cursor: 'pointer', fontWeight: '950', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RefreshCw size={16} /> RESETEAR A PENDIENTE
                    </button>
                    <button onClick={handleExplosion} style={{ padding: '0.8rem 1.8rem', background: '#fff', color: institutionOcre, border: 'none', borderRadius: '14px', cursor: 'pointer', fontWeight: '950', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
                        <ArrowRight size={18} /> EXPLOSIONAR MATERIA PRIMA
                    </button>
                    <button onClick={handleBulkDelete} style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '10px', borderRadius: '12px', border: 'none', cursor: 'pointer' }}>
                        <Trash2 size={20} />
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
                                    <td style={{ padding: '1.2rem 1.5rem', fontSize: '0.8rem', color: '#164e63', fontWeight: '900' }}>
                                        #{order.id && order.id.length > 15 ? order.id.slice(-8).toUpperCase() : (order.id || (order.dbId ? order.dbId.slice(-6).toUpperCase() : 'N/A'))}
                                    </td>
                                    <td style={{ padding: '1.2rem 1.5rem' }}>
                                        <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.95rem' }}>{order.client}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '600', marginTop: '2px' }}>
                                            {order.items?.length || 0} SKUs • {order.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0} UNIDADES
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.2rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.75rem', fontWeight: '800', color: '#475569', background: '#f8fafc', padding: '6px 12px', borderRadius: '10px', width: 'fit-content', border: '1px solid #f1f5f9' }}>
                                            {order.source === 'Entrada Manual' ? <PenTool size={14} /> : getSourceIcon(order.source)}
                                            {order.source?.toUpperCase()}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.2rem 1.5rem', fontSize: '0.8rem', color: '#64748b', fontWeight: '700' }}>{order.date}</td>
                                    <td style={{ padding: '1.2rem 1.5rem', textAlign: 'right', fontWeight: '900', color: '#0f172a', fontSize: '1rem' }}>${(order.amount || 0).toLocaleString('es-CO')}</td>
                                    <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                            <span style={{
                                                padding: '6px 14px',
                                                borderRadius: '12px',
                                                fontSize: '0.65rem',
                                                fontWeight: '900',
                                                letterSpacing: '0.5px',
                                                whiteSpace: 'nowrap',
                                                display: 'inline-block',
                                                background:
                                                    order.status === 'Entregado' || order.status === 'Finalizado' || order.status === 'Cobrado' ? 'rgba(22, 163, 74, 0.1)' :
                                                        order.status === 'Pagado' || order.status === 'Pendiente' || order.status === 'En Producción' || order.status === 'En Compras' || order.status === 'PENDIENTE' ? 'rgba(214, 189, 152, 0.15)' : 
                                                            order.status === 'Pendiente de explosión de materiales' ? 'rgba(14, 165, 233, 0.1)' : 'rgba(2, 83, 87, 0.05)',
                                                color:
                                                    order.status === 'Entregado' || order.status === 'Finalizado' || order.status === 'Cobrado' ? '#16a34a' :
                                                        order.status === 'Pagado' || order.status === 'Pendiente' || order.status === 'En Producción' || order.status === 'En Compras' || order.status === 'PENDIENTE' ? '#B8A07E' : 
                                                            order.status === 'Pendiente de explosión de materiales' ? '#0ea5e9' : deepTeal,
                                                border: '1px solid currentColor',
                                                width: '100%',
                                                textAlign: 'center'
                                            }}>
                                                {(order.status || 'PENDIENTE').toUpperCase()}
                                            </span>
                                            {/* Payment status micro-badge */}
                                            {(() => {
                                                const isWebOrder = order.source === 'Pagina WEB';
                                                const isPaid = order.payment_status === 'Pagado' || order.paymentStatus === 'Pagado' || isWebOrder;
                                                const statusLabel = isPaid ? 'PAGADO' : (order.payment_status || order.paymentStatus || 'PENDIENTE').toUpperCase();
                                                
                                                return (
                                                    <span style={{
                                                        fontSize: '0.6rem',
                                                        fontWeight: '950',
                                                        color: isPaid ? '#10b981' : '#f59e0b',
                                                        textTransform: 'uppercase',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '3px'
                                                    }}>
                                                        {isPaid ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                                                        {statusLabel}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
                                            <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(order); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#cbd5e1' }} title="Descargar"><Download size={20} /></button>
                                            {viewMode === 'Pending' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }}
                                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(212, 120, 90, 0.3)' }}
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            )}
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

            {/* Modal for New Order */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '2rem'
                }}>
                    <div style={{
                        background: '#fff',
                        width: '100%',
                        maxWidth: '1100px',
                        maxHeight: '90vh',
                        borderRadius: '40px',
                        boxShadow: '0 30px 60px rgba(0, 0, 0, 0.4)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        animation: 'scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                        position: 'relative'
                    }}>
                        {/* Modal Header */}
                        <div style={{ padding: '1.8rem 2.5rem', borderBottom: '1px solid rgba(2, 83, 87, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F9FBFA' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.4rem', color: deepTeal, fontWeight: '900', textTransform: 'uppercase' }}>CREAR NUEVO PEDIDO</h3>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Configura el despacho para cliente final de forma rápida.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: '50%', padding: '0.6rem', cursor: 'pointer', color: '#cbd5e1', display: 'flex' }}><X size={20} /></button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '2.5rem', overflowY: 'auto', flex: 1 }}>
                            <div style={{
                                display: 'flex',
                                flexDirection: window.innerWidth < 768 ? 'column' : 'row',
                                gap: '3rem'
                            }}>
                                {/* Left side: Order Info & Items */}
                                <div style={{ flex: 1.4 }}>
                                    <div style={{ marginBottom: '2.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.8rem' }}>
                                            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: '900', color: institutionOcre, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Selección de Cliente</label>
                                            {!showNewClientForm && (
                                                <button 
                                                    onClick={() => { setShowNewClientForm(true); setShowClientDropdown(false); }}
                                                    style={{ background: 'transparent', border: 'none', color: deepTeal, fontSize: '0.7rem', fontWeight: '950', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                >
                                                    <Plus size={14} /> + CREAR NUEVO CLIENTE
                                                </button>
                                            )}
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <Users size={18} style={{ position: 'absolute', left: '1rem', top: '1.1rem', color: clientSearchTerm ? deepTeal : '#94a3b8', zIndex: 1 }} />
                                            <input
                                                type="text"
                                                placeholder="Buscar por Nombre, NIT o Teléfono..."
                                                value={clientSearchTerm}
                                                onFocus={() => setShowClientDropdown(true)}
                                                onChange={(e) => {
                                                    setClientSearchTerm(e.target.value);
                                                    setShowClientDropdown(true);
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
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                                                }}
                                            />
                                            {showClientDropdown && (
                                                <div style={{ 
                                                    position: 'absolute', 
                                                    top: '100%', 
                                                    left: 0, 
                                                    right: 0, 
                                                    background: '#fff', 
                                                    borderRadius: '18px', 
                                                    boxShadow: '0 15px 30px rgba(0,0,0,0.15)', 
                                                    zIndex: 100, 
                                                    marginTop: '8px', 
                                                    maxHeight: '450px', 
                                                    overflowY: 'auto',
                                                    border: '1px solid #f1f5f9',
                                                    padding: '12px'
                                                }}>
                                                    {filteredClients.length > 0 ? (
                                                        filteredClients.map(c => (
                                                            <div 
                                                                key={c.id} 
                                                                onClick={() => {
                                                                    setNewOrder({ ...newOrder, client: c.name, clientId: c.id });
                                                                    setClientSearchTerm(c.name);
                                                                    setShowClientDropdown(false);
                                                                }}
                                                                style={{ 
                                                                    padding: '1rem 1.2rem', 
                                                                    cursor: 'pointer', 
                                                                    borderRadius: '16px',
                                                                    transition: 'all 0.2s',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: '0.6rem',
                                                                    marginBottom: '6px',
                                                                    border: '1px solid transparent'
                                                                }}
                                                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#f1f5f9'; }}
                                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                                                            >
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        <div style={{ fontWeight: '900', color: deepTeal, fontSize: '0.9rem', letterSpacing: '-0.3px' }}>{c.name}</div>
                                                                        {c.is_member && (
                                                                            <div style={{ 
                                                                                fontSize: '0.55rem', 
                                                                                fontWeight: '950', 
                                                                                background: 'linear-gradient(135deg, #FFD700 0%, #D4AF37 100%)', 
                                                                                color: '#fff', 
                                                                                padding: '2px 6px', 
                                                                                borderRadius: '6px', 
                                                                                display: 'flex', 
                                                                                alignItems: 'center', 
                                                                                gap: '3px',
                                                                                boxShadow: '0 2px 4px rgba(212, 175, 55, 0.2)'
                                                                            }}>
                                                                                <Sparkles size={8} /> SUSCRIPCIÓN
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div style={{ 
                                                                        display: 'flex', 
                                                                        alignItems: 'center', 
                                                                        gap: '4px', 
                                                                        fontSize: '0.6rem', 
                                                                        fontWeight: '900', 
                                                                        background: `${institutionOcre}15`, 
                                                                        color: institutionOcre, 
                                                                        padding: '2px 8px', 
                                                                        borderRadius: '20px',
                                                                        textTransform: 'uppercase'
                                                                    }}>
                                                                        <MapPin size={10} /> {c.city || 'Bogotá'}
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                                                    {c.nit && (
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#64748b', fontWeight: '800' }}>
                                                                            <Hash size={12} color="#94a3b8" /> 
                                                                            <span style={{ color: '#94a3b8', fontSize: '0.65rem' }}>NIT:</span> {c.nit}
                                                                        </div>
                                                                    )}
                                                                    {c.phone && (
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#64748b', fontWeight: '800' }}>
                                                                            <Phone size={12} color="#94a3b8" />
                                                                            <span style={{ color: '#94a3b8', fontSize: '0.65rem' }}>TEL:</span> {c.phone}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div style={{ padding: '1.2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No se encontraron resultados</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Dynamic New Client Registration Form */}
                                        {showNewClientForm && (
                                            <div style={{ 
                                                marginTop: '1.5rem', 
                                                background: '#f9fbfb', 
                                                padding: '1.5rem', 
                                                borderRadius: '24px', 
                                                border: '1px solid #e0eeef',
                                                animation: 'fadeUp 0.4s ease-out'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                                                    <h4 style={{ margin: 0, fontSize: '0.85rem', color: deepTeal, fontWeight: '900' }}>REGISTRO RÁPIDO</h4>
                                                    <button onClick={handleCancelNewClient} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={16} /></button>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                    <input 
                                                        placeholder="Nombre Completo" 
                                                        value={newClientData.name}
                                                        onChange={(e) => setNewClientData({...newClientData, name: e.target.value})}
                                                        style={{ padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: '700' }}
                                                    />
                                                    <input 
                                                        placeholder="NIT / Cédula" 
                                                        value={newClientData.nit}
                                                        onChange={(e) => setNewClientData({...newClientData, nit: e.target.value})}
                                                        style={{ padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: '700' }}
                                                    />
                                                    <input 
                                                        placeholder="Teléfono" 
                                                        value={newClientData.phone}
                                                        onChange={(e) => setNewClientData({...newClientData, phone: e.target.value})}
                                                        style={{ padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: '700' }}
                                                    />
                                                    {/* Searchable City Select */}
                                                    <div style={{ position: 'relative' }}>
                                                        <input 
                                                            placeholder="Ciudad / Municipio" 
                                                            value={citySearch}
                                                            onFocus={() => setShowCityDropdown(true)}
                                                            onChange={(e) => {
                                                                setCitySearch(e.target.value);
                                                                setShowCityDropdown(true);
                                                            }}
                                                            style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: '700' }}
                                                        />
                                                        {showCityDropdown && filteredCities.length > 0 && (
                                                            <div style={{
                                                                position: 'absolute',
                                                                top: '100%', left: 0, right: 0,
                                                                background: '#fff',
                                                                borderRadius: '12px',
                                                                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                                                                zIndex: 1000,
                                                                marginTop: '4px',
                                                                maxHeight: '200px',
                                                                overflowY: 'auto',
                                                                border: '1px solid #f1f5f9'
                                                            }}>
                                                                {filteredCities.map((c, idx) => (
                                                                    <div 
                                                                        key={idx}
                                                                        onClick={() => {
                                                                            const selection = `${c.city}, ${c.state}`;
                                                                            setNewClientData({ ...newClientData, city: selection });
                                                                            setCitySearch(selection);
                                                                            setShowCityDropdown(false);
                                                                        }}
                                                                        style={{ padding: '0.8rem 1rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', borderBottom: '1px solid #f1f5f9' }}
                                                                        onMouseEnter={(e) => (e.target.style.background = '#f8fafc')}
                                                                        onMouseLeave={(e) => (e.target.style.background = 'transparent')}
                                                                    >
                                                                        {c.city} <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>({c.state})</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <input 
                                                        placeholder="Dirección" 
                                                        value={newClientData.address}
                                                        onChange={(e) => setNewClientData({...newClientData, address: e.target.value})}
                                                        style={{ padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: '700', gridColumn: 'span 2' }}
                                                    />
                                                </div>
                                                <button 
                                                    onClick={handleCreateQuickClient}
                                                    disabled={isLoading || !newClientData.name || !newClientData.nit}
                                                    style={{ 
                                                        width: '100%', 
                                                        marginTop: '1.2rem', 
                                                        padding: '0.9rem', 
                                                        borderRadius: '12px', 
                                                        background: deepTeal, 
                                                        color: '#fff', 
                                                        fontWeight: '900', 
                                                        border: 'none', 
                                                        cursor: (isLoading || !newClientData.name || !newClientData.nit) ? 'not-allowed' : 'pointer',
                                                        opacity: (isLoading || !newClientData.name || !newClientData.nit) ? 0.6 : 1,
                                                        transition: 'all 0.3s'
                                                    }}
                                                >
                                                    {isLoading ? 'Registrando...' : '✓ GUARDAR Y VINCULAR'}
                                                </button>
                                            </div>
                                        )}

                                        {/* Payment Status Toggle / Selector */}
                                        <div style={{ marginTop: '2.5rem' }}>
                                            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: '900', color: institutionOcre, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.8rem' }}>Estado del Pago</label>
                                            <div style={{ display: 'flex', gap: '0.8rem' }}>
                                                {['Pendiente', 'Pagado'].map(status => (
                                                    <button
                                                        key={status}
                                                        onClick={() => {
                                                            setNewOrder({ ...newOrder, payment_status: status });
                                                            if (status === 'Pendiente') setSelectedBankId('');
                                                        }}
                                                        style={{
                                                            flex: 1,
                                                            padding: '0.8rem',
                                                            borderRadius: '14px',
                                                            border: (newOrder.payment_status === status) ? `2px solid ${deepTeal}` : '1px solid #f1f5f9',
                                                            background: (newOrder.payment_status === status) ? `${deepTeal}08` : '#fff',
                                                            color: (newOrder.payment_status === status) ? deepTeal : '#94a3b8',
                                                            fontWeight: '900',
                                                            fontSize: '0.8rem',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '8px'
                                                        }}
                                                    >
                                                        {status === 'Pagado' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                                        {status.toUpperCase()}
                                                    </button>
                                                ))}
                                            </div>

                                            {newOrder.payment_status === 'Pagado' && (
                                                <div style={{ marginTop: '1.5rem', animation: 'fadeUp 0.3s ease-out' }}>
                                                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: '900', color: institutionOcre, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.8rem' }}>Banco de Recepción</label>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.6rem' }}>
                                                        {(banks || []).filter(b => b.type === 'cta de ahorros').map(b => (
                                                            <button
                                                                key={b.id}
                                                                onClick={() => setSelectedBankId(b.id)}
                                                                style={{
                                                                    padding: '0.8rem',
                                                                    borderRadius: '12px',
                                                                    border: (selectedBankId === b.id) ? `2px solid ${deepTeal}` : '1px solid #f1f5f9',
                                                                    background: (selectedBankId === b.id) ? `${deepTeal}08` : '#fcfcfc',
                                                                    color: (selectedBankId === b.id) ? deepTeal : '#64748b',
                                                                    fontWeight: '800',
                                                                    fontSize: '0.7rem',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s',
                                                                    textAlign: 'center'
                                                                }}
                                                            >
                                                                {b.name.toUpperCase()}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Products in the order */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: '900', color: institutionOcre, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.2rem' }}>Resumen del Pedido</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                            {newOrder.items.length > 0 ? newOrder.items.map(item => (
                                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '1.2rem', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: '850', fontSize: '0.9rem', color: '#1e293b' }}>{item.name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Precio: <span style={{ color: deepTeal }}>${(item.price || 0).toLocaleString()}</span></div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9', padding: '4px' }}>
                                                            <button onClick={() => handleUpdateQuantity(item.id, -1)} style={{ border: 'none', background: 'transparent', padding: '4px 12px', cursor: 'pointer', color: '#64748b', fontWeight: '900' }}>-</button>
                                                            <span style={{ fontSize: '0.85rem', fontWeight: '900', color: deepTeal, minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                                                            <button onClick={() => handleUpdateQuantity(item.id, 1)} style={{ border: 'none', background: 'transparent', padding: '4px 12px', cursor: 'pointer', color: '#64748b', fontWeight: '900' }}>+</button>
                                                        </div>
                                                        <div style={{ fontWeight: '900', width: '90px', textAlign: 'right', color: '#0f172a' }}>${((item.price || 0) * (item.quantity || 0)).toLocaleString()}</div>
                                                        <button
                                                            onClick={() => handleRemoveItem(item.id)}
                                                            style={{ border: 'none', background: 'transparent', color: 'rgba(212, 120, 90, 0.4)', cursor: 'pointer' }}
                                                        ><Trash2 size={18} /></button>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div style={{ textAlign: 'center', padding: '3rem 2rem', background: '#fcfcfc', border: '2px dashed #f1f5f9', borderRadius: '20px', color: '#cbd5e1' }}>
                                                    <ShoppingCart size={40} style={{ opacity: 0.3, marginBottom: '0.8rem' }} />
                                                    <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>Selector de productos inteligente</div>
                                                </div>
                                            )}
                                            {newOrder.items.length > 0 && (
                                                <div style={{ marginTop: '1.5rem', borderTop: '2px dashed #f1f5f9', paddingTop: '1.5rem', textAlign: 'right' }}>
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '900', textTransform: 'uppercase' }}>Total con IVA</div>
                                                    <div style={{ fontSize: '2.5rem', fontWeight: '900', color: deepTeal, marginTop: '0.2rem' }}>
                                                        ${(newOrder.items.reduce((sum, i) => sum + (i.price * i.quantity), 0)).toLocaleString()}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right side: Product Catalog Search */}
                                <div style={{ flex: 1, borderLeft: '1px solid #f1f5f9', paddingLeft: '2.5rem', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ marginBottom: '1.2rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: '900', color: institutionOcre, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.8rem' }}>Catálogo de Productos</label>
                                        <div style={{ position: 'relative' }}>
                                            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1' }} />
                                            <input
                                                type="text"
                                                placeholder="Buscar SKU o nombre..."
                                                value={productSearchTerm}
                                                onChange={(e) => setProductSearchTerm(e.target.value)}
                                                style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.8rem', borderRadius: '14px', border: '1px solid #f1f5f9', outline: 'none', fontSize: '0.85rem', fontWeight: '700' }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ 
                                        flex: 1, 
                                        overflowY: 'auto', 
                                        paddingRight: '0.5rem',
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                                        gap: '0.8rem',
                                        maxHeight: '400px'
                                    }}>
                                        {filteredCatalog.map(product => (
                                            <div 
                                                key={product.id}
                                                onClick={() => handleAddProductToOrder(product)}
                                                style={{ 
                                                    background: '#fff', 
                                                    padding: '1rem', 
                                                    borderRadius: '16px', 
                                                    border: '1px solid #f1f5f9', 
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.01)',
                                                    textAlign: 'center'
                                                }}
                                                className="product-card-hover"
                                            >
                                                <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.5rem' }}>{product.name}</div>
                                                <div style={{ fontSize: '0.75rem', fontWeight: '900', color: deepTeal }}>${(product.price || 0).toLocaleString()}</div>
                                                <div style={{ marginTop: '0.8rem', fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Click para añadir</div>
                                            </div>
                                        ))}
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
                                <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: '950' }}>
                                    <FileText size={24} color={deepTeal} />
                                    Órdenes de Compra a Generar
                                </h3>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <div style={{ background: '#fef3c7', color: '#92400e', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '900', border: '1px solid #fde68a' }}>
                                        PASO 1: Descargar cada PDF 📥
                                    </div>
                                    <div style={{ background: '#dcfce7', color: '#166534', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '900', border: '1px solid #bbf7d0' }}>
                                        PASO 2: Enviar por WhatsApp / Correo 📨
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setIsPoModalOpen(false)} style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', color: '#64748b', display: 'flex' }}><X size={20} /></button>
                        </div>

                        <div style={{ padding: '2rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {poPreviewList.map(po => {
                                const isDownloaded = downloadedIds.includes(po.id);
                                return (
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
                                                label: isDownloaded ? 'Descargada ✓' : 'Descargar',
                                                icon: isDownloaded ? <CheckCircle2 size={18} /> : <Download size={18} />,
                                                onClick: () => handleDownloadPO(po),
                                                background: isDownloaded ? '#10b981' : '#D4785A'
                                            },
                                            {
                                                label: 'WhatsApp',
                                                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.052 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>,
                                                onClick: () => handleSendWhatsApp(po),
                                                background: '#10b981'
                                            },
                                            {
                                                label: 'Correo',
                                                icon: <Mail size={18} />,
                                                onClick: () => handleSendEmail(po),
                                                background: '#0f172a'
                                            },
                                            {
                                                label: 'Eliminar',
                                                icon: <Trash2 size={18} />,
                                                onClick: () => {
                                                    if (window.confirm('¿Eliminar esta OC?')) {
                                                        setPoPreviewList(prev => prev.filter(p => p.id !== po.id));
                                                    }
                                                },
                                                background: '#f87171'
                                            }
                                        ]}
                                    />
                                );
                            })}
                        </div>

                        <div style={{ padding: '1.5rem 2rem', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '1rem', boxShadow: '0 -4px 10px rgba(0,0,0,0.02)' }}>
                            <button
                                onClick={() => setIsPoModalOpen(false)}
                                style={{ padding: '0.8rem 2rem', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                Atrás
                            </button>
                            {(() => {
                                const allDownloaded = poPreviewList.length > 0 && poPreviewList.every(po => downloadedIds.includes(po.id));
                                return (
                                    <button
                                        onClick={handleSendAndSavePOs}
                                        disabled={!allDownloaded || isLoading}
                                        style={{ 
                                            padding: '0.8rem 2.5rem', 
                                            background: (allDownloaded && !isLoading) ? deepTeal : '#cbd5e1', 
                                            color: '#fff', 
                                            border: 'none', 
                                            borderRadius: '12px', 
                                            fontWeight: 'bold', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '0.5rem', 
                                            cursor: (allDownloaded && !isLoading) ? 'pointer' : 'not-allowed',
                                            boxShadow: (allDownloaded && !isLoading) ? '0 4px 12px rgba(26,54,54,0.3)' : 'none',
                                            transition: 'all 0.3s ease',
                                            opacity: isLoading ? 0.7 : 1
                                        }}
                                    >
                                        {isLoading ? <RefreshCw size={18} className="spin" /> : <CheckCircle2 size={18} />}
                                        {isLoading ? 'Guardando...' : 'Confirmar y Enviar de Definitivo'}
                                    </button>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* Viewing/Editing Specific Order Modal */}
            {viewingOrder && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '2rem' }}>
                    <div style={{ background: '#fff', width: '100%', maxWidth: '800px', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                        <div style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                <FileText size={28} color={deepTeal} />
                                <div>
                                    <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', fontWeight: '950' }}>#{viewingOrder.order_number || viewingOrder.id} - {viewingOrder.client}</h3>
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

                            <div style={{ marginBottom: '2rem', padding: '1.2rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                <div style={{ background: '#fff', padding: '0.6rem', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                    <Tags size={20} color={deepTeal} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Orden de Compra / Referencia Cliente</label>
                                    <input 
                                        type="text" 
                                        value={viewingOrder.purchase_order || ''} 
                                        onChange={(e) => setViewingOrder({ ...viewingOrder, purchase_order: e.target.value.toUpperCase() })}
                                        placeholder="Ingrese el número de OC del cliente..."
                                        style={{ width: '100%', background: 'transparent', border: 'none', padding: '4px 0', fontSize: '1rem', fontWeight: '900', color: deepTeal, outline: 'none' }}
                                    />
                                </div>
                                {viewingOrder.purchase_order && (
                                    <div style={{ fontSize: '0.7rem', fontWeight: '900', color: '#10b981', background: '#f0fdf4', padding: '4px 8px', borderRadius: '6px' }}>VINCULADA</div>
                                )}
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



            {/* Explosion Preview Modal — Dashboard & Sorting Unified */}
            {isExplosionModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '2rem' }}>
                    <div style={{ background: '#fff', width: '100%', maxWidth: '1000px', maxHeight: '90vh', borderRadius: '32px', boxShadow: '0 30px 60px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                        <div style={{ padding: '1.5rem 2.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff9f2' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#b45309', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <ChefHat size={24} /> EXPLOSIÓN DE MATERIAS PRIMAS (BOM)
                                </h3>
                                
                                {/* SKU KPI Dashboard */}
                                <div style={{ display: 'flex', gap: '0.8rem', background: '#fff', padding: '0.5rem 1.2rem', borderRadius: '12px', border: '1px solid #fed7aa' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.6rem', fontWeight: '950', color: '#64748b', textTransform: 'uppercase' }}>Total SKUs</div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: '950', color: '#025357' }}>{explosionPreview.length}</div>
                                    </div>
                                    <div style={{ width: '1px', background: '#fed7aa', margin: '0 4px' }} />
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.6rem', fontWeight: '950', color: '#10b981', textTransform: 'uppercase' }}>En Inventario</div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: '950', color: '#10b981' }}>{explosionPreview.filter(i => i.quantityToBuy === 0).length}</div>
                                    </div>
                                    <div style={{ width: '1px', background: '#fed7aa', margin: '0 4px' }} />
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.6rem', fontWeight: '950', color: '#fca5a5', textTransform: 'uppercase' }}>Por Comprar</div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: '950', color: '#e11d48' }}>{explosionPreview.filter(i => i.quantityToBuy > 0).length}</div>
                                    </div>
                                </div>

                                {/* Provider Assignment Progress (Summary) */}
                                {(() => {
                                    const itemsToBuy = explosionPreview.filter(i => i.quantityToBuy > 0);
                                    const totalToAssign = itemsToBuy.length;
                                    const assigned = itemsToBuy.filter(i => i.providerId).length;
                                    const progress = totalToAssign > 0 ? (assigned / totalToAssign) * 100 : 0;

                                    if (totalToAssign === 0) return null;

                                    return (
                                        <div style={{ flex: 1, maxWidth: '280px', marginLeft: '2rem', animation: 'fadeIn 0.5s ease-out' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'baseline' }}>
                                                <span style={{ fontSize: '0.65rem', fontWeight: '950', color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Asignación de Proveedores</span>
                                                <span style={{ fontSize: '0.75rem', fontWeight: '950', color: progress === 100 ? '#10b981' : '#b45309' }}>{assigned}/{totalToAssign}</span>
                                            </div>
                                            <div style={{ width: '100%', height: '8px', background: '#fff', borderRadius: '10px', border: '1px solid #fed7aa', overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}>
                                                <div style={{ 
                                                    width: `${progress}%`, 
                                                    height: '100%', 
                                                    background: progress === 100 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #D4785A, #b45309)',
                                                    transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)',
                                                    boxShadow: '0 0 10px rgba(180, 83, 9, 0.2)'
                                                }} />
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                            <button onClick={() => setIsExplosionModalOpen(false)} style={{ background: '#fff', border: '1px solid #fed7aa', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer', color: '#b45309' }}><X size={20} /></button>
                        </div>
                        <div style={{ padding: '2rem', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
                            {/* PT Requirement Adjustments */}
                            <div style={{ marginBottom: '2rem', background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                                <div style={{ padding: '1rem 1.5rem', background: '#fff7ed', borderBottom: '1px solid #fed7aa', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                    <div style={{ color: '#b45309' }}><ShoppingCart size={18} /></div>
                                    <h4 style={{ margin: 0, color: '#9a3412', fontSize: '0.9rem', fontWeight: '900' }}>PRODUCTOS A FABRICAR</h4>
                                </div>
                                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {ptExplosionData.map(pt => (
                                        <div key={pt.ptId} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px dashed #e2e8f0' }}>
                                            <div>
                                                <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '1rem' }}>{pt.label}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>
                                                    Demanda: {pt.totalDemand} | Stock Actual: {pt.inventoryPT} | Stock de Seguridad: {pt.safety}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                                <label style={{ fontSize: '0.65rem', fontWeight: '900', color: '#025357' }}>PRODUCCIÓN AJUSTADA</label>
                                                <input
                                                    type="number"
                                                    value={pt.manualProduce}
                                                    onChange={(e) => handleUpdatePtProduction(pt.ptId, Number(e.target.value))}
                                                    style={{ width: '100px', padding: '0.6rem', borderRadius: '10px', border: '2px solid #e2e8f0', textAlign: 'center', fontWeight: '900', fontSize: '1rem', outline: 'none' }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>Detalle de Materias Primas Requeridas (Escalado)</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                {explosionPreview.map(item => (
                                    <div key={item.id} style={{ background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.01)' }}>
                                        <div 
                                            onClick={() => setExpandedExplosionItem(expandedExplosionItem === item.id ? null : item.id)}
                                            style={{ padding: '1.2rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ 
                                                    background: (item.providerId || item.quantityToBuy === 0) ? 'rgba(16, 185, 129, 0.1)' : 'rgba(212, 120, 90, 0.1)', 
                                                    color: (item.providerId || item.quantityToBuy === 0) ? '#10b981' : '#b45309', 
                                                    padding: '0.8rem', 
                                                    borderRadius: '14px',
                                                    transition: 'all 0.3sease'
                                                }}>
                                                    {item.quantityToBuy === 0 ? <CheckCircle2 size={20} /> : <ShoppingCart size={20} />}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '900', color: '#1e293b' }}>{item.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>
                                                        Requerido: {item.requiredQtyUsage.toFixed(2)} {item.unitUse} | 
                                                        Stock Actual: {item.currentInv.toFixed(2)} {item.unitUse} | 
                                                        Stock de Seguridad: {item.safety} {item.unitUse} | 
                                                        Neto a Comprar: <span style={{ color: (item.providerId || item.quantityToBuy === 0) ? '#10b981' : '#b45309', fontWeight: '900' }}>
                                                            {item.quantityToBuy} {item.unit}
                                                            {item.providerId && " ✓"}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Visual Stock Fulfillment Bar */}
                                                    <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '10px', marginTop: '10px', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
                                                        <div style={{ 
                                                            width: `${Math.min(100, (item.currentInv / (item.requiredQtyUsage || 1)) * 100)}%`, 
                                                            height: '100%', 
                                                            background: item.currentInv >= item.requiredQtyUsage ? '#10b981' : (item.currentInv > 0 ? '#f59e0b' : '#ef4444'),
                                                            transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                                                            boxShadow: '0 0 10px rgba(0,0,0,0.05)'
                                                        }} />
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                                                        <span style={{ fontSize: '0.55rem', fontWeight: '950', color: item.currentInv >= item.requiredQtyUsage ? '#10b981' : '#94a3b8' }}>
                                                            {Math.round((item.currentInv / (item.requiredQtyUsage || 1)) * 100)}% COBERTURA
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <ChevronDown size={20} style={{ transform: expandedExplosionItem === item.id ? 'rotate(180deg)' : 'none', transition: '0.2s', color: item.providerId ? '#10b981' : '#cbd5e1' }} />
                                        </div>
                                        {expandedExplosionItem === item.id && (
                                            <div style={{ padding: '0 1.5rem 1.5rem', background: '#fcfcfc', borderTop: '1px solid #f8fafc' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Asignar Proveedor</label>
                                                        <select
                                                            value={item.providerId}
                                                            onChange={(e) => handleUpdatePreviewItem(item.id, 'providerId', e.target.value)}
                                                            style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: '700', outline: 'none' }}
                                                        >
                                                            <option value="">Seleccionar proveedor...</option>
                                                            {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.6rem', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Ajustar Cantidad ({item.unit})</label>
                                                        <input
                                                            type="number"
                                                            value={item.quantityToBuy}
                                                            onChange={(e) => handleUpdatePreviewItem(item.id, 'quantityToBuy', Number(e.target.value))}
                                                            style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.9rem', fontWeight: '900', outline: 'none' }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ padding: '1.5rem 2.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: '900', color: '#64748b' }}>Costo Est. Compras: <span style={{ color: '#025357', fontSize: '1.4rem' }}>${explosionPreview.reduce((s, i) => s + (i.quantityToBuy * i.unitCost), 0).toLocaleString()}</span></div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button onClick={() => setIsExplosionModalOpen(false)} style={{ padding: '0.8rem 2rem', borderRadius: '15px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: '900', cursor: 'pointer' }}>Cerrar</button>
                                {(() => {
                                    const needsPurchases = explosionPreview.some(i => i.quantityToBuy > 0);
                                    const itemsToBuy = explosionPreview.filter(i => i.quantityToBuy > 0);
                                    const allAssigned = itemsToBuy.every(i => i.providerId);
                                    const isDisabled = needsPurchases && !allAssigned;

                                    return (
                                        <button 
                                            onClick={handleGeneratePOPreviews} 
                                            disabled={isDisabled}
                                            style={{ 
                                                padding: '0.8rem 2.5rem', 
                                                borderRadius: '15px', 
                                                border: 'none', 
                                                background: isDisabled ? '#cbd5e1' : (needsPurchases ? '#025357' : '#10b981'), 
                                                color: isDisabled ? '#94a3b8' : '#fff', 
                                                fontWeight: '900', 
                                                cursor: isDisabled ? 'not-allowed' : 'pointer', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '10px', 
                                                boxShadow: isDisabled ? 'none' : `0 10px 20px ${needsPurchases ? 'rgba(2, 54, 54, 0.15)' : 'rgba(16, 185, 129, 0.15)'}`,
                                                transition: 'all 0.3s'
                                            }}
                                        >
                                            {needsPurchases ? <Save size={18} /> : <TrendingUp size={18} />}
                                            {needsPurchases ? 'GENERAR ÓRDENES' : 'ENVIAR A PRODUCCIÓN'}
                                        </button>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .table-row-hover:hover { background-color: #f8fafc !important; }
                .btn-premium:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(0, 0, 0, 0.2) !important; transition: all 0.2s; }
                .client-suggestion-item:hover { background-color: rgba(2, 83, 87, 0.05); color: ${deepTeal}; }
            `}</style>
        </div>
    );
};

export default Orders;
