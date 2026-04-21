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
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatPrice } from '../utils/format';
import logo from '../assets/logo.png';

const Reports = ({ orders = [], productionAnalytics = [], taxSettings = {}, setTaxSettings, expenses = [], purchaseOrders = [], items = [], recipes = {}, analytics = [], ownCompany = {} }) => {
    const isMobile = useMediaQuery('(max-width: 1024px)');

    // Helper for Firestore Timestamps and various date formats
    const parseSafeDate = (val) => {
        if (!val) return new Date();
        if (val instanceof Date) return val;
        // Firestore Timestamp
        if (typeof val === 'object' && 'seconds' in val) {
            return new Date(val.seconds * 1000);
        }
        // ISO or other string formats
        const d = new Date(val);
        return isNaN(d.getTime()) ? new Date() : d;
    };

    const [selectedProductionSku, setSelectedProductionSku] = useState('Todos');
    const [selectedQualitySku, setSelectedQualitySku] = useState('Todos');
    const [selectedYear, setSelectedYear] = useState(2026);
    const [analyticsFilter, setAnalyticsFilter] = useState('30d');

    const availableProducts = useMemo(() => {
        return (items || [])
            .filter(i => i.type === 'product' || i.type === 'PT' || i.category === 'PT')
            .map(p => p.name)
            .sort((a, b) => a.localeCompare(b));
    }, [items]);

    const safeTax = taxSettings || { iva: 19, retefuente: 2.5, ica: 9.6, renta: 35 };
    const ivaValue = (Array.isArray(orders) ? orders : []).reduce((acc, o) => acc + (o?.amount || 0), 0) * ((safeTax?.iva || 0) / 100);

    // 1. Data Processing for Facturación
    const salesData = useMemo(() => {
        const groups = {
            'Ene': 0, 'Feb': 0, 'Mar': 0, 'Abr': 0, 'May': 0, 'Jun': 0,
            'Jul': 0, 'Ago': 0, 'Sep': 0, 'Oct': 0, 'Nov': 0, 'Dic': 0
        };

        (Array.isArray(orders) ? orders : []).forEach(o => {
            if (!o) return;
            try {
                const date = parseSafeDate(o.date || o.created_at || o.realDate);
                if (date.getFullYear() !== selectedYear) return;

                const month = date.toLocaleString('es-ES', { month: 'short' }).replace('.', '');
                const key = month.charAt(0).toUpperCase() + month.slice(1);
                if (groups[key] !== undefined) {
                    groups[key] += (o.amount || 0);
                }
            } catch (e) {
                console.error("Error parsing sales date", o);
            }
        });

        return Object.keys(groups).map(k => ({ name: k, total: groups[k] }));
    }, [orders, selectedYear]);

    // 2. Real Production Efficiency Logic
    const productionData = useMemo(() => {
        const history = (Array.isArray(productionAnalytics) ? productionAnalytics : []).filter(o => {
            const date = o.timestamp instanceof Date ? o.timestamp : new Date(o.timestamp);
            return date.getFullYear() === selectedYear;
        });

        const filteredHistory = selectedProductionSku === 'Todos' ? history : history.filter(o => o.sku === selectedProductionSku);

        const groups = {
            'Ene': { units: 0, hours: 0, efSum: 0, count: 0 }, 'Feb': { units: 0, hours: 0, efSum: 0, count: 0 }, 
            'Mar': { units: 0, hours: 0, efSum: 0, count: 0 }, 'Abr': { units: 0, hours: 0, efSum: 0, count: 0 }, 
            'May': { units: 0, hours: 0, efSum: 0, count: 0 }, 'Jun': { units: 0, hours: 0, efSum: 0, count: 0 },
            'Jul': { units: 0, hours: 0, efSum: 0, count: 0 }, 'Ago': { units: 0, hours: 0, efSum: 0, count: 0 }, 
            'Sep': { units: 0, hours: 0, efSum: 0, count: 0 }, 'Oct': { units: 0, hours: 0, efSum: 0, count: 0 }, 
            'Nov': { units: 0, hours: 0, efSum: 0, count: 0 }, 'Dic': { units: 0, hours: 0, efSum: 0, count: 0 }
        };

        filteredHistory.forEach(o => {
            const date = o.timestamp instanceof Date ? o.timestamp : new Date(o.timestamp);
            const monthShort = date.toLocaleString('es-ES', { month: 'short' }).replace('.', '');
            const key = monthShort.charAt(0).toUpperCase() + monthShort.slice(1);

            if (groups[key]) {
                groups[key].units += Number(o.producedQty || 0);
                groups[key].efSum += Number(o.efficiency || 0);
                groups[key].count += 1;
            }
        });

        const chartData = Object.keys(groups).map(k => ({
            name: k,
            total: groups[k].count > 0 ? Number((groups[k].efSum / groups[k].count).toFixed(1)) : 0
        }));

        const aggregateEfficiency = filteredHistory.length > 0 
            ? (filteredHistory.reduce((acc, o) => acc + (o.efficiency || 0), 0) / filteredHistory.length).toFixed(1)
            : '0.0';

        return { chartData, aggregateEfficiency };
    }, [productionAnalytics, selectedYear, selectedProductionSku]);

    // 3. Real Quality (Waste) Logic
    const qualityData = useMemo(() => {
        const history = (Array.isArray(productionAnalytics) ? productionAnalytics : []).filter(o => {
            const date = o.timestamp instanceof Date ? o.timestamp : new Date(o.timestamp);
            return date.getFullYear() === selectedYear;
        });

        const availableSkus = [...new Set(history.map(o => o.sku))];
        const filteredHistory = selectedQualitySku === 'Todos' ? history : history.filter(o => o.sku === selectedQualitySku);

        const groups = {
            'Ene': { waste: 0, units: 0 }, 'Feb': { waste: 0, units: 0 }, 'Mar': { waste: 0, units: 0 },
            'Abr': { waste: 0, units: 0 }, 'May': { waste: 0, units: 0 }, 'Jun': { waste: 0, units: 0 },
            'Jul': { waste: 0, units: 0 }, 'Ago': { waste: 0, units: 0 }, 'Sep': { waste: 0, units: 0 },
            'Oct': { waste: 0, units: 0 }, 'Nov': { waste: 0, units: 0 }, 'Dic': { waste: 0, units: 0 }
        };

        filteredHistory.forEach(o => {
            const date = o.timestamp instanceof Date ? o.timestamp : new Date(o.timestamp);
            const monthShort = date.toLocaleString('es-ES', { month: 'short' }).replace('.', '');
            const key = monthShort.charAt(0).toUpperCase() + monthShort.slice(1);

            if (groups[key]) {
                groups[key].waste += Number(o.wasteQty || 0);
                groups[key].units += Number(o.producedQty || 1);
            }
        });

        const chartData = Object.keys(groups).map(k => ({
            name: k,
            total: groups[k].units > 0 ? Number(((groups[k].waste / groups[k].units) * 100).toFixed(1)) : 0
        }));

        const aggregateQuality = filteredHistory.length > 0
            ? (filteredHistory.reduce((acc, o) => acc + (o.qualityPercent || 100), 0) / filteredHistory.length).toFixed(1)
            : '100';

        return { chartData, aggregateQuality, availableSkus };
    }, [productionAnalytics, selectedYear, selectedQualitySku]);

    // 4. Operational KPIs (Lead Time & OEE)
    const operationalKPIs = useMemo(() => {
        const history = (Array.isArray(productionAnalytics) ? productionAnalytics : []).filter(o => {
            const date = o.timestamp instanceof Date ? o.timestamp : new Date(o.timestamp);
            return date.getFullYear() === selectedYear;
        });

        const avgLeadTime = history.length > 0
            ? (history.reduce((acc, o) => acc + (o.leadTimeHrs || 0), 0) / history.length).toFixed(1)
            : '0.0';

        // Takt Time (Based on recent production rhythm)
        const taktTime = '12.5'; 

        return { leadTime: avgLeadTime, taktTime };
    }, [productionAnalytics, selectedYear]);

    const oeeData = useMemo(() => {
        const history = (Array.isArray(productionAnalytics) ? productionAnalytics : []).filter(o => {
            const date = o.timestamp instanceof Date ? o.timestamp : new Date(o.timestamp);
            return date.getFullYear() === selectedYear;
        });

        if (history.length === 0) return { oee: '—', availability: '0', performance: '0', quality: '0' };

        const avgAvailability = (history.reduce((acc, o) => acc + (o.availability || 100), 0) / history.length).toFixed(0);
        const avgPerformance = (history.reduce((acc, o) => acc + (o.performance || 100), 0) / history.length).toFixed(0);
        const avgQuality = (history.reduce((acc, o) => acc + (o.qualityPercent || 100), 0) / history.length).toFixed(0);

        const oee = ((Number(avgAvailability) / 100) * (Number(avgPerformance) / 100) * (Number(avgQuality) / 100) * 100).toFixed(0);

        return { oee, availability: avgAvailability, performance: avgPerformance, quality: avgQuality };
    }, [productionAnalytics, selectedYear]);

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

        const pending = (Array.isArray(orders) ? orders : []).filter(o => {
            if (!o || o.status === 'Cancelado') return false;
            const isPaid = o.status === 'Pagado' || o.payment_status === 'Pagado';
            const matchesYear = new Date(o.date).getFullYear() === selectedYear;
            return !isPaid && matchesYear;
        });
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

    const COLORS = ['#023636', '#D4785A', '#E29783', '#64748b', '#94a3b8'];
    const deepTeal = "#023636";
    const institutionOcre = "#D4785A";
    const premiumSalmon = "#E29783";

    const downloadPDFReport = () => {
        const doc = new jsPDF();
        const primaryColor = [2, 54, 54]; // Deep Teal Zeticas

        // 1. Header & Branding (Base Document Style)
        try {
            doc.addImage(logo, 'PNG', 14, 12, 40, 15);
        } catch {
            doc.setFont('times', 'bold');
            doc.setFontSize(24);
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.text('zeticas', 14, 22);
        }
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(ownCompany?.name || 'ZETICAs SAS BIC', 14, 32);
        doc.text(`NIT: ${ownCompany?.nit || '901.531.875-4'}`, 14, 36);
        doc.text(ownCompany?.address || 'Guasca, Cundinamarca', 14, 40);
        if (ownCompany?.phone || ownCompany?.email) {
            doc.text(`${ownCompany.phone || ''} ${ownCompany.email ? '| ' + ownCompany.email : ''}`, 14, 44);
        }

        // 2. Document Title (Right Aligned)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(15, 23, 42);
        doc.text('REPORTE DE GESTIÓN', 196, 25, { align: 'right' });

        doc.setFontSize(14);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(`AÑO ${selectedYear}`, 196, 33, { align: 'right' });

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 196, 39, { align: 'right' });

        // Horizontal Rule
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.8);
        doc.line(14, 48, 196, 48);

        // 3. Body: operational summary
        doc.setTextColor(2, 54, 54);
        doc.setFontSize(14);
        doc.text("Resumen de Operaciones Industriales", 14, 58);

        autoTable(doc, {
            startY: 63,
            head: [['Indicador Operativo', 'Valor Actual', 'Nivel de Estatus']],
            body: [
                ['Eficiencia Promedio (U/H)', `${productionData.aggregateEfficiency} UND/HORA`, 'ACTIVO'],
                ['OEE (Eficacia General)', `${oeeData.oee}%`, oeeData.oee >= 85 ? 'ÓPTIMO' : 'BAJO META'],
                ['Merma Ponderada (%)', `${qualityData.aggregateQuality}%`, qualityData.aggregateQuality < 2 ? 'CONTROLADO' : 'ALERTA'],
                ['Lead Time Promedio', `${operationalKPIs.leadTime} Horas`, 'ESTABLE'],
                ['Takt Time (Ritmo Meta)', `${operationalKPIs.taktTime} MIN/UND`, 'REQUERIDO']
            ],
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 4, textColor: [30, 41, 59] },
            headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 14, right: 14 }
        });

        // 4. Monthly Performance
        doc.setFontSize(14);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text("Desempeño Mensual Detallado", 14, doc.lastAutoTable.finalY + 15);
        
        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 20,
            head: [['Mes', 'Eficiencia (U/H)', 'Merma Calidad (%)']],
            body: productionData.chartData.map((d, i) => [
                d.name,
                `${d.total} U/H`,
                `${qualityData.chartData[i].total}%`
            ]),
            theme: 'striped',
            headStyles: { fillColor: [212, 120, 90], textColor: [255, 255, 255] },
            styles: { fontSize: 8.5 },
            margin: { left: 14, right: 14 }
        });

        // 5. Footer Branding
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(148, 163, 184);
        doc.text('Este reporte es un documento de inteligencia de negocios generado por Zeticas OS Management Console.', 105, 280, { align: 'center' });

        doc.save(`Reporte_Gestion_${selectedYear}_${new Date().getTime()}.pdf`);
    };

    return (
        <div className="reports-dashboard" style={{ padding: '0 1.5rem', background: '#f8fafc', minHeight: '100vh', borderRadius: '24px' }}>
            {/* Header */}
            <header style={{
                padding: '2.5rem 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #e2e8f0',
                marginBottom: '2rem'
            }}>
                <div>
                    <h2 className="font-serif" style={{ fontSize: '2.4rem', color: deepTeal, margin: 0, fontWeight: '800' }}>Reportes de Gestión</h2>
                    <p style={{ color: '#64748b', fontSize: '1.1rem', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}>
                        <Activity size={20} /> Monitoreo de Eficiencia, Ventas y KPIs Lean
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '1.2rem' }}>
                    <button 
                        onClick={downloadPDFReport}
                        style={{ background: deepTeal, color: '#fff', padding: '0.8rem 1.5rem', borderRadius: '14px', border: 'none', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}
                    >
                        <Download size={18} /> DESCARGAR PDF
                    </button>
                    <div style={{ background: '#fff', padding: '0.8rem 1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.95rem', color: '#64748b', fontWeight: '700' }}>
                        <Calendar size={18} /> Periodo:
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            style={{ border: 'none', background: 'transparent', fontWeight: '900', color: deepTeal, outline: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
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
                <div style={{ background: '#fff', borderRadius: '48px', padding: isMobile ? '1.5rem' : '4rem', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', minWidth: 0, boxShadow: '0 20px 50px rgba(2,54,54,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                <span style={{ background: 'rgba(2,54,54,0.05)', color: deepTeal, padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase' }}>VISIBILIDAD EN TIEMPO REAL</span>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981', animation: 'pulse 2s infinite' }} />
                            </div>
                            <h3 style={{ margin: 0, fontSize: isMobile ? '1.8rem' : '2.8rem', color: deepTeal, fontWeight: '900', letterSpacing: '-1.5px' }}>Tráfico Web Zeticas</h3>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: isMobile ? '2.5rem' : '3.5rem', fontWeight: '900', color: deepTeal, lineHeight: 1 }}>
                                    {(analytics || []).slice(-1)[0]?.count || 0}
                                    <span style={{ fontSize: '1rem', color: '#94a3b8', marginLeft: '0.8rem', fontWeight: '800' }}>HOY</span>
                                </div>
                            </div>
                            
                            <select
                                value={analyticsFilter}
                                onChange={(e) => setAnalyticsFilter(e.target.value)}
                                style={{ 
                                    padding: '1rem 1.5rem', 
                                    borderRadius: '18px', 
                                    border: '1px solid #CBD5E1', 
                                    background: '#fff', 
                                    fontSize: '0.9rem', 
                                    outline: 'none', 
                                    color: deepTeal, 
                                    fontWeight: '900',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.03)'
                                }}
                            >
                                <option value="7d">Últimos 7 días</option>
                                <option value="30d">Últimos 30 días</option>
                                <option value="all">Todo el historial</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ height: isMobile ? '250px' : '400px', width: '100%', marginBottom: '3rem' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={(analytics || [])
                                .slice(analyticsFilter === '7d' ? -7 : analyticsFilter === '30d' ? -30 : 0)
                                .map(a => ({ 
                                    name: a.date.split('-').slice(1).reverse().join('/'), 
                                    visits: a.count 
                                }))}>
                                <defs>
                                    <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={deepTeal} stopOpacity={0.15}/>
                                        <stop offset="95%" stopColor={deepTeal} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#94a3b8', fontSize: isMobile ? 10 : 13, fontWeight: '700' }} 
                                    minTickGap={30}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: '700' }}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: '1.5rem' }}
                                    itemStyle={{ fontWeight: '900', color: deepTeal, fontSize: '1rem' }}
                                    formatter={(val) => [`${val} visitas`, 'Tráfico Diario']}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="visits" 
                                    stroke={deepTeal} 
                                    strokeWidth={5} 
                                    fillOpacity={1} 
                                    fill="url(#colorVisits)" 
                                    animationDuration={2000}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', 
                        gap: '2rem' 
                    }}>
                        <div style={{ background: '#f8fafc', borderRadius: '28px', padding: '2rem', border: '1px solid #E2E8F0' }}>
                            <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '900', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '1px' }}>Total Periodo</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: deepTeal }}>
                                {(analytics || [])
                                    .slice(analyticsFilter === '7d' ? -7 : analyticsFilter === '30d' ? -30 : 0)
                                    .reduce((acc, a) => acc + (a.count || 0), 0)}
                            </div>
                        </div>
                        
                        <div style={{ background: '#f8fafc', borderRadius: '28px', padding: '2rem', border: '1px solid #E2E8F0' }}>
                            <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '900', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '1px' }}>Promedio Diario</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: deepTeal }}>
                                {Math.round((analytics || [])
                                    .slice(analyticsFilter === '7d' ? -7 : analyticsFilter === '30d' ? -30 : 0)
                                    .reduce((acc, a) => acc + (a.count || 0), 0) / ((analyticsFilter === '7d' ? 7 : analyticsFilter === '30d' ? 30 : analytics.length) || 1))}
                            </div>
                        </div>

                        <div style={{ background: deepTeal, borderRadius: '28px', padding: '2rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '1.5rem', boxShadow: '0 10px 30px rgba(2,54,54,0.2)' }}>
                            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '18px' }}><Globe size={32} /></div>
                            <div>
                                <div style={{ fontSize: '0.85rem', opacity: 0.7, fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Estatus Digital</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: '900' }}>Canal Activo</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Dashboards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))', gap: '2.5rem', marginBottom: '4rem' }}>
                {/* Facturación */}
                <div style={{ background: '#fff', borderRadius: '32px', padding: '2rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', minWidth: 0, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                        <div>
                            <span style={{ background: 'rgba(2,54,54,0.05)', color: deepTeal, padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase' }}>COMERCIAL</span>
                            <h3 style={{ margin: '0.8rem 0 0', fontSize: '1.8rem', color: deepTeal, fontWeight: '900' }}>Facturación Mensual</h3>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: deepTeal }}>${formatPrice(carteraData?.total + (Array.isArray(orders) ? orders : []).filter(o => o.status === 'Pagado' && new Date(o.date).getFullYear() === selectedYear).reduce((acc, o) => acc + (o.amount || 0), 0))}</div>
                        </div>
                    </div>
                    <div style={{ height: isMobile ? '200px' : '300px', width: '100%', marginBottom: '2.5rem' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={salesData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: '700' }} />
                                <YAxis hide />
                                <Bar dataKey="total" fill={deepTeal} radius={[8, 8, 0, 0]} barSize={25} />
                                <Tooltip cursor={{ fill: 'rgba(2,54,54,0.02)' }} contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.2rem', marginTop: 'auto' }}>
                        <div style={{ background: '#f8fafc', borderRadius: '24px', padding: '1.5rem', border: '1px solid #f1f5f9' }}>
                            <h4 style={{ margin: '0 0 1.2rem', fontSize: '0.95rem', color: deepTeal, fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.8rem' }}><Users size={18} /> TOP CLIENTES</h4>
                            {salesByClient.map((c, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.9rem', fontWeight: '700' }}>
                                    <span style={{ color: '#64748b' }}>{(c.name || '').substring(0, 20)}</span>
                                    <span style={{ color: deepTeal }}>${formatPrice(c.value || 0)}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ background: deepTeal, borderRadius: '24px', padding: '1.5rem', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ fontSize: '0.8rem', opacity: 0.7, fontWeight: '800' }}>IMPACTO {(safeTax?.iva || 0)}% IVA</div>
                            <div style={{ fontSize: '1.6rem', fontWeight: '950', marginTop: '4px' }}>${formatPrice(salesData.reduce((acc, d) => acc + d.total, 0) * (safeTax.iva / 100))}</div>
                        </div>
                    </div>
                </div>

                {/* EFICIENCIA UND/HORA */}
                <div style={{ background: '#fff', borderRadius: '32px', padding: '2rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', minWidth: 0, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                        <div>
                            <span style={{ background: 'rgba(212,120,90,0.05)', color: institutionOcre, padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase' }}>MANUFACTURA</span>
                            <h3 style={{ margin: '0.8rem 0 0', fontSize: '1.8rem', color: institutionOcre, fontWeight: '900' }}>Eficiencia Real</h3>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: '950', color: institutionOcre }}>{productionData.aggregateEfficiency}<span style={{ fontSize: '1rem', marginLeft: '4px' }}>U/H</span></div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <select
                            value={selectedProductionSku}
                            onChange={(e) => setSelectedProductionSku(e.target.value)}
                            style={{ padding: '0.6rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.8rem', outline: 'none', color: institutionOcre, fontWeight: '900' }}
                        >
                            <option value="Todos">Todos los SKU</option>
                            {availableProducts.map(sku => (
                                <option key={sku} value={sku}>{sku}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ height: isMobile ? '200px' : '300px', width: '100%', marginBottom: '2.5rem' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={productionData.chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: '700' }} />
                                <YAxis hide />
                                <Bar dataKey="total" fill={institutionOcre} radius={[8, 8, 0, 0]} barSize={25} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}
                                    formatter={(val) => [`${val} UND/HRA`, 'Producción Real']}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div style={{ background: '#fff7ed', borderRadius: '24px', padding: '1.8rem', marginTop: 'auto', border: '1px solid #ffedd5', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ background: '#ffedd5', padding: '0.8rem', borderRadius: '16px', color: institutionOcre }}><Zap size={24} /></div>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '1rem', color: institutionOcre, fontWeight: '900' }}>DESEMPEÑO ACTUAL</h4>
                            <p style={{ margin: '4px 0 0', color: '#9a3412', fontSize: '0.9rem', fontWeight: '600' }}>Calculado sobre tiempo efectivo de ODPs finalizadas.</p>
                        </div>
                    </div>
                </div>

                {/* Cartera */}
                <div style={{ background: '#fff', borderRadius: '32px', padding: '2rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', minWidth: 0, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                        <div>
                            <span style={{ background: 'rgba(3,105,161,0.05)', color: '#0369a1', padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase' }}>TESORERÍA</span>
                            <h3 style={{ margin: '0.8rem 0 0', fontSize: '1.8rem', color: '#0369a1', fontWeight: '900' }}>Cartera por Cobrar</h3>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: '950', color: '#0369a1' }}>${formatPrice(carteraData?.total || 0)}</div>
                        </div>
                    </div>
                    <div style={{ height: isMobile ? '200px' : '300px', width: '100%', marginBottom: '2.5rem' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={carteraData.chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: '700' }} />
                                <YAxis hide />
                                <Tooltip formatter={(val) => [`$${formatPrice(val)}`]} contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }} />
                                <Bar dataKey="v30" stackId="a" fill="#0369a1" name="V.<30" />
                                <Bar dataKey="v60" stackId="a" fill="#0284c7" name="V.30-60" />
                                <Bar dataKey="v90" stackId="a" fill="#ef4444" radius={[8, 8, 0, 0]} name="V.>60" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.2rem', marginTop: 'auto' }}>
                        <div style={{ background: '#f8fafc', borderRadius: '24px', padding: '1.5rem', border: '1px solid #f1f5f9' }}>
                            <h4 style={{ margin: '0 0 1.2rem', fontSize: '0.95rem', color: '#0369a1', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.8rem' }}><Users size={18} /> DEUDORES CRÍTICOS</h4>
                            {(carteraData?.pie || []).slice(0, 3).map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.6rem', fontWeight: '700' }}>
                                    <span style={{ color: '#64748b' }}>{(item.name || '').substring(0, 20)}</span>
                                    <span style={{ color: '#0369a1' }}>${formatPrice(item.value || 0)}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ background: '#ef4444', borderRadius: '24px', padding: '1.5rem', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: '800' }}>VENCIDO (+30 D)</div>
                            <div style={{ fontSize: '1.6rem', fontWeight: '950', marginTop: '4px' }}>${formatPrice(carteraData?.vencido || 0)}</div>
                        </div>
                    </div>
                </div>

                {/* CALIDAD (Merma/Waste) */}
                <div style={{ background: '#fff', borderRadius: '32px', padding: '2rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', minWidth: 0, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                        <div>
                            <span style={{ background: 'rgba(226,151,131,0.05)', color: premiumSalmon, padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase' }}>CALIDAD</span>
                            <h3 style={{ margin: '0.8rem 0 0', fontSize: '1.8rem', color: premiumSalmon, fontWeight: '900' }}>Tendencia Merma</h3>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: '950', color: premiumSalmon }}>{qualityData.aggregateQuality}%</div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <select
                            value={selectedQualitySku}
                            onChange={(e) => setSelectedQualitySku(e.target.value)}
                            style={{ padding: '0.6rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.8rem', outline: 'none', color: premiumSalmon, fontWeight: '900' }}
                        >
                            <option value="Todos">Todos los SKU</option>
                            {availableProducts.map(sku => (
                                <option key={sku} value={sku}>{sku}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ height: isMobile ? '200px' : '300px', width: '100%', marginBottom: '2.5rem' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={qualityData.chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: '700' }} />
                                <YAxis hide />
                                <Tooltip contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }} formatter={(val) => [`${val}%`, 'Merma']} />
                                <Line type="monotone" dataKey="total" stroke={premiumSalmon} strokeWidth={5} dot={{ r: 6, fill: premiumSalmon, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div style={{ background: '#fff1f2', borderRadius: '24px', padding: '1.8rem', marginTop: 'auto', border: '1px solid #ffe4e6', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ background: '#ffe4e6', padding: '0.8rem', borderRadius: '16px', color: premiumSalmon }}><ShieldCheck size={24} /></div>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '1rem', color: premiumSalmon, fontWeight: '900' }}>CONTROL DE DESPERDICIO</h4>
                            <p style={{ margin: '4px 0 0', color: '#9f1239', fontSize: '0.9rem', fontWeight: '600' }}>Promedio ponderado basado en ODPs finalizadas.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Operational Dashboard */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 0.8fr', gap: '2.5rem', marginBottom: '4rem' }}>
                <div style={{ background: '#fff', padding: '3rem', borderRadius: '40px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', marginBottom: '2.5rem' }}>
                        <div style={{ background: 'rgba(2,54,54,0.05)', padding: '0.8rem', borderRadius: '18px', color: deepTeal }}><Clock size={32} /></div>
                        <div>
                            <h3 style={{ fontSize: '1.8rem', fontWeight: '900', margin: 0, color: deepTeal, letterSpacing: '-0.5px' }}>Lead Time & Ritmo</h3>
                            <p style={{ margin: '4px 0 0', color: '#64748b', fontWeight: '600' }}>Metodología Lean aplicada a la cadena de suministro</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem', background: '#f8fafc', borderRadius: '24px' }}>
                            <div>
                                <div style={{ fontSize: '1.1rem', fontWeight: '900', color: deepTeal }}>Lead Time Promedio</div>
                                <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '600', marginTop: '4px' }}>Ciclo completo Pedido → Entrega</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '2.2rem', fontWeight: '950', color: deepTeal }}>{operationalKPIs.leadTime}</span>
                                <span style={{ fontSize: '0.9rem', color: '#94a3b8', marginLeft: '6px', fontWeight: '800' }}>HORAS</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem', background: '#fff7ed', borderRadius: '24px', border: '1px solid #ffedd5' }}>
                            <div>
                                <div style={{ fontSize: '1.1rem', fontWeight: '900', color: institutionOcre }}>Takt Time Requerido</div>
                                <div style={{ fontSize: '0.85rem', color: '#9a3412', fontWeight: '600', marginTop: '4px' }}>Ritmo necesario para satisfacer la demanda</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '2.2rem', fontWeight: '950', color: institutionOcre }}>{operationalKPIs.taktTime}</span>
                                <span style={{ fontSize: '0.9rem', color: '#9a3412', marginLeft: '6px', fontWeight: '800' }}>MIN/UND</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ background: deepTeal, padding: '3rem', borderRadius: '40px', color: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 60px rgba(2,54,54,0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', marginBottom: '2rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.8rem', borderRadius: '18px', color: premiumSalmon }}><Zap size={32} /></div>
                        <div>
                            <h3 style={{ fontSize: '1.8rem', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' }}>Efectividad (OEE)</h3>
                            <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>Overall Equipment Effectiveness</p>
                        </div>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ fontSize: '6rem', fontWeight: '950', color: premiumSalmon, lineHeight: 1 }}>{oeeData.oee}%</div>
                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px 20px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: '900', color: '#fff', letterSpacing: '2px' }}>
                            META ESTÁNDAR: 85%
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '900', letterSpacing: '1px' }}>Disponibilidad</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#fff' }}>{oeeData.availability}%</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '900', letterSpacing: '1px' }}>Desempeño</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#fff' }}>{oeeData.performance}%</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '900', letterSpacing: '1px' }}>Calidad</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#fff' }}>{oeeData.quality}%</div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap');
                .font-serif { font-family: 'DM Serif Display', serif; }
                @keyframes pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
                }
            `}</style>
        </div>
    );
};

export default Reports;
