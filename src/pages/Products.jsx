import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit3, Trash2, X, Barcode as BarcodeIcon, RefreshCw, Image, Box } from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import Barcode from 'react-barcode';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { formatQty, formatPrice } from '../utils/format';

const InlinePriceInput = ({ value, onSave, color }) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const [tempValue, setTempValue] = React.useState(value);

    React.useEffect(() => {
        setTempValue(value);
    }, [value]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            onSave(parseFloat(tempValue) || 0);
            setIsEditing(false);
        } else if (e.key === 'Escape') {
            setTempValue(value);
            setIsEditing(false);
        }
    };

    const handleBlur = () => {
        onSave(parseFloat(tempValue) || 0);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <input
                type="number"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                autoFocus
                style={{
                    width: '90px',
                    padding: '0.3rem 0.6rem',
                    borderRadius: '8px',
                    border: `2px solid ${color || '#023636'}`,
                    outline: 'none',
                    fontWeight: 'bold',
                    color: color || '#023636',
                    textAlign: 'right',
                    fontSize: '0.85rem'
                }}
            />
        );
    }

    return (
        <div 
            onClick={() => setIsEditing(true)}
            style={{ 
                cursor: 'pointer', 
                padding: '4px 8px', 
                borderRadius: '8px',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid transparent'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#cbd5e1';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
            }}
            title="Haga clic para editar"
        >
            <span style={{ fontWeight: 'bold' }}>${formatPrice(value || 0)}</span>
            <Edit3 size={12} style={{ opacity: 0.4, color: '#64748b' }} />
        </div>
    );
};

