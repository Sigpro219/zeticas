import React, { useState, useMemo, useEffect } from 'react';
import {
    Receipt, Plus, DollarSign, Calendar, Tag, FileText,
    ArrowUpRight, ArrowDownRight, Landmark, PieChart,
    Trash2, Search, Filter, TrendingUp, TrendingDown, Pencil, X, RefreshCw
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';

const Expenses = () => {
    const { expenses, orders, purchaseOrders, banks, updateBankBalance, addExpense, updateExpense, deleteExpense } = useBusiness();
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [categories, setCategories] = useState(['Administración', 'Ventas', 'Transporte', 'Alimentación', 'Servicios Públicos', 'Nómina', 'Traslado entre Bancos']);
    const [editingExpense, setEditingExpense] = useState(null);

    const [filterType, setFilterType] = useState('month');
    const [customRange, setCustomRange] = useState({ from: '', to: '' });

    const deepTeal = '#023636';
    const institutionOcre = '#D4785A';
    const premiumSalmon = '#E29783';
    const glassWhite = 'rgba(255, 255, 255, 0.85)';

    const isWithinRange = (dateStr) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        if (filterType === 'week') {
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            return d >= lastWeek;
        } else if (filterType === 'month') {
            const thisMonth = new Date();
            thisMonth.setDate(1);
            return d >= thisMonth;
        } else if (filterType === 'custom' && customRange.from && customRange.to) {
            return dateStr >= customRange.from && dateStr <= customRange.to;
        }
        return true;
    };

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        category: 'Administración',
        description: '',
        amount: '',
        bankId: '',
        targetBankId: ''
    });

    const pygData = useMemo(() => {
        // 1. INGRESOS (SOLO PAGADOS - FLUJO DE CAJA)
        const filteredOrders = (orders || []).filter(o => isWithinRange(o.date));
        const totalPedidosBrutos = filteredOrders.reduce((acc, o) => acc + (o.amount || 0), 0);
        const totalIngresosEfectivo = filteredOrders
            .filter(o => o.status === 'Pagado' || o.paymentStatus === 'Pagado')
            .reduce((acc, o) => acc + (o.amount || 0), 0);

        const filteredExpensesList = (expenses || [])
            .map(e => {
                const bank = banks.find(b => b.id === (e.bankId || e.bank_id));
                return { ...e, bankName: bank ? bank.name : 'N/A' };
            })
            .filter(e => isWithinRange(e.date || e.expense_date))
            .filter(e => e.category !== 'Traslado entre Bancos');

        // RECLASIFICACIÓN DEFINITIVA (Basada en lo que Eliécer ve en su tabla)
        const totalCostosEfectivo = filteredExpensesList
            .filter(e => (e.description || '').toUpperCase().includes('OC') || (e.category || '').toUpperCase().includes('COMPRAS'))
            .reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);

        const totalGastosOperativos = filteredExpensesList
            .filter(e => !(e.description || '').toUpperCase().includes('OC') && !(e.category || '').toUpperCase().includes('COMPRAS'))
            .reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);

        // 4. UTILIDAD NETA (FLUJO DE CAJA)
        const utilidadNeta = totalIngresosEfectivo - totalCostosEfectivo - totalGastosOperativos;

        return {
            ingresos: totalIngresosEfectivo,
            cartera: totalPedidosBrutos - totalIngresosEfectivo,
            costos: totalCostosEfectivo,
            gastos: totalGastosOperativos,
            utilidad: utilidadNeta,
            pedidosBrutos: totalPedidosBrutos,
            listaGastos: filteredExpensesList
        };
    }, [orders, purchaseOrders, expenses, filterType, customRange, banks]);

    const filteredExpenses = (pygData.listaGastos || []).filter(e => {
        const q = searchTerm.toLowerCase();
        if (!q) return true;
        return (
            (e.date || e.expense_date || '').toLowerCase().includes(q) ||
            (e.category || '').toLowerCase().includes(q) ||
            (e.description || '').toLowerCase().includes(q) ||
            (e.bankName || '').toLowerCase().includes(q)
        );
    });

    const handleAddExpense = async (e) => {
        if (e) e.preventDefault();
        const amount = parseFloat(formData.amount) || 0;
        if (!formData.category || !formData.bankId || amount <= 0) return alert("Por favor complete todos los campos.");

        try {
            const res = await addExpense({
                expense_date: formData.date,
                category: formData.category,
                description: formData.description,
                amount: amount,
                bank_id: formData.bankId,
                target_bank_id: formData.category === 'Traslado entre Bancos' ? formData.targetBankId : null,
                created_at: new Date().toISOString()
            });

            if (res.success) {
                // DESCUENTO DEL BANCO
                await updateBankBalance(formData.bankId, amount, 'expense');

                // SI ES TRASLADO, SUMA AL DESTINO
                if (formData.category === 'Traslado entre Bancos' && formData.targetBankId) {
                    await updateBankBalance(formData.targetBankId, amount, 'income');
                }

                setShowModal(false);
                setFormData({ date: new Date().toISOString().split('T')[0], category: 'Administración', description: '', amount: '', bankId: '', targetBankId: '' });
                alert("Movimiento registrado y saldo bancario actualizado.");
            }
        } catch (err) { alert("Error: " + err.message); }
    };

    const handleDeleteExpense = async (id) => {
        if (!window.confirm("¿Eliminar este registro y reintegrar el saldo al banco?")) return;
        try {
            const exp = expenses.find(e => e.id === id);
            if (exp) {
                await deleteExpense(id);
                const bId = exp.bankId || exp.bank_id;
                if (bId) await updateBankBalance(bId, exp.amount, 'income');
                if (exp.category === 'Traslado entre Bancos' && exp.target_bank_id) {
                    await updateBankBalance(exp.target_bank_id, exp.amount, 'expense');
                }
            }
        } catch (err) { alert(err.message); }
    };

    return (
        <div style={{ padding: '1.5rem', minHeight: '100vh', background: '#f8fafc' }}>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: deepTeal }}>
                    <Receipt size={24} />
                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900' }}>Rentabilidad & Gastos Operativos</h2>
                </div>
                <button
                    onClick={() => { setEditingExpense(null); setShowModal(true); }}
                    style={{ background: deepTeal, color: '#fff', padding: '0.5rem 1.2rem', borderRadius: '10px', border: 'none', fontWeight: '900', cursor: 'pointer', fontSize: '0.7rem' }}
                >
                    <Plus size={14} /> CARGAR GASTO
                </button>
            </header>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', background: '#fff', padding: '3px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    {['week', 'month', 'custom'].map(t => (
                        <button key={t} onClick={() => setFilterType(t)} style={{ padding: '0.4rem 1rem', border: 'none', borderRadius: '8px', fontSize: '0.65rem', fontWeight: '900', background: filterType === t ? deepTeal : 'transparent', color: filterType === t ? '#fff' : '#64748b', cursor: 'pointer' }}>
                            {t === 'week' ? 'Semana' : t === 'month' ? 'Mes' : 'Filtro'}
                        </button>
                    ))}
                </div>
                {filterType === 'custom' && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input type="date" value={customRange.from} onChange={e => setCustomRange({ ...customRange, from: e.target.value })} style={{ padding: '0.4rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                        <span style={{ fontSize: '0.7rem' }}>a</span>
                        <input type="date" value={customRange.to} onChange={e => setCustomRange({ ...customRange, to: e.target.value })} style={{ padding: '0.4rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    </div>
                )}
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
                    <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.2rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }} />
                </div>
            </div>

            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.2rem', marginBottom: '2.5rem' }}>
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8' }}>INGRESOS (COBRADOS)</span>
                    <div style={{ fontSize: '1.8rem', fontWeight: '900', color: deepTeal }}>${pygData.ingresos.toLocaleString('es-CO')}</div>
                    <div style={{ fontSize: '0.6rem', color: '#64748b' }}>PENDIENTE COBRO: ${pygData.cartera.toLocaleString()}</div>
                </div>
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8' }}>COSTO DE VENTAS (OC PAGADAS)</span>
                    <div style={{ fontSize: '1.8rem', fontWeight: '900', color: premiumSalmon }}>${pygData.costos.toLocaleString('es-CO')}</div>
                    <div style={{ fontSize: '0.6rem', color: '#64748b' }}>COMPRAS DESCONTADAS DE BANCOS</div>
                </div>
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8' }}>GASTOS OPERATIVOS</span>
                    <div style={{ fontSize: '1.8rem', fontWeight: '900', color: institutionOcre }}>${pygData.gastos.toLocaleString('es-CO')}</div>
                    <div style={{ fontSize: '0.6rem', color: '#64748b' }}>NÓMINA, SERVICIOS, ETC.</div>
                </div>
                <div style={{ background: deepTeal, color: '#fff', padding: '1.5rem', borderRadius: '30px' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: '900', opacity: 0.7 }}>UTILIDAD NETA (FLUJO)</span>
                    <div style={{ fontSize: '1.8rem', fontWeight: '900' }}>${pygData.utilidad.toLocaleString('es-CO')}</div>
                    <div style={{ fontSize: '0.6rem', opacity: 0.6 }}>INGRESOS - (COSTOS + GASTOS)</div>
                </div>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem' }}>
                <div style={{ background: '#fff', borderRadius: '24px', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                        <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '900' }}>Relación de Gastos</h3>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f8fafc' }}>
                            <tr>
                                <th style={{ padding: '0.8rem', textAlign: 'left', fontSize: '0.6rem', color: '#94a3b8' }}>FECHA</th>
                                <th style={{ padding: '0.8rem', textAlign: 'left', fontSize: '0.6rem', color: '#94a3b8' }}>CONCEPTO / BANCO</th>
                                <th style={{ padding: '0.8rem', textAlign: 'right', fontSize: '0.6rem', color: '#94a3b8' }}>VALOR</th>
                                <th style={{ padding: '0.8rem', textAlign: 'center', fontSize: '0.6rem', color: '#94a3b8' }}>ACC</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredExpenses.map(exp => (
                                <tr key={exp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '0.8rem', fontSize: '0.6rem', fontWeight: '900', color: '#64748b', whiteSpace: 'nowrap' }}>{exp.date || exp.expense_date}</td>
                                    <td style={{ padding: '0.8rem' }}>
                                        <div style={{ fontWeight: '800', fontSize: '0.8rem' }}>{exp.description}</div>
                                        <div style={{ fontSize: '0.65rem', opacity: 0.5 }}>{exp.category} • {exp.bankName}</div>
                                    </td>
                                    <td style={{ padding: '0.8rem', textAlign: 'right', fontWeight: '900', color: premiumSalmon }}>${(Number(exp.amount) || 0).toLocaleString()}</td>
                                    <td style={{ padding: '0.8rem', textAlign: 'center' }}>
                                        <button onClick={() => handleDeleteExpense(exp.id)} style={{ border: 'none', background: '#fef2f2', color: '#ef4444', padding: '4px', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={12} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredExpenses.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>No hay gastos en este periodo.</div>}
                </div>

                <div style={{ background: deepTeal, borderRadius: '24px', padding: '1.5rem', color: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '0.9rem' }}>Disponibilidad Bancaria</h3>
                        <RefreshCw size={14} style={{ opacity: 0.4 }} />
                    </div>
                    <div style={{ display: 'grid', gap: '0.8rem' }}>
                        {banks.map(bank => (
                            <div key={bank.id} style={{ background: 'rgba(255,255,255,0.06)', padding: '1rem', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <div style={{ fontSize: '0.65rem', opacity: 0.6, marginBottom: '0.2rem' }}>{bank.name.toUpperCase()}</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: '900' }}>${((bank.balance || 0) + (bank.initial_balance || 1000000)).toLocaleString()}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', padding: '2rem', borderRadius: '24px', width: '400px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: deepTeal, fontWeight: '900' }}>Registrar Gasto o Traslado</h3>
                            <button onClick={() => setShowModal(false)} style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', padding: '4px', cursor: 'pointer' }}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleAddExpense} style={{ display: 'grid', gap: '1rem' }}>
                            <div>
                                <label style={{ fontSize: '0.6rem', fontWeight: '900', color: '#94a3b8' }}>CATEGORÍA DE GASTO</label>
                                <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: '700' }}>
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.6rem', fontWeight: '900', color: '#94a3b8' }}>FECHA</label>
                                    <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontWeight: '700' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.6rem', fontWeight: '900', color: '#94a3b8' }}>VALOR ($)</label>
                                    <input type="number" required value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontWeight: '900' }} />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.6rem', fontWeight: '900', color: '#94a3b8' }}>CONCEPTO / DESCRIPCIÓN</label>
                                <input type="text" required placeholder="Ej: Pago nómina quincena..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontWeight: '700' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: formData.category === 'Traslado entre Bancos' ? '1fr 1fr' : '1fr', gap: '0.8rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.6rem', fontWeight: '900', color: '#94a3b8' }}>{formData.category === 'Traslado entre Bancos' ? 'BANCO ORIGEN' : 'BANCO QUE PAGA'}</label>
                                    <select required value={formData.bankId} onChange={e => setFormData({ ...formData, bankId: e.target.value })} style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontWeight: '700' }}>
                                        <option value="">Seleccione banco...</option>
                                        {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                {formData.category === 'Traslado entre Bancos' && (
                                    <div>
                                        <label style={{ fontSize: '0.6rem', fontWeight: '900', color: '#10b981' }}>BANCO DESTINO</label>
                                        <select required value={formData.targetBankId} onChange={e => setFormData({ ...formData, targetBankId: e.target.value })} style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '2px solid #10b981', background: '#f0fdf4', fontWeight: '700' }}>
                                            <option value="">Seleccione destino...</option>
                                            {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <button type="submit" style={{ width: '100%', padding: '0.8rem', background: deepTeal, color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', marginTop: '0.5rem', fontSize: '0.8rem' }}>REGISTRAR MOVIMIENTO</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Expenses;
