import React, { useState } from 'react';
import { Landmark, Plus, Edit3, Trash2, X, AlertCircle, History, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';

const Banks = () => {
    const { banks, bankTransactions, addBank, updateBank, deleteBank } = useBusiness();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
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

    const handleSave = async (e) => {
        e.preventDefault();
        const data = {
            ...formData,
            initial_balance: parseFloat(formData.initial_balance) || 0,
            balance: parseFloat(formData.balance) || 0,
            real_time: parseFloat(formData.balance) || 0
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
        if (!window.confirm("¿Estás seguro que quieres eliminar este banco?")) return;
        try {
            await deleteBank(id);
        } catch (err) {
            console.error("Error deleting bank:", err);
        }
    };

    const totalLiquidity = banks.reduce((acc, bank) => acc + (Number(bank.real_time || bank.balance) || 0), 0);

    return (
        <div style={{ padding: '0 0.5rem', minHeight: '100vh', background: 'transparent' }}>
            {/* Header Redesign - Cleanup */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem', marginTop: '1rem' }}>
                {/* Narrower KPI Card */}
                <div style={{ 
                    background: `linear-gradient(135deg, ${deepTeal} 0%, #037075 100%)`, 
                    padding: '1.8rem 2.2rem', 
                    borderRadius: '24px', 
                    color: '#fff',
                    boxShadow: `0 15px 35px ${deepTeal}20`,
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    minHeight: '180px'
                }}>
                    <div style={{ position: 'absolute', right: '-10px', bottom: '-20px', opacity: 0.05 }}>
                        <Landmark size={180} />
                    </div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.5rem', opacity: 0.7 }}>
                            <AlertCircle size={14} />
                            <span style={{ fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Liquidez Global Consolidated</span>
                        </div>
                        <div style={{ fontSize: '3rem', fontWeight: '900', letterSpacing: '-2px', lineHeight: 1, marginBottom: '1.2rem' }}>
                            <span style={{ fontSize: '1.2rem', verticalAlign: 'top', marginRight: '4px', opacity: 0.5 }}>$</span>
                            {totalLiquidity.toLocaleString()}
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '800' }}>
                                {banks.length} ACTIVAS
                            </div>
                            <div style={{ background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', padding: '0.5rem 1rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '900' }}>
                                ESTATUS ÓPTIMO
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions Panel */}
                <div style={{ 
                    background: '#fff', 
                    borderRadius: '24px', 
                    border: '1px solid rgba(2, 54, 54, 0.05)', 
                    padding: '1.8rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '1rem',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.02)'
                }}>
                    <button
                        onClick={() => handleOpenModal()}
                        style={{ 
                            background: deepTeal, 
                            color: '#fff', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            gap: '0.8rem',
                            padding: '1rem',
                            borderRadius: '16px',
                            fontWeight: '900',
                            fontSize: '0.85rem',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: `0 8px 20px ${deepTeal}25`,
                            transition: 'all 0.3s'
                        }}
                    >
                        <Plus size={18} /> NUEVA CUENTA
                    </button>
                    <button
                        onClick={() => setIsHistoryOpen(true)}
                        style={{ 
                            background: '#f8fafc', 
                            color: deepTeal, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            gap: '0.8rem',
                            padding: '1rem',
                            borderRadius: '16px',
                            fontWeight: '900',
                            fontSize: '0.85rem',
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            transition: 'all 0.3s'
                        }}
                    >
                        <History size={18} /> HISTORIAL DE MOVIMIENTOS
                    </button>
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
                {banks.sort((a,b) => (Number(b.real_time || b.balance)) - (Number(a.real_time || a.balance))).slice(0, 4).map((bank, index) => {
                    const balance = Number(bank.real_time || bank.balance || 0);
                    const percentage = totalLiquidity > 0 ? (balance / totalLiquidity * 100).toFixed(1) : 0;
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
                                {balance.toLocaleString()}
                            </div>
                            <div style={{ height: '5px', background: 'rgba(2, 54, 54, 0.04)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ 
                                    height: '100%', 
                                    width: `${percentage}%`, 
                                    background: index === 0 ? deepTeal : '#94a3b8',
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
                <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '900', color: deepTeal, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Libro Mayor de Cuentas</h3>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b' }}>Consolidado Real-Time</div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead>
                        <tr style={{ background: 'rgba(2, 83, 87, 0.02)' }}>
                            <th style={{ padding: '1.2rem 1.5rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Institución</th>
                            <th style={{ padding: '1.2rem 1rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Categoría</th>
                            <th style={{ padding: '1.2rem 1rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Identificador</th>
                            <th style={{ padding: '1.2rem 1rem', textAlign: 'right', fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Inicial</th>
                            <th style={{ padding: '1.2rem 1rem', textAlign: 'right', fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Saldo Real</th>
                            <th style={{ padding: '1.2rem 1.5rem', textAlign: 'center', fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {banks.map((bank) => {
                            const balance = Number(bank.real_time || bank.balance || 0);
                            return (
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
                                            <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.9rem', letterSpacing: '-0.3px' }}>{bank.name}</div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.2rem 1rem' }}>
                                        <span style={{ fontSize: '0.6rem', color: institutionOcre, fontWeight: '900', background: `${institutionOcre}10`, padding: '4px 10px', borderRadius: '6px', textTransform: 'uppercase' }}>
                                            {bank.type}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1.2rem 1rem', fontSize: '0.8rem', color: '#64748b', fontWeight: '700' }}>{bank.account_number || '---'}</td>
                                    <td style={{ padding: '1.2rem 1rem', textAlign: 'right', fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700' }}>
                                        ${(bank.initial_balance || 0).toLocaleString()}
                                    </td>
                                    <td style={{ padding: '1.2rem 1rem', textAlign: 'right' }}>
                                        <div style={{ fontSize: '1rem', fontWeight: '900', color: balance >= 0 ? '#10b981' : '#ef4444' }}>
                                            ${balance.toLocaleString()}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                            <button 
                                                onClick={() => handleOpenModal(bank)} 
                                                style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #f1f5f9', background: '#fff', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <Edit3 size={12} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(bank.id)} 
                                                style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid #fee2e2', background: '#fff', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* History Modal - Movements List */}
            {isHistoryOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '2rem' }}>
                    <div style={{ background: '#fff', width: '900px', maxHeight: '85vh', borderRadius: '32px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 50px 100px rgba(0,0,0,0.3)' }}>
                        <div style={{ padding: '2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <History size={28} style={{ color: deepTeal }} />
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900', color: '#1e293b' }}>Historial del Libro Mayor</h3>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>Registro total de entradas y salidas de efectivo</p>
                                </div>
                            </div>
                            <button onClick={() => setIsHistoryOpen(false)} style={{ border: 'none', background: '#f1f5f9', padding: '0.8rem', borderRadius: '50%', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
                                    <tr>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Fecha</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Concepto / Descripción</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Banco</th>
                                        <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Monto</th>
                                        <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Saldo Final</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bankTransactions && bankTransactions.map((t, idx) => {
                                        const dateTime = t.created_at ? new Date(t.created_at).toLocaleString('es-CO', {
                                            day: '2-digit', month: '2-digit', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit', hour12: true
                                        }) : t.date;

                                        return (
                                            <tr key={t.id || idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                                                <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#64748b', fontWeight: '700' }}>
                                                    {dateTime}
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b' }}>{t.description}</div>
                                                    <div style={{ fontSize: '0.7rem', color: institutionOcre, fontWeight: '900', textTransform: 'uppercase' }}>{t.category}</div>
                                                </td>
                                                <td style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: '800', color: deepTeal }}>{t.bank_name}</td>
                                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem', color: t.type === 'income' ? '#10b981' : '#ef4444', fontWeight: '900' }}>
                                                        {t.type === 'income' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                                                        ${(t.amount || 0).toLocaleString()}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.9rem', fontWeight: '900', color: '#1e293b' }}>
                                                    ${(t.end_balance || 0).toLocaleString()}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {(!bankTransactions || bankTransactions.length === 0) && (
                                        <tr>
                                            <td colSpan="5" style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                                                No hay movimientos registrados en este periodo.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Nueva Cuenta / Edición */}
            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                    <div style={{ background: '#fff', padding: '3rem', borderRadius: '40px', width: '500px', boxShadow: '0 40px 80px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                            <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: `${deepTeal}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: deepTeal }}>
                                {editingBank ? <Edit3 size={24} /> : <Plus size={24} />}
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: deepTeal }}>{editingBank ? 'Editar Cuenta' : 'Nueva Cuenta Bancaria'}</h3>
                        </div>
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '900', color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Banco / Institución</label>
                                <input type="text" name="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '1px solid #f1f5f9', background: '#f8fafc', fontWeight: '700' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '900', color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase' }}>No. de Cuenta</label>
                                <input type="text" name="account_number" value={formData.account_number} onChange={(e) => setFormData({...formData, account_number: e.target.value})} style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '1px solid #f1f5f9', background: '#f8fafc', fontWeight: '700' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '900', color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Saldo Inicial</label>
                                    <input type="number" name="initial_balance" value={formData.initial_balance} onChange={(e) => setFormData({...formData, initial_balance: e.target.value})} style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '1px solid #f1f5f9', background: '#f8fafc', fontWeight: '700' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '900', color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Saldo Actual</label>
                                    <input type="number" name="balance" value={formData.balance} onChange={(e) => setFormData({...formData, balance: e.target.value})} style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '1px solid #f1f5f9', background: '#f8fafc', fontWeight: '700' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={handleCloseModal} style={{ flex: 1, padding: '1rem', borderRadius: '14px', border: 'none', background: '#f1f5f9', fontWeight: '900', color: '#64748b', cursor: 'pointer' }}>CANCELAR</button>
                                <button type="submit" style={{ flex: 2, padding: '1rem', borderRadius: '14px', border: 'none', background: deepTeal, color: '#fff', fontWeight: '900', cursor: 'pointer' }}>{editingBank ? 'GUARDAR' : 'CREAR CUENTA'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default Banks;
