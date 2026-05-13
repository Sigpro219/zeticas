import React, { useState, useMemo } from 'react';
import { 
    Landmark, Plus, Edit3, Trash2, X, AlertCircle, History, 
    ArrowUpRight, Truck, CreditCard, RefreshCw,
    TrendingUp, Wallet, Activity, ArrowRight
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';

const Banks = () => {
    const { banks, bankTransactions, expenses, addBank, updateBank, deleteBank, transferFunds } = useBusiness();
    
    // UI States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [editingBank, setEditingBank] = useState(null);
    const [deletingBank, setDeletingBank] = useState(null);
    const [confirmNameValue, setConfirmNameValue] = useState('');
    
    const [formData, setFormData] = useState({
        name: '', type: 'cta de ahorros', account_number: '', initial_balance: 0, balance: 0
    });

    const [transferData, setTransferData] = useState({
        fromId: '', toId: '', amount: '', description: ''
    });

    // Premium Theme
    const theme = {
        deepTeal: '#023636',
        accentOcre: '#D4785A',
        success: '#10b981',
        danger: '#ef4444',
        slate: '#64748b',
        border: 'rgba(2, 54, 54, 0.08)'
    };

    // Advanced Financial Logic
    const totalLiquidity = useMemo(() => 
        banks.reduce((acc, bank) => acc + (Number(bank.real_time || bank.balance) || 0), 0),
    [banks]);

    const runwayData = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentExpenses = (expenses || []).filter(e => new Date(e.date || e.created_at) >= thirtyDaysAgo);
        const totalRecentExpenses = recentExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
        const avgDailyBurn = totalRecentExpenses / 30;
        return {
            burn: avgDailyBurn,
            days: avgDailyBurn > 0 ? Math.floor(totalLiquidity / avgDailyBurn) : '---'
        };
    }, [expenses, totalLiquidity]);

    const sortedBanks = useMemo(() => {
        return [...banks].sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            if (nameA.includes('bbva') && !nameB.includes('bbva')) return -1;
            if (!nameA.includes('bbva') && nameB.includes('bbva')) return 1;
            return (Number(b.real_time || b.balance)) - (Number(a.real_time || a.balance));
        });
    }, [banks]);

    // Handlers
    const handleOpenModal = (bank = null) => {
        if (bank) {
            setEditingBank(bank);
            setFormData(bank);
        } else {
            setEditingBank(null);
            setFormData({ name: '', type: 'cta de ahorros', account_number: '', initial_balance: 0, balance: 0 });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const data = { ...formData, real_time: parseFloat(formData.balance) || 0 };
        try {
            editingBank ? await updateBank(editingBank.id, data) : await addBank(data);
            setIsModalOpen(false);
        } catch (err) { console.error(err); }
    };

    const handleTransfer = async (e) => {
        e.preventDefault();
        const res = await transferFunds(transferData.fromId, transferData.toId, Number(transferData.amount), transferData.description);
        if (res.success) {
            setIsTransferModalOpen(false);
            setTransferData({ fromId: '', toId: '', amount: '', description: '' });
        } else { alert(res.error); }
    };

    return (
        <div style={{ padding: '0.5rem', animation: 'fadeIn 0.5s ease' }}>
            
            {/* --- MASTER KPI BOARD --- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div style={{ 
                    background: `linear-gradient(135deg, ${theme.deepTeal} 0%, #037075 100%)`, 
                    padding: '2rem', borderRadius: '32px', color: '#fff', 
                    boxShadow: '0 20px 40px rgba(2, 54, 54, 0.2)', position: 'relative', overflow: 'hidden' 
                }}>
                    <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.1 }}><TrendingUp size={160} /></div>
                    <div style={{ fontSize: '0.75rem', fontWeight: '900', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '1rem' }}>Liquidez Consolidada</div>
                    <div style={{ fontSize: '3.5rem', fontWeight: '950', letterSpacing: '-2px', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '1.5rem', verticalAlign: 'top', marginRight: '5px', opacity: 0.5 }}>$</span>
                        {totalLiquidity.toLocaleString()}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '800' }}>{banks.length} CUENTAS</div>
                        <div style={{ background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', padding: '0.5rem 1rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '900' }}>STATUS ÓPTIMO</div>
                    </div>
                </div>

                <div style={{ background: '#fff', padding: '2rem', borderRadius: '32px', border: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: '900', color: theme.slate, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Runway Operativo</div>
                        <div style={{ fontSize: '2.8rem', fontWeight: '950', color: theme.accentOcre }}>{runwayData.days}</div>
                        <div style={{ fontSize: '0.65rem', color: theme.slate, fontWeight: '700' }}>Días de supervivencia</div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: '900', color: theme.slate, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Quema Diaria</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: '950', color: theme.danger }}>${Math.round(runwayData.burn).toLocaleString()}</div>
                        <div style={{ fontSize: '0.65rem', color: theme.slate, fontWeight: '700' }}>Avg. últimos 30 días</div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button onClick={() => handleOpenModal()} style={{ flex: 1, background: theme.deepTeal, color: '#fff', border: 'none', borderRadius: '20px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', fontSize: '0.85rem' }}>
                        <Plus size={20} /> NUEVA CUENTA
                    </button>
                    <button onClick={() => setIsTransferModalOpen(true)} style={{ flex: 1, background: 'rgba(212, 120, 90, 0.1)', color: theme.accentOcre, border: 'none', borderRadius: '20px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', fontSize: '0.85rem' }}>
                        <RefreshCw size={20} /> TRASLADO ENTRE CUENTAS
                    </button>
                </div>
            </div>

            {/* --- BANK CARDS --- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                {sortedBanks.map(bank => {
                    const balance = Number(bank.real_time || bank.balance || 0);
                    const isBBVA = bank.name.toLowerCase().includes('bbva');
                    return (
                        <div key={bank.id} style={{ 
                            background: '#fff', padding: '2rem', borderRadius: '32px', 
                            border: isBBVA ? `2px solid ${theme.deepTeal}` : `1px solid ${theme.border}`,
                            position: 'relative', overflow: 'hidden'
                        }}>
                            {isBBVA && <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: theme.deepTeal, color: '#fff', padding: '4px 10px', borderRadius: '8px', fontSize: '0.6rem', fontWeight: '900' }}>PRINCIPAL</div>}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `${theme.deepTeal}05`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.deepTeal }}>
                                    {bank.name.toLowerCase().includes('bold') || bank.name.toLowerCase().includes('wompi') ? <CreditCard size={24} /> : <Landmark size={24} />}
                                </div>
                                <div>
                                    <div style={{ fontSize: '1rem', fontWeight: '900', color: theme.deepTeal }}>{bank.name}</div>
                                    <div style={{ fontSize: '0.7rem', color: theme.slate, fontWeight: '700' }}>{bank.type.toUpperCase()} • {bank.account_number || '---'}</div>
                                </div>
                            </div>
                            <div style={{ fontSize: '2.2rem', fontWeight: '950', letterSpacing: '-1.5px', color: balance < 0 ? theme.danger : '#1e293b' }}>
                                <span style={{ fontSize: '1rem', opacity: 0.3, marginRight: '4px' }}>$</span>
                                {balance.toLocaleString()}
                            </div>
                            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '0.7rem', color: theme.slate, fontWeight: '800' }}>CONCENTRACIÓN: {totalLiquidity > 0 ? (balance / totalLiquidity * 100).toFixed(1) : 0}%</div>
                                <button onClick={() => handleOpenModal(bank)} style={{ background: 'none', border: 'none', color: theme.deepTeal, cursor: 'pointer' }}><Edit3 size={16} /></button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* --- REAL-TIME LEDGER --- */}
            <div style={{ background: '#fff', borderRadius: '32px', border: `1px solid ${theme.border}`, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
                <div style={{ padding: '1.8rem 2.5rem', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Activity size={22} color={theme.deepTeal} />
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '950', textTransform: 'uppercase', letterSpacing: '1px' }}>Libro Mayor (Últimos Movimientos)</h3>
                    </div>
                    <button onClick={() => setIsHistoryOpen(true)} style={{ background: `${theme.deepTeal}08`, color: theme.deepTeal, border: 'none', padding: '0.8rem 1.5rem', borderRadius: '12px', fontWeight: '900', fontSize: '0.75rem', cursor: 'pointer' }}>HISTORIAL COMPLETO</button>
                </div>
                <div style={{ padding: '1.5rem 2.5rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: theme.slate, fontSize: '0.7rem', textTransform: 'uppercase', borderBottom: `2px solid ${theme.border}` }}>
                                <th style={{ padding: '1rem 0' }}>Fecha / Hora</th>
                                <th style={{ padding: '1rem 0' }}>Concepto</th>
                                <th style={{ padding: '1rem 0' }}>Cuenta Destino</th>
                                <th style={{ padding: '1rem 0', textAlign: 'right' }}>Monto</th>
                                <th style={{ padding: '1rem 0', textAlign: 'right' }}>Saldo Final</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(bankTransactions || []).slice(0, 10).map(t => (
                                <tr key={t.id} style={{ borderBottom: `1px solid ${theme.border}`, fontSize: '0.9rem' }}>
                                    <td style={{ padding: '1.2rem 0', color: theme.slate, fontWeight: '600' }}>{new Date(t.created_at || t.date).toLocaleString()}</td>
                                    <td style={{ padding: '1.2rem 0' }}>
                                        <div style={{ fontWeight: '900', color: '#1e293b' }}>{t.description}</div>
                                        <div style={{ fontSize: '0.7rem', color: theme.accentOcre, fontWeight: '800', textTransform: 'uppercase' }}>{t.category || 'Operación'}</div>
                                    </td>
                                    <td style={{ padding: '1.2rem 0', color: theme.deepTeal, fontWeight: '850' }}>{t.bank_name}</td>
                                    <td style={{ padding: '1.2rem 0', textAlign: 'right', fontWeight: '950', color: t.type === 'income' ? theme.success : theme.danger }}>
                                        {t.type === 'income' ? '+' : '-'} ${t.amount.toLocaleString()}
                                    </td>
                                    <td style={{ padding: '1.2rem 0', textAlign: 'right', fontWeight: '900', color: '#1e293b' }}>${(t.new_balance || t.end_balance || 0).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- TRASLADO MODAL --- */}
            {isTransferModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(2, 54, 54, 0.4)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
                    <div style={{ background: '#fff', padding: '3rem', borderRadius: '40px', width: '500px', boxShadow: '0 40px 80px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '950', color: theme.deepTeal, marginBottom: '2rem' }}>Traslado de Fondos</h3>
                        <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '900', color: theme.slate, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Origen</label>
                                    <select value={transferData.fromId} onChange={e => setTransferData({...transferData, fromId: e.target.value})} style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: `1px solid ${theme.border}`, fontWeight: '700' }} required>
                                        <option value="">Seleccionar...</option>
                                        {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '900', color: theme.slate, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Destino</label>
                                    <select value={transferData.toId} onChange={e => setTransferData({...transferData, toId: e.target.value})} style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: `1px solid ${theme.border}`, fontWeight: '700' }} required>
                                        <option value="">Seleccionar...</option>
                                        {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <input type="number" placeholder="Monto a trasladar" value={transferData.amount} onChange={e => setTransferData({...transferData, amount: e.target.value})} style={{ padding: '1.2rem', borderRadius: '16px', border: `2px solid ${theme.deepTeal}`, fontSize: '1.5rem', fontWeight: '950', color: theme.deepTeal }} required />
                            <input type="text" placeholder="Referencia / Concepto" value={transferData.description} onChange={e => setTransferData({...transferData, description: e.target.value})} style={{ padding: '1rem', borderRadius: '14px', border: `1px solid ${theme.border}`, fontWeight: '700' }} />
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button type="button" onClick={() => setIsTransferModalOpen(false)} style={{ flex: 1, padding: '1.2rem', borderRadius: '16px', border: 'none', background: '#f1f5f9', fontWeight: '900', color: theme.slate, cursor: 'pointer' }}>CANCELAR</button>
                                <button type="submit" style={{ flex: 2, padding: '1.2rem', borderRadius: '16px', border: 'none', background: theme.deepTeal, color: '#fff', fontWeight: '900', cursor: 'pointer' }}>EJECUTAR TRASLADO</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                tr:hover { background: rgba(2, 54, 54, 0.01); }
            `}</style>
        </div>
    );
};

export default Banks;
