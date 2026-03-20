import React, { useState, useMemo } from 'react';
import {
    Receipt, Plus, DollarSign, Calendar, Tag, FileText,
    ArrowUpRight, ArrowDownRight, Landmark, PieChart,
    Trash2, Search, Filter, TrendingUp, TrendingDown, Pencil
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { supabase } from '../lib/supabase';

const Expenses = () => {
    const { expenses, setExpenses, orders, purchaseOrders, banks, setBanks, updateBankBalance } = useBusiness();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [categories, setCategories] = useState(['Administración', 'Ventas', 'Transporte', 'Alimentación']);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingExpense, setEditingExpense] = useState(null);

    // Filters and Range
    const [filterType, setFilterType] = useState('month');
    const [customRange, setCustomRange] = useState({ from: '', to: '' });

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

        // 2. COSTOS (Accrual for PYG / Cash for Cash Flow)
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

        const dateMatch = e.date.toLowerCase().includes(q);
        const categoryMatch = e.category.toLowerCase().includes(q);
        const descriptionMatch = e.description.toLowerCase().includes(q);
        const bankMatch = e.bank.toLowerCase().includes(q);

        return dateMatch || categoryMatch || descriptionMatch || bankMatch;
    });

    const handleAddExpense = async (e) => {
        e.preventDefault();
        const amount = parseFloat(formData.amount) || 0;

        try {
            if (editingExpense) {
                // 1. UPDATE in Supabase
                const { error } = await supabase
                    .from('expenses')
                    .update({
                        expense_date: formData.date,
                        category: formData.category,
                        description: formData.description,
                        amount: amount,
                        bank_id: formData.bankId
                    })
                    .eq('id', editingExpense.id);

                if (error) throw error;

                // 2. Adjust bank balances (Reverse old, apply new)
                if (editingExpense.bankId) {
                    await updateBankBalance(editingExpense.bankId, editingExpense.amount, 'income', `Reversión Gasto: ${editingExpense.description}`); // reverse old expense
                }
                if (formData.bankId) {
                    await updateBankBalance(formData.bankId, amount, 'expense', `Actualización Gasto: ${formData.description}`, editingExpense.id); // apply new expense
                }

                // 3. Update local state
                setExpenses(expenses.map(exp => exp.id === editingExpense.id ? {
                    ...exp,
                    date: formData.date,
                    category: formData.category,
                    description: formData.description,
                    amount: amount,
                    bankId: formData.bankId
                } : exp));
                setEditingExpense(null);
                alert("Gasto actualizado.");
            } else {
                // 1. Persist to Supabase
                const { data: newExp, error } = await supabase
                    .from('expenses')
                    .insert([{
                        expense_date: formData.date,
                        category: formData.category,
                        description: formData.description,
                        amount: amount,
                        bank_id: formData.bankId
                    }])
                    .select();

                if (error) throw error;

                if (newExp && newExp[0]) {
                    const expenseForState = {
                        id: newExp[0].id,
                        date: newExp[0].expense_date,
                        category: newExp[0].category,
                        description: newExp[0].description,
                        amount: newExp[0].amount,
                        bankId: newExp[0].bank_id
                    };
                    setExpenses([expenseForState, ...expenses]);
                }

                // 2. Update bank balance
                if (formData.bankId) {
                    await updateBankBalance(formData.bankId, amount, 'expense', `Gasto: ${formData.description}`, newExp[0]?.id);
                }
                alert("Gasto registrado y saldo de banco actualizado.");
            }

            setFormData({
                date: new Date().toISOString().split('T')[0],
                category: categories[0] || 'Administración',
                description: '',
                amount: '',
                bankId: ''
            });
            setShowModal(false);
        } catch (err) {
            console.error("Error saving expense:", err);
            alert("Error al guardar el gasto: " + err.message);
        }
    };

    const openEditModal = (expense) => {
        setEditingExpense(expense);
        setFormData({
            date: expense.date,
            category: expense.category,
            description: expense.description,
            amount: expense.amount ? expense.amount.toString() : '0',
            bankId: expense.bankId || ''
        });
        setShowModal(true);
    };

    const handleDeleteExpense = async (id) => {
        if (!window.confirm("¿Estás seguro que quieres eliminar este gasto?")) {
            return;
        }
        const expense = expenses.find(e => e.id === id);
        if (expense) {
            try {
                // 1. Delete from Supabase
                const { error } = await supabase
                    .from('expenses')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                // 2. Reverse bank balance impact
                if (expense.bankId) {
                    await updateBankBalance(expense.bankId, expense.amount, 'income', `Eliminación Gasto: ${expense.description}`); // income reverses expense
                } else if (expense.bank) {
                    // Fallback if legacy structure uses bank name
                    const bank = banks.find(b => b.name === expense.bank);
                    if (bank) {
                        await updateBankBalance(bank.id, expense.amount, 'income', `Eliminación Gasto (Legacy): ${expense.description}`);
                    }
                }

                // 3. Update local state
                setExpenses(expenses.filter(e => e.id !== id));
                alert("Gasto eliminado y saldo de cuenta restaurado.");
            } catch (err) {
                console.error("Error deleting expense:", err);
                alert("Error al eliminar el gasto: " + err.message);
            }
        }
    };

    const handleDeleteCategory = (e, catName) => {
        e.stopPropagation(); // Prevent dropdown from closing
        const hasExpenses = (expenses || []).some(exp => exp.category === catName);
        if (hasExpenses) {
            alert(`No se puede eliminar la categoría "${catName}" porque ya tiene gastos asociados.`);
            return;
        }

        if (window.confirm(`¿Estás seguro de que deseas eliminar la categoría "${catName}"?`)) {
            const updatedCategories = categories.filter(c => c !== catName);
            setCategories(updatedCategories);
            if (formData.category === catName) {
                setFormData(prev => ({ ...prev, category: updatedCategories[0] || '' }));
            }
        }
    };

    return (
        <div className="expenses-module" style={{ padding: '0 1rem' }}>
            <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 className="font-serif" style={{ fontSize: '2.4rem', color: 'var(--color-primary)', margin: 0 }}>Gastos y P&L (PYG)</h2>
                    <p style={{ color: '#64748b', fontSize: '1rem', marginTop: '0.4rem' }}>Control financiero de administración, ventas y estado de resultados.</p>
                </div>
            </header>

            {/* Filter Bar */}
            <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '16px', border: '1px solid #f1f5f9', marginBottom: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.3rem', borderRadius: '10px' }}>
                    {['week', 'month', 'custom'].map(t => (
                        <button
                            key={t}
                            onClick={() => setFilterType(t)}
                            style={{
                                padding: '0.5rem 1rem',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                background: filterType === t ? '#fff' : 'transparent',
                                color: filterType === t ? 'var(--color-primary)' : '#64748b',
                                boxShadow: filterType === t ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                            }}>
                            {t === 'week' ? 'Gastos Semana' : t === 'month' ? 'Gastos Mes' : 'Personalizado'}
                        </button>
                    ))}
                </div>
                {filterType === 'custom' && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input type="date" value={customRange.from} onChange={e => setCustomRange({ ...customRange, from: e.target.value })} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }} />
                        <span style={{ color: '#94a3b8' }}>a</span>
                        <input type="date" value={customRange.to} onChange={e => setCustomRange({ ...customRange, to: e.target.value })} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }} />
                    </div>
                )}
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Busca por Categoria de Gasto, Banco o Fecha"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ padding: '0.8rem 1rem 0.8rem 3rem', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '0.9rem', width: '100%', outline: 'none', background: '#f8fafc', transition: 'all 0.2s' }}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: '#aaa', cursor: 'pointer' }}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* P&L Summary Dashboard */}
            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.2rem', marginBottom: '3rem' }}>
                {/* VENTAS */}
                <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '800', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        VENTAS (INGRESOS)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <div style={{ borderLeft: '4px solid #10b981', paddingLeft: '0.8rem' }}>
                            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 'bold' }}>PEDIDOS</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#1e293b' }}>${pygData.totalPedidos.toLocaleString()}</div>
                        </div>
                        <div style={{ borderLeft: '4px solid #3b82f6', paddingLeft: '0.8rem' }}>
                            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 'bold' }}>CARTERA</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#1e293b' }}>${pygData.totalCartera.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                {/* COSTO VENTAS */}
                <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '800', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        COSTO VENTAS
                    </div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#ef4444', marginBottom: '0.8rem' }}>
                        ${pygData.totalCostos.toLocaleString()}
                    </div>
                    <div style={{ display: 'grid', gap: '0.4rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', background: '#f8fafc', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                            <span style={{ color: '#64748b' }}>Materia Prima</span>
                            <span style={{ fontWeight: '700' }}>${pygData.costoMP.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', background: '#f8fafc', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                            <span style={{ color: '#64748b' }}>Insumos</span>
                            <span style={{ fontWeight: '700' }}>${pygData.costoInsumos.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* GASTOS OP */}
                <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '800', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        GASTOS OPERATIVOS
                    </div>
                    <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#f59e0b' }}>
                        ${pygData.totalGastos.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.5rem' }}>Total Registro de Gastos</div>
                </div>

                {/* UTILIDAD / FLUJO */}
                <div style={{ background: 'linear-gradient(135deg, #1A3636 0%, #2D4F4F 100%)', padding: '1.2rem', borderRadius: '24px', color: '#fff', boxShadow: '0 10px 20px rgba(26,54,54,0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: '800', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        ESTADO DE RESULTADOS
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>UTILIDAD PYG (Devengado)</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: pygData.utilidadPYG >= 0 ? '#4ade80' : '#fca5a5' }}>
                                ${pygData.utilidadPYG.toLocaleString()}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>FLUJO DE CAJA (Real)</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: pygData.flujoCaja >= 0 ? '#4ade80' : '#fca5a5' }}>
                                ${pygData.flujoCaja.toLocaleString()}
                            </div>
                        </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4ade80', marginTop: '0.8rem', textAlign: 'right' }}>
                        {pygData.margin}% Margen
                    </div>
                </div>
            </section>

            {/* Bank Reconciliations Summary */}
            <div style={{ marginBottom: '1.2rem' }}>
                <button
                    onClick={() => setShowModal(true)}
                    style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '0.8rem 1.8rem', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,77,77,0.15)' }}
                >
                    <Plus size={20} /> Registrar Gasto
                </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.1fr', gap: '2rem', marginBottom: '3rem' }}>
                {/* Expenses List */}
                <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1a3636', fontWeight: '800', fontFamily: 'var(--font-serif)' }}>Detalle Registro de Gastos</h3>
                        <button
                            onClick={() => setShowCategoryModal(true)}
                            style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '12px', padding: '0.6rem 1.2rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(0,77,77,0.1)' }}
                        >
                            <Plus size={16} /> Crear Categoría
                        </button>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f8fafc' }}>
                            <tr>
                                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', color: '#64748b' }}>FECHA</th>
                                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', color: '#64748b' }}>CATEGORÍA</th>
                                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', color: '#64748b' }}>DESCRIPCIÓN</th>
                                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', color: '#64748b' }}>BANCO</th>
                                <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.7rem', color: '#64748b' }}>VALOR</th>
                                <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.7rem', color: '#64748b' }}>ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredExpenses.map(exp => (
                                <tr key={exp.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{exp.date}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 'bold',
                                            background: exp.category === 'Administración' ? '#eff6ff' : '#faf5ff',
                                            color: exp.category === 'Administración' ? '#1e40af' : '#7e22ce'
                                        }}>{exp.category.toUpperCase()}</span>
                                    </td>
                                    <td style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: '500' }}>{exp.description}</td>
                                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#64748b' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <Landmark size={14} /> {exp.bank}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '700', color: '#ef4444' }}>-${exp.amount.toLocaleString()}</td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.8rem' }}>
                                            <button
                                                onClick={() => openEditModal(exp)}
                                                title="Editar gasto"
                                                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.4rem', borderRadius: '8px' }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.color = 'var(--color-primary)';
                                                    e.currentTarget.style.background = '#f1f5f9';
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.color = '#64748b';
                                                    e.currentTarget.style.background = 'none';
                                                }}
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteExpense(exp.id)}
                                                title="Eliminar gasto"
                                                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.4rem', borderRadius: '8px' }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.color = '#ef4444';
                                                    e.currentTarget.style.background = '#fef2f2';
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.color = '#64748b';
                                                    e.currentTarget.style.background = 'none';
                                                }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Banks / Reconciliation Board */}
                <div style={{ background: '#1A3636', borderRadius: '32px', padding: '1.5rem', color: '#fff', boxShadow: '0 20px 40px rgba(26,54,54,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
                        <Landmark size={22} style={{ color: '#fff' }} />
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', fontWeight: 'bold' }}>Conciliación Bancaria</h3>
                    </div>
                    <div style={{ display: 'grid', gap: '0.8rem' }}>
                        {banks.map(bank => (
                            <div key={bank.id} style={{ background: 'rgba(255,255,255,0.08)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: '600', opacity: 0.9 }}>{bank.name}</div>
                                    <div style={{ background: 'rgba(255,255,255,0.15)', padding: '3px 8px', borderRadius: '20px', fontSize: '0.6rem', fontWeight: 'bold' }}>SALDO</div>
                                </div>
                                <div style={{ fontSize: '1.4rem', fontWeight: '900' }}>${bank.balance.toLocaleString()}</div>
                                <div style={{ height: '3px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '0.8rem' }}>
                                    <div style={{ height: '100%', width: '70%', background: '#fff', borderRadius: '2px', opacity: 0.8 }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button style={{ width: '100%', marginTop: '1.5rem', padding: '0.8rem', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.3)', background: 'transparent', color: '#fff', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}>
                        + Agregar Cuenta
                    </button>
                </div>
            </div>

            {/* Add Expense Modal */}
            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
                    <div style={{ background: '#fff', padding: '2.5rem', borderRadius: '24px', width: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', color: 'var(--color-primary)' }}>Registrar Nuevo Gasto</h3>
                        <form onSubmit={handleAddExpense} style={{ display: 'grid', gap: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '900', color: '#64748b', marginBottom: '0.5rem' }}>FECHA</label>
                                    <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '900', color: '#64748b', marginBottom: '0.5rem' }}>CATEGORÍA</label>
                                    <div style={{ position: 'relative' }}>
                                        <div
                                            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                                            style={{
                                                width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0',
                                                background: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                                                alignItems: 'center', fontSize: '0.9rem'
                                            }}
                                        >
                                            {formData.category || 'Seleccione categoría...'}
                                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>▼</span>
                                        </div>

                                        {showCategoryDropdown && (
                                            <div style={{
                                                position: 'absolute', top: '110%', left: 0, width: '100%',
                                                background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
                                                boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 10,
                                                maxHeight: '200px', overflowY: 'auto'
                                            }}>
                                                {categories.map(cat => (
                                                    <div
                                                        key={cat}
                                                        onClick={() => {
                                                            setFormData({ ...formData, category: cat });
                                                            setShowCategoryDropdown(false);
                                                        }}
                                                        style={{
                                                            padding: '0.8rem 1rem', display: 'flex', justifyContent: 'space-between',
                                                            alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid #f8fafc',
                                                            fontSize: '0.85rem'
                                                        }}
                                                        className="cat-option"
                                                    >
                                                        <span style={{ fontWeight: formData.category === cat ? 'bold' : 'normal' }}>{cat}</span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation(); // Evita que se seleccione la categoría al borrar
                                                                e.preventDefault(); // Evita cualquier comportamiento de formulario

                                                                const hasExpenses = (expenses || []).some(exp => exp.category === cat);
                                                                if (hasExpenses) {
                                                                    alert(`No se puede eliminar la categoría "${cat}" porque ya tiene gastos asociados.`);
                                                                    return;
                                                                }

                                                                if (window.confirm(`¿Estás seguro de que deseas eliminar la categoría "${cat}"?`)) {
                                                                    const updatedCategories = categories.filter(c => c !== cat);
                                                                    setCategories(updatedCategories);
                                                                    if (formData.category === cat) {
                                                                        setFormData(prev => ({ ...prev, category: updatedCategories[0] || '' }));
                                                                    }
                                                                }
                                                            }}
                                                            style={{
                                                                background: 'none', border: 'none', color: '#cbd5e1',
                                                                cursor: 'pointer', display: 'flex', alignItems: 'center',
                                                                padding: '4px', borderRadius: '4px', transition: 'all 0.2s'
                                                            }}
                                                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                                            onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '900', color: '#64748b', marginBottom: '0.5rem' }}>DESCRIPCIÓN</label>
                                <input type="text" required placeholder="Eje: Pago Internet, Publicidad..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '900', color: '#64748b', marginBottom: '0.5rem' }}>VALOR ($)</label>
                                    <input type="number" required placeholder="0.00" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: 'bold' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '900', color: '#64748b', marginBottom: '0.5rem' }}>BANCO / ORIGEN</label>
                                    <select value={formData.bankId} onChange={e => setFormData({ ...formData, bankId: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <option value="">Seleccione un banco...</option>
                                        {banks.map(b => (
                                            <option key={b.id} value={b.id}>{b.name} - Saldo: ${(b.balance || 0).toLocaleString()}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
                                <button type="submit" style={{ flex: 1, padding: '1rem', borderRadius: '12px', border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Gasto</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* New Category Modal */}
            {showCategoryModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
                    <div style={{ background: '#fff', padding: '2rem', borderRadius: '24px', width: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>Crear Nueva Categoría</h3>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '900', color: '#64748b', marginBottom: '0.5rem' }}>NOMBRE DE LA CATEGORÍA</label>
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="Eje: Transporte, Publicidad..."
                                    value={newCategoryName}
                                    onChange={e => setNewCategoryName(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            const btn = e.currentTarget.parentElement.parentElement.querySelector('.save-cat-btn');
                                            if (btn) btn.click();
                                        }
                                    }}
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.9rem', outline: 'none' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button onClick={() => setShowCategoryModal(false)} style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
                                <button
                                    className="save-cat-btn"
                                    onClick={() => {
                                        const name = newCategoryName.trim();
                                        if (!name) {
                                            alert("Por favor escribe un nombre para la categoría.");
                                            return;
                                        }
                                        if (categories.includes(name)) {
                                            alert("Esta categoría ya existe.");
                                            setShowCategoryModal(false); // Close anyway or handle as preferred
                                            setNewCategoryName('');
                                            return;
                                        }
                                        setCategories([...categories, name]);
                                        setNewCategoryName('');
                                        setShowCategoryModal(false);
                                    }}
                                    style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 'bold', cursor: 'pointer', transition: 'filter 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.2)'}
                                    onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
                                >
                                    Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Expenses;
