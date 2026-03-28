import React, { useState } from 'react';
import { AlertCircle, RefreshCw, Plus, Package, Save, X, ArrowUpRight, Search } from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';

const Inventory = () => {
    const { items, refreshData, addItem, updateItem } = useBusiness();
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
                    initial: item.initial,
                    safety: item.safety,
                    unit: item.unit,
                    avgCost: item.avgCost,
                    price: item.price,
                    type: item.type === 'product' || item.type === 'PT' ? 'product' : 'material',
                    sku: item.sku || ('SKU-' + Math.random().toString(36).substr(2, 5).toUpperCase())
                };

                if (item.id && typeof item.id === 'string' && !item.id.startsWith('TEMP_')) {
                    await updateItem(item.id, dbData);
                } else if (item.isNew && item.name) {
                    await addItem(dbData);
                }
            }
            // await refreshData(); // Auto handled by context snapshots
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
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: deepTeal, marginBottom: '0.2rem' }}>
                        <Package size={24} />
                        <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-1.2px' }}>Asset Control</h2>
                    </div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: '700' }}>Gestión de activos y suministro JIT.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={refreshData} style={{ background: '#fff', border: '1px solid #f1f5f9', width: '42px', height: '42px', borderRadius: '12px', color: deepTeal, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Sincronizar Cloud">
                        <RefreshCw size={18} />
                    </button>
                    <div style={{ background: glassWhite, backdropFilter: 'blur(10px)', padding: '0.5rem 1.2rem', borderRadius: '14px', border: '1px solid rgba(2, 54, 54, 0.05)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                        <span style={{ fontSize: '0.7rem', fontWeight: '900', color: deepTeal, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sync Active</span>
                    </div>
                </div>
            </header>

            {/* Valuation Dashboard */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
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
                        <button onClick={() => openInventoryForm('MP')} style={{ padding: '0.8rem 1.8rem', borderRadius: '14px', border: 'none', background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', color: '#fff', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.75rem' }}>
                            <Plus size={16} /> GESTIONAR MP
                        </button>
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
                        <button onClick={() => openInventoryForm('PT')} style={{ padding: '0.8rem 1.8rem', borderRadius: '14px', border: 'none', background: institutionOcre, color: '#fff', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.75rem' }}>
                            <Plus size={16} /> GESTIONAR PT
                        </button>
                    </div>
                </div>
            </div>

            {/* Critical Alerts Bar */}
            {pullSignals.length > 0 && (
                <div style={{ background: `linear-gradient(90deg, ${premiumSalmon} 0%, #B85B42 100%)`, padding: '1.2rem 2rem', borderRadius: '18px', color: '#fff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', boxShadow: `0 10px 30px ${premiumSalmon}20` }}>
                    <div style={{ width: '42px', height: '42px', background: 'rgba(255,255,255,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertCircle size={22} /></div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: '900', letterSpacing: '-0.2px', marginBottom: '0.3rem' }}>Protocolo de Reabastecimiento Crítico</div>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                <div style={{ background: glassWhite, backdropFilter: 'blur(10px)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(2, 54, 54, 0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: deepTeal }}>Inventario MP</h3>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input value={searchMP} onChange={e => setSearchMP(e.target.value)} placeholder="Filtrar..." style={{ padding: '0.6rem 1rem 0.6rem 2.5rem', border: '1px solid #f1f5f9', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '900', outline: 'none', background: '#fcfcfc' }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        {items.filter(i => i.type === 'material' && i.name.toLowerCase().includes(searchMP.toLowerCase())).map(item => {
                            const status = getStatus(item);
                            const color = getStatusColor(status);
                            return (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.2rem', background: '#fff', borderRadius: '14px', border: '1px solid #f8fafc', transition: 'all 0.3s' }} className="inventory-row-hover">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${deepTeal}08`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: deepTeal }}><Package size={18} /></div>
                                        <div>
                                            <div style={{ fontWeight: '900', fontSize: '0.95rem', color: '#1e293b' }}>{item.name.toUpperCase()}</div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: '900', color: institutionOcre, marginTop: '2px' }}>{item.unit} | {item.sku}</div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.2rem', fontWeight: '900', color: deepTeal }}>{getFinalStock(item)}</div>
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
                        {items.filter(i => i.type === 'product' && i.name.toLowerCase().includes(searchPT.toLowerCase())).map(item => {
                            const status = getStatus(item);
                            const color = getStatusColor(status);
                            return (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.2rem', background: '#fff', borderRadius: '14px', border: '1px solid #f8fafc', transition: 'all 0.3s' }} className="inventory-row-hover">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${institutionOcre}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: institutionOcre }}><ArrowUpRight size={18} /></div>
                                        <div>
                                            <div style={{ fontWeight: '900', fontSize: '0.95rem', color: '#1e293b' }}>{item.name.toUpperCase()}</div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: '900', color: deepTeal, marginTop: '2px', opacity: 0.6 }}>{item.safety} {item.unit} | {item.sku}</div>
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
