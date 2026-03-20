import React, { useState, useEffect } from 'react';
import { useBusiness } from '../context/BusinessContext';
import {
    DollarSign,
    TrendingUp,
    Package,
    Layers,
    RefreshCcw,
    Calculator
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const Costs = () => {
    const { recalculatePTCosts } = useBusiness();
    const [rawMaterials, setRawMaterials] = useState([]);
    const [products, setProducts] = useState([]);
    const [recipesMap, setRecipesMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [isRecalculating, setIsRecalculating] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch all products
            const { data: allProducts, error: prodError } = await supabase.from('products').select('*').order('name');
            if (prodError) throw prodError;

            // Fetch recipes
            const { data: recipes, error: recError } = await supabase.from('recipes').select(`
                id, finished_good_id, raw_material_id, quantity_required,
                raw_material:products!recipes_raw_material_id_fkey(name, unit_measure, cost)
            `);
            if (recError) throw recError;

            const mps = allProducts.filter(p => p.type === 'MP');
            const pts = allProducts.filter(p => p.type === 'PT');

            setRawMaterials(mps);
            setProducts(pts);

            // Group recipes by PT
            const rMap = {};
            if (recipes) {
                recipes.forEach(r => {
                    if (!rMap[r.finished_good_id]) rMap[r.finished_good_id] = [];
                    rMap[r.finished_good_id].push({
                        id: r.raw_material_id,
                        name: r.raw_material?.name || 'Desconocido',
                        qty: r.quantity_required,
                        unit: r.raw_material?.unit_measure || 'unid',
                        cost: r.raw_material?.cost || 0
                    });
                });
            }
            setRecipesMap(rMap);
        } catch (error) {
            console.error("Error loading costs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const totalInventoryValue = rawMaterials.reduce((acc, item) => {
        return acc + ((item.stock || 0) * (item.cost || 0));
    }, 0) + products.reduce((acc, item) => {
        return acc + ((item.stock || 0) * (item.cost || 0));
    }, 0);

    return (
        <div className="costs-module" style={{ padding: '0 1rem' }}>
            <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2 className="font-serif" style={{ fontSize: '2.2rem', color: 'var(--color-primary)', margin: 0 }}>Gestión de Costos (PPC)</h2>
                    <p style={{ color: '#666', fontSize: '0.95rem', marginTop: '0.5rem' }}>Análisis de Precios Promedio Ponderados y valoración de inventario en tiempo real.</p>
                </div>
                <div style={{ background: '#f8fafc', padding: '1rem 2rem', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Valor Total Inventario</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--color-primary)' }}>
                        ${totalInventoryValue.toLocaleString()}
                    </div>
                </div>
                <button
                    onClick={async () => {
                        setIsRecalculating(true);
                        await recalculatePTCosts();
                        await loadData();
                        setIsRecalculating(false);
                        alert("Costos de Productos Terminados recalculados exitosamente.");
                    }}
                    disabled={isRecalculating}
                    style={{
                        padding: '0.8rem 1.5rem',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'var(--color-primary)',
                        color: '#fff',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        opacity: isRecalculating ? 0.7 : 1
                    }}
                >
                    <Calculator size={18} />
                    {isRecalculating ? 'Recalculando...' : 'Recalcular Todo (PT)'}
                </button>
            </header>

            {loading ? (
                <p>Cargando información de costos desde la base de datos...</p>
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                        <div style={{ background: 'linear-gradient(135deg, #1A3636 0%, #2D5A5A 100%)', padding: '1.5rem', borderRadius: '24px', color: '#fff' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <Calculator size={24} />
                                <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '10px' }}>INFO KARDEX</span>
                            </div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Lógica de Costeo</div>
                            <div style={{ fontSize: '1.3rem', fontWeight: '700', marginTop: '0.4rem' }}>Promedio Ponderado</div>
                            <div style={{ marginTop: '1rem', padding: '0.8rem', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '0.75rem' }}>
                                Coste extraído y calculado desde Base de Datos.
                            </div>
                        </div>

                        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.2rem' }}>
                                <div style={{ background: '#f0fdf4', padding: '0.6rem', borderRadius: '12px', color: '#10b981' }}><RefreshCcw size={20} /></div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Actualización en Línea</h3>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                                Los costos están sincronizados con la Base de Datos central y se actualizan automáticamente tras la importación del Maestro JSON/Excel.
                            </p>
                        </div>
                    </div>

                    <section style={{ marginBottom: '3.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
                            <Layers size={22} color="var(--color-primary)" />
                            <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#334155' }}>Analítico Materias Primas / Insumos</h3>
                        </div>
                        <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #f1f5f9', overflow: 'hidden', maxHeight: '500px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 10 }}>
                                    <tr>
                                        <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.75rem', color: '#64748b' }}>MATERIAL</th>
                                        <th style={{ padding: '1.2rem', textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>UNIDAD</th>
                                        <th style={{ padding: '1.2rem', textAlign: 'right', fontSize: '0.75rem', color: '#64748b' }}>STOCK ACTUAL</th>
                                        <th style={{ padding: '1.2rem', textAlign: 'right', fontSize: '0.75rem', color: '#64748b' }}>COSTO PROMEDIO (PPC)</th>
                                        <th style={{ padding: '1.2rem', textAlign: 'right', fontSize: '0.75rem', color: '#64748b' }}>VALOR TOTAL INV.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rawMaterials.map(mp => {
                                        const stock = mp.stock || 0;
                                        return (
                                            <tr key={mp.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                                <td style={{ padding: '1.2rem', fontWeight: '700', color: '#1e293b' }}>{mp.name}</td>
                                                <td style={{ padding: '1.2rem', textAlign: 'center' }}>
                                                    <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>{mp.unit_measure || 'und'}</span>
                                                </td>
                                                <td style={{ padding: '1.2rem', textAlign: 'right', color: '#64748b' }}>{stock}</td>
                                                <td style={{ padding: '1.2rem', textAlign: 'right', fontWeight: '800', color: 'var(--color-primary)' }}>
                                                    ${(mp.cost || 0).toLocaleString()}
                                                </td>
                                                <td style={{ padding: '1.2rem', textAlign: 'right', fontWeight: '800' }}>
                                                    ${(stock * (mp.cost || 0)).toLocaleString()}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
                            <Package size={22} color="var(--color-primary)" />
                            <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#334155' }}>Explosión de Costos Producto Terminado (PT)</h3>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '3.5rem' }}>
                            {products.map(pt => {
                                const recipe = recipesMap[pt.id] || [];
                                return (
                                    <div key={pt.id} style={{ background: '#fff', borderRadius: '24px', border: '1px solid #f1f5f9', padding: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>{pt.name}</h4>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>SKU: {pt.sku || pt.id.split('-')[0]}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.7rem', fontWeight: '900', color: '#64748b' }}>COSTO TOTAL</div>
                                                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#10b981' }}>
                                                    ${(pt.cost || 0).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '1rem' }}>
                                            <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#94a3b8', marginBottom: '0.8rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem' }}>
                                                DESGLOSE DE COMPONENTES (BOM)
                                            </div>
                                            {recipe.map(comp => {
                                                const costCalc = comp.cost * comp.qty;
                                                return (
                                                    <div key={comp.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                                        <span style={{ color: '#475569' }}>
                                                            {comp.name}
                                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '4px' }}>
                                                                ({comp.qty} {comp.unit})
                                                            </span>
                                                        </span>
                                                        <span style={{ fontWeight: '600' }}>
                                                            ${Math.round(costCalc).toLocaleString()}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
};

export default Costs;
