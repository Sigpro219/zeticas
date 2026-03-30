import React, { useState, useMemo } from 'react';
import { ChefHat, RefreshCw, Plus, Edit3, Trash2, X, PlusCircle, MinusCircle, Save, AlertTriangle, Search } from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';

// ── Conversión de unidades ──────────────────────────────────────────────
const WEIGHT_UNITS = ['kg', 'gr', 'g', 'lb'];
const VOLUME_UNITS = ['lt', 'ml', 'l'];

// Factores a la unidad mínima: peso → gr, volumen → ml
const TO_BASE = { kg: 1000, gr: 1, g: 1, lb: 453.592, lt: 1000, l: 1000, ml: 1 };
const FROM_BASE = { kg: 1/1000, gr: 1, g: 1, lb: 1/453.592, lt: 1/1000, l: 1/1000, ml: 1 };

/**
 * Convierte `qty` desde `inputUnit` a `targetUnit`.
 * Si las unidades son incompatibles (ej peso vs volumen) devuelve la cantidad sin cambios.
 */
const convertQty = (qty, inputUnit, targetUnit) => {
    const n = Number(qty) || 0;
    const src = (inputUnit || '').toLowerCase();
    const tgt = (targetUnit || '').toLowerCase();
    if (!src || !tgt || src === tgt) return n;

    const srcIsWeight = WEIGHT_UNITS.includes(src);
    const tgtIsWeight = WEIGHT_UNITS.includes(tgt);
    const srcIsVol = VOLUME_UNITS.includes(src);
    const tgtIsVol = VOLUME_UNITS.includes(tgt);

    if ((srcIsWeight && tgtIsWeight) || (srcIsVol && tgtIsVol)) {
        const base = n * (TO_BASE[src] || 1);
        return Math.round(base * (FROM_BASE[tgt] || 1) * 1e6) / 1e6;
    }
    return n; // familias distintas → sin conversión
};
// ──────────────────────────────────────────────────────────────

