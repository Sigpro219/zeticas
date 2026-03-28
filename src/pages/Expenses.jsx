import React, { useState, useMemo } from 'react';
import {
    Receipt, Plus, DollarSign, Calendar, Tag, FileText,
    ArrowUpRight, ArrowDownRight, Landmark, PieChart,
    Trash2, Search, Filter, TrendingUp, TrendingDown, Pencil, X
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
// supabase import removed

const Expenses = () => {
    const { expenses, orders, purchaseOrders, banks, updateBankBalance, addExpense, updateExpense, deleteExpense } = useBusiness();
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [categories, setCategories] = useState(['Administración', 'Ventas', 'Transporte', 'Alimentación']);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingExpense, setEditingExpense] = useState(null);

    // Filters and Range
    const [filterType, setFilterType] = useState('month');
    const [customRange, setCustomRange] = useState({ from: '', to: '' });

    // Design Tokens
    const deepTeal = '#023636';
    const institutionOcre = '#D4785A';
    const premiumSalmon = '#E29783';
    const glassWhite = 'rgba(255, 255, 255, 0.85)';

    // Date filtering helper
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
        return true; // Fallback or 'All'
    };

    // Form State
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        category: 'Administración',
        description: '',
        amount: '',
        bankId: ''
    });

    // P&L Calculations (PYG) - REAL-TIME
    const pygData = useMemo(() => {
        // 1. VENTAS
        const filteredOrders = (orders || []).filter(o => isWithinRange(o.date));
        const totalPedidos = filteredOrders.reduce((acc, o) => acc + (o.amount || 0), 0);
        const totalCartera = filteredOrders
            .filter(o => o.status === 'Pagado')
            .reduce((acc, o) => acc + (o.amount || 0), 0);

        // 2. COSTOS
        const filteredPOs = (purchaseOrders || []).filter(po => isWithinRange(po.date));
        let costoMP_Pyg = 0;
        let costoInsumos_Pyg = 0;
        let costoMP_Cash = 0;
        let costoInsumos_Cash = 0;

        filteredPOs.forEach(oc => {
            const isPaid = oc.paymentStatus === 'Pagado';
            (oc.items || []).forEach(item => {
                const itemTotal = (item.toBuy || 0) * (item.purchasePrice || 0);
                if (item.type === 'MP') {
                    costoMP_Pyg += itemTotal;
                    if (isPaid) costoMP_Cash += itemTotal;
                } else if (item.type === 'INSUMO') {
                    costoInsumos_Pyg += itemTotal;
                    if (isPaid) costoInsumos_Cash += itemTotal;
                } else {
                    costoMP_Pyg += itemTotal;
                    if (isPaid) costoMP_Cash += itemTotal;
                }
            });
        });

        const totalCostos_Pyg = costoMP_Pyg + costoInsumos_Pyg;
        const totalCostos_Cash = costoMP_Cash + costoInsumos_Cash;

        // 3. GASTOS
        const filteredExpensesList = (expenses || [])
            .map(e => {
                const bank = banks.find(b => b.id === e.bankId);
                return { ...e, bank: bank ? bank.name : 'N/A' };
            })
            .filter(e => isWithinRange(e.date));

        const totalGastos = filteredExpensesList.reduce((acc, e) => acc + (e.amount || 0), 0);

        // 4. UTILIDADES
        const utilidadPYG = totalPedidos - totalCostos_Pyg - totalGastos;
        const flujoCaja = totalCartera - totalCostos_Cash - totalGastos;

        return {
            totalPedidos,
            totalCartera,
            costoMP: costoMP_Pyg,
            costoInsumos: costoInsumos_Pyg,
            totalCostos: totalCostos_Pyg,
            totalGastos,
            utilidadPYG,
            flujoCaja,
            margin: totalPedidos > 0 ? (utilidadPYG / totalPedidos * 100).toFixed(1) : 0,
            filteredExpensesList
        };
    }, [orders, purchaseOrders, expenses, filterType, customRange, banks]);

    const filteredExpenses = (pygData.filteredExpensesList || []).filter(e => {
        const q = searchTerm.toLowerCase();
        if (!q) return true;
        return (
            e.date.toLowerCase().includes(q) ||
            e.category.toLowerCase().includes(q) ||
            e.description.toLowerCase().includes(q) ||
            e.bank.toLowerCase().includes(q)
        );
    });

    const handleAddExpense = async (e) => {
        e.preventDefault();
        const amount = parseFloat(formData.amount) || 0;
        try {
            if (editingExpense) {
                const res = await updateExpense(editingExpense.id, {
                    expense_date: formData.date,
                    category: formData.category,
                    description: formData.description,
                    amount: amount,
                    bank_id: formData.bankId
                });
                if (!res.success) throw new Error(res.error);
                
                if (editingExpense.bankId) await updateBankBalance(editingExpense.bankId, editingExpense.amount, 'income', `Reversión Gasto: ${editingExpense.description}`);
                if (formData.bankId) await updateBankBalance(formData.bankId, amount, 'expense', `Actualización Gasto: ${formData.description}`, editingExpense.id);
                setEditingExpense(null);
            } else {
                const res = await addExpense({
                    expense_date: formData.date,
                    category: formData.category,
                    description: formData.description,
                    amount: amount,
                    bank_id: formData.bankId
                });
                if (!res.success) throw new Error(res.error);
                if (formData.bankId) await updateBankBalance(formData.bankId, amount, 'expense', `Gasto: ${formData.description}`, res.id);
            }
            setFormData({ date: new Date().toISOString().split('T')[0], category: categories[0] || 'Administración', description: '', amount: '', bankId: '' });
            setShowModal(false);
        } catch (err) {
            alert("Error al guardar el gasto: " + err.message);
        }
    };

    const openEditModal = (expense) => {
        setEditingExpense(expense);
        setFormData({ date: expense.date, category: expense.category, description: expense.description, amount: expense.amount ? expense.amount.toString() : '0', bankId: expense.bankId || '' });
        setShowModal(true);
    };

    const handleDeleteExpense = async (id) => {
        if (!window.confirm("¿Estás seguro que quieres eliminar este gasto?")) return;
        const expense = expenses.find(e => e.id === id);
        if (expense) {
            try {
                const res = await deleteExpense(id);
                if (!res.success) throw new Error(res.error);
                if (expense.bankId) await updateBankBalance(expense.bankId, expense.amount, 'income', `Eliminación Gasto: ${expense.description}`);
            } catch (err) {
                alert("Error al eliminar el gasto: " + err.message);
            }
        }
    };

    return (
        <div style={{ padding: '2rem', minHeight: '100vh', background: '#f8fafc' }}>
            <header style={{ marginBottom: '4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: 'fadeUp 0.5s ease-out' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: deepTeal, marginBottom: '0.4rem' }}>
                        <Receipt size={32} />
                        <h2 style={{ margin: 0, fontSize: '2.2rem', fontWeight: '900', letterSpacing: '-1.5px' }}>Rentabilidad & Burn Rate</h2>
                    </div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '1rem', fontWeight: '700' }}>Análisis profundo de P&L, flujo de caja y gestión administrativa.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingExpense(null);
                        setFormData({ date: new Date().toISOString().split('T')[0], category: categories[0] || 'Administración', description: '', amount: '', bankId: '' });
                        setShowModal(true);
                    }}
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
                    <Plus size={22} /> Registrar Gasto
                </button>
            </header>

            {/* Filter Bar */}
            <div style={{ 
                display: 'flex', 
                gap: '2rem', 
                marginBottom: '4rem', 
                alignItems: 'center',
                background: glassWhite,
                backdropFilter: 'blur(10px)',
                padding: '1.8rem 2.5rem',
                borderRadius: '40px',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.03)',
                animation: 'fadeUp 0.6s ease-out'
            }}>
                <div style={{ display: 'flex', background: 'rgba(2, 83, 87, 0.05)', padding: '6px', borderRadius: '22px', border: '1px solid rgba(2, 83, 87, 0.08)' }}>
                    {['week', 'month', 'custom'].map(t => (
                        <button
                            key={t}
                            onClick={() => setFilterType(t)}
                            style={{ 
                                padding: '0.9rem 2rem', 
                                border: 'none', 
                                borderRadius: '18px', 
                                fontSize: '0.8rem', 
                                fontWeight: '900', 
                                cursor: 'pointer', 
                                background: filterType === t ? deepTeal : 'transparent', 
                                color: filterType === t ? '#fff' : '#64748b', 
                                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                textTransform: 'uppercase',
                                letterSpacing: '1px'
                            }}>
                            {t === 'week' ? 'Semana' : t === 'month' ? 'Mes' : 'Personalizado'}
                        </button>
                    ))}
                </div>
                {filterType === 'custom' && (
                    <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center', padding: '0 1.8rem', height: '64px', borderRadius: '24px', border: '1px solid #f1f5f9', background: '#fff' }}>
                        <input type="date" value={customRange.from} onChange={e => setCustomRange({ ...customRange, from: e.target.value })} style={{ border: 'none', background: 'transparent', fontSize: '1rem', fontWeight: '900', color: deepTeal, outline: 'none' }} />
                        <ArrowUpRight size={18} color="#94a3b8" />
                        <input type="date" value={customRange.to} onChange={e => setCustomRange({ ...customRange, to: e.target.value })} style={{ border: 'none', background: 'transparent', fontSize: '1rem', fontWeight: '900', color: deepTeal, outline: 'none' }} />
                    </div>
                )}
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={24} style={{ position: 'absolute', left: '1.8rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', opacity: 0.6 }} />
                    <input
                        type="text"
                        placeholder="Busca por categoría, descripción, banco..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ 
                            width: '100%', 
                            padding: '1.8rem 1.8rem 1.8rem 4.5rem', 
                            borderRadius: '30px', 
                            border: '1px solid #f1f5f9', 
                            background: '#fff',
                            outline: 'none', 
                            fontSize: '1rem',
                            fontWeight: '900',
                            color: '#1e293b'
                        }}
                    />
                </div>
            </div>

            {/* P&L Dashboard */}
            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2.5rem', marginBottom: '4rem' }}>
                <div style={{ background: glassWhite, backdropFilter: 'blur(10px)', padding: '2.5rem', borderRadius: '45px', border: '1px solid rgba(255, 255, 255, 0.5)', boxShadow: '0 20px 50px rgba(0,0,0,0.03)', animation: 'fadeUp 0.6s ease-out' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                            <ArrowUpRight size={26} />
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Ingresos</span>
                    </div>
                    <div style={{ fontSize: '2.8rem', fontWeight: '900', color: deepTeal, letterSpacing: '-2px' }}>${pygData.totalPedidos.toLocaleString()}</div>
                    <div style={{ marginTop: '2rem', background: 'rgba(16, 185, 129, 0.05)', padding: '1rem 1.5rem', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#10b981' }}>CARTERA</span>
                        <span style={{ fontSize: '1rem', fontWeight: '900', color: '#10b981' }}>${pygData.totalCartera.toLocaleString()}</span>
                    </div>
                </div>

                <div style={{ background: glassWhite, backdropFilter: 'blur(10px)', padding: '2.5rem', borderRadius: '45px', border: '1px solid rgba(255, 255, 255, 0.5)', boxShadow: '0 20px 50px rgba(0,0,0,0.03)', animation: 'fadeUp 0.7s ease-out' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '20px', background: `${premiumSalmon}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: premiumSalmon }}>
                            <TrendingDown size={26} />
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Costo de Ventas</span>
                    </div>
                    <div style={{ fontSize: '2.8rem', fontWeight: '900', color: premiumSalmon, letterSpacing: '-2px' }}>${pygData.totalCostos.toLocaleString()}</div>
                    <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ background: '#f8fafc', padding: '0.8rem', borderRadius: '15px' }}>
                            <div style={{ fontSize: '0.6rem', fontWeight: '900' }}>MP</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: '900' }}>${pygData.costoMP.toLocaleString()}</div>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '0.8rem', borderRadius: '15px' }}>
                            <div style={{ fontSize: '0.6rem', fontWeight: '900' }}>INS</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: '900' }}>${pygData.costoInsumos.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                <div style={{ background: glassWhite, backdropFilter: 'blur(10px)', padding: '2.5rem', borderRadius: '45px', border: '1px solid rgba(255, 255, 255, 0.5)', boxShadow: '0 20px 50px rgba(0,0,0,0.03)', animation: 'fadeUp 0.8s ease-out' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '20px', background: `${institutionOcre}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: institutionOcre }}>
                            <PieChart size={26} />
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Gastos Operativos</span>
                    </div>
                    <div style={{ fontSize: '2.8rem', fontWeight: '900', color: institutionOcre, letterSpacing: '-2px' }}>${pygData.totalGastos.toLocaleString()}</div>
                </div>

                <div style={{ background: `linear-gradient(135deg, ${deepTeal} 0%, #037075 100%)`, padding: '2.5rem', borderRadius: '45px', color: '#fff', boxShadow: `0 30px 60px ${deepTeal}30`, animation: 'fadeUp 0.9s ease-out' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', opacity: 0.8 }}>
                        <TrendingUp size={24} />
                        <span style={{ fontSize: '0.85rem', fontWeight: '900', textTransform: 'uppercase' }}>Utilidad Neta</span>
                    </div>
                    <div style={{ fontSize: '3.2rem', fontWeight: '900', letterSpacing: '-2px' }}>${pygData.utilidadPYG.toLocaleString()}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '1rem' }}>
                         <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.6rem 1.2rem', borderRadius: '15px', fontSize: '1.1rem', fontWeight: '900' }}>{pygData.margin}%</div>
                        <span style={{ fontSize: '0.75rem', fontWeight: '900', opacity: 0.6 }}>Margen Operativo</span>
                    </div>
                </div>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: '2.4fr 1.1fr', gap: '2.5rem' }}>
                <div style={{ background: glassWhite, backdropFilter: 'blur(10px)', borderRadius: '45px', border: '1px solid rgba(255, 255, 255, 0.5)', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.03)' }}>
                    <div style={{ padding: '2.5rem 3rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900', color: deepTeal }}>Detalle de Gastos</h3>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead style={{ background: 'rgba(2, 83, 87, 0.02)' }}>
                            <tr>
                                <th style={{ padding: '1.5rem 2.5rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Fecha</th>
                                <th style={{ padding: '1.5rem 1.5rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Clasificación</th>
                                <th style={{ padding: '1.5rem 1.5rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Concepto</th>
                                <th style={{ padding: '1.5rem 1.5rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Valor</th>
                                <th style={{ padding: '1.5rem 2.5rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredExpenses.map(exp => (
                                <tr key={exp.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                    <td style={{ padding: '2rem 2.5rem', fontWeight: '800' }}>{exp.date}</td>
                                    <td style={{ padding: '2rem 1.5rem' }}>
                                        <span style={{ padding: '6px 14px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '900', background: 'rgba(2, 54, 54, 0.05)', color: deepTeal }}>{exp.category}</span>
                                    </td>
                                    <td style={{ padding: '2rem 1.5rem' }}>
                                        <div style={{ fontWeight: '900' }}>{exp.description}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{exp.bank}</div>
                                    </td>
                                    <td style={{ padding: '2rem 1.5rem', textAlign: 'right', fontWeight: '900', color: premiumSalmon }}>-${exp.amount.toLocaleString()}</td>
                                    <td style={{ padding: '2rem 2.5rem', textAlign: 'center' }}>
                                         <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                                            <button onClick={() => openEditModal(exp)} style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: '#f1f5f9', cursor: 'pointer' }}><Pencil size={14} /></button>
                                            <button onClick={() => handleDeleteExpense(exp.id)} style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: '#fef2f2', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div style={{ background: deepTeal, borderRadius: '45px', padding: '3rem', color: '#fff' }}>
                    <h3 style={{ margin: '0 0 3rem', fontSize: '1.4rem', fontWeight: '900' }}>Saldos Tesorería</h3>
                    <div style={{ display: 'grid', gap: '1.2rem' }}>
                        {banks.map(bank => (
                            <div key={bank.id} style={{ background: 'rgba(255,255,255,0.06)', padding: '1.8rem', borderRadius: '28px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: '900', opacity: 0.6, marginBottom: '0.5rem' }}>{bank.name}</div>
                                <div style={{ fontSize: '2rem', fontWeight: '900' }}>${bank.balance.toLocaleString()}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', padding: '3.5rem', borderRadius: '45px', width: '550px', position: 'relative' }}>
                        <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '2rem', right: '2rem', border: 'none', background: '#f1f5f9', width: '45px', height: '45px', borderRadius: '50%', cursor: 'pointer' }}><X size={20} /></button>
                        <h3 style={{ margin: '0 0 3rem', fontSize: '1.8rem', fontWeight: '900', color: deepTeal }}>{editingExpense ? 'Editar Registro' : 'Nuevo Gasto'}</h3>
                        <form onSubmit={handleAddExpense} style={{ display: 'grid', gap: '2rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '900', color: '#94a3b8', marginBottom: '0.5rem' }}>FECHA</label><input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} style={{ width: '100%', padding: '1.2rem', borderRadius: '20px', border: '1px solid #f1f5f9', background: '#f8fafc', fontWeight: '700' }} /></div>
                                <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '900', color: '#94a3b8', marginBottom: '0.5rem' }}>CATEGORÍA</label><select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} style={{ width: '100%', padding: '1.2rem', borderRadius: '20px', border: '1px solid #f1f5f9', background: '#f8fafc', fontWeight: '700' }}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                            </div>
                            <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '900', color: '#94a3b8', marginBottom: '0.5rem' }}>DESCRIPCIÓN</label><input type="text" required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} style={{ width: '100%', padding: '1.2rem', borderRadius: '20px', border: '1px solid #f1f5f9', background: '#f8fafc', fontWeight: '700' }} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '900', color: '#94a3b8', marginBottom: '0.5rem' }}>VALOR ($)</label><input type="number" required value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} style={{ width: '100%', padding: '1.2rem', borderRadius: '20px', border: '1px solid #f1f5f9', background: '#f8fafc', fontWeight: '900' }} /></div>
                                <div><label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '900', color: '#94a3b8', marginBottom: '0.5rem' }}>BANCARIZACIÓN</label><select value={formData.bankId} onChange={e => setFormData({ ...formData, bankId: e.target.value })} style={{ width: '100%', padding: '1.2rem', borderRadius: '20px', border: '1px solid #f1f5f9', background: '#f8fafc', fontWeight: '700' }}><option value="">Seleccione banco...</option>{banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                            </div>
                            <button type="submit" style={{ padding: '1.4rem', borderRadius: '24px', border: 'none', background: deepTeal, color: '#fff', fontWeight: '900', cursor: 'pointer' }}>FINALIZAR REGISTRO</button>
                        </form>
                    </div>
                </div>
            )}

            {showCategoryModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div style={{ background: '#fff', padding: '3.5rem', borderRadius: '45px', width: '450px' }}>
                        <h3 style={{ margin: '0 0 2rem', fontSize: '1.4rem', fontWeight: '900', color: deepTeal }}>Administrar Categorías</h3>
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            <input type="text" placeholder="Nueva categoría..." value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} style={{ width: '100%', padding: '1.2rem', borderRadius: '20px', border: '1px solid #f1f5f9', background: '#f8fafc', fontWeight: '700' }} />
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button onClick={() => setShowCategoryModal(false)} style={{ flex: 1, padding: '1.2rem', borderRadius: '20px', border: '2px solid #f1f5f9', background: '#fff', fontWeight: '900' }}>CERRAR</button>
                                <button onClick={() => { if(newCategoryName.trim()) { setCategories([...categories, newCategoryName.trim()]); setNewCategoryName(''); } }} style={{ flex: 2, padding: '1.2rem', borderRadius: '20px', border: 'none', background: deepTeal, color: '#fff', fontWeight: '900' }}>AÑADIR</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default Expenses;
