import React, { useState, useMemo } from 'react';
import { Package, Plus, Search, Edit3, Trash2, X, Barcode, Save, AlertTriangle, RefreshCw, Upload, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useBusiness } from '../context/BusinessContext';
import * as XLSX from 'xlsx';

const Products = () => {
    const { items, refreshData, loading, recalculatePTCosts } = useBusiness();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ show: false, target: null, title: '', message: '' });
    const [barcodeModal, setBarcodeModal] = useState({ show: false, product: null });
    const [formData, setFormData] = useState({
        sku: '',
        name: '',
        category: 'Sal',
        price: '',
        cost: '',
        stock: '',
        unit_measure: 'unidad',
        type: 'PT'
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
        if (formData.unit_measure) set.add(formData.unit_measure);
        return Array.from(set);
    }, [unitOptions, formData.unit_measure]);



    const productsList = items.map(i => ({
        id: i.id,
        sku: i.sku,
        name: i.name,
        category: i.group || 'Otros',
        price: i.price || 0,
        cost: i.avgCost || 0,
        stock: i.initial || 0,
        unit_measure: i.unit || 'unidad',
        type: i.type === 'product' ? 'PT' : 'MP'
    }));

    const filteredProducts = productsList.filter(p => {
        const matchesSearch = (p.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.sku?.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleOpenModal = (product = null) => {
        setShowUnitManager(false);
        if (product) {
            setEditingProduct(product);
            setFormData({ ...product });
        } else {
            setEditingProduct(null);
            setFormData({ sku: '', name: '', category: 'Sal', price: '', cost: '', stock: '0', unit_measure: 'unidad', type: 'PT' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const data = {
            sku: formData.sku,
            name: formData.name,
            category: formData.category,
            price: parseFloat(formData.price) || 0,
            cost: parseFloat(formData.cost) || 0,
            stock: parseInt(formData.stock) || 0,
            unit_measure: formData.unit_measure,
            type: formData.type
        };

        try {
            if (editingProduct) {
                await supabase.from('products').update(data).eq('id', editingProduct.id);
            } else {
                await supabase.from('products').insert([data]);
            }
            await refreshData();

            // Recalculate PT costs if a Raw Material was updated
            if (data.type === 'MP') {
                await recalculatePTCosts();
            }
            setIsModalOpen(false);
        } catch (err) {
            console.error("Error saving product:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleBulkUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            const wb = XLSX.read(evt.target.result, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws);
            if (!data.length) return;

            const get = (row, terms) => {
                const keys = Object.keys(row);
                for (const t of terms) {
                    const k = keys.find(k => k.trim().toLowerCase().includes(t.toLowerCase()));
                    if (k && row[k] !== undefined) return row[k];
                }
                return null;
            };

            const mapped = data.map(row => {
                const typeStr = String(get(row, ['tipo', 'type', 'clase']) || 'PT').toUpperCase();
                return {
                    sku: String(get(row, ['sku', 'referencia', 'ref', 'código']) || '').trim(),
                    name: String(get(row, ['nombre', 'producto', 'item']) || 'Sin Nombre'),
                    category: String(get(row, ['categoría', 'grupo']) || 'Otros'),
                    price: parseFloat(get(row, ['precio', 'valor venta'])) || 0,
                    cost: parseFloat(get(row, ['costo', 'valor compra', 'costo unitario'])) || 0,
                    stock: parseFloat(get(row, ['stock', 'cantidad inicial', 'inventario'])) || 0,
                    unit_measure: String(get(row, ['unidad', 'medida', 'u.m']) || 'unidad'),
                    type: typeStr.includes('MP') ? 'MP' : 'PT'
                };
            }).filter(p => p.sku && p.name);

            setIsSaving(true);
            try {
                const { error } = await supabase.from('products').insert(mapped);
                if (error) throw error;
                await refreshData();
                alert(`✅ ${mapped.length} productos / SKU importados correctamente desde Excel.`);
            } catch (err) {
                alert('Error al importar: ' + err.message);
            } finally {
                setIsSaving(false);
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = null;
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([
            ['SKU', 'Nombre', 'Categoría', 'Precio Venta', 'Costo Unitario', 'Stock Inicial', 'Unidad de Medida', 'Tipo (PT o MP)'],
            ['PT-HUM-01', 'Hummus de Garbanzo', 'Sal', '21000', '12000', '50', 'frasco', 'PT'],
            ['MP-GAR-01', 'Garbanzo Seco', 'Insumos', '0', '8000', '100', 'kg', 'MP']
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Productos');
        XLSX.writeFile(wb, 'Plantilla_Cargue_Masivo_Productos.xlsx');
    };
    const executeDeletion = async () => {
        try {
            await supabase.from('products').delete().eq('id', confirmModal.target.id);
            await refreshData();
            setConfirmModal({ show: false, target: null, title: '', message: '' });
        } catch (err) {
            console.error("Error deleting product:", err);
            alert("Error al eliminar. Verifique si el producto está en uso.");
        }
    };

    return (
        <div className="products-module" style={{ padding: '0 1rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 className="font-serif" style={{ fontSize: '2.2rem', color: 'var(--color-primary)', margin: 0 }}>Maestro de Productos (Nube)</h2>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>Gestión centralizada de SKU y costos maestros.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <button onClick={refreshData} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '0.6rem', borderRadius: '12px', cursor: 'pointer' }}>
                        <RefreshCw size={18} className={loading ? 'spin' : ''} />
                    </button>
                    {/* Template */}
                    <button onClick={downloadTemplate} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.65rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                        <Download size={15} /> Plantilla
                    </button>
                    {/* Import */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.65rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', margin: 0 }}>
                        <Upload size={15} /> Importar Excel
                        <input type="file" accept=".xlsx,.xls" onChange={handleBulkUpload} style={{ display: 'none' }} />
                    </label>
                    <button onClick={() => handleOpenModal()} style={{ background: 'var(--color-secondary)', color: '#fff', padding: '0.7rem 1.5rem', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Plus size={18} /> Nuevo SKU
                    </button>
                </div>
            </header>

            <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '20px', marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input placeholder="Buscar en la nube..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.8rem', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                </div>
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={{ padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', fontWeight: 'bold' }}>
                    <option value="Todos">Categorías</option>
                    <option value="Sal">Sal</option>
                    <option value="Dulce">Dulce</option>
                    <option value="Insumos">Insumos</option>
                </select>
            </div>

            <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f8fafc' }}>
                        <tr>
                            <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.7rem' }}>SKU</th>
                            <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.7rem' }}>PRODUCTO</th>
                            <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.7rem' }}>CATEGORÍA</th>
                            <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.7rem' }}>COSTO/COMPRA</th>
                            <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.7rem' }}>PRECIO VENTA</th>
                            <th style={{ padding: '1.2rem', textAlign: 'center', fontSize: '0.7rem' }}>ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map(p => (
                            <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '1rem', fontWeight: 'bold', fontSize: '0.85rem' }}>{p.sku}</td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#666' }}>{p.unit_measure}</div>
                                </td>
                                <td style={{ padding: '1rem' }}>{p.category}</td>
                                <td style={{ padding: '1rem', color: '#666' }}>${p.cost?.toLocaleString()}</td>
                                <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>${p.price?.toLocaleString()}</td>
                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                        <button onClick={() => setBarcodeModal({ show: true, product: p })} style={{ padding: '0.4rem', border: '1px solid #eee', background: 'none', cursor: 'pointer' }}><Barcode size={14} /></button>
                                        <button onClick={() => handleOpenModal(p)} style={{ padding: '0.4rem', border: '1px solid #eee', background: 'none', cursor: 'pointer' }}><Edit3 size={14} /></button>
                                        <button onClick={() => setConfirmModal({ show: true, target: p, title: 'Eliminar SKU', message: '¿Eliminar permanentemente?' })} style={{ padding: '0.4rem', border: '1px solid #fee2e2', background: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit/New SKU Modal */}
            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
                    <div style={{ background: '#fff', padding: '2rem', borderRadius: '24px', width: '90%', maxWidth: '500px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
                        <button
                            onClick={() => setIsModalOpen(false)}
                            style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}
                        >
                            <X size={24} />
                        </button>
                        <h3 style={{ marginBottom: '1.5rem' }}>{editingProduct ? 'Editar SKU' : 'Nuevo SKU'}</h3>
                        <form onSubmit={handleSave} style={{ display: 'grid', gap: '1.2rem', marginTop: '1rem' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.4rem', display: 'block' }}>SKU / REFERENCIA</label>
                                <input placeholder="Ej: MP-SAL-01" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', outline: 'none' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.4rem', display: 'block' }}>NOMBRE DEL PRODUCTO</label>
                                <input placeholder="Nombre descriptivo" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', outline: 'none' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.4rem', display: 'block' }}>COSTO/COMPRA</label>
                                    <input placeholder="0" type="number" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', outline: 'none' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.4rem', display: 'block' }}>PRECIO VENTA</label>
                                    <input placeholder="0" type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', outline: 'none' }} />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.4rem', display: 'block' }}>UNIDAD DE MEDIDA</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <select
                                        value={formData.unit_measure}
                                        onChange={(e) => setFormData({ ...formData, unit_measure: e.target.value })}
                                        style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', outline: 'none', background: '#fff' }}
                                    >
                                        {finalUnitOptions.map(u => (
                                            <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setShowUnitManager(!showUnitManager)}
                                        style={{ padding: '0.8rem', borderRadius: '12px', border: '1px solid #ddd', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                        title="Gestionar Unidades"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                                {showUnitManager && (
                                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
                                            <input
                                                placeholder="Nueva unidad..."
                                                value={newUnitType}
                                                onChange={(e) => setNewUnitType(e.target.value)}
                                                style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', fontSize: '0.85rem' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAddUnit}
                                                style={{ padding: '0.5rem 1rem', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                                            >
                                                Agregar
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                            {unitOptions.map(u => (
                                                <div key={u} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#fff', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid #eee', fontSize: '0.75rem' }}>
                                                    {u}
                                                    <X size={12} style={{ cursor: 'pointer', color: '#fca5a5' }} onClick={() => handleRemoveUnit(u)} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button type="submit" disabled={isSaving} style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '1rem', borderRadius: '12px', fontWeight: 'bold', marginTop: '1rem', cursor: 'pointer' }}>
                                {isSaving ? 'Guardando...' : editingProduct ? 'Actualizar Producto' : 'Guardar SKU'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Barcode Modal */}
            {barcodeModal.show && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
                    <div style={{ background: '#fff', padding: '2.5rem', borderRadius: '24px', maxWidth: '400px', textAlign: 'center', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <button onClick={() => setBarcodeModal({ show: false, product: null })} style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={24} /></button>
                        <h3 style={{ marginBottom: '1.5rem', color: 'var(--color-primary)' }}>Generador de Etiquetas</h3>
                        <div style={{ padding: '2rem', border: '2px dashed #e2e8f0', background: '#f8fafc', borderRadius: '16px', marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '3rem', color: '#1A3636', marginBottom: '0.5rem', letterSpacing: '2px' }}>||||||||||</div>
                            <div style={{ fontWeight: '900', fontSize: '1.4rem', color: '#1e293b' }}>{barcodeModal.product?.sku}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem', fontWeight: '500' }}>{barcodeModal.product?.name}</div>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1.5rem' }}>Utiliza esta etiqueta para el control de inventario JIT y despacho.</p>
                        <button
                            onClick={() => window.print()}
                            style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'var(--color-primary)', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                        >
                            <Barcode size={18} /> Imprimir Etiqueta
                        </button>
                    </div>
                </div>
            )}

            {/* Confirm Delete Modal */}
            {confirmModal.show && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
                    <div style={{ background: '#fff', padding: '2.5rem', borderRadius: '24px', maxWidth: '400px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ background: '#fee2e2', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                            <Trash2 size={32} color="#ef4444" />
                        </div>
                        <h3 style={{ marginBottom: '0.5rem', color: '#1e293b', fontSize: '1.5rem' }}>{confirmModal.title}</h3>
                        <p style={{ color: '#64748b', marginBottom: '2rem', lineHeight: '1.5' }}>{confirmModal.message}</p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => setConfirmModal({ show: false, target: null })}
                                style={{ flex: 1, padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: '700', color: '#64748b' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={executeDeletion}
                                style={{ flex: 1, padding: '1rem', borderRadius: '12px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: '800', cursor: 'pointer' }}
                            >
                                Si, Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default Products;
