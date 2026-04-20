import React, { useState, useMemo } from 'react';
import { AlertCircle, RefreshCw, Package, Save, X, ArrowUpRight, Search, Lightbulb, AlertTriangle, Calendar } from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';

const formatNum = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return Number(num).toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
    });
};

const Inventory = () => {
    const { user } = useAuth();
    const { 
        items, updateItem, recipes, createInternalOrder, orders, purchaseOrders,
        siteContent, updateInventoryConfig, auditStockAdjustment
    } = useBusiness();
    const [searchMP, setSearchMP] = useState('');
    const [searchPT, setSearchPT] = useState('');
    const [historyWindow, setHistoryWindow] = useState(30); // 30, 60 or 'total'

    const [activeTab, setActiveTab] = useState('MP');
    const activeTabTitle = activeTab === 'MP' ? 'Gestión de Insumos (Materia Prima)' : 'Gestión de Producto Terminado (Planta)';
    const [selectedPulls, setSelectedPulls] = useState(new Set());
    const [isGenerating, setIsGenerating] = useState(false);
    const redThreshold = siteContent?.inventory?.config?.redThreshold || 0.5;
    const [isSimulated, setIsSimulated] = useState(false);
    const [neededMPForSelection, setNeededMPForSelection] = useState({});

    const getFinalStock = (item) => Math.round(((item.initial || 0) + (item.purchases || 0) - (item.sales || 0)) * 10) / 10;

    const pullSignals = (items || []).filter(item =>
        getFinalStock(item) < (item.safety || 0)
    );

    const getStatus = (item) => {
        const stock = getFinalStock(item);
        const safety = Number(item.safety) || Number(item.min_stock_level) || 0;
        if (stock < safety * redThreshold) return 'CRITICAL';
        if (stock < safety) return 'LOW';
        return 'OPTIMAL';
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'CRITICAL': return '#ef4444';
            case 'LOW': return '#f59e0b'; // Amarillo/Ámbar claro para nivel de advertencia
            default: return '#10b981';
        }
    };

    const totalValueMP = items
        .filter(i => i.type === 'material' || i.category === 'Materia Prima' || i.category === 'Insumo')
        .reduce((acc, i) => acc + (getFinalStock(i) * (i.avgCost || 0)), 0);

    const totalValuePT = items
        .filter(i => i.type === 'product' || i.type === 'PT')
        .reduce((acc, i) => acc + (getFinalStock(i) * (i.price || 0)), 0);

    const deepTeal = "#023636";
    const institutionOcre = "#D4785A";

    const windowMovements = useMemo(() => {
        const mv = {};
        const now = new Date();
        const cutoff = historyWindow === 'total' ? null : new Date(now.setDate(now.getDate() - historyWindow));

        const isRecent = (dateStr) => {
            if (!cutoff) return true;
            if (!dateStr) return false;
            return new Date(dateStr) >= cutoff;
        };

        // 1. Sales (From Orders)
        orders.forEach(order => {
            if (isRecent(order.date)) {
                (order.items || []).forEach(it => {
                    const sku = it.name;
                    if (!mv[sku]) mv[sku] = { purchases: 0, sales: 0 };
                    mv[sku].sales += Number(it.quantity) || 0;
                });
            }
        });

        // 2. Purchases (From POs)
        (purchaseOrders || []).forEach(po => {
            if (isRecent(po.date)) {
                (po.items || []).forEach(it => {
                    const sku = it.name;
                    if (!mv[sku]) mv[sku] = { purchases: 0, sales: 0 };
                    mv[sku].purchases += Number(it.quantity) || 0;
                });
            }
        });

        return mv;
    }, [orders, purchaseOrders, historyWindow]);

    const [localInitialsMP, setLocalInitialsMP] = useState({});
    const [localInitialsPT, setLocalInitialsPT] = useState({});

    const handleAuditAdjustment = async (item, newVal) => {
        const oldVal = getFinalStock(item);
        if (Number(newVal) === oldVal) return;

        if (window.confirm(`⚠️ AJUSTE DE AUDITORÍA\n\n¿Deseas corregir el stock de "${item.name}"?\nAnterior: ${oldVal}\nNuevo: ${newVal}\n\nEste movimiento quedará registrado permanentemente.`)) {
            const reason = window.prompt("Escribe el MOTIVO del ajuste (mínimo 5 caracteres):", "Auditoría de inventario físico");
            
            if (!reason || reason.trim().length < 5) {
                alert("❌ El motivo es obligatorio para registrar el ajuste.");
                return;
            }

            const res = await auditStockAdjustment(item.id, newVal, reason, user);
            if (res.success) {
                alert("✅ Stock ajustado y registrado correctamente.");
            } else {
                alert("❌ Error: " + res.error);
            }
        }
    };

    return (
        <div style={{ padding: '2rem', minHeight: '100vh', background: '#fff', animation: 'fadeUp 0.6s ease-out' }}>
            {/* Master Dashboard Header */}
            <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '950', color: deepTeal, letterSpacing: '-1px' }}>DASHBOARD MAESTRO DE INVENTARIO</h1>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600', marginTop: '4px' }}>Control centralizado de existencias, valorización y reabastecimiento crítico.</div>
                </div>
            </div>

            {/* Valuation Dashboard */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
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
                        <span style={{ fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7 }}>Valor de Materia Prima</span>
                        <div style={{ fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1.5px', lineHeight: 1, margin: '1rem 0' }}>
                            <span style={{ fontSize: '1.2rem', verticalAlign: 'top', marginRight: '4px', opacity: 0.4 }}>$</span>
                            {Math.round(totalValueMP).toLocaleString()}
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
                        <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Valor de Producto Terminado</span>
                        <div style={{ fontSize: '2.5rem', fontWeight: '900', color: deepTeal, letterSpacing: '-1px', lineHeight: 1, margin: '1rem 0' }}>
                            <span style={{ fontSize: '1.2rem', verticalAlign: 'top', marginRight: '4px', opacity: 0.2 }}>$</span>
                            {Math.round(totalValuePT).toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            {/* LOGICA DE REABASTECIMIENTO ASISTIDO */}
            {(() => {
                const ptPulls = pullSignals.filter(s => s.type === 'product');
                const mpPulls = pullSignals.filter(s => s.type === 'material');
                
                // Helper to check for active internal orders
                const hasActiveInternalOrder = (itemName) => {
                    return orders.some(o => 
                        (o.client === 'Stock Interno' || o.client_id === 'INTERNAL_STOCK') && 
                        o.status !== 'delivered' && 
                        (o.items || []).some(oi => oi.name?.toLowerCase().trim() === itemName.toLowerCase().trim())
                    );
                };

                const simulateRequirements = () => {
                    const requirements = {};
                    const selectedPTItems = ptPulls.filter(p => selectedPulls.has(p.name));
                    
                    selectedPTItems.forEach(pt => {
                        const recipe = recipes[pt.id] || recipes[pt.name?.toLowerCase().trim()] || [];
                        recipe.forEach(ingredient => {
                            const ingName = ingredient.name?.toLowerCase().trim();
                            const qtyNeeded = Number(ingredient.qty);
                            if (ingName) {
                                requirements[ingName] = (requirements[ingName] || 0) + qtyNeeded;
                            }
                        });
                    });
                    
                    setNeededMPForSelection(requirements);
                    setIsSimulated(true);
                    
                    const newSelection = new Set(selectedPulls);
                    Object.keys(requirements).forEach(reqName => {
                        const material = items.find(i => i.name?.toLowerCase().trim() === reqName);
                        if (material) newSelection.add(material.name);
                    });
                    setSelectedPulls(newSelection);
                };

                const handleGenerateOrders = async () => {
                    const selectedArr = Array.from(selectedPulls);
                    if (selectedArr.length === 0) return;
                    
                    setIsGenerating(true);
                    try {
                        // All selected items go to the order. 
                        // The backend will distinguish between PT and MP.
                        const res = await createInternalOrder(selectedArr);
                        if (res.success) {
                            setSelectedPulls(new Set());
                            setIsSimulated(false);
                            setNeededMPForSelection({});
                            alert(`🚀 Éxito: Se ha generado el Lote de Reabastecimiento para ${selectedArr.length} ítems.`);
                        }
                    } catch (err) {
                        alert("Error al generar: " + err.message);
                    } finally {
                        setIsGenerating(false);
                    }
                };

                const toggleSelect = (name) => {
                    const next = new Set(selectedPulls);
                    if (next.has(name)) next.delete(name);
                    else next.add(name);
                    setSelectedPulls(next);
                };

                return pullSignals.length > 0 && (
                    <div style={{ padding: '2rem', background: '#fff', borderRadius: '32px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)', marginBottom: '2.5rem', border: '1px solid rgba(0,0,0,0.05)', animation: 'fadeUp 0.6s ease-out' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', marginBottom: '2rem' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c', border: '1px solid #fed7aa' }}>
                                <RefreshCw className={isGenerating ? 'animate-spin' : ''} size={28} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: '950', color: '#1e293b', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    PROTOCOLO DE REABASTECIMIENTO ASISTIDO
                                    <span style={{ fontSize: '0.75rem', background: '#ea580c', color: '#fff', padding: '3px 10px', borderRadius: '20px', fontWeight: '900' }}>{pullSignals.length} ALERTAS</span>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Gestión inteligente de demanda interna. Define el umbral de prioridad roja abajo.</div>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div title="Define bajo qué % de la meta el producto se torna Rojo (Urgente)" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: '0.65rem', fontWeight: '900', color: '#64748b', textAlign: 'right' }}>UMBRAL CRÍTICO (ROJO)</label>
                                    <select 
                                        value={redThreshold}
                                        onChange={async (e) => {
                                            const val = parseFloat(e.target.value);
                                            if (window.confirm(`⚠️ ¿Deseas establecer el UMBRAL INSTITUCIONAL de alerta roja al ${val * 100}%?\n\nEsto afectará la visibilidad del tablero para todos los usuarios.`)) {
                                                await updateInventoryConfig(val);
                                            }
                                        }}
                                        style={{ padding: '0.5rem', borderRadius: '10px', border: '2px solid #e2e8f0', background: '#fff', fontSize: '0.75rem', fontWeight: '800', outline: 'none', cursor: 'pointer', color: '#ea580c' }}
                                    >
                                        <option value={0.1}>10% (Muy Arriesgado)</option>
                                        <option value={0.2}>20% (Agresivo)</option>
                                        <option value={0.3}>30% (Moderado-Agresivo)</option>
                                        <option value={0.5}>50% (Equilibrado)</option>
                                        <option value={0.7}>70% (Conservador)</option>
                                    </select>
                                </div>
                                <button onClick={() => { setSelectedPulls(new Set()); setIsSimulated(false); setNeededMPForSelection({}); }} style={{ padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: '0.75rem', fontWeight: '900', cursor: 'pointer', marginTop: '14px' }}>
                                    LIMPIAR SELECCIÓN
                                </button>
                            </div>
                        </div>

                        <div style={{ marginBottom: '2.5rem' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '950', color: '#94a3b8', letterSpacing: '1.5px', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ flex: 1, height: '1px', background: '#f1f5f9' }}></div>
                                1. PRODUCTO TERMINADO (DEMANDA DE VENTA)
                                <div style={{ flex: 1, height: '1px', background: '#f1f5f9' }}></div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.2rem' }}>
                                {ptPulls.map(sig => {
                                    const status = getStatus(sig);
                                    const color = getStatusColor(status);
                                    const needsRecipe = !recipes[sig.id] && !recipes[sig.name?.toLowerCase().trim()];
                                    const isSelected = selectedPulls.has(sig.name);
                                    const inFlight = hasActiveInternalOrder(sig.name);

                                    return (
                                        <div key={sig.id} 
                                            onClick={() => (!needsRecipe && !inFlight) && toggleSelect(sig.name)}
                                            style={{ 
                                                padding: '1.2rem', borderRadius: '20px', 
                                                background: inFlight ? '#f1f5f9' : (isSelected ? '#fff7ed' : '#f8fafc'), 
                                                border: `2px solid ${inFlight ? '#cbd5e1' : (isSelected ? '#ea580c' : 'rgba(0,0,0,0.02)')}`,
                                                cursor: (needsRecipe || inFlight) ? 'default' : 'pointer', 
                                                transition: 'all 0.2s', position: 'relative', 
                                                opacity: (needsRecipe || (inFlight && !isSelected)) ? 0.6 : 1
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                                                {!needsRecipe && !inFlight && (
                                                    <div style={{ width: '22px', height: '22px', border: `2px solid ${isSelected ? '#ea580c' : '#cbd5e1'}`, borderRadius: '6px', background: isSelected ? '#ea580c' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {isSelected && <Package size={14} color="#fff" />}
                                                    </div>
                                                )}
                                                {inFlight && <div style={{ fontSize: '0.65rem', fontWeight: '950', background: '#cbd5e1', color: '#64748b', padding: '3px 8px', borderRadius: '6px' }}>⚙️ EN PROCESO</div>}
                                                <div style={{ padding: '3px 8px', borderRadius: '6px', background: color, color: '#fff', fontSize: '0.6rem', fontWeight: '950' }}>{status}</div>
                                            </div>
                                            <div style={{ fontWeight: '900', color: '#1e293b', fontSize: '0.9rem', marginBottom: '4px' }}>{sig.name.toUpperCase()}</div>
                                            <div style={{ fontSize: '1rem', fontWeight: '950', color: inFlight ? '#64748b' : color }}>
                                                {getFinalStock(sig)} <span style={{ opacity: 0.4, fontSize: '0.75rem' }}>/ {sig.safety} {sig.unit}</span>
                                            </div>
                                            {needsRecipe && (
                                                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', color: '#ea580c', background: '#fff', padding: '4px 8px', borderRadius: '8px', border: '1px solid #fed7aa' }}>
                                                    <AlertTriangle size={14} />
                                                    <span style={{ fontSize: '0.65rem', fontWeight: '950' }}>SIN RECETA</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {selectedPulls.size > 0 && Array.from(selectedPulls).some(n => ptPulls.some(p => p.name === n)) && !isSimulated && (
                                <button 
                                    onClick={simulateRequirements}
                                    disabled={isGenerating}
                                    style={{ width: '100%', marginTop: '1.5rem', padding: '1rem', borderRadius: '16px', background: '#334155', color: '#fff', border: 'none', fontWeight: '950', fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 8px 25px rgba(51, 65, 85, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    <Search size={18} /> 🔍 SIMULAR REQUERIMIENTO (EXPLOSIÓN DE MATERIALES)
                                </button>
                            )}
                        </div>

                        <div style={{ marginTop: '2.5rem' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: '950', color: '#94a3b8', letterSpacing: '1.5px', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ flex: 1, height: '1px', background: '#f1f5f9' }}></div>
                                2. MATERIA PRIMA (SUMINISTROS)
                                <div style={{ flex: 1, height: '1px', background: '#f1f5f9' }}></div>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                                {mpPulls.map(sig => {
                                    const status = getStatus(sig);
                                    const color = getStatusColor(status);
                                    const isSelected = selectedPulls.has(sig.name);
                                    const isLinked = isSimulated && neededMPForSelection[sig.name?.toLowerCase().trim()];
                                    const inFlight = hasActiveInternalOrder(sig.name);

                                    return (
                                        <div key={sig.id} 
                                            onClick={() => !inFlight && toggleSelect(sig.name)}
                                            style={{ 
                                                padding: '1rem', borderRadius: '16px', 
                                                background: inFlight ? '#f1f5f9' : (isLinked ? '#fff7ed' : (isSelected ? '#f0f9ff' : '#f8fafc')), 
                                                border: `2px solid ${inFlight ? '#cbd5e1' : (isLinked ? '#ea580c' : (isSelected ? '#0ea5e9' : 'rgba(0,0,0,0.02)'))}`,
                                                cursor: inFlight ? 'default' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '12px',
                                                boxShadow: isLinked ? '0 4px 15px rgba(234, 88, 12, 0.15)' : 'none',
                                                opacity: inFlight ? 0.6 : 1
                                            }}
                                        >
                                            <div style={{ width: '18px', height: '18px', border: `2px solid ${isLinked ? '#ea580c' : (isSelected ? '#0ea5e9' : '#cbd5e1')}`, borderRadius: '6px', background: isLinked ? '#ea580c' : (isSelected ? '#0ea5e9' : '#fff'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {(isSelected || isLinked) && <Package size={12} color="#fff" />}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                                                    {sig.name.toUpperCase()}
                                                    {inFlight && <span style={{ fontSize: '0.6rem', color: '#64748b' }}>⚙️ EN COLA</span>}
                                                </div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: '950', color: isLinked ? '#ea580c' : color }}>
                                                    {getFinalStock(sig)} <span style={{ opacity: 0.4, fontSize: '0.75rem' }}>/ {sig.safety}</span>
                                                    {isLinked && <span style={{ marginLeft: '10px', fontSize: '0.65rem', color: '#ea580c', background: '#fff', padding: '2px 6px', borderRadius: '4px' }}>NECESARIO: {neededMPForSelection[sig.name?.toLowerCase().trim()]}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {selectedPulls.size > 0 && (
                                <button 
                                    onClick={handleGenerateOrders}
                                    disabled={isGenerating}
                                    style={{ width: '100%', marginTop: '2rem', padding: '1.2rem', borderRadius: '20px', background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', color: '#fff', border: 'none', fontWeight: '950', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 12px 30px rgba(30, 41, 59, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', animation: isSimulated ? 'pulse 2s infinite' : 'none' }}
                                >
                                    🚀 GENERAR ÓRDENES CONSOLIDADAS (REABASTECIMIENTO INVENTARIO)
                                </button>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Navigation Tabs for Management Gallery */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                <button 
                    onClick={() => setActiveTab(activeTab === 'MP' ? null : 'MP')}
                    style={{ 
                        padding: '1.25rem 2rem', 
                        borderRadius: '20px', 
                        border: activeTab === 'MP' ? 'none' : `2px solid ${deepTeal}20`, 
                        background: activeTab === 'MP' ? deepTeal : `${deepTeal}08`, 
                        color: activeTab === 'MP' ? '#fff' : deepTeal, 
                        fontWeight: '950', 
                        fontSize: '0.9rem', 
                        cursor: 'pointer', 
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: activeTab === 'MP' ? `0 15px 35px ${deepTeal}40` : 'none',
                        flex: 1,
                        letterSpacing: '0.5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.8rem'
                    }}
                    onMouseEnter={e => { if(activeTab !== 'MP') { e.currentTarget.style.background = `${deepTeal}15`; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                    onMouseLeave={e => { if(activeTab !== 'MP') { e.currentTarget.style.background = `${deepTeal}08`; e.currentTarget.style.transform = 'translateY(0)'; } }}
                >
                    <Package size={20} /> GESTIÓN MP (MATERIA PRIMA)
                </button>
                <button 
                    onClick={() => setActiveTab(activeTab === 'PT' ? null : 'PT')}
                    style={{ 
                        padding: '1.25rem 2rem', 
                        borderRadius: '20px', 
                        border: activeTab === 'PT' ? 'none' : '2px solid rgba(234, 88, 12, 0.2)', 
                        background: activeTab === 'PT' ? '#ea580c' : 'rgba(234, 88, 12, 0.08)', 
                        color: activeTab === 'PT' ? '#fff' : '#ea580c', 
                        fontWeight: '950', 
                        fontSize: '0.9rem', 
                        cursor: 'pointer', 
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: activeTab === 'PT' ? `0 15px 35px #ea580c40` : 'none',
                        flex: 1,
                        letterSpacing: '0.5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.8rem'
                    }}
                    onMouseEnter={e => { if(activeTab !== 'PT') { e.currentTarget.style.background = 'rgba(234, 88, 12, 0.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                    onMouseLeave={e => { if(activeTab !== 'PT') { e.currentTarget.style.background = 'rgba(234, 88, 12, 0.08)'; e.currentTarget.style.transform = 'translateY(0)'; } }}
                >
                    <RefreshCw size={20} /> GESTIÓN PT (PRODUCTO TERMINADO)
                </button>
            </div>

            {activeTab === 'MP' && (
                <div style={{ background: '#fff', borderRadius: '24px', padding: '2rem', border: '1px solid rgba(0,0,0,0.05)', marginBottom: '2.5rem', animation: 'fadeUp 0.5s ease-out' }}>
                    <div style={{ marginBottom: '1.5rem', borderLeft: `4px solid ${deepTeal}`, paddingLeft: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '1.1rem', fontWeight: '900', color: deepTeal, letterSpacing: '0.5px' }}>FÓRMULA DE OPERACIÓN MP</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>Inv. Inicial + Compras - Producción = <b style={{ color: deepTeal }}>Inventario Final MP</b></div>
                        </div>

                        {/* History Window Selector (Inline) */}
                        <div style={{ background: '#f1f5f9', padding: '4px', borderRadius: '14px', display: 'flex', gap: '4px', border: '1px solid #e2e8f0' }}>
                            {[
                                { val: 30, label: '30 D' },
                                { val: 60, label: '60 D' },
                                { val: 'total', label: 'TODO' }
                            ].map(opt => (
                                <button
                                    key={opt.val}
                                    onClick={() => setHistoryWindow(opt.val)}
                                    style={{
                                        padding: '0.4rem 0.8rem',
                                        borderRadius: '10px',
                                        border: 'none',
                                        fontSize: '0.65rem',
                                        fontWeight: '900',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        background: historyWindow === opt.val ? deepTeal : 'transparent',
                                        color: historyWindow === opt.val ? '#fff' : '#64748b'
                                    }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                placeholder="Buscar SKU / MP..."
                                value={searchMP}
                                onChange={(e) => setSearchMP(e.target.value)}
                                style={{ 
                                    padding: '0.6rem 1rem 0.6rem 2.8rem', 
                                    borderRadius: '12px', 
                                    border: '1px solid #e2e8f0', 
                                    fontSize: '0.85rem', 
                                    width: '250px',
                                    fontWeight: '600',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                                }}
                                onFocus={(e) => e.target.style.borderColor = deepTeal}
                                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            />
                        </div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                    <tr style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0' }}>
                                        <th style={{ padding: '1rem', textAlign: 'left', width: '25%' }}>Insumo / MP</th>
                                        <th style={{ padding: '1rem', textAlign: 'center' }}>
                                            {historyWindow === 'total' ? 'Inv. Inicial (Maestro)' : `Stock Inicial (${historyWindow}d)`}
                                        </th>
                                        <th style={{ padding: '1rem', textAlign: 'center' }}>Meta / Seg.</th>
                                        <th style={{ padding: '1rem', textAlign: 'center' }}>
                                            {historyWindow === 'total' ? 'Compras (+)' : `Compras (+${historyWindow}d)`}
                                        </th>
                                        <th style={{ padding: '1rem', textAlign: 'center' }}>
                                            {historyWindow === 'total' ? 'Producción (-)' : `Producción (-${historyWindow}d)`}
                                        </th>
                                        <th style={{ padding: '1rem', textAlign: 'center', color: deepTeal }}>Stock Final</th>
                                    </tr>
                            </thead>
                            <tbody>
                                {items
                                    .filter(i => (i.type === 'material' || i.category === 'Materia Prima' || i.category === 'Insumo' || i.category === 'Insumos') && i.name.toLowerCase().includes(searchMP.toLowerCase()))
                                    .sort((a,b) => (a.name || '').localeCompare(b.name || ''))
                                    .map(item => {
                                        const trueFinal = getFinalStock(item);
                                        const win = windowMovements[item.name] || { purchases: 0, sales: 0 };
                                        
                                        const displayPurchases = historyWindow === 'total' ? (item.purchases || 0) : win.purchases;
                                        const displaySales = historyWindow === 'total' ? (item.sales || 0) : win.sales;

                                        // Opening Stock logic
                                        // If total: is the master initial. If window: is Final - WindowPurchases + WindowSales
                                        const masterInit = item.initial || 0;
                                        const calculatedOpening = historyWindow === 'total' ? masterInit : (trueFinal - win.purchases + win.sales);
                                        
                                        const currentInputVal = localInitialsMP[item.id] !== undefined ? localInitialsMP[item.id] : calculatedOpening.toFixed(1);
                                        const stockSeg = item.min_stock_level || item.safety || 0;

                                        return (
                                            <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ fontWeight: '800', color: '#1e293b' }}>{item.name.toUpperCase()}</div>
                                                    <div style={{ fontSize: '0.7rem', color: '#64748b', opacity: 0.6 }}>{item.unit_measure || item.unit}</div>
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                    <input
                                                        type="text"
                                                        value={currentInputVal}
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/[^0-9.-]/g, ''); // Permitimos negativos para correcciones ácidas
                                                            setLocalInitialsMP(prev => ({ ...prev, [item.id]: val }));
                                                        }}
                                                        onBlur={async (e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            setLocalInitialsMP(prev => ({ ...prev, [item.id]: val.toFixed(1) }));
                                                            await handleAuditAdjustment(item, val);
                                                        }}
                                                        style={{ 
                                                            width: '85px', 
                                                            padding: '0.6rem', 
                                                            textAlign: 'center', 
                                                            border: '1px solid #cbd5e1', 
                                                            borderRadius: '10px', 
                                                            fontWeight: '900', 
                                                            color: deepTeal,
                                                            background: '#fff',
                                                            cursor: 'text'
                                                        }}
                                                    />
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontWeight: '700' }}>{formatNum(stockSeg)}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center', color: '#16a34a', fontWeight: '700' }}>+{formatNum(displayPurchases)}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center', color: '#ef4444', fontWeight: '700' }}>-{formatNum(displaySales)}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '950', color: deepTeal, fontSize: '1.1rem' }}>{formatNum(trueFinal)}</td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'PT' && (
                <div style={{ background: '#fff', borderRadius: '24px', padding: '2rem', border: '1px solid rgba(0,0,0,0.05)', marginBottom: '2.5rem', animation: 'fadeUp 0.5s ease-out' }}>
                    <div style={{ marginBottom: '1.5rem', borderLeft: `4px solid #ea580c`, paddingLeft: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ea580c', letterSpacing: '0.5px' }}>FÓRMULA DE OPERACIÓN PT</div>
                            <div style={{ fontSize: '0.85rem', color: '#c2410c', marginTop: '4px' }}>Inv. Inicial PT + Producción - Pedidos = <b style={{ color: '#ea580c' }}>Inventario Final PT</b></div>
                        </div>

                        {/* History Window Selector (Inline) */}
                        <div style={{ background: '#fff7ed', padding: '4px', borderRadius: '14px', display: 'flex', gap: '4px', border: '1px solid #fdba74' }}>
                            {[
                                { val: 30, label: '30 D' },
                                { val: 60, label: '60 D' },
                                { val: 'total', label: 'TODO' }
                            ].map(opt => (
                                <button
                                    key={opt.val}
                                    onClick={() => setHistoryWindow(opt.val)}
                                    style={{
                                        padding: '0.4rem 0.8rem',
                                        borderRadius: '10px',
                                        border: 'none',
                                        fontSize: '0.65rem',
                                        fontWeight: '900',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        background: historyWindow === opt.val ? '#ea580c' : 'transparent',
                                        color: historyWindow === opt.val ? '#fff' : '#c2410c'
                                    }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#ea580c', opacity: 0.5 }} />
                            <input
                                placeholder="Buscar Producto / SKU..."
                                value={searchPT}
                                onChange={(e) => setSearchPT(e.target.value)}
                                style={{ 
                                    padding: '0.6rem 1rem 0.6rem 2.8rem', 
                                    borderRadius: '12px', 
                                    border: '1px solid #fdba74', 
                                    fontSize: '0.85rem', 
                                    width: '250px',
                                    fontWeight: '600',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#ea580c'}
                                onBlur={(e) => e.target.style.borderColor = '#fdba74'}
                            />
                        </div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ color: '#c2410c', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '2px solid #fdba74' }}>
                                    <th style={{ padding: '1rem', textAlign: 'left', width: '25%' }}>Producto Terminado</th>
                                    <th style={{ padding: '1rem', textAlign: 'center' }}>
                                        {historyWindow === 'total' ? 'Inv. Inicial (Maestro)' : `Stock Inicial (${historyWindow}d)`}
                                    </th>
                                    <th style={{ padding: '1rem', textAlign: 'center' }}>Meta / Seg.</th>
                                    <th style={{ padding: '1rem', textAlign: 'center' }}>
                                        {historyWindow === 'total' ? 'Producción (+)' : `Producción (+${historyWindow}d)`}
                                    </th>
                                    <th style={{ padding: '1rem', textAlign: 'center' }}>
                                        {historyWindow === 'total' ? 'Ventas (-)' : `Ventas (-${historyWindow}d)`}
                                    </th>
                                    <th style={{ padding: '1rem', textAlign: 'center', color: '#ea580c' }}>Stock Final</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items
                                    .filter(i => (i.type === 'product' || i.type === 'PT') && i.name.toLowerCase().includes(searchPT.toLowerCase()))
                                    .sort((a,b) => (a.name || '').localeCompare(b.name || ''))
                                    .map(item => {
                                        const trueFinal = getFinalStock(item);
                                        const win = windowMovements[item.name] || { purchases: 0, sales: 0 };
                                        
                                        const displayProd = historyWindow === 'total' ? (item.purchases || 0) : win.purchases;
                                        const displaySales = historyWindow === 'total' ? (item.sales || 0) : win.sales;

                                        // Opening Stock logic
                                        const masterInit = item.initial || 0;
                                        const calculatedOpening = historyWindow === 'total' ? masterInit : (trueFinal - win.purchases + win.sales);
                                        
                                        const currentInputVal = localInitialsPT[item.id] !== undefined ? localInitialsPT[item.id] : calculatedOpening.toFixed(1);
                                        const stockSeg = item.min_stock_level || item.safety || 0;

                                        return (
                                            <tr key={item.id} style={{ borderBottom: '1px solid #fff7ed' }}>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ fontWeight: '800', color: '#1e293b' }}>{item.name.toUpperCase()}</div>
                                                        {(!recipes[item.id] && !recipes[item.name?.toLowerCase().trim()]) && (
                                                            <div title="URGENTE: Crear receta para activar producción automática" style={{ 
                                                                color: '#ea580c', background: '#fff7ed', padding: '4px 8px', borderRadius: '8px', border: '1px solid #fdba74',
                                                                display: 'flex', alignItems: 'center', gap: '6px', animation: 'pulse 2s infinite' 
                                                            }}>
                                                                <AlertTriangle size={14} />
                                                                <span style={{ fontSize: '0.65rem', fontWeight: '950' }}>SIN RECETA</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', color: '#ea580c', opacity: 0.6 }}>{item.unit_measure || item.unit}</div>
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                    <input
                                                        type="text"
                                                        value={currentInputVal}
                                                        readOnly={historyWindow !== 'total'}
                                                        onChange={(e) => {
                                                            if (historyWindow !== 'total') return;
                                                            const val = e.target.value.replace(/[^0-9.]/g, '');
                                                            setLocalInitialsPT(prev => ({ ...prev, [item.id]: val }));
                                                        }}
                                                        onBlur={async (e) => {
                                                            if (historyWindow !== 'total') return;
                                                            const val = parseFloat(e.target.value) || 0;
                                                            setLocalInitialsPT(prev => ({ ...prev, [item.id]: val.toFixed(1) }));
                                                            await handleAuditAdjustment(item, val);
                                                        }}
                                                        style={{ 
                                                            width: '85px', 
                                                            padding: '0.6rem', 
                                                            textAlign: 'center', 
                                                            border: '1px solid #fdba74', 
                                                            borderRadius: '10px', 
                                                            fontWeight: '900', 
                                                            color: '#ea580c',
                                                            background: historyWindow !== 'total' ? '#fff7ed' : '#fff',
                                                            opacity: historyWindow !== 'total' ? 0.7 : 1,
                                                            cursor: historyWindow !== 'total' ? 'not-allowed' : 'text'
                                                        }}
                                                    />
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'center', color: '#c2410c', fontWeight: '700' }}>{formatNum(stockSeg)}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center', color: '#16a34a', fontWeight: '700' }}>+{formatNum(displayProd)}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center', color: '#ef4444', fontWeight: '700' }}>-{formatNum(displaySales)}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '950', color: '#ea580c', fontSize: '1.1rem' }}>{formatNum(trueFinal)}</td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Assets Matrix Grid — Sorted & Compact */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                {/* MP COLUMN */}
                <div style={{ background: '#fff', borderRadius: '24px', padding: '1.5rem', border: '1px solid rgba(0,0,0,0.05)', height: 'fit-content' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                        <div style={{ fontSize: '1rem', fontWeight: '900', color: deepTeal, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <Package size={18} /> INVENTARIO MP
                        </div>
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                placeholder="Filtrar..."
                                value={searchMP}
                                onChange={(e) => setSearchMP(e.target.value)}
                                style={{ padding: '0.4rem 0.8rem 0.4rem 2rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.75rem', width: '150px' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {items
                            .filter(i => (i.type === 'material' || i.category === 'Materia Prima' || i.category === 'Insumo' || i.category === 'Insumos') && i.name.toLowerCase().includes(searchMP.toLowerCase()))
                            .sort((a,b) => {
                                const priority = { 'CRITICAL': 0, 'LOW': 1, 'STOCK OK': 2, 'OPTIMAL': 2 };
                                const diff = priority[getStatus(a)] - priority[getStatus(b)];
                                if (diff !== 0) return diff;
                                return (a.name || '').localeCompare(b.name || '');
                            })
                            .map(item => {
                                const status = getStatus(item);
                                const color = getStatusColor(status);
                                const stock = getFinalStock(item);
                                const goal = item.min_stock_level || item.safety || 0;
                                return (
                                    <div 
                                        key={item.id} 
                                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                                        style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center', 
                                            padding: '0.7rem 1rem', 
                                            background: '#f8fafc', 
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            border: `1px solid ${status === 'STOCK OK' || status === 'OPTIMAL' ? 'transparent' : color + '20'}`,
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.transform = 'translateX(0)'; }}
                                    >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                                <div style={{ padding: '0.4rem', borderRadius: '8px', background: '#fff', border: '1px solid #e2e8f0', color: deepTeal }}>
                                                    <Package size={14} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1e293b' }}>{item.name.toUpperCase()}</div>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: '900', color: '#64748b' }}>Meta: {goal} <span style={{ fontSize: '0.55rem', opacity: 0.8 }}>{item.unit_measure || item.unit}</span></div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: '950', color: stock === 0 ? '#cbd5e1' : '#1e293b' }}>
                                                    {stock} <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>{item.unit_measure || item.unit}</span>
                                                </div>
                                                <div style={{ fontSize: '0.55rem', fontWeight: '900', color, textTransform: 'uppercase' }}>{status === 'OPTIMAL' ? 'STOCK OK' : status}</div>
                                            </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>

                {/* PT COLUMN */}
                <div style={{ background: '#fff', borderRadius: '24px', padding: '1.5rem', border: '1px solid rgba(0,0,0,0.05)', height: 'fit-content' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                        <div style={{ fontSize: '1rem', fontWeight: '900', color: '#ea580c', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <ArrowUpRight size={18} /> INVENTARIO PT
                        </div>
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                placeholder="Filtrar..."
                                value={searchPT}
                                onChange={(e) => setSearchPT(e.target.value)}
                                style={{ padding: '0.4rem 0.8rem 0.4rem 2rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.75rem', width: '150px' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {items
                            .filter(i => (i.type === 'product' || i.type === 'PT') && i.name.toLowerCase().includes(searchPT.toLowerCase()))
                            .sort((a,b) => {
                                const priority = { 'CRITICAL': 0, 'LOW': 1, 'STOCK OK': 2, 'OPTIMAL': 2 };
                                const diff = priority[getStatus(a)] - priority[getStatus(b)];
                                if (diff !== 0) return diff;
                                return (a.name || '').localeCompare(b.name || '');
                            })
                            .map(item => {
                                    const status = getStatus(item);
                                    const color = getStatusColor(status);
                                    const stock = getFinalStock(item);
                                    const goal = item.min_stock_level || item.safety || 0;
                                    return (
                                        <div 
                                            key={item.id} 
                                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                                            style={{ 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                alignItems: 'center', 
                                                padding: '0.7rem 1rem', 
                                                background: '#f8fafc', 
                                                borderRadius: '12px',
                                                cursor: 'pointer',
                                                border: `1px solid ${status === 'STOCK OK' || status === 'OPTIMAL' ? 'transparent' : color + '20'}`,
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.transform = 'translateX(0)'; }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                                <div style={{ padding: '0.4rem', borderRadius: '8px', background: '#fff', border: '1px solid #e2e8f0', color: '#ea580c', position: 'relative' }}>
                                                    <ArrowUpRight size={14} />
                                                    {(!recipes[item.id] && !recipes[item.name?.toLowerCase().trim()]) && (
                                                        <div title="SIN RECETA" style={{ position: 'absolute', top: '-8px', right: '-8px', color: '#fff', background: '#ea580c', borderRadius: '6px', padding: '2px 4px', border: '2px solid #fff', boxShadow: '0 4px 10px rgba(234, 88, 12, 0.3)' }}>
                                                            <AlertTriangle size={10} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1e293b' }}>{item.name.toUpperCase()}</div>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: '900', color: '#64748b' }}>Meta: {goal} <span style={{ fontSize: '0.55rem', opacity: 0.8 }}>{item.unit_measure || item.unit}</span></div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: '950', color: stock === 0 ? '#cbd5e1' : '#1e293b' }}>
                                                    {stock} <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>{item.unit_measure || item.unit}</span>
                                                </div>
                                                <div style={{ fontSize: '0.55rem', fontWeight: '900', color, textTransform: 'uppercase' }}>{status === 'OPTIMAL' ? 'STOCK OK' : status}</div>
                                            </div>
                                        </div>
                                    );
                            })}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                input[type=number] { -moz-appearance: textfield; }
            `}</style>
        </div>
    );
};

export default Inventory;
