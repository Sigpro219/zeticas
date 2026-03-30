import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit3, Trash2, X, Barcode as BarcodeIcon, RefreshCw, Image } from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import Barcode from 'react-barcode';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

const Products = () => {
    const { items, refreshData, loading, recalculatePTCosts, addItem, updateItem, deleteItem, units } = useBusiness();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('Todos');
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
        cost: '',
        stock: '0',
        unit_measure: 'unidad',
        purchase_unit: '', // New field for Raw Materials
        type: 'PT',
        barcode_text: '',
        description: '',
        benefits: '',
        image_url: '',
        image_url_2: '',
        batch_size: 1,  // Tamaño del lote de producción (frascos por batch)
        published: true // Default to true for new PT products
    });


    const [showUnitManager, setShowUnitManager] = useState(false);
    const [newUnitType, setNewUnitType] = useState('');
    const [unitOptions, setUnitOptions] = useState(() => {
        const saved = localStorage.getItem('zeticas_units');
        if (saved) return JSON.parse(saved);
        return ['unidad', 'kg', 'gr', 'ml', 'lt', 'paquete', 'caja', 'und'];
    });

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
        // Incluir unidades guardadas en Firestore (colección 'units')
        units.forEach(u => { if (u.name) set.add(u.name.toLowerCase().trim()); });
        // Asegurar que el valor actual del form siempre esté disponible
        if (formData.unit_measure) set.add(formData.unit_measure);
        if (formData.purchase_unit) set.add(formData.purchase_unit);
        return Array.from(set).sort();
    }, [unitOptions, units, formData.unit_measure, formData.purchase_unit]);

    const productsList = items.map(i => ({
        id: i.id,
        sku: i.sku,
        name: i.name,
        category: i.category || i.group || 'Otros',
        product_type: i.product_type || 'Insumo',
        price: i.price || 0,
        cost: i.avgCost || 0,
        stock: i.initial || 0,
        unit_measure: i.unit_measure || i.unit || 'unidad',
        purchase_unit: i.purchase_unit || i.unit_measure || i.unit || 'unidad',
        type: i.type === 'product' ? 'PT' : 'MP',
        barcode_text: i.barcode_text || '',
        image_url: i.image_url || '',
        image_url_2: i.image_url_2 || '',
        description: i.description || '',
        benefits: i.benefits || '',
        batch_size: i.batch_size || 1,   // ← tamaño del lote de producción
        published: i.published !== undefined ? i.published : true
    }));



    const filteredProducts = productsList.filter(p => {
        const srch = searchTerm.toLowerCase();
        const matchesSearch = (p.name?.toLowerCase().includes(srch)) ||
            (p.sku?.toLowerCase().includes(srch)) ||
            (p.product_type?.toLowerCase().includes(srch)) ||
            (p.category?.toLowerCase().includes(srch));
        
        const matchesCategory = selectedCategoryFilter === 'Todos' || p.category === selectedCategoryFilter;
        const matchesLine = selectedLineFilter === 'Todos' || p.product_type === selectedLineFilter;
        
        return matchesSearch && matchesCategory && matchesLine;
    });


    const handleOpenModal = (product = null) => {
        setShowUnitManager(false);
        if (product) {
            setEditingProduct(product);
            setFormData({ 
                ...product,
                barcode_text: product.barcode_text || '' 
            });
        } else {
            setEditingProduct(null);
            setFormData({ 
                sku: '', name: '', category: 'Producto Terminado', product_type: 'Sal', price: '', cost: '', stock: '0', unit_measure: 'unidad', purchase_unit: 'unidad', type: 'PT', barcode_text: '', batch_size: 1, published: true
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
                cost: parseFloat(formData.cost) || 0,
                stock: parseInt(formData.stock) || 0,
                unit_measure: formData.unit_measure,
                purchase_unit: formData.category === 'Materia Prima' ? (formData.purchase_unit || formData.unit_measure) : (formData.unit_measure),
                type: formData.category === 'Materia Prima' ? 'MP' : 'PT',
                barcode_text: formData.barcode_text || '',
                image_url: imageUrl,
                image_url_2: imageUrl2,
                description: formData.description || '',
                benefits: formData.benefits || '',
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

    return (
        <div className="products-module" style={{ padding: '0 0.5rem' }}>            {/* ÁREA DE IMPRESIÓN PROFESIONAL (50mm x 25mm Standard) */}
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
                {/* Header and other UI content... */}
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', marginTop: '1rem' }}>
                    <div>
                        <h2 className="font-serif" style={{ fontSize: '1.5rem', color: 'var(--color-primary)', margin: 0 }}>Maestro de SKU / Nube</h2>
                        <p style={{ color: '#666', fontSize: '0.85rem', margin: 0 }}>Gestión centralizada de costos y precios.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: window.innerWidth < 768 ? 'flex-start' : 'flex-end', width: window.innerWidth < 768 ? '100%' : 'auto' }}>
                        {selectedForPrint.length > 0 && (
                            <button 
                                onClick={handlePrintSelected} 
                                style={{ background: '#D4785A', color: '#fff', padding: '0.7rem 1.5rem', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 10px 20px rgba(212, 120, 90, 0.2)', fontSize: '0.8rem' }}
                            >
                                <BarcodeIcon size={18} /> {window.innerWidth < 768 ? 'Imprimir' : `Imprimir ${selectedForPrint.length} Etiquetas`}
                            </button>
                        )}
                        <button onClick={refreshData} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '0.6rem', borderRadius: '12px', cursor: 'pointer', display: 'flex' }}>
                            <RefreshCw size={18} className={loading ? 'spin' : ''} />
                        </button>
                        <button onClick={() => handleOpenModal()} style={{ background: '#023636', color: '#fff', padding: '0.7rem 1.5rem', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 10px 20px rgba(2, 54, 54, 0.15)', whiteSpace: 'nowrap' }}>
                            <Plus size={18} /> {window.innerWidth < 768 ? 'Nuevo' : 'Nuevo SKU'}
                        </button>
                    </div>
                </header>

                <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '25px', marginBottom: '2.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center', boxShadow: '0 15px 35px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, position: 'relative', minWidth: window.innerWidth < 768 ? '100%' : '300px' }}>
                        <Search size={22} style={{ position: 'absolute', left: '1.5rem', top: '50%', transform: 'translateY(-50%)', color: '#023636', opacity: 0.4 }} />
                        <input 
                            placeholder="Buscar SKU, Nombre..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            style={{ width: '100%', padding: '1rem 3rem 1rem 4rem', borderRadius: '20px', border: '1px solid #f1f5f9', outline: 'none', fontSize: '1rem', fontWeight: '500', background: '#f8fafc', transition: 'all 0.3s', boxSizing: 'border-box' }} 
                            onFocus={(e) => { e.target.style.borderColor = '#023636'; e.target.style.background = '#fff'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#f1f5f9'; e.target.style.background = '#f8fafc'; }}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '1.2rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.05)', border: 'none', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}><X size={16} /></button>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginRight: '4px' }}>Tipo:</span>
                        {['Todos', 'Materia Prima', 'Producto Terminado'].map(cat => (
                            <button 
                                key={cat} 
                                onClick={() => setSelectedCategoryFilter(cat)} 
                                style={{ 
                                    padding: '0.6rem 1.2rem', 
                                    borderRadius: '12px', 
                                    border: '1px solid #e2e8f0', 
                                    background: selectedCategoryFilter === cat ? '#023636' : '#fff', 
                                    color: selectedCategoryFilter === cat ? '#fff' : '#64748b', 
                                    fontSize: '0.75rem', 
                                    fontWeight: '900', 
                                    cursor: 'pointer', 
                                    textTransform: 'uppercase', 
                                    transition: 'all 0.3s' 
                                }}
                            >
                                {cat}
                            </button>
                        ))}
                        
                        <div style={{ width: '1px', height: '24px', background: '#e2e8f0', margin: '0 12px' }} />
                        
                        <span style={{ fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginRight: '4px' }}>Línea:</span>
                        {['Todos', 'Sal', 'Dulce'].map(line => (
                            <button 
                                key={line} 
                                onClick={() => setSelectedLineFilter(line)} 
                                style={{ 
                                    padding: '0.6rem 1.2rem', 
                                    borderRadius: '12px', 
                                    border: '1px solid #e2e8f0', 
                                    background: selectedLineFilter === line ? '#D4785A' : '#fff', 
                                    color: selectedLineFilter === line ? '#fff' : '#64748b', 
                                    fontSize: '0.75rem', 
                                    fontWeight: '900', 
                                    cursor: 'pointer', 
                                    textTransform: 'uppercase', 
                                    transition: 'all 0.3s' 
                                }}
                            >
                                {line}
                            </button>
                        ))}
                    </div>

                </div>

                <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#f8fafc' }}>
                                <tr>
                                    <th style={{ padding: '1.2rem', textAlign: 'center', width: '50px' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedForPrint.length === filteredProducts.length && filteredProducts.length > 0} 
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedForPrint(filteredProducts);
                                                else setSelectedForPrint([]);
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    </th>
                                    <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.7rem' }}>SKU</th>
                                    <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.7rem' }}>PRODUCTO</th>
                                    <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.7rem' }}>LÍNEA</th>
                                    <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.7rem' }}>TIPO / CATEGORÍA</th>
                                    <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.7rem' }}>COSTO</th>
                                    <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.7rem' }}>PRECIO VENTA</th>
                                    <th style={{ padding: '1.2rem', textAlign: 'center', fontSize: '0.7rem' }}>ACCIONES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map(p => (
                                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', background: selectedForPrint.find(s => s.id === p.id) ? '#fff7ed' : 'transparent' }}>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={!!selectedForPrint.find(s => s.id === p.id)} 
                                                onChange={() => toggleSelection(p)}
                                                style={{ cursor: 'pointer' }}
                                            />
                                        </td>
                                        <td style={{ padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem' }}>{p.sku}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                {p.image_url ? (
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #eee', background: '#f8f9fa', flexShrink: 0 }}>
                                                        <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    </div>
                                                ) : (
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', border: '1px dashed #ddd', background: '#fcfcfc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <Image size={14} color="#94a3b8" />
                                                    </div>
                                                )}
                                                <div>
                                                    <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                                                    <div style={{ fontSize: '0.7rem', color: '#666' }}>{p.unit_measure}</div>
                                                </div>
                                            </div>
                                        </td>
    
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '900', background: p.product_type === 'Sal' ? '#f1f5f9' : p.product_type === 'Dulce' ? '#fff7ed' : '#f8fafc', color: p.product_type === 'Sal' ? '#475569' : p.product_type === 'Dulce' ? '#c2410c' : '#94a3b8', border: '1px solid currentColor', opacity: p.product_type === 'Insumo' ? 0.3 : 1 }}>{p.product_type}</span>
                                        </td>
                                        <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{p.category}</td>
                                        <td style={{ padding: '1rem', color: '#666' }}>${p.cost?.toLocaleString()}</td>
                                        <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>${p.price?.toLocaleString()}</td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                <button onClick={() => setBarcodeModal({ show: true, product: p })} style={{ padding: '0.4rem', border: '1px solid #eee', background: 'none', cursor: 'pointer' }}><BarcodeIcon size={14} /></button>
                                                <button onClick={() => handleOpenModal(p)} style={{ padding: '0.4rem', border: '1px solid #eee', background: 'none', cursor: 'pointer' }}><Edit3 size={14} /></button>
                                                <button onClick={() => setConfirmModal({ show: true, target: p, title: 'Eliminar SKU', message: '¿Eliminar permanentemente?' })} style={{ padding: '0.4rem', border: '1px solid #fee2e2', background: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {isModalOpen && (
                    <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: window.innerWidth < 768 ? 'flex-start' : 'center', justifyContent: 'center', zIndex: 3000 }}>
                        <div style={{ 
                            background: '#fff', 
                            padding: window.innerWidth < 768 ? '1.5rem' : '2rem', 
                            borderRadius: window.innerWidth < 768 ? '0' : '24px', 
                            width: '100%', 
                            maxWidth: '500px', 
                            height: window.innerWidth < 768 ? '100%' : 'auto',
                            maxHeight: window.innerWidth < 768 ? '100%' : '90vh', 
                            overflowY: 'auto', 
                            position: 'relative' 
                        }}>
                            <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={24} /></button>
                            <h3 style={{ marginBottom: '1.5rem', color: 'var(--color-primary)', fontWeight: '800' }}>{editingProduct ? 'Editar SKU' : 'Nuevo SKU'}</h3>
                            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                
                                {/* 1. CATEGORÍA - PRIMER CAMPO */}
                                <div>
                                    <label style={{ fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', marginBottom: '0.6rem', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>CATEGORÍA</label>
                                    <select 
                                        value={formData.category} 
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value, type: e.target.value === 'Materia Prima' ? 'MP' : 'PT' })} 
                                        style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: '700', color: 'var(--color-primary)', outline: 'none' }}
                                    >
                                        <option value="Producto Terminado">Producto Terminado</option>
                                        <option value="Materia Prima">Materia Prima</option>
                                        <option value="Otros">Otros</option>
                                    </select>
                                </div>

                                {/* 2. Identificación básica */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', marginBottom: '0.6rem', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>SKU / REFERENCIA</label>
                                        <input placeholder="Ej: PT-VINAGRETA" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0', outline: 'none', fontWeight: 'bold' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', marginBottom: '0.6rem', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>NOMBRE DEL PRODUCTO</label>
                                        <input placeholder="Nombre descriptivo" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0', outline: 'none', fontWeight: 'bold' }} />
                                    </div>
                                </div>

                                {/* 3. Valores financieros */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', marginBottom: '0.6rem', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>COSTO / COMPRA</label>
                                        <input type="number" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0', fontWeight: '700' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', marginBottom: '0.6rem', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>PRECIO VENTA</label>
                                        <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0', fontWeight: '700' }} />
                                    </div>
                                </div>

                                {/* 4. UNIDADES DE MEDIDA - Lógica Dual para Materia Prima */}
                                {formData.category === 'Materia Prima' ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', marginBottom: '0.6rem', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>UNIDAD DE COMPRA</label>
                                            <select 
                                                value={formData.purchase_unit || formData.unit_measure} 
                                                onChange={(e) => setFormData({ ...formData, purchase_unit: e.target.value })} 
                                                style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: '2px solid #D4785A', background: '#fff', fontWeight: 'bold' }}
                                            >
                                                {finalUnitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', marginBottom: '0.6rem', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>UNIDAD DE USO / RECETA</label>
                                            <select 
                                                value={formData.unit_measure} 
                                                onChange={(e) => setFormData({ ...formData, unit_measure: e.target.value })} 
                                                style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 'bold' }}
                                            >
                                                {finalUnitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <label style={{ fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', marginBottom: '0.6rem', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>UNIDAD DE MEDIDA</label>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <select value={formData.unit_measure} onChange={(e) => setFormData({ ...formData, unit_measure: e.target.value })} style={{ flex: 1, padding: '1rem', borderRadius: '16px', border: '1px solid #ddd', background: '#fff', fontWeight: 'bold' }}>
                                                {finalUnitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                                            </select>
                                            <button type="button" onClick={() => setShowUnitManager(!showUnitManager)} style={{ padding: '0 1.2rem', borderRadius: '16px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}><Plus size={20} /></button>
                                        </div>
                                    </div>
                                )}

                                {showUnitManager && (
                                    <div style={{ padding: '1.2rem', background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0', animation: 'fadeIn 0.3s' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                            <input placeholder="Nueva unidad" value={newUnitType} onChange={(e) => setNewUnitType(e.target.value)} style={{ flex: 1, padding: '0.6rem', borderRadius: '10px', border: '1px solid #ddd' }} />
                                            <button type="button" onClick={handleAddUnit} style={{ padding: '0.6rem 1.2rem', background: '#023636', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'BOLD', cursor: 'pointer' }}>Añadir</button>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {unitOptions.map(u => (
                                                <div key={u} style={{ padding: '0.4rem 0.8rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                                                    {u}
                                                    <X size={12} style={{ cursor: 'pointer', color: '#ef4444' }} onClick={() => handleRemoveUnit(u)} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 5. Clasificación y Etiquetas */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', marginBottom: '0.6rem', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>LÍNEA DE PRODUCTO</label>
                                        <select value={formData.product_type} onChange={(e) => setFormData({ ...formData, product_type: e.target.value })} style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#fff', fontWeight: '700' }}>
                                            <option value="Sal">Sal</option>
                                            <option value="Dulce">Dulce</option>
                                            <option value="Insumo">Insumo</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', marginBottom: '0.6rem', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>EAN / BARRAS</label>
                                        <input placeholder="Ej: ZT001500" value={formData.barcode_text} onChange={(e) => setFormData({ ...formData, barcode_text: e.target.value })} style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0', outline: 'none' }} />
                                    </div>
                                </div>

                                {/* 6. Campos Pro (Producto Terminado) */}
                                {formData.category === 'Producto Terminado' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

                                        {/* TAMAÑO DEL LOTE */}
                                        <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '16px', border: '1px solid #bbf7d0' }}>
                                            <label style={{ fontSize: '0.65rem', fontWeight: '900', color: '#166534', marginBottom: '0.6rem', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                🧴 Tamaño del Lote (frascos / batch)
                                            </label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={formData.batch_size}
                                                    onChange={(e) => setFormData({ ...formData, batch_size: e.target.value })}
                                                    style={{ width: '100px', padding: '0.8rem', borderRadius: '12px', border: '2px solid #16a34a', fontWeight: '900', fontSize: '1.1rem', textAlign: 'center', outline: 'none', color: '#166534' }}
                                                />
                                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>unidades producidas por lote de producción</span>
                                            </div>
                                        </div>

                                        <div>
                                            <label style={{ fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', marginBottom: '0.6rem', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>DESCRIPCIÓN COMERCIAL (TIENDA)</label>
                                            <textarea 
                                                rows="3"
                                                placeholder="Ej: Mermelada gourmet endulzada con stevia..." 
                                                value={formData.description} 
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                                                style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0', outline: 'none', fontFamily: 'inherit' }} 
                                            />
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', padding: '1rem', borderRadius: '16px', border: '1px solid #bcf0da' }}>
                                            <div>
                                                <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#025357', display: 'block' }}>Publicar en Tienda</span>
                                                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>¿Mostrar este producto en el catálogo digital?</span>
                                            </div>
                                            <div 
                                                onClick={() => setFormData({ ...formData, published: !formData.published })}
                                                style={{ 
                                                    width: '50px', 
                                                    height: '26px', 
                                                    borderRadius: '13px', 
                                                    background: formData.published ? '#10b981' : '#cbd5e1', 
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

                                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                            <label style={{ fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', marginBottom: '0.8rem', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                Galería de Imágenes
                                            </label>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#fff', padding: '0.5rem', borderRadius: '12px', border: '1px solid #eee' }}>
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', border: '1px dashed #cbd5e1', overflow: 'hidden', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {previewUrl || formData.image_url ? <img src={previewUrl || formData.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Image size={18} color="#94a3b8" />}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} id="img-1" />
                                                        <label htmlFor="img-1" style={{ fontSize: '0.55rem', fontWeight: '900', cursor: 'pointer', color: 'var(--color-primary)', textDecoration: 'underline' }}>Principal</label>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#fff', padding: '0.5rem', borderRadius: '12px', border: '1px solid #eee' }}>
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', border: '1px dashed #cbd5e1', overflow: 'hidden', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {previewUrl2 || formData.image_url_2 ? <img src={previewUrl2 || formData.image_url_2} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Image size={18} color="#94a3b8" />}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <input type="file" accept="image/*" onChange={handleFileChange2} style={{ display: 'none' }} id="img-2" />
                                                        <label htmlFor="img-2" style={{ fontSize: '0.55rem', fontWeight: '900', cursor: 'pointer', color: 'var(--color-primary)', textDecoration: 'underline' }}>Secundaria</label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <button type="submit" disabled={isSaving} style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '1.2rem', borderRadius: '16px', fontWeight: '900', cursor: 'pointer', marginTop: '1rem', transition: 'all 0.3s' }}>
                                    {isSaving ? 'Guardando...' : editingProduct ? 'ACTUALIZAR PRODUCTO' : 'REGISTRAR NUEVO SKU'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {barcodeModal.show && (
                    <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
                        <div style={{ background: '#fff', padding: '2.5rem', borderRadius: '24px', maxWidth: '400px', textAlign: 'center', position: 'relative' }}>
                            <button onClick={() => setBarcodeModal({ show: false, product: null })} style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={24} /></button>
                            <h3 style={{ marginBottom: '1.5rem' }}>Generador de Etiqueta Individual</h3>
                            <div style={{ padding: '1rem', border: '2px dashed #e2e8f0', background: '#f8fafc', borderRadius: '16px', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Barcode 
                                    value={barcodeModal.product?.barcode_text || barcodeModal.product?.sku || 'ERROR'} 
                                    format="CODE128"
                                    width={1.5}
                                    height={60}
                                    fontSize={14}
                                    background="#f8fafc"
                                />
                                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>{barcodeModal.product?.name}</div>
                            </div>
                            <button 
                                onClick={() => {
                                    setSelectedForPrint([barcodeModal.product]);
                                    setTimeout(() => window.print(), 100);
                                }} 
                                style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'var(--color-primary)', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            >
                                <BarcodeIcon size={18} /> Imprimir Etiqueta Sola
                            </button>
                        </div>
                    </div>
                )}

                {confirmModal.show && (
                    <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
                        <div style={{ background: '#fff', padding: '2.5rem', borderRadius: '24px', maxWidth: '400px', textAlign: 'center' }}>
                            <div style={{ background: '#fee2e2', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}><Trash2 size={32} color="#ef4444" /></div>
                            <h3>{confirmModal.title}</h3>
                            <p style={{ color: '#64748b', marginBottom: '2rem' }}>{confirmModal.message}</p>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button onClick={() => setConfirmModal({ show: false, target: null })} style={{ flex: 1, padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}>Cancelar</button>
                                <button onClick={executeDeletion} style={{ flex: 1, padding: '1rem', borderRadius: '12px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: '800', cursor: 'pointer' }}>Si, Eliminar</button>
                            </div>
                        </div>
                    </div>
                )}

            </div> {/* Fin no-print */}

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                .print-area { display: none; }

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
            `}</style>
        </div>
    );
};

export default Products;
