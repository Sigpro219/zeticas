import React, { useState } from 'react';
import { Landmark, Plus, Edit3, Trash2, X, AlertCircle } from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
// supabase import removed

const Banks = () => {
    const { banks, addBank, updateBank, deleteBank } = useBusiness();
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
                await updateBank(editingBank.id, data);
            } else {
                await addBank(data);
            }
        } catch (err) {
            console.error("Error saving bank:", err);
        }
        handleCloseModal();
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Estás seguro que quieres eliminar este banco?")) {
            return;
        }
        try {
            await deleteBank(id);
        } catch (err) {
            console.error("Error deleting bank:", err);
        }
    };

    const totalLiquidity = banks.reduce((acc, bank) => acc + (bank.balance || 0), 0);

    return (
        <div style={{ padding: '0 0.5rem', minHeight: '100vh', background: 'transparent' }}>
            {/* Treasury Header */}
            <header style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '2rem',
                marginTop: '1.5rem',
                animation: 'fadeUp 0.5s ease-out'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: deepTeal, marginBottom: '0.2rem' }}>
                        <Landmark size={24} />
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', letterSpacing: '-0.8px' }}>Control de Tesorería</h2>
                    </div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: '700' }}>Gestión centralizada de activos líquidos.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    style={{ 
                        background: deepTeal, 
                        color: '#fff', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.6rem',
                        padding: '0.8rem 1.8rem',
                        borderRadius: '14px',
                        fontWeight: '900',
                        fontSize: '0.8rem',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: `0 10px 25px ${deepTeal}20`,
                        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                        textTransform: 'uppercase'
                    }}
                >
                    <Plus size={18} /> Nueva Cuenta
                </button>
            </header>

            {/* Global Liquidity KPI */}
            <div style={{ 
                background: `linear-gradient(135deg, ${deepTeal} 0%, #037075 100%)`, 
                padding: '2rem 2.5rem', 
                borderRadius: '24px', 
                color: '#fff',
                marginBottom: '1.5rem',
                boxShadow: `0 15px 35px ${deepTeal}20`,
                position: 'relative',
                overflow: 'hidden',
                animation: 'fadeUp 0.6s ease-out'
            }}>
                <div style={{ position: 'absolute', right: '-10px', bottom: '-20px', opacity: 0.1 }}>
                    <Landmark size={200} />
                </div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem', opacity: 0.8 }}>
                        <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.5rem', borderRadius: '10px' }}>
                            <AlertCircle size={20} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Liquidez Global</span>
                    </div>
                    <div style={{ fontSize: '3rem', fontWeight: '900', letterSpacing: '-2px', lineHeight: 1, marginBottom: '1.5rem' }}>
                        <span style={{ fontSize: '1.4rem', verticalAlign: 'top', marginRight: '6px', opacity: 0.4 }}>$</span>
                        {totalLiquidity.toLocaleString()}
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.08)', padding: '0.8rem 1.5rem', borderRadius: '14px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: '900', opacity: 0.6, textTransform: 'uppercase', marginBottom: '2px' }}>Entidades</div>
                            <div style={{ fontSize: '1rem', fontWeight: '900' }}>{banks.length} ActivAs</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.08)', padding: '0.8rem 1.5rem', borderRadius: '14px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '0.65rem', fontWeight: '900', opacity: 0.6, textTransform: 'uppercase', marginBottom: '2px' }}>Health Rating</div>
                            <div style={{ fontSize: '1rem', fontWeight: '900', color: '#4ade80' }}>OPTIMA</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Asset Allocation Board */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                gap: '1.5rem', 
                marginBottom: '2rem',
                animation: 'fadeUp 0.7s ease-out'
            }}>
                {banks.sort((a,b) => b.balance - a.balance).slice(0, 4).map((bank, index) => {
                    const percentage = totalLiquidity > 0 ? (bank.balance / totalLiquidity * 100).toFixed(1) : 0;
                    return (
                        <div key={bank.id} style={{ 
                            background: glassWhite, 
                            backdropFilter: 'blur(10px)',
                            padding: '1.2rem 1.5rem', 
                            borderRadius: '24px', 
                            border: '1px solid rgba(2, 54, 54, 0.05)', 
                            boxShadow: '0 10px 25px rgba(0,0,0,0.02)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>{bank.name}</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: '900', color: deepTeal }}>{percentage}%</div>
                            </div>
                            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#10b981', letterSpacing: '-0.5px', marginBottom: '1rem' }}>
                                <span style={{ fontSize: '0.7rem', opacity: 0.4, marginRight: '3px', color: '#64748b' }}>$</span>
                                {bank.balance.toLocaleString()}
                            </div>
                            <div style={{ height: '5px', background: 'rgba(2, 54, 54, 0.04)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ 
                                    height: '100%', 
                                    width: `${percentage}%`, 
                                    background: index === 0 ? deepTeal : index === 1 ? institutionOcre : index === 2 ? premiumSalmon : '#94a3b8',
                                    borderRadius: '3px',
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
                borderRadius: '24px', 
                border: '1px solid rgba(2, 54, 54, 0.05)', 
                overflow: 'hidden', 
                boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
                animation: 'fadeUp 0.7s ease-out'
            }}>
                <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '900', color: deepTeal, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Libro Mayor de Cuentas</h3>
                </div>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead>
                        <tr style={{ background: 'rgba(2, 83, 87, 0.02)' }}>
                            <th style={{ padding: '1.2rem 1.5rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Institución</th>
                            <th style={{ padding: '1.2rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Tipo</th>
                            <th style={{ padding: '1.2rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>No. Cuenta</th>
                            <th style={{ padding: '1.2rem 1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Inicial</th>
                            <th style={{ padding: '1.2rem 1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Real-Time</th>
                            <th style={{ padding: '1.2rem 1.5rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Acción</th>
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
                                <td style={{ padding: '1.2rem 1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${deepTeal}05`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: deepTeal }}>
                                            <Landmark size={16} />
                                        </div>
                                        <div style={{ fontWeight: '900', color: '#1e293b', fontSize: '0.95rem', letterSpacing: '-0.3px' }}>{bank.name}</div>
                                    </div>
                                </td>
                                <td style={{ padding: '1.2rem 1rem' }}>
                                    <span style={{ fontSize: '0.65rem', color: institutionOcre, fontWeight: '900', background: `${institutionOcre}10`, padding: '4px 10px', borderRadius: '6px', textTransform: 'uppercase' }}>
                                        {bank.type}
                                    </span>
                                </td>
                                <td style={{ padding: '1.2rem 1rem', fontSize: '0.85rem', color: '#64748b', fontWeight: '700' }}>{bank.account_number || 'N/A'}</td>
                                <td style={{ padding: '1.2rem 1rem', textAlign: 'right', fontSize: '0.85rem', color: '#94a3b8', fontWeight: '700' }}>
                                    ${(bank.initial_balance || 0).toLocaleString()}
                                </td>
                                <td style={{ padding: '1.2rem 1rem', textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '900', color: (bank.balance || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                                        ${(bank.balance || 0).toLocaleString()}
                                    </div>
                                </td>
                                <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
                                        <button 
                                            onClick={() => handleOpenModal(bank)} 
                                            style={{ 
                                                width: '32px', 
                                                height: '32px', 
                                                borderRadius: '8px', 
                                                border: '1px solid #f1f5f9', 
                                                background: '#fff', 
                                                cursor: 'pointer', 
                                                color: '#64748b',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.3s'
                                            }}
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(bank.id)} 
                                            style={{ 
                                                width: '32px', 
                                                height: '32px', 
                                                borderRadius: '8px', 
                                                border: '1px solid #fee2e2', 
                                                background: '#fff', 
                                                cursor: 'pointer', 
                                                color: '#ef4444',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.3s'
                                            }}
                                        >
                                            <Trash2 size={14} />
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
