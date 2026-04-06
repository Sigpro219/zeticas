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
    const [searchMP, setSearchMP] = useState('');
    const [searchPT, setSearchPT] = useState('');
    const [activeTab, setActiveTab] = useState('MP');
    const [showQuickIntake, setShowQuickIntake] = useState(false);
    const [quickIntakeData, setQuickIntakeData] = useState({ itemId: '', itemName: '', quantity: '', search: '', ocNumber: '' });

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

    const totalValueMP = items
        .filter(i => i.type === 'material')
        .reduce((acc, i) => acc + (getFinalStock(i) * (i.avgCost || 0)), 0);

    const totalValuePT = items
        .filter(i => i.type === 'product')
        .reduce((acc, i) => acc + (getFinalStock(i) * (i.price || 0)), 0);

    const deepTeal = "#023636";
    const institutionOcre = "#D4785A";
    const premiumSalmon = "#E29783";

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

            {/* Critical Alerts Bar — Enhanced Semaforo & Compact View */}
            {pullSignals.length > 0 && (
                <div style={{ 
                    background: 'rgba(30, 41, 59, 0.03)', 
                    padding: '1.5rem', 
                    borderRadius: '24px', 
                    marginBottom: '1.5rem', 
                    border: '1px solid rgba(30, 41, 59, 0.08)',
                    animation: 'fadeUp 0.6s ease-out'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <div style={{ padding: '0.5rem', borderRadius: '10px', background: premiumSalmon, color: '#fff' }}>
                                <AlertCircle size={20} />
                            </div>
                            <div>
                                <div style={{ fontSize: '1rem', fontWeight: '900', color: '#1e293b', letterSpacing: '-0.3px' }}>Protocolo de Reabastecimiento Crítico</div>
                                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>{pullSignals.length} alertas activas que requieren acción inmediata.</div>
                            </div>
                        </div>
                        <button onClick={handleDismissAllPulls} style={{ padding: '0.5rem 1.2rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: '0.7rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
                            IGNORAR TODAS <X size={14} />
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                        {pullSignals
                            .sort((a, b) => {
                                const statusA = getStatus(a);
                                const statusB = getStatus(b);
                                if (statusA === 'CRITICAL' && statusB !== 'CRITICAL') return -1;
                                if (statusB === 'CRITICAL' && statusA !== 'CRITICAL') return 1;
                                return 0;
                            })
                            .map(sig => {
                            const status = getStatus(sig);
                            const color = getStatusColor(status);
                            const isMP = sig.type === 'material' || sig.category === 'Materia Prima' || sig.category === 'Insumo' || sig.category === 'Insumos';
                            const typeLabel = isMP ? 'MP' : 'PT';
                            const stock = getFinalStock(sig);
                            const goal = sig.min_stock_level || sig.safety || 0;

                            return (
                                <div 
                                    key={sig.id} 
                                    style={{ 
                                        background: color, 
                                        padding: '0.8rem 1rem', 
                                        borderRadius: '16px', 
                                        fontSize: '0.78rem', 
                                        fontWeight: '900', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between',
                                        boxShadow: `0 6px 18px ${color}40`,
                                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                        color: '#fff',
                                        position: 'relative',
                                        border: 'none'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 10px 25px ${color}60`; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 6px 18px ${color}40`; }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', overflow: 'hidden', flex: 1 }}>
                                        <div style={{ 
                                            background: isMP ? '#2563eb' : '#7c3aed', 
                                            color: '#fff', 
                                            padding: '2px 8px', 
                                            borderRadius: '6px', 
                                            fontSize: '0.65rem', 
                                            fontWeight: '950',
                                            minWidth: '24px',
                                            textAlign: 'center',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                                        }}>
                                            {typeLabel}
                                        </div>
                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.2px' }}>
                                            {sig.name.toUpperCase()}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginLeft: '0.5rem' }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.88rem', fontWeight: '950', letterSpacing: '-0.3px' }}>
                                                {stock} <span style={{ opacity: 0.6, fontSize: '0.7rem' }}>/ {goal}</span>
                                            </div>
                                            <div style={{ fontSize: '0.55rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{sig.unit_measure || sig.unit}</div>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDismissPull(sig.id); }}
                                            style={{ 
                                                border: 'none', 
                                                background: 'transparent', 
                                                color: 'rgba(255,255,255,0.7)', 
                                                cursor: 'pointer', 
                                                padding: '6px', 
                                                display: 'flex', 
                                                borderRadius: '8px',
                                                transition: 'all 0.2s'
                                            }} 
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#fff'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

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
                                                    <div style={{ fontWeight: '800', color: '#1e293b' }}>{item.name.toUpperCase()}</div>
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
                                                <div style={{ padding: '0.4rem', borderRadius: '8px', background: '#fff', border: '1px solid #e2e8f0', color: '#ea580c' }}>
                                                    <ArrowUpRight size={14} />
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
