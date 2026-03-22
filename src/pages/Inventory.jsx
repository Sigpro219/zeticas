import React, { useState, useMemo } from 'react';
import { AlertCircle, RefreshCw, Plus, Package, Save, X, ArrowUpRight, Search, Zap, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useBusiness } from '../context/BusinessContext';

const Inventory = () => {
    const { items, refreshData } = useBusiness();
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

    const getFinalStock = (item) => (item.initial || 0) + (item.purchases || 0) - (item.sales || 0);

    const pullSignals = items.filter(item =>
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

    const openInventoryForm = (type) => {
        setModalType(type);
        setEditData([...items]);
        setIsModalOpen(true);
    };

    const handleAddItem = () => {
        const newItem = {
            id: 'TEMP_' + Date.now(),
            name: '',
            type: modalType === 'MP' ? 'material' : 'product',
            initial: 0,
            purchases: 0,
            sales: 0,
            safety: 0,
            unit: modalType === 'MP' ? 'kg' : 'und',
            avgCost: 0,
            price: 0,
            sku: '',
            isNew: true
        };
        setEditData([newItem, ...editData]);
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
                const dbData = {
                    name: item.name,
                    stock: item.initial,
                    min_stock_level: item.safety,
                    unit_measure: item.unit,
                    cost: item.avgCost,
                    price: item.price,
                    type: item.type === 'product' ? 'PT' : 'MP',
                    sku: item.sku || ('SKU-' + Math.random().toString(36).substr(2, 5).toUpperCase())
                };

                if (item.id && typeof item.id === 'string' && !item.id.startsWith('TEMP_')) {
                    await supabase.from('products').update(dbData).eq('id', item.id);
                } else if (item.isNew && item.name) {
                    await supabase.from('products').insert([dbData]);
                }
            }
            await refreshData();
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

    return (
        <div style={{ padding: '2rem', minHeight: '100vh', background: '#f8fafc', animation: 'fadeUp 0.6s ease-out' }}>
            
            {/* Header - Inventory Control Center */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '4rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: deepTeal, marginBottom: '0.4rem' }}>
                        <Package size={32} />
                        <h2 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1.8px' }}>Asset & Stock Control</h2>
                    </div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '1.1rem', fontWeight: '700' }}>Gestión de activos industriales y optimización JIT del suministro.</p>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <button onClick={refreshData} style={{ background: '#fff', border: '1px solid #f1f5f9', padding: '1rem', borderRadius: '20px', color: deepTeal, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }} title="Sincronizar Cloud">
                        <RefreshCw size={22} />
                    </button>
                    <div style={{ background: glassWhite, backdropFilter: 'blur(10px)', padding: '0.8rem 1.8rem', borderRadius: '22px', border: '1px solid rgba(255, 255, 255, 0.5)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: '900', color: deepTeal, textTransform: 'uppercase', letterSpacing: '1px' }}>Global Sync Active</span>
                    </div>
                </div>
            </header>

            {/* Valuation Dashboard */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginBottom: '4rem' }}>
                <div style={{ 
                    background: `linear-gradient(135deg, ${deepTeal} 0%, #037075 100%)`, 
                    padding: '3rem', 
                    borderRadius: '50px', 
                    color: '#fff',
                    boxShadow: `0 30px 60px ${deepTeal}30`,
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', right: '-20px', top: '-20px', opacity: 0.1 }}><Package size={200} /></div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <span style={{ fontSize: '1rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.8 }}>Valorización Materias Primas (MP)</span>
                        <div style={{ fontSize: '4.5rem', fontWeight: '900', letterSpacing: '-3px', lineHeight: 1, margin: '2.5rem 0' }}>
                           <span style={{ fontSize: '2rem', verticalAlign: 'top', marginRight: '8px', opacity: 0.4 }}>$</span>
                           {totalValueMP.toLocaleString()}
                        </div>
                        <button onClick={() => openInventoryForm('MP')} style={{ padding: '1.2rem 2.8rem', borderRadius: '25px', border: 'none', background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', color: '#fff', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <Plus size={22} /> CARGAR MATRIZ MP
                        </button>
                    </div>
                </div>

                <div style={{ 
                    background: '#fff', 
                    padding: '3rem', 
                    borderRadius: '50px', 
                    border: '1px solid rgba(2, 54, 54, 0.05)',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.03)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', right: '-20px', top: '-20px', opacity: 0.05 }}><ArrowUpRight size={200} color={institutionOcre} /></div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <span style={{ fontSize: '1rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px' }}>Valorización Producto Terminado (PT)</span>
                        <div style={{ fontSize: '4.5rem', fontWeight: '900', color: deepTeal, letterSpacing: '-3px', lineHeight: 1, margin: '2.5rem 0' }}>
                           <span style={{ fontSize: '2rem', verticalAlign: 'top', marginRight: '8px', opacity: 0.2 }}>$</span>
                           {totalValuePT.toLocaleString()}
                        </div>
                        <button onClick={() => openInventoryForm('PT')} style={{ padding: '1.2rem 2.8rem', borderRadius: '25px', border: 'none', background: institutionOcre, color: '#fff', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: `0 15px 35px ${institutionOcre}40` }}>
                            <Plus size={22} /> CARGAR MAESTRO PT
                        </button>
                    </div>
                </div>
            </div>

            {/* Critical Alerts Bar */}
            {pullSignals.length > 0 && (
                <div style={{ background: `linear-gradient(90deg, ${premiumSalmon} 0%, #B85B42 100%)`, padding: '2.5rem 3.5rem', borderRadius: '40px', color: '#fff', marginBottom: '4rem', display: 'flex', alignItems: 'center', gap: '3rem', boxShadow: `0 20px 50px ${premiumSalmon}30`, animation: 'pulse 3s infinite ease-in-out' }}>
                    <div style={{ width: '64px', height: '64px', background: 'rgba(255,255,255,0.2)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertCircle size={32} /></div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: '900', letterSpacing: '-0.5px', marginBottom: '0.8rem' }}>Protocolo de Reabastecimiento Crítico Activado</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                            {pullSignals.map(sig => (
                                <div key={sig.id} style={{ background: 'rgba(255,255,255,0.15)', padding: '0.6rem 1.2rem', borderRadius: '15px', fontSize: '0.85rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    {sig.name.toUpperCase()} <span style={{ opacity: 0.7 }}>|</span> {getFinalStock(sig)} {sig.unit}
                                    <button onClick={() => handleDismissPull(sig.id)} style={{ border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', padding: '2px', opacity: 0.6 }}><X size={16}/></button>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                <div style={{ background: glassWhite, backdropFilter: 'blur(10px)', padding: '2.5rem', borderRadius: '50px', border: '1px solid rgba(255, 255, 255, 0.5)', boxShadow: '0 20px 60px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: deepTeal }}>Inventario MP</h3>
                        <div style={{ position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input value={searchMP} onChange={e => setSearchMP(e.target.value)} placeholder="Filtrar matriz..." style={{ padding: '0.8rem 1rem 0.8rem 3rem', border: '1px solid #f1f5f9', borderRadius: '18px', fontSize: '0.9rem', fontWeight: '900', outline: 'none' }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        {items.filter(i => i.type === 'material' && i.name.toLowerCase().includes(searchMP.toLowerCase())).map(item => {
                            const status = getStatus(item);
                            const color = getStatusColor(status);
                            return (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.8rem', background: '#fff', borderRadius: '30px', border: '1px solid #f8fafc', transition: 'all 0.3s' }} className="inventory-row-hover">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                        <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: `${deepTeal}08`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: deepTeal }}><Package size={22} /></div>
                                        <div>
                                            <div style={{ fontWeight: '900', fontSize: '1.1rem', color: '#1e293b' }}>{item.name.toUpperCase()}</div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: '900', color: institutionOcre, marginTop: '4px' }}>UNIDAD: {item.unit} | SKU: {item.sku}</div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.6rem', fontWeight: '900', color: deepTeal }}>{getFinalStock(item)}</div>
                                        <div style={{ fontSize: '0.65rem', fontWeight: '900', color, textTransform: 'uppercase', letterSpacing: '1px' }}>{status}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div style={{ background: glassWhite, backdropFilter: 'blur(10px)', padding: '2.5rem', borderRadius: '50px', border: '1px solid rgba(255, 255, 255, 0.5)', boxShadow: '0 20px 60px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: deepTeal }}>Inventario PT</h3>
                        <div style={{ position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input value={searchPT} onChange={e => setSearchPT(e.target.value)} placeholder="Filtrar matriz..." style={{ padding: '0.8rem 1rem 0.8rem 3rem', border: '1px solid #f1f5f9', borderRadius: '18px', fontSize: '0.9rem', fontWeight: '900', outline: 'none' }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        {items.filter(i => i.type === 'product' && i.name.toLowerCase().includes(searchPT.toLowerCase())).map(item => {
                            const status = getStatus(item);
                            const color = getStatusColor(status);
                            return (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.8rem', background: '#fff', borderRadius: '30px', border: '1px solid #f8fafc', transition: 'all 0.3s' }} className="inventory-row-hover">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                        <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: `${institutionOcre}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: institutionOcre }}><ArrowUpRight size={22} /></div>
                                        <div>
                                            <div style={{ fontWeight: '900', fontSize: '1.1rem', color: '#1e293b' }}>{item.name.toUpperCase()}</div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: '900', color: deepTeal, marginTop: '4px', opacity: 0.6 }}>MIN: {item.safety} {item.unit} | SKU: {item.sku}</div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.8rem', fontWeight: '900', color }}>{getFinalStock(item)}</div>
                                        <div style={{ fontSize: '0.65rem', fontWeight: '950', color, textTransform: 'uppercase', letterSpacing: '1px' }}>{status === 'OPTIMAL' ? 'STOCK OK' : status}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Custom Styles for Interactions */}
            <style>{`
                @keyframes fadeUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
                .inventory-row-hover:hover { transform: translateY(-3px); box-shadow: 0 10px 30px rgba(0,0,0,0.04); border-color: ${institutionOcre}40 !important; }
                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.95; transform: scale(1.005); } 100% { opacity: 1; } }
            `}</style>
        </div>
    );
};

export default Inventory;