const Recipes = () => {
    const { items, recipes, recalculatePTCosts, addRecipe, deleteRecipeByProduct, units } = useBusiness();
    
    // Split items into PTs and Materials
    const pts = useMemo(() => items.filter(i => i.category === 'Producto Terminado'), [items]);
    // Ingredients can be anything EXCEPT Finished Goods (to avoid circular references)
    const materials = useMemo(() => items.filter(i => i.category !== 'Producto Terminado'), [items]);

    const recipesList = useMemo(() => {
        return pts.map(pt => ({
            id: pt.id,
            name: pt.name,
            batch_size: pt.batch_size || 1,  // tamaño del lote desde el SKU
            yield: 'Batch Producción',
            ingredients: recipes[pt.id] || []
        }));
    }, [pts, recipes]);

    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [doubleConfirm, setDoubleConfirm] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecipe, setEditingRecipe] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ show: false, targetId: null, title: '', message: '' });
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        id: '', // finished_good_id
        name: '',
        yield: 'Batch Producción',
        yield_qty: 1, // Number of units produced
        ingredients: [{ rm_id: '', name: '', qty: '', unit: '' }]
    });

    // loadData removed as it's now handled by useMemo and context subscriptions
    const loading = false; // BusinessContext handles loading externally if needed, but here we can assume it's live

    const filteredRecipes = useMemo(() => {
        if (!searchTerm) return recipesList;
        const q = searchTerm.toLowerCase();
        return recipesList.filter(recipe => recipe.name.toLowerCase().includes(q));
    }, [recipesList, searchTerm]);

    const handleDeleteClick = (recipe) => {
        setDoubleConfirm(false);
        setConfirmModal({
            show: true,
            targetId: recipe.id,
            title: '¿Eliminar Receta?',
            message: `¿Estás seguro que quieres eliminar toda la lista de materiales de "${recipe.name}"? Esta acción no se puede deshacer.`
        });
    };

    const executeDeletion = async () => {
        if (!doubleConfirm) return;
        setIsDeleting(true);
        try {
            const res = await deleteRecipeByProduct(confirmModal.targetId);
            if (!res.success) throw new Error(res.error);
            setConfirmModal({ show: false, targetId: null, title: '', message: '' });
            setDoubleConfirm(false);
        } catch (err) {
            console.error("Error deleting recipe:", err);
            alert("Error al eliminar la receta. Por favor, reintenta.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleOpenModal = (recipe = null) => {
        if (recipe) {
            setEditingRecipe(recipe);
            // ← usar batch_size del producto (fuente de verdad), no yield_quantity del ingrediente
            const pt = pts.find(p => p.id === recipe.id);
            const batchSize = pt?.batch_size || recipe.batch_size || recipe.ingredients[0]?.yield_quantity || 1;
            setFormData({
                id: recipe.id,
                name: recipe.name,
                yield: recipe.yield || 'Batch Producción',
                yield_qty: batchSize,
                ingredients: recipe.ingredients.length > 0
                    ? recipe.ingredients.map(i => ({ ...i }))
                    : [{ rm_id: '', name: '', qty: '', unit: '' }]
            });
        } else {
            setEditingRecipe(null);
            setFormData({
                id: '',
                name: '',
                yield: 'Batch Producción',
                yield_qty: 1,
                ingredients: [{ rm_id: '', name: '', qty: '', unit: '' }]
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingRecipe(null);
    };

    const addIngredientRow = () => {
        setFormData({
            ...formData,
            ingredients: [...formData.ingredients, { rm_id: '', name: '', qty: '', unit: '' }]
        });
    };

    const removeIngredientRow = (index) => {
        const newIngs = formData.ingredients.filter((_, i) => i !== index);
        setFormData({
            ...formData,
            ingredients: newIngs.length > 0 ? newIngs : [{ rm_id: '', name: '', qty: '', unit: '' }]
        });
    };

    const handleIngredientChange = (index, field, value) => {
        const newIngs = [...formData.ingredients];
        if (field === 'rm_id') {
            const mat = materials.find(m => m.id === value);
            // Usar la unidad de compra del insumo como unidad por defecto
            const defaultUnit = mat?.purchase_unit || mat?.unit_measure || mat?.unit || 'und';
            newIngs[index] = {
                ...newIngs[index],
                rm_id: value,
                name: mat?.name || '',
                unit: defaultUnit,
                _purchaseUnit: defaultUnit // guardar para referencia en el save
            };
        } else {
            newIngs[index][field] = value;
        }
        setFormData({ ...formData, ingredients: newIngs });
    };

    const handleSaveRecipe = async () => {
        if (!formData.id && !editingRecipe) {
            alert("Por favor selecciona un producto para crear su receta.");
            return;
        }

        setIsSaving(true);
        try {
            // Delete existing rows for this finished_good_id in Firestore
            await deleteRecipeByProduct(formData.id);

            // Insert new rows — normalizando a la unidad de compra del insumo
            for (const i of formData.ingredients) {
                if (i.rm_id && i.qty) {
                    // Unidad de compra del insumo (fuente de verdad para almacenar)
                    const mat = materials.find(m => m.id === i.rm_id);
                    const purchaseUnit = mat?.purchase_unit || mat?.unit_measure || mat?.unit || i.unit;

                    // Convertir la cantidad ingresada a la unidad de compra
                    const normalizedQty = convertQty(parseFloat(i.qty), i.unit, purchaseUnit);

                    await addRecipe({
                        finished_good_id: formData.id,
                        finished_good_name: formData.name,
                        raw_material_id: i.rm_id,
                        raw_material_name: i.name,
                        raw_material_sku: i.sku || i.name,
                        quantity_required: normalizedQty,      // en purchase_unit
                        unit: purchaseUnit,                    // unidad de compra del insumo
                        input_qty: parseFloat(i.qty),          // valor original del usuario
                        input_unit: i.unit,                    // unidad original del usuario
                        yield_quantity: Number(formData.yield_qty) || 1
                    });
                }
            }

            // Recalculate PT costs based on the new recipe
            await recalculatePTCosts();

            // await loadData(); // No longer needed
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving recipe:", error);
            alert("Error al guardar la receta. Revisa los datos.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="recipes-module">
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 className="font-serif" style={{ fontSize: '1.8rem', color: 'var(--color-primary)' }}>Recetas (BOM)</h2>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>Lista de Materiales y explosión de insumos para producción Lean.</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Busca Receta"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                padding: '0.5rem 2.5rem 0.5rem 2.5rem',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                                outline: 'none',
                                fontSize: '0.85rem',
                                width: '250px'
                            }}
                        />
                        {searchTerm && (
                            <X 
                                size={14} 
                                style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', cursor: 'pointer' }} 
                                onClick={() => setSearchTerm('')}
                            />
                        )}
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        style={{ background: 'var(--color-secondary)', color: '#fff', padding: '0.5rem 1.2rem', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(22, 101, 52, 0.2)', fontSize: '0.85rem' }}
                    >
                        <Plus size={16} /> Nueva Receta
                    </button>
                </div>
            </header>

            {loading ? (
                <div style={{ padding: '4rem', textAlign: 'center' }}>
                    <RefreshCw className="spin" size={32} color="var(--color-primary)" />
                    <p style={{ marginTop: '1rem', color: '#64748b' }}>Sincronizando con base de datos...</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '2rem' }}>
                    {filteredRecipes.map(recipe => (
                        <div key={recipe.id} className="recipe-card" style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', transition: 'all 0.3s' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#1A3636' }}>{recipe.name}</h3>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{recipe.yield}</div>
                                        <div style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontSize: '0.75rem',
                                            background: '#dcfce7',
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            color: '#166534',
                                            fontWeight: '800'
                                        }}>
                                            🧴 {recipe.batch_size} frascos / lote
                                        </div>
                                    </div>
                                </div>
                                <Edit3 size={18} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => handleOpenModal(recipe)} />
                            </div>

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                {recipe.ingredients.length > 0 ? (
                                    recipe.ingredients.map((ing, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}>
                                            <span style={{ color: '#475569' }}>{ing.name}</span>
                                            <span style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{ing.qty} {ing.unit}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', border: '1px dashed #cbd5e1' }}>
                                        Sin ingredientes configurados
                                    </div>
                                )}
                            </div>

                            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.8rem' }}>
                                <button
                                    onClick={() => handleOpenModal(recipe)}
                                    style={{ flex: 3, padding: '0.5rem 0.8rem', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', background: '#fff', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                                    className="btn-premium"
                                >
                                    Gestionar BOM
                                </button>
                                <button
                                    onClick={() => handleDeleteClick(recipe)}
                                    style={{ flex: 1, padding: '0.5rem', border: '1px solid #fca5a5', color: '#ef4444', background: '#fff', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                    title="Eliminar Receta"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Gestión de BOM */}
            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ padding: '1.5rem 2rem', background: 'var(--color-primary)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800' }}>{editingRecipe ? 'Editar Receta' : 'Nueva Receta'}</h3>
                                <p style={{ margin: '4px 0 0', opacity: 0.95, fontSize: '1.1rem', fontWeight: '700' }}>{formData.name || 'Selecciona un producto terminado'}</p>
                            </div>
                            <X size={24} style={{ cursor: 'pointer' }} onClick={handleCloseModal} />
                        </div>

                        <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>

                            {/* Selector de producto — solo en modo NUEVA receta */}
                            {!editingRecipe && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>PRODUCTO TERMINADO</label>
                                    <select
                                        value={formData.id}
                                        onChange={(e) => {
                                            const selectedId = e.target.value;
                                            const selectedPT = pts.find(p => p.id === selectedId);
                                            const selectedName = selectedPT?.name || e.target.options[e.target.selectedIndex].text.replace(' (Sin Receta) ⚠️', '');
                                            setFormData({
                                                ...formData,
                                                id: selectedId,
                                                name: selectedName,
                                                yield_qty: selectedPT?.batch_size || 1
                                            });
                                        }}
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff' }}
                                    >
                                        <option value="">Seleccionar producto...</option>
                                        {recipesList.length > 0 ? (
                                            recipesList.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name}{p.ingredients.length === 0 ? ' (Sin Receta) ⚠️' : ''}
                                                </option>
                                            ))
                                        ) : (
                                            <option value="" disabled>No existe en Módulo de Datos Maestros de Productos, Crealo primero</option>
                                        )}
                                    </select>

                                    {/* Alerta de Receta Existente */}
                                    {formData.id && recipes[formData.id] && (
                                        <div style={{ marginTop: '1rem', padding: '1rem', background: '#ecfdf5', borderRadius: '12px', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                                <AlertTriangle size={20} color="#059669" />
                                                <div>
                                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#065f46', fontWeight: '700' }}>Este producto ya tiene una receta.</p>
                                                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#047857' }}>No crees una nueva, edita la existente para evitar duplicados.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleOpenModal(recipesList.find(r => r.id === formData.id))}
                                                style={{ padding: '0.4rem 0.8rem', background: '#059669', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                                            >
                                                Cargar para Editar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ marginBottom: '1.5rem' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1.2rem',
                                    padding: '0.9rem 1.2rem',
                                    background: '#f0fdf4',
                                    borderRadius: '12px',
                                    border: '1px solid #bbf7d0'
                                }}>
                                    {/* Icono de lote */}
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '10px',
                                        background: '#dcfce7', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', flexShrink: 0, fontSize: '1.2rem'
                                    }}>
                                        🧴
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: '900', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                                            Tamaño de Lote
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                                            <span style={{ fontSize: '1.6rem', fontWeight: '900', color: '#166534', lineHeight: 1 }}>
                                                {formData.yield_qty || 1}
                                            </span>
                                            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>
                                                frascos / lote de producción
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', textAlign: 'right', maxWidth: '140px', lineHeight: 1.4 }}>
                                        🔒 Solo editable desde el formulario del <strong>SKU del producto</strong>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: 0, fontSize: '1rem', color: '#1A3636', fontWeight: '800' }}>INGREDIENTES / MATERIALES</h4>
                                    <button onClick={addIngredientRow} style={{ padding: '0.5rem 1rem', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <PlusCircle size={16} /> Añadir Fila
                                    </button>
                                </div>

                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
                                            <th style={{ padding: '0.8rem', fontSize: '0.75rem', color: '#94a3b8' }}>MATERIAL / INSUMO</th>
                                            <th style={{ padding: '0.8rem', fontSize: '0.75rem', color: '#94a3b8', width: '100px' }}>CANT.</th>
                                            <th style={{ padding: '0.8rem', fontSize: '0.75rem', color: '#94a3b8', width: '80px' }}>UND</th>
                                            <th style={{ padding: '0.8rem', fontSize: '0.75rem', color: '#94a3b8', width: '50px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {formData.ingredients.map((ing, index) => (
                                            <tr key={index}>
                                                <td style={{ padding: '0.5rem' }}>
                                                    <select
                                                        value={ing.rm_id}
                                                        onChange={(e) => handleIngredientChange(index, 'rm_id', e.target.value)}
                                                        style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }}
                                                    >
                                                        <option value="">Seleccionar...</option>
                                                        {materials.length > 0 ? (
                                                            materials.map(m => (
                                                                <option key={m.id} value={m.id}>{m.name}</option>
                                                            ))
                                                        ) : (
                                                            <option value="" disabled>No existe en Módulo de Datos Maestros de Productos, Crealo primero</option>
                                                        )}
                                                    </select>
                                                </td>
                                                <td style={{ padding: '0.5rem' }}>
                                                    <input
                                                        type="number"
                                                        value={ing.qty}
                                                        onChange={(e) => handleIngredientChange(index, 'qty', e.target.value)}
                                                        placeholder="0.00"
                                                        style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }}
                                                    />
                                                    {/* Hint de conversión en tiempo real */}
                                                    {(() => {
                                                        const mat = materials.find(m => m.id === ing.rm_id);
                                                        const pu = mat?.purchase_unit || mat?.unit_measure || mat?.unit;
                                                        if (!pu || !ing.qty || pu === ing.unit) return null;
                                                        const conv = convertQty(parseFloat(ing.qty), ing.unit, pu);
                                                        return (
                                                            <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: '700', marginTop: '2px', paddingLeft: '2px' }}>
                                                                → se guardará como {conv} {pu}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                                <td style={{ padding: '0.5rem' }}>
                                                    <select
                                                        value={ing.unit}
                                                        onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                                                        style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem', background: '#f8fafc' }}
                                                    >
                                                        {(units || []).map(u => (
                                                            <option key={u.id} value={u.id}>{u.id}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                                    <MinusCircle size={18} color="#fca5a5" style={{ cursor: 'pointer' }} onClick={() => removeIngredientRow(index)} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div style={{ padding: '1rem 2rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: '#f8fafc' }}>
                            <button onClick={handleCloseModal} style={{ padding: '0.5rem 1.2rem', border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}>
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveRecipe}
                                disabled={isSaving}
                                style={{ padding: '0.5rem 1.5rem', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isSaving ? 0.7 : 1, fontSize: '0.85rem' }}
                            >
                                <Save size={16} /> {isSaving ? 'Guardando...' : 'Guardar Receta'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmación Premium */}
            {confirmModal.show && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '450px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'modalSlideUp 0.3s ease-out' }}>
                        <div style={{ padding: '2rem', textAlign: 'center' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid #fee2e2' }}>
                                <AlertTriangle size={32} color="#ef4444" />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1A3636', marginBottom: '0.8rem' }}>{confirmModal.title}</h3>
                            <p style={{ fontSize: '0.95rem', color: '#64748b', lineHeight: '1.6', marginBottom: '1.5rem' }}>{confirmModal.message}</p>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '1rem', background: '#fff1f2', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #ffe4e6' }}>
                                <input 
                                    type="checkbox" 
                                    id="double-confirm-check"
                                    checked={doubleConfirm}
                                    onChange={(e) => setDoubleConfirm(e.target.checked)}
                                    style={{ cursor: 'pointer', width: '20px', height: '20px', accentColor: '#ef4444' }}
                                />
                                <label htmlFor="double-confirm-check" style={{ fontSize: '0.85rem', color: '#991b1b', cursor: 'pointer', fontWeight: '600' }}>
                                    Confirmar que deseo borrar esta receta permanentemente.
                                </label>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                                    disabled={isDeleting}
                                    style={{ flex: 1, padding: '0.6rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={executeDeletion}
                                    disabled={isDeleting || !doubleConfirm}
                                    style={{ 
                                        flex: 1, 
                                        padding: '0.6rem', 
                                        borderRadius: '10px', 
                                        border: 'none', 
                                        background: doubleConfirm ? '#ef4444' : '#fca5a5', 
                                        color: '#fff', 
                                        fontWeight: '700', 
                                        cursor: doubleConfirm ? 'pointer' : 'not-allowed', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        gap: '0.5rem', 
                                        boxShadow: doubleConfirm ? '0 4px 12px rgba(239, 68, 68, 0.2)' : 'none', 
                                        fontSize: '0.85rem',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {isDeleting ? 'Eliminando...' : 'Eliminar Ahora'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes modalSlideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .recipe-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 12px 20px -5px rgba(0,0,0,0.1) !important;
                }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default Recipes;

