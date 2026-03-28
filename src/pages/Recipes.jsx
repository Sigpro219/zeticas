import React, { useState, useEffect, useMemo } from 'react';
import { ChefHat, RefreshCw, Plus, Edit3, Trash2, X, PlusCircle, MinusCircle, Save, AlertTriangle, Search } from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';

const Recipes = () => {
    const { items, recipes, recalculatePTCosts, addRecipe, deleteRecipeByProduct } = useBusiness();
    
    // Split items into PTs and Materials
    const pts = useMemo(() => items.filter(i => i.type === 'product' || i.type === 'PT'), [items]);
    const materials = useMemo(() => items.filter(i => i.type === 'material' || i.type === 'material'), [items]);

    const recipesList = useMemo(() => {
        return pts.map(pt => ({
            id: pt.id,
            name: pt.name,
            yield: 'Batch Producción',
            ingredients: recipes[pt.name] || [] // Context groups by name
        }));
    }, [pts, recipes]);

    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecipe, setEditingRecipe] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ show: false, targetId: null, title: '', message: '' });
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        id: '', // finished_good_id
        name: '',
        yield: 'Batch Producción',
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
        setConfirmModal({
            show: true,
            targetId: recipe.id,
            title: '¿Eliminar Receta?',
            message: `¿Estás seguro que quieres eliminar toda la lista de materiales de "${recipe.name}"? Esta acción no se puede deshacer.`
        });
    };

    const executeDeletion = async () => {
        setIsDeleting(true);
        try {
            const res = await deleteRecipeByProduct(confirmModal.targetId);
            if (!res.success) throw new Error(res.error);
            setConfirmModal({ show: false, targetId: null, title: '', message: '' });
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
            setFormData({
                id: recipe.id,
                name: recipe.name,
                yield: recipe.yield || 'Batch Producción',
                ingredients: recipe.ingredients.length > 0
                    ? recipe.ingredients.map(i => ({ ...i }))
                    : [{ rm_id: '', name: '', qty: '', unit: '' }]
            });
        } else {
            // New recipe usually tied to an existing PT that doesn't have one
            setEditingRecipe(null);
            setFormData({
                id: '',
                name: '',
                yield: 'Batch Producción',
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
            newIngs[index] = {
                ...newIngs[index],
                rm_id: value,
                name: mat?.name || '',
                unit: mat?.unit_measure || 'und'
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

            // Insert new rows
            for (const i of formData.ingredients) {
                if (i.rm_id && i.qty) {
                    await addRecipe({
                        finished_good_id: formData.id,
                        finished_good_name: formData.name,
                        raw_material_id: i.rm_id,
                        raw_material_name: i.name,
                        raw_material_sku: i.sku || i.name,
                        quantity_required: parseFloat(i.qty)
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
                                padding: '0.5rem 1rem 0.5rem 2.5rem',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                                outline: 'none',
                                fontSize: '0.85rem',
                                width: '250px'
                            }}
                        />
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
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rendimiento: {recipe.yield}</div>
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
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ padding: '1.5rem 2rem', background: 'var(--color-primary)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800' }}>{editingRecipe ? 'Editar Receta' : 'Nueva Receta'}</h3>
                                <p style={{ margin: '4px 0 0', opacity: 0.8, fontSize: '0.85rem' }}>{formData.name || 'Selecciona un producto terminado'}</p>
                            </div>
                            <X size={24} style={{ cursor: 'pointer' }} onClick={handleCloseModal} />
                        </div>

                        <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>PRODUCTO TERMINADO</label>
                                <select
                                    value={formData.id}
                                    onChange={(e) => setFormData({ ...formData, id: e.target.value, name: e.target.options[e.target.selectedIndex].text })}
                                    disabled={!!editingRecipe}
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', background: !!editingRecipe ? '#f8fafc' : '#fff' }}
                                >
                                    <option value="">Seleccionar producto...</option>
                                    {recipesList.length > 0 ? (
                                        recipesList.filter(r => !editingRecipe ? r.ingredients.length === 0 : true).map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))
                                    ) : (
                                        <option value="" disabled>No existe en Módulo de Datos Maestros de Productos, Crealo primero</option>
                                    )}
                                </select>
                            </div>

                            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>RENDIMIENTO BASE</label>
                                    <input
                                        type="text"
                                        value={formData.yield}
                                        onChange={(e) => setFormData({ ...formData, yield: e.target.value })}
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }}
                                    />
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
                                                </td>
                                                <td style={{ padding: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                                                    {ing.unit}
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
                            <p style={{ fontSize: '0.95rem', color: '#64748b', lineHeight: '1.6', marginBottom: '2rem' }}>{confirmModal.message}</p>

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
                                    disabled={isDeleting}
                                    style={{ flex: 1, padding: '0.6rem', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)', fontSize: '0.85rem' }}
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

