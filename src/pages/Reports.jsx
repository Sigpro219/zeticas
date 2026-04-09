import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    TrendingUp, Package, Users, DollarSign,
    ShoppingCart, Download, Calendar, Filter,
    Clock, Zap, Target, Edit2, Check, Activity, ShieldCheck, Globe
} from 'lucide-react';
import { useMediaQuery } from '../hooks/useMediaQuery';

const Reports = ({ orders = [], taxSettings = {}, setTaxSettings, expenses = [], purchaseOrders = [], items = [], recipes = {}, analytics = [] }) => {
    const isMobile = useMediaQuery('(max-width: 1024px)');
    const [selectedProductionSku, setSelectedProductionSku] = useState('Todos');
    const [selectedQualitySku, setSelectedQualitySku] = useState('Todos');
    const [selectedYear, setSelectedYear] = useState(2026);
    const [analyticsFilter, setAnalyticsFilter] = useState('30d');

    const safeTax = taxSettings || { iva: 19, retefuente: 2.5, ica: 9.6, renta: 35 };
    const ivaValue = (Array.isArray(orders) ? orders : []).reduce((acc, o) => acc + (o?.amount || 0), 0) * ((safeTax?.iva || 0) / 100);

    // 1. Data Processing for Facturación
    const salesData = useMemo(() => {
        const groups = {
            'Ene': 0, 'Feb': 0, 'Mar': 0, 'Abr': 0, 'May': 0, 'Jun': 0,
            'Jul': 0, 'Ago': 0, 'Sep': 0, 'Oct': 0, 'Nov': 0, 'Dic': 0
        };

        (Array.isArray(orders) ? orders : []).forEach(o => {
            if (!o || !o.date) return;
            try {
                const date = new Date(o.date);
                if (date.getFullYear() !== selectedYear) return;

                const month = date.toLocaleString('es-ES', { month: 'short' }).replace('.', '');
                const key = month.charAt(0).toUpperCase() + month.slice(1);
                if (groups[key] !== undefined) {
                    groups[key] += (o.amount || 0);
                } else {
                    groups['Feb'] += (o.amount || 0);
                }
            } catch (e) {
                console.error("Error parsing date", o.date);
            }
        });

        return Object.keys(groups).map(k => ({ name: k, total: groups[k] }));
    }, [orders, selectedYear]);

    // 2. Base Production History (Mock & Persistence)
    const productionHistory = useMemo(() => {
        const historyRaw = localStorage.getItem('zeticas_production_history');
        let history = historyRaw ? JSON.parse(historyRaw) : [];

        const hasYearData = history.some(h => new Date(h.date).getFullYear() === selectedYear);
        if (!hasYearData || (history.length > 0 && !history[0].start)) {
            const skus = items.filter(i => i.type === 'PT').map(i => i.name);
            if (skus.length === 0) skus.push('Berenjenas en Escabeche', 'Hummus Tradicional');

            const mockData = [];
            for (let m = 0; m < 12; m++) {
                skus.forEach(sku => {
                    const start = new Date(selectedYear, m, 15, 8, 0);
                    const end = new Date(selectedYear, m, 15, 17, 30);
                    mockData.push({
                        sku,
                        date: new Date(selectedYear, m, 15).toISOString(),
                        efficiency: Math.random() * 5 + 24, // 24-29 U/H
                        quality: Math.random() * 1.5 + 1, // 1-2.5% waste
                        units: 250 + Math.random() * 50,
                        start: start.toISOString(),
                        end: end.toISOString()
                    });
                });
            }
            history = [...history.filter(h => new Date(h.date).getFullYear() !== selectedYear), ...mockData];
            localStorage.setItem('zeticas_production_history', JSON.stringify(history));
        }
        return history;
    }, [items, selectedYear]);

    const productionData = useMemo(() => {
        return { chartData: [], aggregateEfficiency: '—', availableSkus: [] };
    }, []);

    // 3. CALIDAD Logic
    const qualityData = useMemo(() => {
        return { chartData: [], aggregateQuality: '—', availableSkus: [] };
    }, []);

    const operationalKPIs = useMemo(() => {
        return { leadTime: '—', taktTime: '—' };
    }, []);

    const oeeData = useMemo(() => {
        return { oee: '—', availability: '—', performance: '—', quality: '—' };
    }, []);

    const salesByClient = useMemo(() => {
        const clients = {};
        (Array.isArray(orders) ? orders : []).forEach(o => {
            if (o && o.client) {
                const date = new Date(o.date);
                if (date.getFullYear() === selectedYear) {
                    clients[o.client] = (clients[o.client] || 0) + (o.amount || 0);
                }
            }
        });
        return Object.keys(clients)
            .map(k => ({ name: k, value: clients[k] }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [orders, selectedYear]);

    // 4. Data Processing for Cartera (Cartera is cumulative, but maybe filter by order year?)
    const carteraData = useMemo(() => {
        const now = new Date();
        const shippingRaw = localStorage.getItem('zeticas_shipping_persistence');
        const shippingData = shippingRaw ? JSON.parse(shippingRaw) : {};

        const pending = (Array.isArray(orders) ? orders : []).filter(o =>
            o && o.status !== 'Pagado' && o.status !== 'Cancelado' && new Date(o.date).getFullYear() === selectedYear
        );
        const totalDebt = pending.reduce((acc, o) => acc + (o.amount || 0), 0);

        const groups = {
            'Ene': { v30: 0, v60: 0, v90: 0 }, 'Feb': { v30: 0, v60: 0, v90: 0 }, 'Mar': { v30: 0, v60: 0, v90: 0 },
            'Abr': { v30: 0, v60: 0, v90: 0 }, 'May': { v30: 0, v60: 0, v90: 0 }, 'Jun': { v30: 0, v60: 0, v90: 0 },
            'Jul': { v30: 0, v60: 0, v90: 0 }, 'Ago': { v30: 0, v60: 0, v90: 0 }, 'Sep': { v30: 0, v60: 0, v90: 0 },
            'Oct': { v30: 0, v60: 0, v90: 0 }, 'Nov': { v30: 0, v60: 0, v90: 0 }, 'Dic': { v30: 0, v60: 0, v90: 0 }
        };

        pending.forEach(o => {
            if (!o || !o.date) return;
            const orderDate = new Date(o.date);
            const monthShort = orderDate.toLocaleString('es-ES', { month: 'short' }).replace('.', '');
            const key = monthShort.charAt(0).toUpperCase() + monthShort.slice(1);

            const data = (shippingData && o.id) ? (shippingData[o.id] || {}) : {};
            const invoiceDate = data.invoiceDate ? new Date(data.invoiceDate) : orderDate;
            const diffDays = Math.ceil(Math.abs(now - invoiceDate) / (1000 * 60 * 60 * 24));

            let category = 'v30';
            if (diffDays > 60) category = 'v90';
            else if (diffDays > 30) category = 'v60';

            if (groups[key]) {
                groups[key][category] += (o.amount || 0);
            }
        });

        const chartData = Object.keys(groups).map(k => ({
            name: k,
            v30: groups[k].v30,
            v60: groups[k].v60,
            v90: groups[k].v90,
            total: groups[k].v30 + groups[k].v60 + groups[k].v90
        }));

        const debtByClient = {};
        pending.forEach(o => {
            if (o && o.client) {
                debtByClient[o.client] = (debtByClient[o.client] || 0) + (o.amount || 0);
            }
        });

        const pieData = Object.keys(debtByClient).map(k => ({ name: k, value: debtByClient[k] }));

        return {
            total: totalDebt,
            chartData,
            pie: pieData,
            vencido: pending.reduce((acc, o) => {
                const data = (shippingData && o.id) ? (shippingData[o.id] || {}) : {};
                const invoiceDate = data.invoiceDate ? new Date(data.invoiceDate) : new Date(o.date);
                const diffDays = Math.ceil(Math.abs(now - invoiceDate) / (1000 * 60 * 60 * 24));
                return diffDays > 30 ? acc + (o.amount || 0) : acc;
            }, 0),
        };
    }, [orders, selectedYear]);

    const COLORS = ['#1A3636', '#40534C', '#677D6A', '#9FB69E', '#D6BD98'];


    return (
        <div className="reports-dashboard" style={{ padding: '0 1.5rem', background: '#f8fafc', minHeight: '100vh', borderRadius: '24px' }}>
            {/* Header */}
            <header style={{
                padding: '2.5rem 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h2 className="font-serif" style={{ fontSize: '2.0rem', color: '#1A3636', margin: 0 }}>Informes de Gestión Integral</h2>
                    <p style={{ color: '#64748b', fontSize: '1rem', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Activity size={18} /> Monitoreo de Eficiencia Operativa, Ventas y KPIs Lean
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ background: '#fff', padding: '0.6rem 1.2rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.9rem', color: '#64748b' }}>
                        <Calendar size={18} /> Periodo:
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            style={{ border: 'none', background: 'transparent', fontWeight: 'bold', color: '#1A3636', outline: 'none', cursor: 'pointer', fontSize: '1rem', marginLeft: '0.3rem' }}
                        >
                            {Array.from({ length: 25 }, (_, i) => 2026 + i).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </header>

            {/* FULL WIDTH ANALYTICS */}
            <div style={{ marginBottom: '3rem' }}>
                <div style={{ background: '#F1F5F9', borderRadius: '48px', padding: isMobile ? '1.5rem' : '3rem', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                <span style={{ background: '#E2E8F0', color: '#475569', padding: '4px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase' }}>VISIBILIDAD</span>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', animation: 'pulse 2s infinite' }} />
                            </div>
                            <h3 style={{ margin: 0, fontSize: isMobile ? '1.6rem' : '2.2rem', color: '#1E293B', fontWeight: '900' }}>Tráfico Web (Visitas)</h3>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: isMobile ? '1.8rem' : '2.5rem', fontWeight: '900', color: '#1E293B', lineHeight: 1 }}>
                                    {(analytics || []).slice(-1)[0]?.count || 0}
                                    <span style={{ fontSize: '0.8rem', color: '#64748B', marginLeft: '0.6rem', fontWeight: '700' }}>Hoy</span>
                                </div>
                            </div>
                            
                            <select
                                value={analyticsFilter}
                                onChange={(e) => setAnalyticsFilter(e.target.value)}
                                style={{ 
                                    padding: '0.8rem 1.2rem', 
                                    borderRadius: '16px', 
                                    border: '1px solid #CBD5E1', 
                                    background: '#fff', 
                                    fontSize: '0.85rem', 
                                    outline: 'none', 
                                    color: '#1E293B', 
                                    fontWeight: '700',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                }}
                            >
                                <option value="7d">Últimos 7 días</option>
                                <option value="30d">Últimos 30 días</option>
                                <option value="all">Todo el historial</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ height: isMobile ? '200px' : '350px', width: '100%', marginBottom: '2.5rem' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={(analytics || [])
                                .slice(analyticsFilter === '7d' ? -7 : analyticsFilter === '30d' ? -30 : 0)
                                .map(a => ({ 
                                    name: a.date.split('-').slice(1).reverse().join('/'), 
                                    visits: a.count 
                                }))}>
                                <defs>
                                    <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#025357" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#025357" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#64748B', fontSize: isMobile ? 10 : 12 }} 
                                    minTickGap={30}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#64748B', fontSize: 12 }}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '1rem' }}
                                    itemStyle={{ fontWeight: '800', color: '#025357' }}
                                    formatter={(val) => [`${val} visitas`, 'Tráfico']}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="visits" 
                                    stroke="#025357" 
                                    strokeWidth={4} 
                                    fillOpacity={1} 
                                    fill="url(#colorVisits)" 
                                    animationDuration={1500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', 
                        gap: '1.5rem' 
                    }}>
                        <div style={{ background: '#fff', borderRadius: '24px', padding: '1.5rem', border: '1px solid #E2E8F0' }}>
                            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>Total Periodo</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#025357' }}>
                                {(analytics || [])
                                    .slice(analyticsFilter === '7d' ? -7 : analyticsFilter === '30d' ? -30 : 0)
                                    .reduce((acc, a) => acc + (a.count || 0), 0)}
                            </div>
                        </div>
                        
                        <div style={{ background: '#fff', borderRadius: '24px', padding: '1.5rem', border: '1px solid #E2E8F0' }}>
                            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px' }}>Promedio Diario</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#025357' }}>
                                {Math.round((analytics || [])
                                    .slice(analyticsFilter === '7d' ? -7 : analyticsFilter === '30d' ? -30 : 0)
                                    .reduce((acc, a) => acc + (a.count || 0), 0) / ((analyticsFilter === '7d' ? 7 : analyticsFilter === '30d' ? 30 : analytics.length) || 1))}
                            </div>
                        </div>

                        <div style={{ background: '#025357', borderRadius: '24px', padding: '1.5rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <Globe size={32} style={{ opacity: 0.5 }} />
                            <div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: '800', textTransform: 'uppercase' }}>Estado Canal</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: '900' }}>Activo y Creciendo</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Dashboards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: '2rem', marginBottom: '3rem' }}>
                {/* Facturación */}
                <div style={{ background: '#E9EFEC', borderRadius: '32px', padding: '1.5rem', border: '1px solid #C4DAD2', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                        <div>
                            <span style={{ background: '#C4DAD2', color: '#1A3636', padding: '4px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase' }}>COMERCIAL</span>
                            <h3 style={{ margin: '0.5rem 0 0', fontSize: '1.4rem', color: '#1A3636' }}>Facturación Total</h3>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '2rem', fontWeight: '900', color: '#1A3636' }}>${(carteraData?.total + (Array.isArray(orders) ? orders : []).filter(o => o.status === 'Pagado' && new Date(o.date).getFullYear() === selectedYear).reduce((acc, o) => acc + (o.amount || 0), 0)).toLocaleString()}</div>
                        </div>
                    </div>
                    <div style={{ height: isMobile ? '160px' : '220px', width: '100%', marginBottom: '2rem' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={salesData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#C4DAD2" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#40534C', fontSize: 11 }} />
                                <YAxis hide />
                                <Bar dataKey="total" fill="#1A3636" radius={[4, 4, 0, 0]} barSize={25} />
                                <Tooltip />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: 'auto' }}>
                        <div style={{ background: 'rgba(255,255,255,0.4)', borderRadius: '20px', padding: '1.2rem' }}>
                            <h4 style={{ margin: '0 0 0.8rem', fontSize: '0.85rem', color: '#1A3636', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={14} /> Top Clientes</h4>
                            {salesByClient.map((c, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                                    <span style={{ color: '#40534C' }}>{(c.name || '').substring(0, 15)}</span>
                                    <span style={{ fontWeight: 'bold' }}>${(c.value || 0).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ background: '#1A3636', borderRadius: '20px', padding: '1.2rem', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>Impacto {(safeTax?.iva || 0)}% IVA</div>
                            <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>${(salesData.reduce((acc, d) => acc + d.total, 0) * (safeTax.iva / 100)).toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                {/* EFICIENCIA UND/HORA */}
                <div style={{ background: '#FFF4E6', borderRadius: '32px', padding: '1.5rem', border: '1px solid #FFE8CC', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                        <div>
                            <span style={{ background: '#FFE8CC', color: '#D9480F', padding: '4px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase' }}>PRODUCCIÓN</span>
                            <h3 style={{ margin: '0.5rem 0 0', fontSize: '1.4rem', color: '#D9480F' }}>Eficiencia UND/HORA</h3>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '2rem', fontWeight: '900', color: '#D9480F' }}>— <span style={{ fontSize: '0.8rem' }}>U/H</span></div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <select
                            value={selectedProductionSku}
                            onChange={(e) => setSelectedProductionSku(e.target.value)}
                            style={{ padding: '0.4rem', borderRadius: '8px', border: '1px solid #FFE8CC', background: '#fff', fontSize: '0.75rem', outline: 'none', color: '#D9480F', fontWeight: '700' }}
                        >
                            <option value="Todos">Todos los SKU</option>
                            {productionData.availableSkus.map(sku => (
                                <option key={sku} value={sku}>{sku}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ height: isMobile ? '160px' : '220px', width: '100%', marginBottom: '2rem' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={productionData.chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#FFE8CC" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#D9480F', fontSize: 11 }} />
                                <YAxis hide />
                                <Bar dataKey="total" fill="#D9480F" radius={[4, 4, 0, 0]} barSize={25} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    formatter={(val) => [`${val} UND/HRA`, 'Eficiencia']}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.4)', borderRadius: '20px', padding: '1.2rem', marginTop: 'auto' }}>
                        <h4 style={{ margin: '0 0 0.8rem', fontSize: '0.85rem', color: '#D9480F', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Zap size={14} /> Rendimiento SKU</h4>
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {(productionData.availableSkus || []).slice(0, 3).map((sku, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                    <span style={{ color: '#862e01' }}>{(sku || '').substring(0, 15)}</span>
                                    <span style={{ fontWeight: 'bold' }}>Status: Activo</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Cartera */}
                <div style={{ background: '#E8F1F5', borderRadius: '32px', padding: '1.5rem', border: '1px solid #D1E1E9', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                        <div>
                            <span style={{ background: '#D1E1E9', color: '#0369a1', padding: '4px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase' }}>A/R</span>
                            <h3 style={{ margin: '0.5rem 0 0', fontSize: '1.4rem', color: '#0369a1' }}>Cartera Total</h3>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '2rem', fontWeight: '900', color: '#0369a1' }}>${(carteraData?.total || 0).toLocaleString()}</div>
                        </div>
                    </div>
                    <div style={{ height: isMobile ? '160px' : '220px', width: '100%', marginBottom: '2rem' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={carteraData.chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D1E1E9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#0369a1', fontSize: 11 }} />
                                <YAxis hide />
                                <Tooltip formatter={(val) => [`$${val.toLocaleString()}`]} />
                                <Bar dataKey="v30" stackId="a" fill="#0369a1" name="V.<30" />
                                <Bar dataKey="v60" stackId="a" fill="#0284c7" name="V.30-60" />
                                <Bar dataKey="v90" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} name="V.>60" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: 'auto' }}>
                        <div style={{ background: 'rgba(255,255,255,0.4)', borderRadius: '20px', padding: '1.2rem' }}>
                            <h4 style={{ margin: '0 0 0.8rem', fontSize: '0.85rem', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={14} /> Deudores Críticos</h4>
                            {(carteraData?.pie || []).slice(0, 3).map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                                    <span style={{ color: '#0c4a6e' }}>{(item.name || '').substring(0, 15)}</span>
                                    <span style={{ fontWeight: 'bold' }}>${(item.value || 0).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ background: '#0369a1', borderRadius: '20px', padding: '1.2rem', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>Vencido (+30 d)</div>
                            <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>${(carteraData?.vencido || 0).toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                {/* CALIDAD (Merma/Waste) */}
                <div style={{ background: '#FDF2F8', borderRadius: '32px', padding: '1.5rem', border: '1px solid #FBCFE8', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                        <div>
                            <span style={{ background: '#FBCFE8', color: '#9D174D', padding: '4px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase' }}>CONTROL</span>
                            <h3 style={{ margin: '0.5rem 0 0', fontSize: '1.4rem', color: '#9D174D' }}>Calidad (Merma)</h3>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '2rem', fontWeight: '900', color: '#9D174D' }}>—%</div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <select
                            value={selectedQualitySku}
                            onChange={(e) => setSelectedQualitySku(e.target.value)}
                            style={{ padding: '0.4rem', borderRadius: '8px', border: '1px solid #FBCFE8', background: '#fff', fontSize: '0.75rem', outline: 'none', color: '#9D174D', fontWeight: '700' }}
                        >
                            <option value="Todos">Todos los SKU</option>
                            {qualityData.availableSkus.map(sku => (
                                <option key={sku} value={sku}>{sku}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ height: isMobile ? '160px' : '220px', width: '100%', marginBottom: '2rem' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={qualityData.chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#FBCFE8" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9D174D', fontSize: 11 }} />
                                <YAxis hide />
                                <Bar dataKey="total" fill="#9D174D" radius={[4, 4, 0, 0]} barSize={25} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    formatter={(val) => [`${val}%`, 'Merma']}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.4)', borderRadius: '20px', padding: '1.2rem', marginTop: 'auto' }}>
                        <h4 style={{ margin: '0 0 0.8rem', fontSize: '0.85rem', color: '#9D174D', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck size={14} /> Control de Merma</h4>
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {qualityData.availableSkus.slice(0, 3).map((sku, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                    <span style={{ color: '#831843' }}>{(sku || '').substring(0, 15)}</span>
                                    <span style={{ fontWeight: 'bold' }}>Calidad: OK</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>

            {/* Operational Dashboard */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
                <div style={{ background: '#fff', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.8rem' }}>
                        <div style={{ background: '#f0f4f4', padding: '0.6rem', borderRadius: '12px', color: 'var(--color-primary)' }}><Clock size={24} /></div>
                        <h3 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, color: '#1e293b' }}>Lead Time & Takt Time</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.8rem', borderBottom: '1px solid #f1f5f9' }}>
                            <div>
                                <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#334155' }}>Lead Time (Promedio)</div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tiempo desde pedido hasta despacho</div>
                            </div>
                            <span style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--color-primary)' }}>{operationalKPIs.leadTime} días</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.8rem', borderBottom: '1px solid #f1f5f9' }}>
                            <div>
                                <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#334155' }}>Takt Time (Requerido)</div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Ritmo de producción vs demanda</div>
                            </div>
                            <span style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--color-primary)' }}>{operationalKPIs.taktTime} min/und</span>
                        </div>
                    </div>
                </div>

                <div style={{ background: '#fff', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.2rem' }}>
                        <div style={{ background: '#fff7ed', padding: '0.6rem', borderRadius: '12px', color: '#ea580c' }}><Zap size={24} /></div>
                        <h3 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, color: '#1e293b' }}>OEE (Indicador de Eficacia)</h3>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ fontSize: '4.5rem', fontWeight: '900', color: '#ea580c', lineHeight: 1 }}>{oeeData.oee}%</div>
                        <div style={{ color: '#64748b', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Rendimiento de Planta <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>(META: 85%)</span></div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Disponibilidad</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b' }}>{oeeData.availability}%</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Desempeño</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b' }}>{oeeData.performance}%</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Calidad</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b' }}>{oeeData.quality}%</div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap');
                .font-serif { font-family: 'DM Serif Display', serif; }
            `}</style>
        </div>
    );
};

export default Reports;
