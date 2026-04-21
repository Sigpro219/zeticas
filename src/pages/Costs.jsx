import React, { useState, useMemo } from 'react';
import { useBusiness } from '../context/BusinessContext';
import {
    DollarSign,
    TrendingUp,
    Package,
    Layers,
    RefreshCcw,
    Calculator
} from 'lucide-react';
import SkeletonLoader from '../components/SkeletonLoader';
import { formatQty, formatPrice } from '../utils/format';

const Costs = () => {
    const { items, recipes, recalculatePTCosts, loading: contextLoading } = useBusiness();
    const [isRecalculating, setIsRecalculating] = useState(false);
    const [searchMP, setSearchMP] = useState('');
    const [searchPT, setSearchPT] = useState('');

    const { rawMaterials, products, recipesMap } = useMemo(() => {
        if (!items || !recipes) return { rawMaterials: [], products: [], recipesMap: {} };

        const mps = items.filter(p => p.type === 'material' || p.type === 'MP' || p.category === 'Materia Prima');
        const pts = items.filter(p => p.type === 'product' || p.type === 'PT' || p.category === 'Producto Terminado');

        const rMap = {};
        const recipeList = Array.isArray(recipes) ? recipes : Object.values(recipes).flat();

        recipeList.forEach(r => {
            if (!r) return;
            const finishedGoodId = r.finished_good_id;
            if (!finishedGoodId) return;
            if (!rMap[finishedGoodId]) rMap[finishedGoodId] = [];

            // r tiene 'rm_id', 'name', 'qty', 'unit' gracias al mapeo en BusinessContext
            const mp = items.find(i => i.id === r.rm_id || i.name === r.name);

            rMap[finishedGoodId].push({
                id: r.rm_id || (mp?.id),
                name: mp?.name || r.name || 'Desconocido',
                qty: r.qty !== undefined ? r.qty : 0,
                unit: r.unit || mp?.unit_measure || 'unid',
                cost: mp?.cost || mp?.avgCost || 0
            });
        });

        return { rawMaterials: mps, products: pts, recipesMap: rMap };
    }, [items, recipes]);

    const loading = contextLoading;

    const totalInventoryValue = rawMaterials.reduce((acc, item) => {
        return acc + ((item.stock || 0) * (item.cost || 0));
    }, 0) + products.reduce((acc, item) => {
        return acc + ((item.stock || 0) * (item.cost || 0));
    }, 0);

    return (
        <div className="costs-module" style={{ padding: '0 1rem' }}>
            <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2 className="font-serif" style={{ fontSize: '2.0rem', color: 'var(--color-primary)', margin: 0 }}>Gestión de Costos (PPC)</h2>
                    <p style={{ color: '#666', fontSize: '0.95rem', marginTop: '0.5rem' }}>Análisis de Precios Promedio Ponderados y valoración de inventario en tiempo real.</p>
                </div>
                <div style={{ background: '#f8fafc', padding: '1rem 2rem', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Valor Total Inventario</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--color-primary)' }}>
                        ${formatPrice(totalInventoryValue)}
                    </div>
                </div>
                <button
                    onClick={async () => {
                        setIsRecalculating(true);
                        await recalculatePTCosts();
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
                <div style={{ animation: 'fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                        <SkeletonLoader height="160px" borderRadius="24px" />
                        <SkeletonLoader height="160px" borderRadius="24px" />
                    </div>
                    <div style={{ marginBottom: '3.5rem' }}>
                        <SkeletonLoader height="30px" width="300px" style={{ marginBottom: '1.5rem' }} />
                        <SkeletonLoader height="400px" borderRadius="24px" />
                    </div>
                    <div>
                        <SkeletonLoader height="30px" width="400px" style={{ marginBottom: '1.5rem' }} />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
                            <SkeletonLoader height="220px" borderRadius="24px" />
                            <SkeletonLoader height="220px" borderRadius="24px" />
                            <SkeletonLoader height="220px" borderRadius="24px" />
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
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
                                Los costos están sincronizados con la Base de Datos central, calculándose automáticamente a partir del Maestro de Productos y Recetas (BOM).
                            </p>
                        </div>
                    </div>

                    <section style={{ marginBottom: '3.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                <Layers size={22} color="var(--color-primary)" />
                                <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#334155' }}>Analítico Materias Primas / Insumos</h3>
                            </div>
                            <input
                                placeholder="Buscar Materia Prima..."
                                value={searchMP}
                                onChange={(e) => setSearchMP(e.target.value)}
                                style={{ padding: '0.6rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', minWidth: '250px', outline: 'none', background: '#fff' }}
                            />
                        </div>
                        <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #f1f5f9', overflow: 'hidden', maxHeight: '500px', overflowY: 'auto', overflowX: 'auto' }}>
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
                                    {rawMaterials.filter(mp => mp.name?.toLowerCase().includes(searchMP.toLowerCase())).map(mp => {
                                        const stock = mp.stock || 0;
                                        return (
                                            <tr key={mp.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                                <td style={{ padding: '1.2rem', fontWeight: '700', color: '#1e293b' }}>{mp.name}</td>
                                                <td style={{ padding: '1.2rem', textAlign: 'center' }}>
                                                    <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>{mp.unit_measure || 'und'}</span>
                                                </td>
                                                <td style={{ padding: '1.2rem', textAlign: 'right', color: '#64748b' }}>{stock}</td>
                                                <td style={{ padding: '1.2rem', textAlign: 'right', fontWeight: '800', color: 'var(--color-primary)' }}>
                                                    ${formatPrice(mp.cost || 0)}
                                                </td>
                                                <td style={{ padding: '1.2rem', textAlign: 'right', fontWeight: '800' }}>
                                                    ${formatPrice(stock * (mp.cost || 0))}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                <Package size={22} color="var(--color-primary)" />
                                <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#334155' }}>Explosión de Costos Producto Terminado (PT)</h3>
                            </div>
                            <input
                                placeholder="Buscar Producto Terminado..."
                                value={searchPT}
                                onChange={(e) => setSearchPT(e.target.value)}
                                style={{ padding: '0.6rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', minWidth: '250px', outline: 'none', background: '#fff' }}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 450px), 1fr))', gap: '1.5rem', marginBottom: '3.5rem' }}>
                            {products.filter(pt => pt.name?.toLowerCase().includes(searchPT.toLowerCase())).map(pt => {
                                const recipe = recipesMap[pt.id] || [];
                                return (
                                    <div key={pt.id} className="recipe-card" style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', transition: 'all 0.3s' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                            <div>
                                                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#1A3636' }}>{pt.name}</h3>
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Batch Producción</div>
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
                                                        🧴 {pt.batch_size || 1} frascos / lote
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                                                    <div style={{ fontSize: '0.7rem', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>COSTO BATCH LOTE</div>
                                                    <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#10b981' }}>
                                                        ${formatPrice(pt.recipe_batch_cost || (pt.cost * (pt.batch_size || 1)) || 0)}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#0ea5e9', background: '#e0f2fe', padding: '2px 8px', borderRadius: '6px', marginTop: '4px' }}>
                                                        Valor Unitario: ${formatPrice(pt.cost || 0)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                            {recipe.length > 0 ? (
                                                <>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.5rem', fontSize: '0.7rem', color: '#94a3b8', fontWeight: '800' }}>
                                                        <div style={{ flex: 2 }}>MATERIAL / INSUMO</div>
                                                        <div style={{ flex: 1, textAlign: 'right' }}>V. UNITARIO</div>
                                                        <div style={{ flex: 1, textAlign: 'right' }}>V. TOTAL</div>
                                                    </div>
                                                    {recipe.map((comp, idx) => {
                                                        const costCalc = comp.cost * comp.qty;
                                                        const displayQty = comp.qty;
                                                        const displayUnit = comp.unit;
                                                        const VUnitario = comp.cost;

                                                        return (
                                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                                                                <div style={{ flex: 2 }}>
                                                                    <div style={{ color: '#475569', fontWeight: '600' }}>{comp.name}</div>
                                                                    <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-primary)' }}>{formatQty(displayQty)} {displayUnit}</div>
                                                                </div>
                                                                <div style={{ flex: 1, textAlign: 'right', fontWeight: '600', color: '#64748b' }}>
                                                                    ${formatPrice(VUnitario)}
                                                                    <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>/ {displayUnit}</div>
                                                                </div>
                                                                <div style={{ flex: 1, textAlign: 'right', fontWeight: '800', color: 'var(--color-primary)' }}>
                                                                    ${formatPrice(costCalc)}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </>
                                            ) : (
                                                <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', border: '1px dashed #cbd5e1' }}>
                                                    Sin receta vinculada
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </>
            )}
            <style>{`
                .recipe-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 12px 20px -5px rgba(0,0,0,0.1) !important;
                }
            `}</style>
        </div>
    );
};

export default Costs;
