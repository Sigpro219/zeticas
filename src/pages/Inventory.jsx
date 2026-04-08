import React, { useState } from 'react';
import { AlertCircle, RefreshCw, Plus, Package, Save, X, ArrowUpRight, Search, Lightbulb, AlertTriangle } from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';

const formatNum = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return Number(num).toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
    });
};

const Inventory = () => {
    const { 
        items, updateItem, recipes, createInternalOrder, orders,
        siteContent, updateInventoryConfig
    } = useBusiness();
    const [searchMP, setSearchMP] = useState('');
    const [searchPT, setSearchPT] = useState('');
    const [activeTab, setActiveTab] = useState('MP');
    const [selectedPulls, setSelectedPulls] = useState(new Set());
    const [isGenerating, setIsGenerating] = useState(false);
    const redThreshold = siteContent?.inventory?.config?.redThreshold || 0.5;
    const [isSimulated, setIsSimulated] = useState(false);
    const [neededMPForSelection, setNeededMPForSelection] = useState({});

    const [showQuickIntake, setShowQuickIntake] = useState(false);
    const [quickIntakeData, setQuickIntakeData] = useState({ itemId: '', itemName: '', quantity: '', search: '', ocNumber: '' });

    const handleQuickIntakeConfirm = async () => {
        if (!quickIntakeData.itemId || !quickIntakeData.quantity || !quickIntakeData.ocNumber) return;
        const item = items.find(i => i.id === quickIntakeData.itemId);
        const currentPurchases = Number(item.purchases || 0);
        await updateItem(quickIntakeData.itemId, { purchases: currentPurchases + Number(quickIntakeData.quantity) });
        setShowQuickIntake(false);
        setQuickIntakeData({ itemId: '', itemName: '', quantity: '', search: '', ocNumber: '' });
    };

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
        .filter(i => i.type === 'material')
        .reduce((acc, i) => acc + (getFinalStock(i) * (i.avgCost || 0)), 0);

    const totalValuePT = items
        .filter(i => i.type === 'product')
        .reduce((acc, i) => acc + (getFinalStock(i) * (i.price || 0)), 0);

    const deepTeal = "#023636";
    const institutionOcre = "#D4785A";

    const [localInitialsMP, setLocalInitialsMP] = useState({});
    const [localInitialsPT, setLocalInitialsPT] = useState({});

    return (
        <div style={{ padding: '2rem', minHeight: '100vh', background: '#fff', animation: 'fadeUp 0.6s ease-out' }}>
            {/* Master Dashboard Header */}
            <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '950', color: deepTeal, letterSpacing: '-1px' }}>DASHBOARD MAESTRO DE INVENTARIO</h1>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600', marginTop: '4px' }}>Control centralizado de existencias, valorización y reabastecimiento crítico.</div>
                </div>
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <button 
                        onClick={() => setShowQuickIntake(true)}
                        style={{
                            background: '#10b981', color: '#fff', border: 'none',
                            padding: '1rem 2rem', borderRadius: '18px', fontSize: '0.85rem',
                            fontWeight: '950', cursor: 'pointer', display: 'flex',
                            alignItems: 'center', gap: '10px', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
                            transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.5px'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <Plus size={20} /> ENTRADA DE MP
                    </button>
                    <div style={{ padding: '0.6rem 1.2rem', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                        <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#1e293b' }}>SISTEMA LIVE</span>
                    </div>
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
                                    <th style={{ padding: '1rem', textAlign: 'center' }}>Inv. Inicial (Editable)</th>
                                    <th style={{ padding: '1rem', textAlign: 'center' }}>Meta / Seg.</th>
                                    <th style={{ padding: '1rem', textAlign: 'center' }}>Compras (+)</th>
                                    <th style={{ padding: '1rem', textAlign: 'center' }}>Producción (-)</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', color: deepTeal }}>Stock Final</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items
                                    .filter(i => (i.type === 'material' || i.category === 'Materia Prima' || i.category === 'Insumo' || i.category === 'Insumos') && i.name.toLowerCase().includes(searchMP.toLowerCase()))
                                    .sort((a,b) => (a.name || '').localeCompare(b.name || ''))
                                    .map(item => {
                                        const init = item.initial || 0;
                                        const currentInputVal = localInitialsMP[item.id] !== undefined ? localInitialsMP[item.id] : init;
                                        const calculationInit = localInitialsMP[item.id] !== undefined ? (parseFloat(localInitialsMP[item.id]) || 0) : init;
                                        const accCompras = item.purchases || 0;
                                        const accProd = item.sales || 0;
                                        const fin = Math.round((calculationInit + accCompras - accProd) * 10) / 10;
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
                                                            const val = e.target.value.replace(/[^0-9.]/g, '');
                                                            setLocalInitialsMP(prev => ({ ...prev, [item.id]: val }));
                                                        }}
                                                        onBlur={async (e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            setLocalInitialsMP(prev => ({ ...prev, [item.id]: val.toFixed(1) }));
                                                            await updateItem(item.id, { stock: val, initial: val });
                                                        }}
                                                        style={{ width: '85px', padding: '0.6rem', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '10px', fontWeight: '900', color: deepTeal }}
                                                    />
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontWeight: '700' }}>{formatNum(stockSeg)}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center', color: '#16a34a', fontWeight: '700' }}>+{formatNum(accCompras)}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center', color: '#ef4444', fontWeight: '700' }}>-{formatNum(accProd)}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '950', color: deepTeal, fontSize: '1.1rem' }}>{formatNum(fin)}</td>
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
                                    <th style={{ padding: '1rem', textAlign: 'center' }}>Inv. Inicial (Editable)</th>
                                    <th style={{ padding: '1rem', textAlign: 'center' }}>Meta / Seg.</th>
                                    <th style={{ padding: '1rem', textAlign: 'center' }}>Producción (+)</th>
                                    <th style={{ padding: '1rem', textAlign: 'center' }}>Ventas (-)</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', color: '#ea580c' }}>Stock Final</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items
                                    .filter(i => (i.type === 'product' || i.type === 'PT') && i.name.toLowerCase().includes(searchPT.toLowerCase()))
                                    .sort((a,b) => (a.name || '').localeCompare(b.name || ''))
                                    .map(item => {
                                        const init = item.initial || 0;
                                        const currentInputVal = localInitialsPT[item.id] !== undefined ? localInitialsPT[item.id] : init;
                                        const calculationInit = localInitialsPT[item.id] !== undefined ? (parseFloat(localInitialsPT[item.id]) || 0) : init;
                                        const accProd = item.purchases || 0;
                                        const accVentas = item.sales || 0;
                                        const fin = Math.round((calculationInit + accProd - accVentas) * 10) / 10;
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
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/[^0-9.]/g, '');
                                                            setLocalInitialsPT(prev => ({ ...prev, [item.id]: val }));
                                                        }}
                                                        onBlur={async (e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            setLocalInitialsPT(prev => ({ ...prev, [item.id]: val.toFixed(1) }));
                                                            await updateItem(item.id, { stock: val, initial: val });
                                                        }}
                                                        style={{ width: '85px', padding: '0.6rem', textAlign: 'center', border: '1px solid #fdba74', borderRadius: '10px', fontWeight: '900', color: '#ea580c' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'center', color: '#c2410c', fontWeight: '700' }}>{formatNum(stockSeg)}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center', color: '#16a34a', fontWeight: '700' }}>+{formatNum(accProd)}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center', color: '#ef4444', fontWeight: '700' }}>-{formatNum(accVentas)}</td>
                                                <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '950', color: '#ea580c', fontSize: '1.1rem' }}>{formatNum(fin)}</td>
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

            {/* Quick Intake Modal */}
            {showQuickIntake && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1rem' }}>
                    <div style={{ background: '#fff', width: '450px', maxWidth: '95vw', borderRadius: '24px', padding: '2.5rem', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <button onClick={() => setShowQuickIntake(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', border: 'none', background: '#f1f5f9', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer', transition: 'all 0.2s' }}>
                            <X size={20} />
                        </button>
                        
                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', fontWeight: '950', color: deepTeal, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>Entrada de Materia Prima</h3>
                        <p style={{ margin: '0 0 2rem 0', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>Vincule los insumos a una Orden de Compra.</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Campo OC */}
                            <div style={{ position: 'relative' }}>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}># Orden de Compra (OC)</label>
                                <input 
                                    type="text"
                                    placeholder="Ej: OC-2024-001"
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #f1f5f9', fontSize: '1rem', fontWeight: '700', outline: 'none' }}
                                    value={quickIntakeData.ocNumber}
                                    onChange={(e) => setQuickIntakeData({...quickIntakeData, ocNumber: e.target.value})}
                                />
                            </div>

                            {/* Buscador Insumo */}
                            <div style={{ position: 'relative' }}>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Insumo / Fruta</label>
                                <div style={{ position: 'relative' }}>
                                    <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input 
                                        type="text"
                                        placeholder="Buscar insumo..."
                                        style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: '12px', border: '2px solid #f1f5f9', fontSize: '1rem', fontWeight: '600', outline: 'none' }}
                                        value={quickIntakeData.search}
                                        onChange={(e) => setQuickIntakeData({...quickIntakeData, itemId: '', search: e.target.value})}
                                    />
                                </div>
                                {quickIntakeData.search.length > 1 && !quickIntakeData.itemId && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 10, marginTop: '8px', maxHeight: '180px', overflowY: 'auto', border: '1px solid #f1f5f9' }}>
                                        {items.filter(i => (i.name || '').toLowerCase().includes(quickIntakeData.search.toLowerCase())).map(item => (
                                            <div 
                                                key={item.id}
                                                onClick={() => setQuickIntakeData({...quickIntakeData, itemId: item.id, itemName: item.name, search: item.name.toUpperCase()})}
                                                style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f8fafc', fontSize: '0.9rem', fontWeight: '700', color: deepTeal }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                {item.name.toUpperCase()}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Cantidad */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Cantidad a Ingresar</label>
                                <input 
                                    type="number"
                                    placeholder="0"
                                    style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #f1f5f9', fontSize: '1.2rem', fontWeight: '900', textAlign: 'center', outline: 'none', color: '#10b981' }}
                                    value={quickIntakeData.quantity}
                                    onChange={(e) => setQuickIntakeData({...quickIntakeData, quantity: e.target.value})}
                                />
                            </div>

                            <button 
                                onClick={handleQuickIntakeConfirm}
                                disabled={!quickIntakeData.itemId || !quickIntakeData.quantity || !quickIntakeData.ocNumber}
                                style={{ 
                                    marginTop: '0.5rem', padding: '1.25rem', borderRadius: '18px', border: 'none', 
                                    background: !quickIntakeData.itemId || !quickIntakeData.quantity || !quickIntakeData.ocNumber ? '#e2e8f0' : '#10b981', 
                                    color: '#fff', fontSize: '1rem', fontWeight: '950', cursor: 'pointer', transition: 'all 0.3s',
                                    boxShadow: !quickIntakeData.itemId || !quickIntakeData.quantity || !quickIntakeData.ocNumber ? 'none' : '0 10px 25px rgba(16, 185, 129, 0.3)'
                                }}
                            >
                                CONFIRMAR ENTRADA
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                input[type=number] { -moz-appearance: textfield; }
            `}</style>
        </div>
    );
};

export default Inventory;
