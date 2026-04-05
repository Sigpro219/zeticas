import React, { useState } from 'react';
import { AlertCircle, RefreshCw, Plus, Package, Save, X, ArrowUpRight, Search } from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';

const formatNum = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return Number(num).toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
    });
};

const Inventory = () => {
    const { items, updateItem } = useBusiness();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState('MP'); // 'MP' or 'PT'
    const [editData, setEditData] = useState([]);
    const [modalSearch, setModalSearch] = useState('');
    const [searchMP, setSearchMP] = useState('');
    const [searchPT, setSearchPT] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [dismissedPulls, setDismissedPulls] = useState(() => {
        const saved = localStorage.getItem('zeticas_dismissed_pulls');
        return saved ? JSON.parse(saved) : [];
    });

    const handleDismissPull = (id) => {
        const newDismissed = [...dismissedPulls, id];
        setDismissedPulls(newDismissed);
        localStorage.setItem('zeticas_dismissed_pulls', JSON.stringify(newDismissed));
    };

    const handleDismissAllPulls = () => {
        const idsToDismiss = pullSignals.map(sig => sig.id);
        const newDismissed = [...new Set([...dismissedPulls, ...idsToDismiss])];
        setDismissedPulls(newDismissed);
        localStorage.setItem('zeticas_dismissed_pulls', JSON.stringify(newDismissed));
    };

    const getFinalStock = (item) => Math.round(((item.initial || 0) + (item.purchases || 0) - (item.sales || 0)) * 10) / 10;

    const pullSignals = (items || []).filter(item =>
        getFinalStock(item) <= (item.safety || 0) && !dismissedPulls.includes(item.id)
    );

    const getStatus = (item) => {
        const stock = getFinalStock(item);
        if (stock <= (item.safety || 0) * 0.5) return 'CRITICAL';
        if (stock <= (item.safety || 0)) return 'LOW';
        return 'OPTIMAL';
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'CRITICAL': return '#ef4444';
            case 'LOW': return '#D4785A';
            default: return '#10b981';
        }
    };

    const StatusTooltip = ({ children }) => {
        const [show, setShow] = useState(false);
        return (
            <div style={{ position: 'relative', display: 'inline-block' }} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
                {children}
                {show && (
                    <div style={{ position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)', background: '#1e293b', color: '#fff', padding: '1rem', borderRadius: '12px', width: '250px', fontSize: '0.75rem', zIndex: 10000, boxShadow: '0 10px 25px rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontWeight: '900', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.3rem' }}>POLÍTICA DE SEMÁFORO</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} /> <b>CRITICAL:</b> ≤ 50% de la meta
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#D4785A' }} /> <b>LOW:</b> ≤ 100% de la meta
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.6 }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} /> <b>OPTIMAL:</b> {">"} meta (Ocultos)
                        </div>
                        <div style={{ marginTop: '0.6rem', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.65rem' }}>* Los niveles se definen individualmente en Data Maestra.</div>
                        <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid #1e293b' }} />
                    </div>
                )}
            </div>
        );
    };

    const openInventoryForm = (type) => {
        setModalType(type);
        setEditData([...items]);
        setIsModalOpen(true);
    };



    const handleEditChange = (id, field, value) => {
        setEditData(prev => prev.map(item =>
            item.id === id ? { ...item, [field]: field === 'name' || field === 'unit' || field === 'sku' ? value : (parseFloat(value) || 0) } : item
        ));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            for (const item of editData) {
                if (item.id && typeof item.id === 'string') {
                    await updateItem(item.id, { initial: item.initial });
                }
            }
            setIsModalOpen(false);
            setModalSearch('');
        } catch (err) {
            console.error("Error saving inventory:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const totalValueMP = items
        .filter(i => i.type === 'material')
        .reduce((acc, i) => acc + (getFinalStock(i) * (i.avgCost || 0)), 0);

    const totalValuePT = items
        .filter(i => i.type === 'product')
        .reduce((acc, i) => acc + (getFinalStock(i) * (i.price || 0)), 0);

    const deepTeal = "#023636";
    const institutionOcre = "#D4785A";
    const premiumSalmon = "#E29783";
    const glassWhite = "rgba(255, 255, 255, 0.85)";

    const [openMP, setOpenMP] = useState(false);
    const [openPT, setOpenPT] = useState(false);

    const [localInitialsMP, setLocalInitialsMP] = useState({});
    const [localInitialsPT, setLocalInitialsPT] = useState({});

    const handleSaveAll = async (type) => {
        const updates = type === 'MP' ? localInitialsMP : localInitialsPT;
        for (const [id, value] of Object.entries(updates)) {
            const num = parseFloat(value) || 0;
            // Guardamos primariamente en 'stock' porque BusinessContext mapea initial <- p.stock
            await updateItem(id, { stock: num, initial: num });
        }
        if (type === 'MP') setLocalInitialsMP({});
        if (type === 'PT') setLocalInitialsPT({});
    };

    const handleToggleMP = () => {
        setOpenMP(!openMP);
    };

    const handleTogglePT = () => {
        setOpenPT(!openPT);
    };

    return (
        <div style={{ padding: '2rem', minHeight: '100vh', background: '#fff', animation: 'fadeUp 0.6s ease-out' }}>

            {/* Accordion MP */}
            <div style={{ background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', overflow: 'hidden' }}>
                <div
                    onClick={handleToggleMP}
                    style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background 0.3s' }}
                >
                    <div>
                        <div style={{ fontSize: '1rem', fontWeight: '900', color: deepTeal, letterSpacing: '0.5px' }}>JUEGO DE INVENTARIO MP</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Inv. Inicial + Compras - Producción = <b style={{ color: deepTeal }}>Inv. Final MP</b></div>
                    </div>
                    <button style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: deepTeal, color: '#fff', fontWeight: '900', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', pointerEvents: 'none' }}>
                        {openMP ? <X size={16} /> : <Plus size={16} />}
                        {openMP ? 'CERRAR Y GUARDAR CAMBIOS' : 'CARGAR INICIO MP'}
                    </button>
                </div>
                {openMP && (
                    <div style={{ padding: '0 2rem 2rem 2rem' }}>
                        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <div style={{ position: 'relative', width: '100%' }}>
                                <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    type="text"
                                    placeholder="Buscar Materia Prima / Insumo por nombre o sku..."
                                    value={searchMP}
                                    onChange={(e) => setSearchMP(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem 2.8rem 0.6rem 2.5rem', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }}
                                />
                                {searchMP && (
                                    <button onClick={() => setSearchMP('')} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', color: '#64748b', borderRadius: '50%', transition: 'background 0.2s' }}>
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' }}>
                                    <th style={{ padding: '1rem', textAlign: 'left', width: '25%' }}>Insumo / MP</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', width: '15%' }}>Inv. Inicial (Editable)</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', width: '15%' }}>Stock Seg.</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', width: '15%' }}>Compras</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', width: '15%' }}>Producción</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', width: '15%', color: deepTeal }}>Inv. Final</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items
                                    .filter(i => i.type === 'material' || i.category === 'Materia Prima' || i.category === 'Insumo' || i.category === 'Insumos')
                                    .filter(i => !searchMP || (i.name || '').toLowerCase().includes(searchMP.toLowerCase()) || (i.sku || '').toLowerCase().includes(searchMP.toLowerCase()))
                                    .map(item => {
                                        const init = item.initial || 0;
                                        const currentInputVal = localInitialsMP[item.id] !== undefined ? localInitialsMP[item.id] : init;
                                        const calculationInit = localInitialsMP[item.id] !== undefined ? (parseFloat(localInitialsMP[item.id]) || 0) : init;
                                        const accCompras = item.purchases || 0;
                                        const accProd = item.sales || 0; // en MP, 'sales' funge como consumo prod
                                        const fin = Math.round((calculationInit + accCompras - accProd) * 10) / 10;
                                        const stockSeg = item.min_stock_level || item.safety || 0;

                                        return (
                                            <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ fontWeight: '800', color: '#1e293b' }}>{item.name}</div>
                                                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{item.sku} | {item.unit_measure || item.unit}</div>
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                    <input
                                                        type="text"
                                                        value={currentInputVal}
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/[^0-9.]/g, '');
                                                            setLocalInitialsMP(prev => ({ ...prev, [item.id]: val }));
                                                        }}
                                                        onBlur={async (e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            setLocalInitialsMP(prev => ({ ...prev, [item.id]: val.toFixed(1) }));
                                                            await updateItem(item.id, { initial: val }); // Afectación en línea a la base de datos
                                                        }}
                                                        style={{ width: '80px', padding: '0.6rem', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 'bold' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>{formatNum(stockSeg)}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>{formatNum(accCompras)}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center', color: '#ef4444' }}>-{formatNum(accProd)}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '900', color: deepTeal, fontSize: '1.1rem' }}>{formatNum(fin)}</td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Accordion PT */}
            <div style={{ background: '#fff7ed', borderRadius: '16px', border: '1px solid #fed7aa', marginBottom: '2.5rem', overflow: 'hidden' }}>
                <div
                    onClick={handleTogglePT}
                    style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background 0.3s' }}
                >
                    <div>
                        <div style={{ fontSize: '1rem', fontWeight: '900', color: '#9a3412', letterSpacing: '0.5px' }}>JUEGO DE INVENTARIO PT</div>
                        <div style={{ fontSize: '0.8rem', color: '#c2410c', marginTop: '4px' }}>Inv. Inicial PT + Producción - Pedidos = <b style={{ color: '#9a3412' }}>Inv. Final PT</b></div>
                    </div>
                    <button style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: '#ea580c', color: '#fff', fontWeight: '900', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', pointerEvents: 'none' }}>
                        {openPT ? <X size={16} /> : <Plus size={16} />}
                        {openPT ? 'CERRAR Y GUARDAR CAMBIOS' : 'CARGAR INICIO PT'}
                    </button>
                </div>
                {openPT && (
                    <div style={{ padding: '0 2rem 2rem 2rem' }}>
                        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <div style={{ position: 'relative', width: '100%' }}>
                                <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#ea580c' }} />
                                <input
                                    type="text"
                                    placeholder="Buscar Producto Terminado por nombre o sku..."
                                    value={searchPT}
                                    onChange={(e) => setSearchPT(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem 2.8rem 0.6rem 2.5rem', borderRadius: '12px', border: '1px solid #fdba74', outline: 'none', boxSizing: 'border-box' }}
                                />
                                {searchPT && (
                                    <button onClick={() => setSearchPT('')} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', color: '#ea580c', borderRadius: '50%', transition: 'background 0.2s' }}>
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ color: '#c2410c', fontSize: '0.7rem', textTransform: 'uppercase', borderBottom: '2px solid #fdba74' }}>
                                    <th style={{ padding: '1rem', textAlign: 'left', width: '25%' }}>Producto Terminado</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', width: '15%' }}>Inv. Inicial (Editable)</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', width: '15%' }}>Stock Seg.</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', width: '15%' }}>Producción</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', width: '15%' }}>Pedidos / Ventas</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', width: '15%', color: '#9a3412' }}>Inv. Final</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items
                                    .filter(i => i.type === 'product' || i.type === 'PT' || i.category === 'Producto Terminado')
                                    .filter(i => !searchPT || (i.name || '').toLowerCase().includes(searchPT.toLowerCase()) || (i.sku || '').toLowerCase().includes(searchPT.toLowerCase()))
                                    .map(item => {
                                        const init = item.initial || 0;
                                        const currentInputVal = localInitialsPT[item.id] !== undefined ? localInitialsPT[item.id] : init;
                                        const calculationInit = localInitialsPT[item.id] !== undefined ? (parseFloat(localInitialsPT[item.id]) || 0) : init;
                                        const accProd = item.purchases || 0; // en PT, 'purchases' funge como produccion generada
                                        const accVentas = item.sales || 0;
                                        const fin = Math.round((calculationInit + accProd - accVentas) * 10) / 10;
                                        const stockSeg = item.min_stock_level || item.safety || 0;

                                        return (
                                            <tr key={item.id} style={{ borderBottom: '1px solid #ffedd5' }}>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ fontWeight: '800', color: '#7c2d12' }}>{item.name}</div>
                                                    <div style={{ fontSize: '0.7rem', color: '#c2410c' }}>{item.sku} | {item.unit_measure || item.unit}</div>
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                    <input
                                                        type="text"
                                                        value={currentInputVal}
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/[^0-9.]/g, '');
                                                            setLocalInitialsPT(prev => ({ ...prev, [item.id]: val }));
                                                        }}
                                                        onBlur={async (e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            setLocalInitialsPT(prev => ({ ...prev, [item.id]: val.toFixed(1) }));
                                                            await updateItem(item.id, { initial: val }); // Afectación en línea a la base de datos
                                                        }}
                                                        style={{ width: '80px', padding: '0.6rem', textAlign: 'center', border: '1px solid #fdba74', borderRadius: '8px', fontWeight: 'bold' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'center', color: '#c2410c' }}>{formatNum(stockSeg)}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center', color: '#16a34a' }}>+{formatNum(accProd)}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center', color: '#ef4444' }}>-{formatNum(accVentas)}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '900', color: '#9a3412', fontSize: '1.1rem' }}>{formatNum(fin)}</td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Valuation Dashboard */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem', marginTop: '1.5rem' }}>
                <div style={{
                    background: `linear-gradient(135deg, ${deepTeal} 0%, #037075 100%)`,
                    padding: '1.5rem 2rem',
                    borderRadius: '24px',
                    color: '#fff',
                    boxShadow: `0 15px 35px ${deepTeal}20`,
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.1 }}><Package size={120} /></div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7 }}>Valorización MP</span>
                        <div style={{ fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1.5px', lineHeight: 1, margin: '1rem 0' }}>
                            <span style={{ fontSize: '1.2rem', verticalAlign: 'top', marginRight: '4px', opacity: 0.4 }}>$</span>
                            {totalValueMP.toLocaleString()}
                        </div>
                    </div>
                </div>

                <div style={{
                    background: '#fff',
                    padding: '1.5rem 2rem',
                    borderRadius: '24px',
                    border: '1px solid rgba(2, 54, 54, 0.05)',
                    boxShadow: '0 15px 35px rgba(0,0,0,0.02)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05 }}><ArrowUpRight size={120} color={institutionOcre} /></div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Valorización PT</span>
                        <div style={{ fontSize: '2.5rem', fontWeight: '900', color: deepTeal, letterSpacing: '-1px', lineHeight: 1, margin: '1rem 0' }}>
                            <span style={{ fontSize: '1.2rem', verticalAlign: 'top', marginRight: '4px', opacity: 0.2 }}>$</span>
                            {totalValuePT.toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Critical Alerts Bar */}
            {pullSignals.length > 0 && (
                <div style={{ background: `linear-gradient(90deg, ${premiumSalmon} 0%, #B85B42 100%)`, padding: '1.2rem 2rem', borderRadius: '18px', color: '#fff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', boxShadow: `0 10px 30px ${premiumSalmon}20` }}>
                    <StatusTooltip>
                        <div style={{ width: '42px', height: '42px', background: 'rgba(255,255,255,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'help' }}>
                            <AlertCircle size={22} color="#fff" />
                        </div>
                    </StatusTooltip>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                            <div style={{ fontSize: '0.95rem', fontWeight: '900', letterSpacing: '-0.2px' }}>Protocolo de Reabastecimiento Crítico</div>
                            <button onClick={handleDismissAllPulls} style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.4)', background: 'transparent', color: '#fff', fontSize: '0.7rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s' }}>
                                CERRAR TODAS <X size={14} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                            {pullSignals.map(sig => (
                                <div key={sig.id} style={{ background: 'rgba(255,255,255,0.15)', padding: '0.6rem 1.2rem', borderRadius: '15px', fontSize: '0.85rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    {sig.name.toUpperCase()} <span style={{ opacity: 0.7 }}>|</span> {getFinalStock(sig)} {sig.unit_measure || sig.unit}
                                    <button onClick={() => handleDismissPull(sig.id)} style={{ border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', padding: '2px', opacity: 0.6 }}><X size={16} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '2rem', fontWeight: '900' }}>{pullSignals.length}</div>
                        <div style={{ fontSize: '0.7rem', fontWeight: '900', opacity: 0.8, textTransform: 'uppercase' }}>Alertas</div>
                    </div>
                </div>
            )}

            {/* Assets Matrix Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div style={{ background: glassWhite, backdropFilter: 'blur(10px)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(2, 54, 54, 0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: deepTeal }}>Inventario MP</h3>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input value={searchMP} onChange={e => setSearchMP(e.target.value)} placeholder="Filtrar..." style={{ padding: '0.6rem 1rem 0.6rem 2.5rem', border: '1px solid #f1f5f9', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '900', outline: 'none', background: '#fcfcfc' }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        {items.filter(i => (i.type === 'material' || i.category === 'Materia Prima' || i.category === 'Insumo' || i.category === 'Insumos') && (i.name || '').toLowerCase().includes(searchMP.toLowerCase())).map(item => {
                            const status = getStatus(item);
                            const color = getStatusColor(status);
                            return (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.2rem', background: '#fff', borderRadius: '14px', border: '1px solid #f8fafc', transition: 'all 0.3s' }} className="inventory-row-hover">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${deepTeal}08`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: deepTeal }}><Package size={18} /></div>
                                        <div>
                                            <div style={{ fontWeight: '900', fontSize: '0.95rem', color: '#1e293b' }}>{item.name.toUpperCase()}</div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: '900', color: institutionOcre, marginTop: '2px' }}>{item.unit_measure || item.unit} | {item.sku}</div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.2rem', fontWeight: '900', color: institutionOcre }}>{formatNum(getFinalStock(item))}</div>
                                        <div style={{ fontSize: '0.6rem', fontWeight: '900', color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{status}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div style={{ background: glassWhite, backdropFilter: 'blur(10px)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(2, 54, 54, 0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: deepTeal }}>Inventario PT</h3>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input value={searchPT} onChange={e => setSearchPT(e.target.value)} placeholder="Filtrar..." style={{ padding: '0.6rem 1rem 0.6rem 2.5rem', border: '1px solid #f1f5f9', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '900', outline: 'none', background: '#fcfcfc' }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        {items.filter(i => (i.type === 'product' || i.type === 'PT' || i.category === 'Producto Terminado') && (i.name || '').toLowerCase().includes(searchPT.toLowerCase())).map(item => {
                            const status = getStatus(item);
                            const color = getStatusColor(status);
                            return (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.2rem', background: '#fff', borderRadius: '14px', border: '1px solid #f8fafc', transition: 'all 0.3s' }} className="inventory-row-hover">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${institutionOcre}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: institutionOcre }}><ArrowUpRight size={18} /></div>
                                        <div>
                                            <div style={{ fontWeight: '900', fontSize: '0.95rem', color: '#1e293b' }}>{item.name.toUpperCase()}</div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: '900', color: deepTeal, marginTop: '2px', opacity: 0.6 }}>{item.min_stock_level || item.safety} {item.unit_measure || item.unit} | {item.sku}</div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.2rem', fontWeight: '900', color }}>{getFinalStock(item)}</div>
                                        <div style={{ fontSize: '0.6rem', fontWeight: '950', color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{status === 'OPTIMAL' ? 'STOCK OK' : status}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
                input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                input[type=number] { -moz-appearance: textfield; }
                .inventory-row-hover:hover { transform: translateY(-3px); box-shadow: 0 10px 30px rgba(0,0,0,0.04); border-color: ${institutionOcre}40 !important; }
            `}</style>
        </div>
    );
};

export default Inventory;