const Products = () => {
    const { items, refreshData, loading, recalculatePTCosts, addItem, updateItem, deleteItem } = useBusiness();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('Producto Terminado');
    const [selectedLineFilter, setSelectedLineFilter] = useState('Todos');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ show: false, target: null, title: '', message: '' });
    const [barcodeModal, setBarcodeModal] = useState({ show: false, product: null });
    const [selectedForPrint, setSelectedForPrint] = useState([]); // Array of product objects
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedFile2, setSelectedFile2] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [previewUrl2, setPreviewUrl2] = useState('');
    const [directUploadProduct, setDirectUploadProduct] = useState(null);


    const toggleSelection = (product) => {
        if (selectedForPrint.find(p => p.id === product.id)) {
            setSelectedForPrint(selectedForPrint.filter(p => p.id !== product.id));
        } else {
            setSelectedForPrint([...selectedForPrint, product]);
        }
    };

    const handlePrintSelected = () => {
        if (selectedForPrint.length === 0) return;
        window.print();
    };

    const [formData, setFormData] = useState({
        sku: '',
        name: '',
        category: 'Producto Terminado',
        product_type: 'Sal',
        price: '',
        distributor_price: '',
        cost: '',
        stock: '0',
        unit_measure: 'und',
        purchase_unit: 'und',
        conversion_factor: 1, // Nuevo campo para equivalencia
        type: 'PT',
        barcode_text: '',
        description: '',
        benefits: '',
        image_url: '',
        image_url_2: '',
        batch_size: 1,  // Tamaño del lote de producción (frascos por batch)
        min_stock_level: 0, // Política de Stock de Seguridad
        published: true // Default to true for new PT products
    });


    const [showUnitManager, setShowUnitManager] = useState(false);
    const [newUnitType, setNewUnitType] = useState('');
    const [unitOptions, setUnitOptions] = useState(() => {
        return ['atd', 'cja', 'gr', 'kg', 'lb', 'lt', 'ml', 'paq', 'und'];
    });

    const normalizeUnit = (u) => {
        if (!u) return 'und';
        const str = u.toLowerCase().trim();
        if (['unidades', 'unidad', 'und', 'insumo'].includes(str)) return 'und';
        if (['kilogramo', 'kilogramos', 'kg', 'kilos', 'kilo'].includes(str)) return 'kg';
        if (['gramo', 'gramos', 'gr'].includes(str)) return 'gr';
        if (['litro', 'litros', 'lt'].includes(str)) return 'lt';
        if (['mililitro', 'mililitros', 'ml'].includes(str)) return 'ml';
        if (['libra', 'libras', 'lb'].includes(str)) return 'lb';
        if (['paquete', 'paquetes', 'paq'].includes(str)) return 'paq';
        if (['caja', 'cajas', 'cja'].includes(str)) return 'cja';
        if (['atado', 'atados', 'atd'].includes(str)) return 'atd';
        return str;
    };

    const handleAddUnit = () => {
        if (!newUnitType) return;
        const normalized = newUnitType.toLowerCase().trim();
        if (!unitOptions.includes(normalized)) {
            const updated = [...unitOptions, normalized];
            setUnitOptions(updated);
            localStorage.setItem('zeticas_units', JSON.stringify(updated));
            setFormData(prev => ({ ...prev, unit_measure: normalized }));
        }
        setNewUnitType('');
    };

    const handleRemoveUnit = (u) => {
        const updated = unitOptions.filter(opt => opt !== u);
        setUnitOptions(updated);
        localStorage.setItem('zeticas_units', JSON.stringify(updated));
        if (formData.unit_measure === u) {
            setFormData(prev => ({ ...prev, unit_measure: updated[0] || 'unidad' }));
        }
    };

    const finalUnitOptions = useMemo(() => {
        const set = new Set(unitOptions);
        if (formData.unit_measure) set.add(formData.unit_measure);
        if (formData.purchase_unit) set.add(formData.purchase_unit);
        return Array.from(set).sort();
    }, [unitOptions, formData.unit_measure, formData.purchase_unit]);

    const productsList = items.map(i => ({
        id: i.id,
        sku: i.sku,
        name: i.name,
        category: i.category || i.group || 'Otros',
        product_type: i.product_type || 'Kit',
        price: i.price || 0,
        distributor_price: i.distributor_price || 0,
        cost: i.avgCost || 0,
        stock: i.initial || 0,
        unit_measure: i.unit_measure || i.unit || 'unidad',
        purchase_unit: i.purchase_unit || i.unit_measure || i.unit || 'unidad',
        conversion_factor: i.conversion_factor || 1,
        type: i.type === 'product' ? 'PT' : 'MP',
        barcode_text: i.barcode_text || '',
        image_url: i.image_url || '',
        image_url_2: i.image_url_2 || '',
        description: i.description || '',
        benefits: i.benefits || '',
        batch_size: i.batch_size || 1,   // ← tamaño del lote de producción
        min_stock_level: i.min_stock_level || 0, // ← política de stock
        published: i.published !== undefined ? i.published : true,
        components: i.components || [] // Array of { id, qty, name, unit, cost }
    }));



    const filteredProducts = productsList.filter(p => {
        const srch = searchTerm.toLowerCase();
        const matchesSearch = (p.name?.toLowerCase().includes(srch)) ||
            (p.sku?.toLowerCase().includes(srch)) ||
            (p.product_type?.toLowerCase().includes(srch)) ||
            (p.category?.toLowerCase().includes(srch));

        const matchesCategory = p.category === selectedCategoryFilter;
        const matchesLine = selectedLineFilter === 'Todos' || p.product_type === selectedLineFilter;

        return matchesSearch && matchesCategory && matchesLine;
    }).sort((a, b) => {
        const getPriority = (cat) => {
            if (cat === 'Materia Prima') return 1;
            if (cat === 'Producto Terminado') return 2;
            return 3;
        };
        const priorityA = getPriority(a.category);
        const priorityB = getPriority(b.category);
        if (priorityA !== priorityB) return priorityA - priorityB;
        return (a.name || '').localeCompare(b.name || '');
    });


    const handleOpenModal = (product = null) => {
        setShowUnitManager(false);
        if (product) {
            setEditingProduct(product);
            setFormData({
                ...product,
                unit_measure: normalizeUnit(product.unit_measure),
                purchase_unit: normalizeUnit(product.purchase_unit),
                barcode_text: product.barcode_text || '',
                conversion_factor: product.conversion_factor || 1,
                purchase_cost: (parseFloat(product.cost) || 0) * (parseFloat(product.conversion_factor) || 1),
                components: product.components || []
            });
        } else {
            setEditingProduct(null);
            setFormData({
                sku: '', name: '', category: 'Producto Terminado', product_type: 'Sal', price: '', distributor_price: '', cost: '', purchase_cost: '', stock: '0', min_stock_level: 0, unit_measure: 'und', purchase_unit: 'und', conversion_factor: 1, type: 'PT', barcode_text: '', batch_size: 1, published: true, components: []
            });
        }
        setSelectedFile(null);
        setSelectedFile2(null);
        setPreviewUrl('');
        setPreviewUrl2('');
        setIsModalOpen(true);

    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            let imageUrl = formData.image_url || '';
            let imageUrl2 = formData.image_url_2 || '';

            if (selectedFile) {
                const storageRef = ref(storage, `products/${Date.now()}_1_${selectedFile.name}`);
                await uploadBytes(storageRef, selectedFile);
                imageUrl = await getDownloadURL(storageRef);
            }

            if (selectedFile2) {
                const storageRef2 = ref(storage, `products/${Date.now()}_2_${selectedFile2.name}`);
                await uploadBytes(storageRef2, selectedFile2);
                imageUrl2 = await getDownloadURL(storageRef2);
            }


            // Note: Currently only supporting one primary image upload in this UI, 
            // but we could add a second one later if needed. 
            // For now we persist imageUrl2 if it existed or was manually linked.

            const productData = {
                sku: formData.sku,
                name: formData.name,
                category: formData.category,
                product_type: formData.product_type,
                price: parseFloat(formData.price) || 0,
                distributor_price: parseFloat(formData.distributor_price) || 0,
                cost: parseFloat(formData.cost) || 0,
                stock: parseInt(formData.stock) || 0,
                unit_measure: formData.unit_measure,
                purchase_unit: formData.category !== 'Producto Terminado' ? (formData.purchase_unit || formData.unit_measure) : (formData.unit_measure),
                conversion_factor: formData.category !== 'Producto Terminado' ? (parseFloat(formData.conversion_factor) || 1) : 1,
                purchase_cost: formData.category !== 'Producto Terminado' ? ((parseFloat(formData.cost) || 0) * (parseFloat(formData.conversion_factor) || 1)) : (parseFloat(formData.cost) || 0),
                type: formData.category !== 'Producto Terminado' ? 'MP' : 'PT',
                barcode_text: formData.barcode_text || '',
                image_url: imageUrl,
                image_url_2: imageUrl2,
                description: formData.description || '',
                benefits: formData.benefits || '',
                min_stock_level: parseFloat(formData.min_stock_level) || 0,
                components: formData.product_type === 'Kit' ? formData.components : [],
                // Firestore no acepta undefined — solo incluir batch_size en Producto Terminado
                ...(formData.category === 'Producto Terminado' && { batch_size: parseInt(formData.batch_size) || 1 }),
                published: formData.published !== undefined ? formData.published : true
            };


            if (editingProduct) {
                const result = await updateItem(editingProduct.id, productData);
                if (!result?.success) throw new Error(result?.error || 'Error al actualizar el producto');
            } else {
                const result = await addItem(productData);
                if (!result?.success) throw new Error(result?.error || 'Error al crear el producto');
            }

            if (productData.type === 'MP') {
                await recalculatePTCosts();
            }

            setIsModalOpen(false);
            setEditingProduct(null);
            setSelectedFile(null);
            setPreviewUrl('');
            refreshData();
        } catch (error) {
            console.error("Error saving product:", error);
            if (error.code === 'storage/unauthorized' || error.message?.includes('CORS')) {
                alert("Error de permisos (CORS): No se pudo subir la imagen. Por favor configura los permisos de Storage o intenta guardar sin subir una imagen nueva.");
            } else {
                alert("Error al guardar: " + error.message);
            }
        } finally {
            setIsSaving(false);
        }

    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleFileChange2 = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile2(file);
            setPreviewUrl2(URL.createObjectURL(file));
        }
    };


    const executeDeletion = async () => {
        try {
            const res = await deleteItem(confirmModal.target.id);
            if (!res.success) throw new Error(res.error);
            setConfirmModal({ show: false, target: null, title: '', message: '' });
        } catch (err) {
            console.error("Error deleting product:", err);
            alert("Error al eliminar. Verifique si el producto está en uso.");
        }
    };

    const handleTableImageClick = (product) => {
        setDirectUploadProduct(product);
        setTimeout(() => {
            const el = document.getElementById('direct-image-upload');
            if (el) el.click();
        }, 50);
    };

    const handleDirectFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file || !directUploadProduct) return;
        
        setIsSaving(true);
        try {
            const storageRef = ref(storage, `products/${Date.now()}_direct_${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);
            
            const res = await updateItem(directUploadProduct.id, { 
                image_url: downloadUrl,
                // Keep other data consistent
                sku: directUploadProduct.sku,
                name: directUploadProduct.name,
                type: directUploadProduct.type,
                published: directUploadProduct.published
            });
            
            if (res.success) {
                refreshData();
                setDirectUploadProduct(null);
            } else {
                throw new Error(res.error);
            }
        } catch (error) {
            console.error("Direct Upload Error:", error);
            alert("Error al subir imagen directamente: " + error.message);
        } finally {
            setIsSaving(false);
            e.target.value = ''; // Reset input
        }
    };

    const mpCount = productsList.filter(p => p.category === 'Materia Prima').length;
    const ptCount = productsList.filter(p => p.category === 'Producto Terminado').length;

    // --- Component Management Logics ---
    const [compSearch, setCompSearch] = useState('');
    const availableForKit = useMemo(() => {
        if (!compSearch) return [];
        return productsList.filter(p => 
            p.id !== editingProduct?.id && 
            (p.name.toLowerCase().includes(compSearch.toLowerCase()) || p.sku.toLowerCase().includes(compSearch.toLowerCase()))
        ).slice(0, 5);
    }, [compSearch, productsList, editingProduct]);

    const addComponentToKit = (p) => {
        if (formData.components.find(c => c.id === p.id)) return;
        const newComponents = [...formData.components, { 
            id: p.id, 
            name: p.name, 
            qty: 1, 
            unit: p.unit_measure, 
            cost: p.cost 
        }];
        
        // Auto-calculate total cost
        const totalCost = newComponents.reduce((acc, c) => acc + (c.qty * c.cost), 0);
        
        setFormData({ 
            ...formData, 
            components: newComponents,
            cost: totalCost.toFixed(2)
        });
        setCompSearch('');
    };

    const removeComponentFromKit = (id) => {
        const newComponents = formData.components.filter(c => c.id !== id);
        const totalCost = newComponents.reduce((acc, c) => acc + (c.qty * c.cost), 0);
        setFormData({ 
            ...formData, 
            components: newComponents,
            cost: totalCost.toFixed(2)
        });
    };

    const updateComponentQty = (id, newQty) => {
        const newComponents = formData.components.map(c => 
            c.id === id ? { ...c, qty: parseFloat(newQty) || 0 } : c
        );
        const totalCost = newComponents.reduce((acc, c) => acc + (c.qty * c.cost), 0);
        setFormData({ 
            ...formData, 
            components: newComponents,
            cost: totalCost.toFixed(2)
        });
    };

    return (
        <div className="products-module products-container">
            {/* ÁREA DE IMPRESIÓN PROFESIONAL (50mm x 25mm Standard) */}
            <div className="print-area">
                {selectedForPrint.map(p => (
                    <div key={p.id} className="print-label">
                        <div className="label-barcode">
                            <div style={{ width: '46mm', display: 'flex', justifyContent: 'center' }}>
                                <Barcode
                                    value={p.barcode_text || p.sku || 'ERROR'}
                                    format="CODE128"
                                    width={1.4}
                                    height={40}
                                    fontSize={0}
                                    margin={0}
                                    background="#fff"
                                />
                            </div>
                        </div>
                        <div className="label-id">{p.barcode_text || p.sku}</div>
                        <div className="label-name">{p.name}</div>
                    </div>
                ))}
            </div>

            <div className="no-print">
                <header className="products-header">
                    <div>
                        <h2 className="page-title-main">Maestro de SKU / Nube</h2>
                        <p className="page-subtitle">Gestión centralizada de costos y precios.</p>
                    </div>
                    <div className="header-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Compact Stats */}
                        <div className="stats-container">
                            <div className="stat-pill primary">
                                <Box size={14} />
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                    <span className="stat-num">{mpCount}</span>
                                    <span className="stat-label">MP</span>
                                </div>
                            </div>
                            <div className="stat-pill secondary">
                                <BarcodeIcon size={14} />
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                    <span className="stat-num">{ptCount}</span>
                                    <span className="stat-label">PT</span>
                                </div>
                            </div>
                        </div>

                        {selectedForPrint.length > 0 && (
                            <button
                                onClick={handlePrintSelected}
                                className="premium-btn secondary"
                            >
                                <BarcodeIcon size={16} /> 
                                <span>Imprimir ({selectedForPrint.length})</span>
                            </button>
                        )}
                        <button onClick={() => handleOpenModal()} className="premium-btn primary">
                            <Plus size={16} /> 
                            <span>Nuevo SKU</span>
                        </button>
                    </div>
                </header>

                <div className="glass-panel filters-panel">
                    <div className="search-wrapper">
                        <Search size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-primary)', opacity: 0.6 }} />
                        <input
                            placeholder="Buscar SKU, Nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input-field"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.05)', border: 'none', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}><X size={14} /></button>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tipo:</span>
                            <div className="filter-group">
                                {['Materia Prima', 'Producto Terminado'].map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategoryFilter(cat)}
                                        className={`filter-btn primary ${selectedCategoryFilter === cat ? 'active' : ''}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="responsive-divider" style={{ width: '1px', height: '20px', background: 'rgba(229, 231, 235, 0.8)' }} />

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Línea:</span>
                            <div className="filter-group">
                                {['Todos', 'Sal', 'Dulce', 'Kit'].map(line => (
                                    <button
                                        key={line}
                                        onClick={() => setSelectedLineFilter(line)}
                                        className={`filter-btn secondary ${selectedLineFilter === line ? 'active' : ''}`}
                                    >
                                        {line}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="glass-panel table-panel">
                    <div style={{ overflowX: 'auto' }} className="overflow-x-auto">
                        <table className="premium-table">
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'center', width: '60px' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedForPrint.length === filteredProducts.length && filteredProducts.length > 0}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedForPrint(filteredProducts);
                                                else setSelectedForPrint([]);
                                            }}
                                            style={{ cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                                        />
                                    </th>
                                    <th style={{ textAlign: 'left' }}>SKU</th>
                                    <th style={{ textAlign: 'left' }}>Producto</th>
                                    <th style={{ textAlign: 'left' }}>Línea</th>
                                    <th style={{ textAlign: 'left' }}>Categoría</th>
                                    <th style={{ textAlign: 'left' }}>Costo</th>
                                    <th style={{ textAlign: 'left' }}>Precio Venta</th>
                                    <th style={{ textAlign: 'left' }}>Precio Dist.</th>
                                    <th style={{ textAlign: 'center', width: '120px' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map(p => {
                                    const isSelected = !!selectedForPrint.find(s => s.id === p.id);
                                    return (
                                        <tr key={p.id} className={isSelected ? 'selected' : ''}>
                                            <td style={{ textAlign: 'center' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelection(p)}
                                                    style={{ cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                                                />
                                            </td>
                                            <td style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--color-primary)' }}>{p.sku}</td>
                                            <td>
                                                <div 
                                                    onClick={() => p.category !== 'Materia Prima' && handleTableImageClick(p)}
                                                    className={p.category !== 'Materia Prima' ? "table-image-cell" : ""}
                                                    style={{ 
                                                        display: 'flex', 
                                                        gap: '0.75rem', 
                                                        alignItems: 'center', 
                                                        cursor: p.category !== 'Materia Prima' ? 'pointer' : 'default',
                                                        position: 'relative'
                                                     }}
                                                    title={p.category !== 'Materia Prima' ? "Haga clic para subir fotografía" : ""}
                                                >
                                                    {p.category !== 'Materia Prima' && (
                                                        p.image_url ? (
                                                            <div style={{ 
                                                                width: '38px', 
                                                                height: '38px', 
                                                                borderRadius: '10px', 
                                                                overflow: 'hidden', 
                                                                border: `2px solid ${p.published ? 'var(--color-primary)' : 'var(--color-secondary)'}`, 
                                                                background: '#f8fafc', 
                                                                flexShrink: 0, 
                                                                position: 'relative',
                                                                boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                                                                transition: 'transform 0.2s'
                                                            }}>
                                                                <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                <div className="img-overlay" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(2, 83, 87, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                                                                    <Plus size={12} color="#fff" />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div style={{ 
                                                                width: '38px', 
                                                                height: '38px', 
                                                                borderRadius: '10px', 
                                                                border: `2px solid ${p.published ? 'rgba(2, 83, 87, 0.3)' : 'rgba(243, 124, 121, 0.3)'}`, 
                                                                background: '#fafaf9', 
                                                                display: 'flex', 
                                                                alignItems: 'center', 
                                                                justifyContent: 'center', 
                                                                flexShrink: 0, 
                                                                transition: 'all 0.2s',
                                                                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                                                            }}>
                                                                <Image size={14} color="#94a3b8" />
                                                            </div>
                                                        )
                                                    )}
                                                    <div style={{ transition: 'all 0.2s' }}>
                                                        <div style={{ fontWeight: '600', color: 'var(--color-text)' }}>{p.name}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)' }}>{p.unit_measure}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`line-badge ${p.product_type?.toLowerCase()}`}>
                                                    {p.product_type}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>{p.category}</td>
                                            <td style={{ fontWeight: '500', color: 'var(--color-text-light)' }}>${formatPrice(p.cost || 0)}</td>
                                            <td>
                                                {p.category === 'Producto Terminado' ? (
                                                    <InlinePriceInput 
                                                        value={p.price} 
                                                        onSave={async (newVal) => {
                                                            await updateItem(p.id, { price: newVal });
                                                        }}
                                                        color="var(--color-primary)"
                                                    />
                                                ) : (
                                                    <span style={{ color: '#cbd5e1', paddingLeft: '8px' }}>-</span>
                                                )}
                                            </td>
                                            <td>
                                                {p.category === 'Producto Terminado' ? (
                                                    <InlinePriceInput 
                                                        value={p.distributor_price} 
                                                        onSave={async (newVal) => {
                                                            await updateItem(p.id, { distributor_price: newVal });
                                                        }}
                                                        color="var(--color-secondary)"
                                                    />
                                                ) : (
                                                    <span style={{ color: '#cbd5e1', paddingLeft: '8px' }}>-</span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'center' }}>
                                                    <button onClick={() => setBarcodeModal({ show: true, product: p })} className="action-btn-circle" title="Ver código de barras"><BarcodeIcon size={13} /></button>
                                                    <button onClick={() => handleOpenModal(p)} className="action-btn-circle" title="Editar"><Edit3 size={13} /></button>
                                                    <button onClick={() => setConfirmModal({ show: true, target: p, title: 'Eliminar SKU', message: '¿Eliminar permanentemente?' })} className="action-btn-circle delete" title="Eliminar"><Trash2 size={13} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {isModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content-card" style={{ padding: '2rem' }}>
                            <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={24} /></button>
                            <h3 style={{ marginBottom: '1.5rem', color: 'var(--color-primary)', fontWeight: '800', fontFamily: 'var(--font-serif)', fontSize: '1.5rem' }}>{editingProduct ? 'Editar SKU' : 'Nuevo SKU'}</h3>
                            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                                {/* 1. CATEGORÍA - PRIMER CAMPO */}
                                <div className="form-group">
                                    <label className="form-label-premium">Categoría</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value, type: e.target.value === 'Materia Prima' ? 'MP' : 'PT' })}
                                        className="form-select-premium"
                                        style={{ fontWeight: '700', color: 'var(--color-primary)' }}
                                    >
                                        <option value="Producto Terminado">Producto Terminado</option>
                                        <option value="Materia Prima">Materia Prima</option>
                                        <option value="Otros">Otros</option>
                                    </select>
                                </div>

                                {/* 2. Identificación básica */}
                                <div className="responsive-grid-col2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label-premium">SKU / Referencia</label>
                                        <input placeholder="Ej: PT-VINAGRETA" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="form-input-premium" style={{ fontWeight: '700' }} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label-premium">Nombre del Producto</label>
                                        <input placeholder="Nombre descriptivo" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-input-premium" style={{ fontWeight: '700' }} />
                                    </div>
                                </div>

                                {/* FOTOGRAFÍAS - DISPONIBLES SOLO PARA PRODUCTO TERMINADO / OTROS */}
                                {formData.category !== 'Materia Prima' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ background: 'rgba(248, 250, 252, 0.65)', backdropFilter: 'blur(4px)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(229, 231, 235, 0.6)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <div style={{ 
                                                width: '70px', 
                                                height: '70px', 
                                                borderRadius: '12px', 
                                                border: '2px dashed #cbd5e1', 
                                                overflow: 'hidden', 
                                                background: '#fff', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center',
                                                boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
                                                flexShrink: 0
                                            }}>
                                                {previewUrl || formData.image_url ? (
                                                    <img src={previewUrl || formData.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <Image size={20} color="#cbd5e1" />
                                                )}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label className="form-label-premium" style={{ marginBottom: '0.25rem', display: 'block' }}>Fotografía Principal</label>
                                                <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} id="img-main-upload" />
                                                <label 
                                                    htmlFor="img-main-upload" 
                                                    className="premium-btn primary"
                                                    style={{ 
                                                        display: 'inline-block',
                                                        padding: '0.4rem 0.8rem', 
                                                        borderRadius: '8px', 
                                                        fontSize: '0.65rem', 
                                                        fontWeight: '700', 
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    CAMBIAR IMAGEN 1
                                                </label>
                                            </div>
                                        </div>

                                        <div style={{ background: 'rgba(248, 250, 252, 0.65)', backdropFilter: 'blur(4px)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(229, 231, 235, 0.6)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <div style={{ 
                                                width: '70px', 
                                                height: '70px', 
                                                borderRadius: '12px', 
                                                border: '2px dashed #cbd5e1', 
                                                overflow: 'hidden', 
                                                background: '#fff', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center',
                                                boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
                                                flexShrink: 0
                                            }}>
                                                {previewUrl2 || formData.image_url_2 ? (
                                                    <img src={previewUrl2 || formData.image_url_2} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <Image size={20} color="#cbd5e1" />
                                                )}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label className="form-label-premium" style={{ marginBottom: '0.25rem', display: 'block' }}>Fotografía de Referencia / Uso</label>
                                                <input type="file" accept="image/*" onChange={handleFileChange2} style={{ display: 'none' }} id="img-secondary-upload" />
                                                <label 
                                                    htmlFor="img-secondary-upload" 
                                                    className="premium-btn secondary"
                                                    style={{ 
                                                        display: 'inline-block',
                                                        padding: '0.4rem 0.8rem', 
                                                        borderRadius: '8px', 
                                                        fontSize: '0.65rem', 
                                                        fontWeight: '700', 
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    CAMBIAR IMAGEN 2
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {formData.category !== 'Producto Terminado' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        {/* Row 1: Units */}
                                        <div className="responsive-grid-col2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div className="form-group">
                                                <label className="form-label-premium">Unidad de Compra</label>
                                                <select
                                                    value={formData.purchase_unit || formData.unit_measure}
                                                    onChange={(e) => setFormData({ ...formData, purchase_unit: e.target.value })}
                                                    className="form-select-premium"
                                                    style={{ borderColor: 'var(--color-secondary)' }}
                                                >
                                                    {finalUnitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label-premium">Unidad de Uso / Receta</label>
                                                <select
                                                    value={formData.unit_measure}
                                                    onChange={(e) => setFormData({ ...formData, unit_measure: e.target.value })}
                                                    className="form-select-premium"
                                                >
                                                    {finalUnitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Row 2: Costs (Crossed to match units) */}
                                        <div className="responsive-grid-col2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label className="form-label-premium" style={{ color: '#10b981', display: 'block' }}>Costo Total Compra</label>
                                                    <div style={{ fontSize: '0.65rem', color: '#047857', marginBottom: '0.4rem', fontWeight: '600', minHeight: '1rem' }}>
                                                        {`Valor por 1 ${formData.purchase_unit || 'unidad'}`}
                                                    </div>
                                                </div>
                                                <div style={{ position: 'relative', marginTop: 'auto' }}>
                                                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontWeight: '700', color: '#059669', fontSize: '0.875rem' }}>$</span>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        value={formData.purchase_cost}
                                                        onChange={(e) => {
                                                            const newVal = e.target.value;
                                                            const factor = parseFloat(formData.conversion_factor) || 1;
                                                            setFormData({ 
                                                                ...formData, 
                                                                purchase_cost: newVal, 
                                                                cost: newVal ? Number((parseFloat(newVal) / factor).toFixed(4)) : '' 
                                                            });
                                                        }}
                                                        className="form-input-premium"
                                                        style={{
                                                            paddingLeft: '1.75rem',
                                                            background: 'rgba(16, 185, 129, 0.05)',
                                                            borderColor: 'rgba(16, 185, 129, 0.25)',
                                                            color: '#059669',
                                                            fontWeight: '700'
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label className="form-label-premium" style={{ display: 'block' }}>Costo Unitario Receta</label>
                                                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-light)', marginBottom: '0.4rem', fontWeight: '600', minHeight: '1rem' }}>
                                                        {`Valor por 1 ${formData.unit_measure || 'unidad de uso'}`}
                                                    </div>
                                                </div>
                                                <div style={{ position: 'relative', marginTop: 'auto' }}>
                                                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontWeight: '700', color: 'var(--color-text-light)', fontSize: '0.875rem' }}>$</span>
                                                    <input 
                                                        type="number" 
                                                        step="any"
                                                        value={formData.cost} 
                                                        onChange={(e) => {
                                                            const newVal = e.target.value;
                                                            const factor = parseFloat(formData.conversion_factor) || 1;
                                                            setFormData({ 
                                                                ...formData, 
                                                                cost: newVal, 
                                                                purchase_cost: newVal ? Number((parseFloat(newVal) * factor).toFixed(2)) : '' 
                                                            });
                                                        }} 
                                                        className="form-input-premium"
                                                        style={{ paddingLeft: '1.75rem' }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {formData.purchase_unit && formData.unit_measure && formData.purchase_unit !== formData.unit_measure && (
                                            <div style={{ background: 'rgba(243, 124, 121, 0.03)', backdropFilter: 'blur(4px)', padding: '1rem', borderRadius: '14px', border: '1px solid rgba(243, 124, 121, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', animation: 'fadeIn 0.3s' }}>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', lineHeight: '1.4' }}>
                                                    <b style={{ color: 'var(--color-primary)', display: 'block', marginBottom: '2px' }}>EQUIVALENCIA:</b>
                                                    ¿Cuántos <b>{formData.unit_measure}</b> rinde 1 <b>{formData.purchase_unit}</b>?
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.7)', padding: '0.4rem 0.75rem', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid rgba(229, 231, 235, 0.6)' }}>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8' }}>1 {formData.purchase_unit} = </span>
                                                    <input
                                                        type="number"
                                                        min="0.0001"
                                                        step="any"
                                                        value={formData.conversion_factor}
                                                        onChange={(e) => {
                                                            const newFactor = e.target.value;
                                                            const currentCost = parseFloat(formData.cost) || 0;
                                                            setFormData({ 
                                                                ...formData, 
                                                                conversion_factor: newFactor,
                                                                purchase_cost: currentCost ? Number((currentCost * parseFloat(newFactor)).toFixed(2)) : formData.purchase_cost
                                                            });
                                                        }}
                                                        style={{ width: '70px', padding: '0.4rem', borderRadius: '6px', border: '2px solid var(--color-secondary)', fontWeight: '700', textAlign: 'center', color: 'var(--color-primary)', outline: 'none' }}
                                                    />
                                                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--color-primary)' }}>{formData.unit_measure}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        {/* Cost and Unit Row */}
                                        <div className="responsive-grid-col2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label className="form-label-premium" style={{ display: 'block' }}>Costo de Producción</label>
                                                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-light)', marginBottom: '0.4rem', fontWeight: '600', minHeight: '1rem' }}>
                                                        Precio base calculado
                                                    </div>
                                                </div>
                                                <div style={{ position: 'relative', marginTop: 'auto' }}>
                                                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontWeight: '700', color: 'var(--color-text-light)', fontSize: '0.875rem' }}>$</span>
                                                    <input type="number" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} className="form-input-premium" style={{ paddingLeft: '1.75rem' }} />
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label className="form-label-premium" style={{ display: 'block' }}>Unidad de Medida</label>
                                                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-light)', marginBottom: '0.4rem', fontWeight: '600', minHeight: '1rem' }}>
                                                        Presentación comercial
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                                                    <select value={formData.unit_measure} onChange={(e) => setFormData({ ...formData, unit_measure: e.target.value })} className="form-select-premium" style={{ flex: 1 }}>
                                                        {finalUnitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                                                    </select>
                                                    <button type="button" onClick={() => setShowUnitManager(!showUnitManager)} className="action-btn-circle" style={{ width: '42px', height: '42px', borderRadius: '12px' }}><Plus size={18} /></button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Sales and Distributor Prices Row */}
                                        <div className="responsive-grid-col2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label className="form-label-premium" style={{ display: 'block' }}>Precio Venta</label>
                                                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-light)', marginBottom: '0.4rem', fontWeight: '600', minHeight: '1rem' }}>
                                                        Precio final al cliente
                                                    </div>
                                                </div>
                                                <div style={{ position: 'relative', marginTop: 'auto' }}>
                                                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontWeight: '700', color: 'var(--color-text-light)', fontSize: '0.875rem' }}>$</span>
                                                    <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="form-input-premium" style={{ paddingLeft: '1.75rem' }} />
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label className="form-label-premium" style={{ display: 'block' }}>Precio Distribuidor</label>
                                                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-light)', marginBottom: '0.4rem', fontWeight: '600', minHeight: '1rem' }}>
                                                        Precio a distribuidores
                                                    </div>
                                                </div>
                                                <div style={{ position: 'relative', marginTop: 'auto' }}>
                                                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontWeight: '700', color: 'var(--color-text-light)', fontSize: '0.875rem' }}>$</span>
                                                    <input type="number" value={formData.distributor_price} onChange={(e) => setFormData({ ...formData, distributor_price: e.target.value })} className="form-input-premium" style={{ paddingLeft: '1.75rem' }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Stock de Seguridad - Política Centralizada */}
                                <div style={{ background: 'rgba(248, 250, 252, 0.65)', backdropFilter: 'blur(4px)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.18)' }}>
                                    <label className="form-label-premium" style={{ color: '#dc2626', marginBottom: '0.5rem', display: 'block' }}>
                                        🚨 Política de Stock de Seguridad (Mínimo)
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                        <input
                                            type="number"
                                            value={formData.min_stock_level}
                                            onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                                            className="form-input-premium"
                                            style={{ width: '90px', padding: '0.6rem', textAlign: 'center', borderColor: 'rgba(239, 68, 68, 0.25)', color: '#dc2626', fontSize: '1.05rem', fontWeight: '700' }}
                                        />
                                        <span style={{ fontSize: '1rem', fontWeight: '700', color: '#dc2626' }}>{formData.unit_measure}</span>
                                        <div style={{ fontSize: '0.78rem', color: '#991b1b', fontWeight: '500', lineHeight: '1.3', flex: 1, minWidth: '180px' }}>
                                            Nivel crítico donde el sistema activará señales de reposición.
                                        </div>
                                    </div>
                                </div>

                                {showUnitManager && (
                                    <div style={{ padding: '1rem', background: 'rgba(248, 250, 252, 0.65)', backdropFilter: 'blur(4px)', borderRadius: '16px', border: '1px solid rgba(229, 231, 235, 0.6)', animation: 'fadeIn 0.3s' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                            <input placeholder="Nueva unidad" value={newUnitType} onChange={(e) => setNewUnitType(e.target.value)} className="form-input-premium" style={{ flex: 1 }} />
                                            <button type="button" onClick={handleAddUnit} className="premium-btn primary" style={{ padding: '0.5rem 1rem', borderRadius: '10px' }}>Añadir</button>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                                            {unitOptions.map(u => (
                                                <div key={u} style={{ padding: '0.3rem 0.6rem', background: 'rgba(255, 255, 255, 0.7)', border: '1px solid rgba(229, 231, 235, 0.6)', borderRadius: '8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontWeight: '600' }}>
                                                    {u}
                                                    <X size={10} style={{ cursor: 'pointer', color: '#ef4444' }} onClick={() => handleRemoveUnit(u)} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 5.5 COMPOSICIÓN DEL KIT - SOLO SI ES KIT */}
                                {formData.product_type === 'Kit' && (
                                    <div style={{ background: 'rgba(248, 250, 252, 0.6)', backdropFilter: 'blur(4px)', padding: '1.25rem', borderRadius: '20px', border: '1px solid rgba(2, 83, 87, 0.15)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            <label className="form-label-premium" style={{ color: 'var(--color-primary)' }}>🛠️ Composición del Kit</label>
                                            <span style={{ fontSize: '0.6rem', fontWeight: '700', background: 'var(--color-primary)', color: '#fff', padding: '2px 8px', borderRadius: '6px' }}>COSTO AUTO-CALCULADO</span>
                                        </div>

                                        <div style={{ position: 'relative' }}>
                                            <Search size={14} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-primary)', opacity: 0.6 }} />
                                            <input 
                                                placeholder="Buscar producto o insumo para añadir..." 
                                                value={compSearch}
                                                onChange={(e) => setCompSearch(e.target.value)}
                                                className="form-input-premium"
                                                style={{ paddingLeft: '2.25rem' }} 
                                            />
                                            {availableForKit.length > 0 && (
                                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid rgba(229, 231, 235, 0.9)', borderRadius: '12px', boxShadow: '0 10px 25px rgba(2, 83, 87, 0.1)', zIndex: 10, marginTop: '4px', overflow: 'hidden' }}>
                                                    {availableForKit.map(p => (
                                                        <div key={p.id} onClick={() => addComponentToKit(p)} style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid rgba(229, 231, 235, 0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(2, 83, 87, 0.04)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                                            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text)' }}>{p.name} <span style={{ fontSize: '0.65rem', color: 'var(--color-text-light)', fontWeight: 'normal' }}>({p.sku})</span></div>
                                                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-primary)' }}>${p.cost}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                                            {formData.components.length === 0 && (
                                                <div style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--color-text-light)', fontSize: '0.75rem', fontStyle: 'italic', background: 'rgba(255, 255, 255, 0.45)', borderRadius: '10px', border: '1px dashed rgba(2, 83, 87, 0.1)' }}>
                                                    No hay componentes añadidos. Busque arriba para empezar.
                                                </div>
                                            )}
                                            {formData.components.map(c => (
                                                <div key={c.id} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255, 255, 255, 0.75)', padding: '0.5rem 0.75rem', borderRadius: '10px', gap: '0.75rem', border: '1px solid rgba(2, 83, 87, 0.12)', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--color-text)' }}>{c.name}</div>
                                                        <div style={{ fontSize: '0.65rem', color: 'var(--color-text-light)' }}>Costo: ${c.cost} / {c.unit}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                                        <input 
                                                            type="number" 
                                                            value={c.qty} 
                                                            onChange={(e) => updateComponentQty(c.id, e.target.value)}
                                                            style={{ width: '50px', padding: '0.35rem', borderRadius: '6px', border: '1px solid rgba(2, 83, 87, 0.2)', textAlign: 'center', fontWeight: '700', color: 'var(--color-primary)', outline: 'none' }} 
                                                        />
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', width: '25px' }}>{c.unit}</span>
                                                        <button type="button" onClick={() => removeComponentFromKit(c.id)} className="action-btn-circle delete" style={{ width: '28px', height: '28px' }}>
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        
                                        {formData.components.length > 0 && (
                                            <div style={{ marginTop: '0.25rem', borderTop: '1px dashed rgba(2, 83, 87, 0.2)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-primary)' }}>COSTO TOTAL DEL KIT:</span>
                                                <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--color-primary)' }}>${formData.cost}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 5.6 Línea y EAN */}
                                <div className="responsive-grid-col2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label-premium">Línea de Producto</label>
                                        <select value={formData.product_type} onChange={(e) => setFormData({ ...formData, product_type: e.target.value })} className="form-select-premium">
                                            <option value="Sal">Sal</option>
                                            <option value="Dulce">Dulce</option>
                                            <option value="Kit">Kit (Bundle)</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label-premium">EAN / Barras</label>
                                        <input placeholder="Ej: ZT001500" value={formData.barcode_text} onChange={(e) => setFormData({ ...formData, barcode_text: e.target.value })} className="form-input-premium" />
                                    </div>
                                </div>

                                {/* DESCRIPCIÓN Y BENEFICIOS - SOLO PARA PRODUCTO TERMINADO / OTROS */}
                                {formData.category !== 'Materia Prima' && (
                                    <>
                                        <div className="form-group">
                                            <label className="form-label-premium">Descripción Comercial (Tienda)</label>
                                            <textarea
                                                rows="2"
                                                placeholder="Ej: Mermelada gourmet..."
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                className="form-input-premium"
                                                style={{ fontFamily: 'inherit', fontSize: '0.85rem', resize: 'vertical' }}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label-premium">Notas y Beneficios (Tienda)</label>
                                            <textarea
                                                rows="2"
                                                placeholder="Ej: Rico en antioxidantes..."
                                                value={formData.benefits}
                                                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                                                className="form-input-premium"
                                                style={{ fontFamily: 'inherit', fontSize: '0.85rem', resize: 'vertical' }}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* 6. Campos Pro (Producto Terminado) */}
                                {formData.category === 'Producto Terminado' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                                        {/* TAMAÑO DEL LOTE */}
                                        <div style={{ background: 'rgba(248, 250, 252, 0.65)', backdropFilter: 'blur(4px)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(2, 83, 87, 0.15)' }}>
                                            <label className="form-label-premium" style={{ color: 'var(--color-primary)', marginBottom: '0.5rem', display: 'block' }}>
                                                🧴 Tamaño del Lote (frascos / batch)
                                            </label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={formData.batch_size}
                                                    onChange={(e) => setFormData({ ...formData, batch_size: e.target.value })}
                                                    className="form-input-premium"
                                                    style={{ width: '90px', padding: '0.6rem', textAlign: 'center', fontSize: '1.05rem', fontWeight: '700', color: 'var(--color-primary)' }}
                                                />
                                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>unidades producidas por lote de producción</span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(248, 250, 252, 0.65)', backdropFilter: 'blur(4px)', padding: '1rem 1.25rem', borderRadius: '16px', border: '1px solid rgba(2, 83, 87, 0.15)' }}>
                                            <div>
                                                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--color-primary)', display: 'block' }}>Publicar en Tienda</span>
                                                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-light)' }}>¿Mostrar este producto en el catálogo digital?</span>
                                            </div>
                                            <div
                                                onClick={() => setFormData({ ...formData, published: !formData.published })}
                                                style={{
                                                    width: '50px',
                                                    height: '26px',
                                                    borderRadius: '13px',
                                                    background: formData.published ? 'var(--color-primary)' : '#cbd5e1',
                                                    position: 'relative',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.3s ease'
                                                }}
                                            >
                                                <div style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '50%',
                                                    background: '#fff',
                                                    position: 'absolute',
                                                    top: '3px',
                                                    left: formData.published ? '27px' : '3px',
                                                    transition: 'all 0.3s ease',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                }} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <button type="submit" disabled={isSaving} className="premium-btn primary" style={{ width: '100%', padding: '1rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                                    {isSaving ? 'Guardando...' : editingProduct ? 'ACTUALIZAR PRODUCTO' : 'REGISTRAR NUEVO SKU'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {barcodeModal.show && (
                    <div className="modal-overlay">
                        <div className="modal-content-card" style={{ maxWidth: '400px', padding: '2.5rem', textAlign: 'center' }}>
                            <button onClick={() => setBarcodeModal({ show: false, product: null })} style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={24} /></button>
                            <h3 style={{ marginBottom: '1.5rem', fontFamily: 'var(--font-serif)', color: 'var(--color-primary)', fontSize: '1.5rem', fontWeight: '700' }}>Generador de Etiqueta Individual</h3>
                            <div style={{ padding: '1.5rem 1rem', border: '1px dashed rgba(2, 83, 87, 0.3)', background: 'rgba(248, 250, 252, 0.6)', backdropFilter: 'blur(4px)', borderRadius: '16px', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Barcode
                                    value={barcodeModal.product?.barcode_text || barcodeModal.product?.sku || 'ERROR'}
                                    format="CODE128"
                                    width={1.5}
                                    height={60}
                                    fontSize={14}
                                    background="#fafaf9"
                                />
                                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text)', marginTop: '0.75rem' }}>{barcodeModal.product?.name}</div>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedForPrint([barcodeModal.product]);
                                    setTimeout(() => window.print(), 100);
                                }}
                                className="premium-btn primary"
                                style={{ width: '100%', padding: '1rem', justifyContent: 'center' }}
                            >
                                <BarcodeIcon size={18} /> Imprimir Etiqueta Sola
                            </button>
                        </div>
                    </div>
                )}

                {confirmModal.show && (
                    <div className="modal-overlay">
                        <div className="modal-content-card" style={{ maxWidth: '400px', padding: '2.5rem', textAlign: 'center' }}>
                            <div style={{ background: '#fee2e2', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}><Trash2 size={32} color="#ef4444" /></div>
                            <h3 style={{ fontSize: '1.25rem', color: 'var(--color-text)', fontFamily: 'var(--font-sans)', fontWeight: '700' }}>{confirmModal.title}</h3>
                            <p style={{ color: 'var(--color-text-light)', marginBottom: '2rem', fontSize: '0.875rem' }}>{confirmModal.message}</p>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button onClick={() => setConfirmModal({ show: false, target: null })} className="premium-btn" style={{ flex: 1, border: '1px solid rgba(229, 231, 235, 0.8)', background: '#fff', color: 'var(--color-text)', justifyContent: 'center' }}>Cancelar</button>
                                <button onClick={executeDeletion} className="premium-btn" style={{ flex: 1, background: '#ef4444', color: '#fff', fontWeight: '700', justifyContent: 'center' }}>Sí, Eliminar</button>
                            </div>
                        </div>
                    </div>
                )}

            </div> {/* Fin no-print */}

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                .print-area { display: none; }

                /* Zeticas Premium Styling Rules */
                .products-container {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    box-sizing: border-box;
                }

                .products-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 1.25rem;
                }

                /* Stats Pill Indicators */
                .stats-container {
                    display: flex;
                    align-items: center;
                    background: rgba(248, 250, 252, 0.65);
                    backdrop-filter: blur(8px);
                    padding: 0.2rem;
                    border-radius: 14px;
                    border: 1px solid rgba(229, 231, 235, 0.8);
                    gap: 0.25rem;
                }

                .stat-pill {
                    display: flex;
                    align-items: center;
                    padding: 0.35rem 0.75rem;
                    border-radius: 10px;
                    gap: 0.4rem;
                    font-weight: 600;
                    transition: all 0.2s ease;
                    font-size: 0.8rem;
                }

                .stat-pill:hover {
                    transform: translateY(-1px);
                }

                .stat-pill.primary {
                    background: rgba(2, 83, 87, 0.04);
                    border: 1px solid rgba(2, 83, 87, 0.15);
                    color: var(--color-primary);
                }

                .stat-pill.primary:hover {
                    background: rgba(2, 83, 87, 0.08);
                    border-color: rgba(2, 83, 87, 0.3);
                }

                .stat-pill.secondary {
                    background: rgba(243, 124, 121, 0.04);
                    border: 1px solid rgba(243, 124, 121, 0.15);
                    color: var(--color-secondary);
                }

                .stat-pill.secondary:hover {
                    background: rgba(243, 124, 121, 0.08);
                    border-color: rgba(243, 124, 121, 0.3);
                }

                .stat-num {
                    font-size: 0.95rem;
                    font-weight: 800;
                    line-height: 1;
                }

                .stat-label {
                    font-size: 0.58rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    opacity: 0.85;
                    line-height: 1;
                }

                /* Filters Panel styling */
                .filters-panel {
                    display: flex;
                    gap: 1.25rem;
                    padding: 0.75rem 1rem;
                    align-items: center;
                    flex-wrap: wrap;
                    margin-bottom: 1.25rem;
                }

                .search-wrapper {
                    position: relative;
                    flex: 1;
                    min-width: 250px;
                }

                .search-input-field {
                    width: 100%;
                    padding: 0.75rem 1rem 0.75rem 2.5rem;
                    border-radius: 12px;
                    border: 1px solid rgba(229, 231, 235, 0.8);
                    background: #fafaf9;
                    outline: none;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--color-text);
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .search-input-field:focus {
                    border-color: var(--color-primary);
                    background: #fff;
                    box-shadow: 0 0 0 3px rgba(2, 83, 87, 0.06);
                }

                .filter-group {
                    display: flex;
                    align-items: center;
                    background: rgba(229, 231, 235, 0.3);
                    padding: 0.2rem;
                    border-radius: 10px;
                    border: 1px solid rgba(229, 231, 235, 0.4);
                    gap: 2px;
                }

                .filter-btn {
                    padding: 0.35rem 0.65rem;
                    border-radius: 6px;
                    border: none;
                    font-size: 0.7rem;
                    font-weight: 700;
                    cursor: pointer;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .filter-btn.primary {
                    background: transparent;
                    color: var(--color-text-light);
                }

                .filter-btn.primary.active {
                    background: var(--color-primary);
                    color: #fff;
                    box-shadow: 0 2px 6px rgba(2, 83, 87, 0.1);
                }

                .filter-btn.secondary {
                    background: transparent;
                    color: var(--color-text-light);
                }

                .filter-btn.secondary.active {
                    background: var(--color-secondary);
                    color: #fff;
                    box-shadow: 0 2px 6px rgba(243, 124, 121, 0.1);
                }

                .table-panel {
                    border-radius: 16px;
                    overflow: hidden;
                    background: #fff;
                    box-shadow: 0 2px 12px rgba(0,0,0,0.01);
                    border: 1px solid rgba(229, 231, 235, 0.5);
                    margin-bottom: 1.5rem;
                }

                .premium-table {
                    min-width: 800px;
                }

                .premium-table tr.selected td {
                    background-color: rgba(243, 124, 121, 0.02);
                }

                .line-badge {
                    padding: 0.25rem 0.5rem;
                    border-radius: 12px;
                    font-size: 0.68rem;
                    font-weight: 700;
                    letter-spacing: 0.2px;
                    border: 1px solid transparent;
                    text-transform: uppercase;
                    display: inline-block;
                }

                .line-badge.sal {
                    background-color: rgba(2, 83, 87, 0.05);
                    color: var(--color-primary);
                    border-color: rgba(2, 83, 87, 0.1);
                }

                .line-badge.dulce {
                    background-color: rgba(243, 124, 121, 0.05);
                    color: #d45956;
                    border-color: rgba(243, 124, 121, 0.1);
                }

                .line-badge.kit {
                    background-color: rgba(175, 191, 113, 0.06);
                    color: #798544;
                    border-color: rgba(175, 191, 113, 0.12);
                }

                /* Premium Modals Overlay */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(2, 83, 87, 0.35);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 3000;
                    padding: 1rem;
                    animation: fadeInModal 0.2s ease-out;
                }

                @keyframes fadeInModal {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .modal-content-card {
                    background: #fff;
                    border-radius: 24px;
                    width: 100%;
                    max-width: 550px;
                    max-height: 90vh;
                    overflow-y: auto;
                    position: relative;
                    box-shadow: 0 25px 50px -12px rgba(2, 83, 87, 0.2), 
                                0 0 0 1px rgba(2, 83, 87, 0.05);
                    border: 1px solid rgba(255,255,255,0.8);
                    animation: slideUpModal 0.25s cubic-bezier(0.34, 1.3, 0.64, 1);
                }

                @keyframes slideUpModal {
                    from { transform: translateY(15px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                .modal-content-card::-webkit-scrollbar {
                    width: 6px;
                }
                .modal-content-card::-webkit-scrollbar-track {
                    background: transparent;
                }
                .modal-content-card::-webkit-scrollbar-thumb {
                    background: rgba(229, 231, 235, 0.8);
                    border-radius: 3px;
                }
                .modal-content-card::-webkit-scrollbar-thumb:hover {
                    background: rgba(203, 213, 225, 1);
                }

                /* Form Controls */
                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.375rem;
                }

                @media print {
                    @page {
                        size: letter;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        background: #fff !important;
                    }
                    body * { visibility: hidden; }
                    .print-area, .print-area * { visibility: visible; }
                    .print-area { 
                        display: grid; 
                        grid-template-columns: repeat(4, 52mm); 
                        grid-auto-rows: 27mm;
                        gap: 2mm; 
                        position: absolute; 
                        left: 5mm; 
                        top: 10mm; 
                        width: 215mm;
                        background: transparent;
                    }
                    .print-label {
                        width: 50mm;
                        height: 25mm;
                        border: 0.2pt solid #ccc;
                        border-radius: 1.5mm;
                        padding: 1mm;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        background: white !important;
                        overflow: hidden;
                        page-break-inside: avoid;
                    }
                    .label-header {
                        font-family: 'Inter', sans-serif;
                        font-size: 7.5pt;
                        font-weight: 800;
                        text-align: center;
                        text-transform: uppercase;
                        margin-bottom: 0.5mm;
                        white-space: nowrap;
                        width: 100%;
                        overflow: hidden;
                    }
                    .label-barcode {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        padding: 1mm 0;
                        width: 100%;
                        overflow: hidden;
                    }
                    .label-barcode svg {
                        max-width: 100%;
                        height: auto;
                    }
                    .label-id {
                        font-family: 'Inter', sans-serif;
                        font-size: 12pt;
                        font-weight: 900;
                        text-align: center;
                        margin-top: -2mm;
                        letter-spacing: 1px;
                        color: #000;
                    }
                    .label-name {
                        font-family: 'Inter', sans-serif;
                        font-size: 8pt;
                        font-weight: 500;
                        text-align: center;
                        color: #666;
                        margin-top: 0.5mm;
                    }
                    .no-print { display: none !important; }
                }

                /* Responsive utilities */
                @media (max-width: 768px) {
                    .products-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 1.25rem;
                    }
                    .stats-container {
                        width: 100%;
                        justify-content: space-between;
                    }
                    .stat-pill {
                        flex: 1;
                        justify-content: center;
                    }
                    .header-actions {
                        width: 100%;
                        display: flex;
                        gap: 0.5rem;
                    }
                    .header-actions button {
                        flex: 1;
                        justify-content: center;
                    }
                    .modal-content-card {
                        max-height: 100vh;
                        border-radius: 0;
                        height: 100%;
                    }
                    .responsive-grid-col2 {
                        grid-template-columns: 1fr !important;
                    }
                    .responsive-divider {
                        display: none;
                    }
                }

                /* Image Cell Overlay */
                .table-image-cell:hover .img-overlay { opacity: 1 !important; }
                .table-image-cell:hover div:first-child { border-color: var(--color-primary) !important; transform: scale(1.05); }
                .table-image-cell:hover div:last-child div:first-child { color: var(--color-primary); }
            `}</style>
        </div>
    );
};

export default Products;
