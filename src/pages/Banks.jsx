import React, { useState } from 'react';
import { Landmark, Plus, Edit3, Trash2, X, AlertCircle } from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { supabase } from '../lib/supabase';

const Banks = () => {
    const { banks, setBanks } = useBusiness();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBank, setEditingBank] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        type: 'cta de ahorros',
        account_number: '',
        initial_balance: 0,
        balance: 0
    });

    const deepTeal = '#023636';
    const institutionOcre = '#D4785A';
    const premiumSalmon = '#E29783';
    const glassWhite = 'rgba(255, 255, 255, 0.85)';

    const handleOpenModal = (bank = null) => {
        if (bank) {
            setEditingBank(bank);
            setFormData(bank);
        } else {
            setEditingBank(null);
            setFormData({
                name: '',
                type: 'cta de ahorros',
                account_number: '',
                initial_balance: 0,
                balance: 0
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingBank(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSave = async (e) => {
        e.preventDefault();

        const data = {
            ...formData,
            initial_balance: parseFloat(formData.initial_balance) || 0,
            balance: parseFloat(formData.balance) || 0
        };

        try {
            if (editingBank) {
                const { error } = await supabase
                    .from('banks')
                    .update(data)
                    .eq('id', editingBank.id);

                if (!error) {
                    setBanks(banks.map(b => b.id === editingBank.id ? { ...b, ...data } : b));
                }
            } else {
                const { data: newBank, error } = await supabase
                    .from('banks')
                    .insert([data])
                    .select();

                if (!error && newBank) {
                    setBanks([...banks, newBank[0]]);
                } else {
                    setBanks([...banks, { ...data, id: Date.now() }]);
                }
            }
        } catch (err) {
            console.error("Error saving bank:", err);
            if (editingBank) {
                setBanks(banks.map(b => b.id === editingBank.id ? { ...b, ...data } : b));
            } else {
                setBanks([...banks, { ...data, id: Date.now() }]);
            }
        }
        handleCloseModal();
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Estás seguro que quieres eliminar este banco?")) {
            return;
        }
        try {
            const { error } = await supabase.from('banks').delete().eq('id', id);
            if (!error) {
                setBanks(banks.filter(b => b.id !== id));
            }
        } catch (err) {
            setBanks(banks.filter(b => b.id !== id));
        }
    };

    const totalLiquidity = banks.reduce((acc, bank) => acc + (bank.balance || 0), 0);

    return (
        <div style={{ padding: '2rem', minHeight: '100vh', background: '#f8fafc' }}>
            {/* Treasury Header */}
            <header style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '4rem',
                animation: 'fadeUp 0.5s ease-out'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: deepTeal, marginBottom: '0.4rem' }}>
                        <Landmark size={32} />
                        <h2 style={{ margin: 0, fontSize: '2.2rem', fontWeight: '900', letterSpacing: '-1px' }}>Control de Tesorería</h2>
                    </div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '1rem', fontWeight: '700' }}>Gestión centralizada de activos líquidos y flujo de caja operativo.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    style={{ 
                        background: deepTeal, 
                        color: '#fff', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.8rem',
                        padding: '1.2rem 2.8rem',
                        borderRadius: '24px',
                        fontWeight: '900',
                        fontSize: '1rem',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: `0 15px 35px ${deepTeal}30`,
                        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05) translateY(-5px)'; e.currentTarget.style.boxShadow = `0 25px 50px ${deepTeal}40`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1) translateY(0)'; e.currentTarget.style.boxShadow = `0 15px 35px ${deepTeal}30`; }}
                >
                    <Plus size={22} /> Apertura de Cuenta
                </button>
            </header>

            {/* Global Liquidity KPI */}
            <div style={{ 
                background: `linear-gradient(135deg, ${deepTeal} 0%, #037075 100%)`, 
                padding: '4rem', 
                borderRadius: '50px', 
                color: '#fff',
                marginBottom: '2.5rem',
                boxShadow: `0 35px 70px ${deepTeal}35`,
                position: 'relative',
                overflow: 'hidden',
                animation: 'fadeUp 0.6s ease-out'
            }}>
                <div style={{ position: 'absolute', right: '-20px', bottom: '-40px', opacity: 0.08 }}>
                    <Landmark size={400} />
                </div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', marginBottom: '2rem', opacity: 0.8 }}>
                        <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.8rem', borderRadius: '18px' }}>
                            <AlertCircle size={28} />
                        </div>
                        <span style={{ fontSize: '1.1rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '3px' }}>Liquidez Global Disponible</span>
                    </div>
                    <div style={{ fontSize: '6rem', fontWeight: '900', letterSpacing: '-4px', lineHeight: 1, marginBottom: '2.5rem' }}>
                        <span style={{ fontSize: '2.5rem', verticalAlign: 'top', marginRight: '10px', opacity: 0.4 }}>$</span>
                        {totalLiquidity.toLocaleString()}
                    </div>
                    <div style={{ display: 'flex', gap: '3rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1.2rem 2.5rem', borderRadius: '24px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: '900', opacity: 0.6, textTransform: 'uppercase', marginBottom: '4px' }}>Cuentas Activas</div>
                            <div style={{ fontSize: '1.6rem', fontWeight: '900' }}>{banks.length} ENTIDADES</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1.2rem 2.5rem', borderRadius: '24px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: '900', opacity: 0.6, textTransform: 'uppercase', marginBottom: '4px' }}>Salud Financiera</div>
                            <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#4ade80' }}>OPTIMA (A+)</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Asset Allocation Board */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: '2.5rem', 
                marginBottom: '4rem',
                animation: 'fadeUp 0.7s ease-out'
            }}>
                {banks.sort((a,b) => b.balance - a.balance).slice(0, 4).map((bank, index) => {
                    const percentage = totalLiquidity > 0 ? (bank.balance / totalLiquidity * 100).toFixed(1) : 0;
                    return (
                        <div key={bank.id} style={{ 
                            background: glassWhite, 
                            backdropFilter: 'blur(10px)',
                            padding: '2rem', 
                            borderRadius: '35px', 
                            border: '1px solid rgba(255, 255, 255, 0.5)', 
                            boxShadow: '0 15px 40px rgba(0,0,0,0.03)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>{bank.name}</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: '900', color: deepTeal }}>{percentage}%</div>
                            </div>
                            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#1e293b', letterSpacing: '-1px', marginBottom: '1.5rem' }}>
                                <span style={{ fontSize: '0.9rem', opacity: 0.3, marginRight: '4px' }}>$</span>
                                {bank.balance.toLocaleString()}
                            </div>
                            <div style={{ height: '8px', background: 'rgba(2, 54, 54, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ 
                                    height: '100%', 
                                    width: `${percentage}%`, 
                                    background: index === 0 ? deepTeal : index === 1 ? institutionOcre : index === 2 ? premiumSalmon : '#64748b',
                                    borderRadius: '4px',
                                    transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)'
                                }} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Account Grid / Detailed Ledger */}
            <div style={{ 
                background: glassWhite, 
                backdropFilter: 'blur(10px)',
                borderRadius: '45px', 
                border: '1px solid rgba(255, 255, 255, 0.5)', 
                overflow: 'hidden', 
                boxShadow: '0 20px 60px rgba(0,0,0,0.03)',
                animation: 'fadeUp 0.7s ease-out'
            }}>
                <div style={{ padding: '3rem 3.5rem', borderBottom: '1px solid #f1f5f9' }}>
                    <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900', color: deepTeal, letterSpacing: '-0.5px' }}>Libro Mayor de Cuentas</h3>
                </div>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead>
                        <tr style={{ background: 'rgba(2, 83, 87, 0.02)' }}>
                            <th style={{ padding: '1.8rem 3.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Institución & Producto</th>
                            <th style={{ padding: '1.8rem 2rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Tipo de Activo</th>
                            <th style={{ padding: '1.8rem 2rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Número de Cuenta</th>
                            <th style={{ padding: '1.8rem 2rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Balance Inicial</th>
                            <th style={{ padding: '1.8rem 2rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Balance Real-Time</th>
                            <th style={{ padding: '1.8rem 3.5rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Gestión</th>
                        </tr>
                    </thead>
                    <tbody>
                        {banks.map((bank) => (
                            <tr 
                                key={bank.id} 
                                style={{ borderBottom: '1px solid #f8fafc', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(2, 83, 87, 0.02)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            >
                                <td style={{ padding: '2.5rem 3.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '15px', background: `${deepTeal}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: deepTeal }}>
                                            <Landmark size={22} />
                                        </div>
                                        <div style={{ fontWeight: '900', color: '#1e293b', fontSize: '1.15rem', letterSpacing: '-0.3px' }}>{bank.name}</div>
                                    </div>
                                </td>
                                <td style={{ padding: '2.5rem 2rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: institutionOcre, fontWeight: '900', background: `${institutionOcre}15`, padding: '6px 14px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {bank.type}
                                    </span>
                                </td>
                                <td style={{ padding: '2.5rem 2rem', fontSize: '1rem', color: '#64748b', fontWeight: '700', letterSpacing: '0.5px' }}>{bank.account_number || 'N/A ELECTRONIC'}</td>
                                <td style={{ padding: '2.5rem 2rem', textAlign: 'right', fontSize: '1.05rem', color: '#94a3b8', fontWeight: '800' }}>
                                    ${(bank.initial_balance || 0).toLocaleString()}
                                </td>
                                <td style={{ padding: '2.5rem 2rem', textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.4rem', fontWeight: '900', color: (bank.balance || 0) >= 0 ? '#10b981' : '#ef4444', letterSpacing: '-0.5px' }}>
                                        ${(bank.balance || 0).toLocaleString()}
                                    </div>
                                </td>
                                <td style={{ padding: '2.5rem 3.5rem', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                        <button 
                                            onClick={() => handleOpenModal(bank)} 
                                            style={{ 
                                                width: '45px', 
                                                height: '45px', 
                                                borderRadius: '14px', 
                                                border: '1px solid #f1f5f9', 
                                                background: '#fff', 
                                                cursor: 'pointer', 
                                                color: '#64748b',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.3s',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = deepTeal; e.currentTarget.style.color = deepTeal; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                        >
                                            <Edit3 size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(bank.id)} 
                                            style={{ 
                                                width: '45px', 
                                                height: '45px', 
                                                borderRadius: '14px', 
                                                border: '1px solid #fee2e2', 
                                                background: '#fff', 
                                                cursor: 'pointer', 
                                                color: '#ef4444',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.3s',
                                                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.05)'
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Premium Banking Modal */}
            {isModalOpen && (
                <div style={{ 
                    position: 'fixed', 
                    top: 0, left: 0, right: 0, bottom: 0, 
                    background: 'rgba(15, 23, 42, 0.4)', 
                    backdropFilter: 'blur(12px)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    zIndex: 1000,
                    animation: 'fadeUp 0.3s ease-out'
                }}>
                    <div style={{ 
                        background: '#fff', 
                        padding: '3.5rem', 
                        borderRadius: '45px', 
                        width: '100%', 
                        maxWidth: '550px', 
                        position: 'relative',
                        boxShadow: '0 40px 80px rgba(0,0,0,0.25)',
                        border: '1px solid rgba(255,255,255,0.2)'
                    }}>
                        <button 
                            onClick={handleCloseModal} 
                            style={{ 
                                position: 'absolute', 
                                top: '2rem', 
                                right: '2rem', 
                                border: 'none', 
                                background: '#f1f5f9', 
                                width: '45px', 
                                height: '45px', 
                                borderRadius: '50%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                cursor: 'pointer', 
                                color: '#64748b',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#e2e8f0'}
                        >
                            <X size={20} />
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
                            <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: `${institutionOcre}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: institutionOcre }}>
                                <Plus size={28} />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', color: deepTeal, letterSpacing: '-0.8px' }}>
                                {editingBank ? 'Refactorizar Cuenta' : 'Apertura de Activo'}
                            </h3>
                        </div>
                        
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '900', color: '#94a3b8', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Entidad Financiera</label>
                                <input 
                                    type="text" 
                                    name="name" 
                                    value={formData.name} 
                                    onChange={handleInputChange} 
                                    required 
                                    placeholder="Ej: Bancolombia Corporate"
                                    style={{ width: '100%', padding: '1.2rem', borderRadius: '20px', border: '1px solid #f1f5f9', background: '#f8fafc', fontSize: '1rem', fontWeight: '700', outline: 'none', transition: 'all 0.3s' }} 
                                    onFocus={(e) => { e.target.style.borderColor = deepTeal; e.target.style.background = '#fff'; }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '900', color: '#94a3b8', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Categoría de Activo</label>
                                <select 
                                    name="type" 
                                    value={formData.type} 
                                    onChange={handleInputChange} 
                                    style={{ width: '100%', padding: '1.2rem', borderRadius: '20px', border: '1px solid #f1f5f9', background: '#f8fafc', fontSize: '1rem', fontWeight: '700', outline: 'none', cursor: 'pointer' }}
                                >
                                    <option value="cta de ahorros">Cta de Ahorros</option>
                                    <option value="cta corriente">Cta Corriente</option>
                                    <option value="Efectivo">Caja Menor / Efectivo</option>
                                    <option value="Pasarela Digital">Pasarela de Pagos (Wompi/Stripe)</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '900', color: '#94a3b8', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Identificador de Cuenta</label>
                                <input 
                                    type="text" 
                                    name="account_number" 
                                    value={formData.account_number} 
                                    onChange={handleInputChange} 
                                    placeholder="No. 057-000000-XX" 
                                    style={{ width: '100%', padding: '1.2rem', borderRadius: '20px', border: '1px solid #f1f5f9', background: '#f8fafc', fontSize: '1rem', fontWeight: '700', outline: 'none' }} 
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '900', color: '#94a3b8', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Saldo Apertura</label>
                                    <input
                                        type="number"
                                        name="initial_balance"
                                        value={formData.initial_balance}
                                        onChange={handleInputChange}
                                        style={{ width: '100%', padding: '1.2rem', borderRadius: '20px', border: '1px solid #f1f5f9', background: '#f8fafc', fontSize: '1rem', fontWeight: '900', outline: 'none' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '900', color: '#94a3b8', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Balance Real</label>
                                    <input
                                        type="number"
                                        name="balance"
                                        value={formData.balance}
                                        onChange={handleInputChange}
                                        style={{ width: '100%', padding: '1.2rem', borderRadius: '20px', border: '1px solid #f1f5f9', background: '#e2e8f0', fontSize: '1rem', fontWeight: '900', outline: 'none' }}
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
                                <button 
                                    type="button"
                                    onClick={handleCloseModal}
                                    style={{ flex: 1, padding: '1.2rem', borderRadius: '20px', border: '2px solid #f1f5f9', background: '#fff', color: '#64748b', fontWeight: '900', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                                >
                                    DESCARTAR
                                </button>
                                <button 
                                    type="submit" 
                                    style={{ 
                                        flex: 2, 
                                        padding: '1.2rem', 
                                        borderRadius: '20px', 
                                        border: 'none', 
                                        background: deepTeal, 
                                        color: '#fff', 
                                        fontWeight: '900', 
                                        fontSize: '1rem', 
                                        cursor: 'pointer',
                                        boxShadow: `0 10px 25px ${deepTeal}30`,
                                        transition: 'all 0.3s'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 15px 35px ${deepTeal}40`; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 10px 25px ${deepTeal}30`; }}
                                >
                                    {editingBank ? 'ACTUALIZAR CUENTA' : 'CONFIRMAR APERTURA'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default Banks;
