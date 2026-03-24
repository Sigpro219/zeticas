import React, { useState } from 'react';
import {
    Plus,
    Save,
    AlertCircle,
    Truck,
    Download,
    Eye,
    DollarSign,
    TrendingDown,
    Filter,
    Search,
    Layout,
    Package,
    ChefHat,
    LayoutGrid,
    FileText,
    ShoppingCart,
    Receipt,
    BarChart3,
    UserPlus,
    ClipboardList,
    Landmark,
    ShieldCheck,
    Zap,
    Database,
    ChevronUp,
    ChevronDown,
    LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { useBusiness } from '../context/BusinessContext';

// Components
import Kanban from './Kanban';
import Inventory from './Inventory';
import Shipping from './Shipping';
import Products from './Products';
import Recipes from './Recipes';
import Suppliers from './Suppliers';
import Clients from './Clients';
import Purchases from './Purchases';
import Sales from './Sales';
import Production from './Production';
import Cartera from './Cartera';
import Costs from './Costs';
import Reports from './Reports';
import Expenses from './Expenses';
import Banks from './Banks';
import CRM from './CRM';
import CMSContents from './CMSContents';

const allTabs = [
    'kanban', 'orders', 'purchases', 'shipping', 'cartera', 'expenses', 'reports', 
    'production', 'inventory', 'recipes', 'costs', 'products', 'clients', 'suppliers', 'banks', 'crm', 'cms'
];

const Gestion = () => {
    const navigate = useNavigate();
    const { tab } = useParams();
    const { logout } = useAuth();
    const {
        items, setItems,
        orders, setOrders,
        expenses, setExpenses,
        purchaseOrders, setPurchaseOrders,
        banks, setBanks,
        taxSettings, setTaxSettings,
        recipes, providers,
        lastUpdate
    } = useBusiness();

    let activeTab = tab || localStorage.getItem('zeticas_last_tab');
    if (!allTabs.includes(activeTab)) {
        activeTab = 'kanban';
    }

    // Premium Branding Colors
    const deepTeal = "#023636";
    const institutionOcre = "#D4785A";
    const premiumSalmon = "#E29783";

    const isMasterDataTab = ['products', 'recipes', 'suppliers', 'clients', 'costs', 'banks', 'cms'].includes(activeTab);
    const [isMasterDataOpen, setIsMasterDataOpen] = useState(() => {
        const savedState = localStorage.getItem('zeticas_master_data_open');
        return savedState !== null ? JSON.parse(savedState) : isMasterDataTab;
    });

    React.useEffect(() => {
        if (!tab || !allTabs.includes(tab)) {
            navigate(`/gestion/${activeTab}`, { replace: true });
        } else {
            localStorage.setItem('zeticas_last_tab', tab);
        }
    }, [tab, activeTab, navigate]);

    React.useEffect(() => {
        if (['products', 'recipes', 'suppliers', 'clients', 'costs', 'banks', 'cms'].includes(activeTab)) {
            setIsMasterDataOpen(true);
            localStorage.setItem('zeticas_master_data_open', 'true');
        }
    }, [activeTab]);

    const setActiveTab = (tabId) => {
        navigate(`/gestion/${tabId}`);
    };

    const valueStreamTabs = [
        { id: 'kanban', label: 'Tablero Kanban', icon: <LayoutGrid size={18} /> },
        { id: 'orders', label: 'Pedidos / Ventas', icon: <FileText size={18} /> },
        { id: 'purchases', label: 'Compras / OC', icon: <ShoppingCart size={18} /> },
        { id: 'shipping', label: 'Logística / Despachos', icon: <Truck size={18} /> },
        { id: 'cartera', label: 'Cartera / Cobro', icon: <DollarSign size={18} /> },
        { id: 'expenses', label: 'Gastos / PYG', icon: <Receipt size={18} /> },
        { id: 'reports', label: 'Reportes Dashboard', icon: <BarChart3 size={18} /> },
    ];

    const operationalHubTabs = [
        { id: 'production', label: 'Producción / ODP', icon: <ChefHat size={18} /> },
        { id: 'inventory', label: 'Inventarios', icon: <Package size={18} /> },
    ];

    const masterDataTabs = [
        { id: 'products', label: 'Catálogo Productos', icon: <Package size={18} /> },
        { id: 'clients', label: 'Clientes / CRM', icon: <UserPlus size={18} /> },
        { id: 'suppliers', label: 'Directorio Proveedores', icon: <ClipboardList size={18} /> },
        { id: 'banks', label: 'Tesorería Bancos', icon: <Landmark size={18} /> },
        { id: 'recipes', label: 'Recetas (BOM)', icon: <ChefHat size={18} /> },
        { id: 'costs', label: 'Análisis de Costos', icon: <DollarSign size={18} /> },
        { id: 'cms', label: 'Contenidos Web (CMS)', icon: <Layout size={18} /> },
    ];

    return (
        <div style={{ 
            display: 'flex', 
            height: 'calc(100vh - 85px)', // Navbar only 
            background: '#f1f5f9',
            overflow: 'hidden' // Contain children
        }}>
            {/* Premium Sidebar */}
            <aside style={{
                width: '280px', // Slightly narrower
                padding: '2rem 1.25rem',
                background: '#fff',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                borderRight: '1px solid #e2e8f0',
                boxShadow: '10px 0 30px rgba(0,0,0,0.02)',
                zIndex: 100,
                flexShrink: 0
            }}>
                <nav style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.4rem', 
                    flex: 1, 
                    overflowY: 'auto',
                    paddingRight: '4px' // Space for scrollbar
                }}>
                    {/* CRM Highlighted */}
                    <button
                        onClick={() => setActiveTab('crm')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.8rem',
                            padding: '1rem 1.25rem',
                            border: 'none',
                            background: activeTab === 'crm' ? `linear-gradient(135deg, ${premiumSalmon}, #D4785A)` : 'rgba(212, 120, 90, 0.05)',
                            color: activeTab === 'crm' ? '#fff' : institutionOcre,
                            borderRadius: '16px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '800',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            marginBottom: '0.5rem',
                            boxShadow: activeTab === 'crm' ? `0 10px 25px ${institutionOcre}30` : 'none',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}
                    >
                        <Zap size={18} /> Commercial / CRM
                    </button>

                    {/* Kanban as Second Priority */}
                    <button
                        onClick={() => setActiveTab('kanban')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.8rem',
                            padding: '0.8rem 1.25rem',
                            border: 'none',
                            background: activeTab === 'kanban' ? deepTeal : 'transparent',
                            color: activeTab === 'kanban' ? '#fff' : '#64748b',
                            borderRadius: '14px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            transform: activeTab === 'kanban' ? 'translateX(5px)' : 'none',
                            boxShadow: activeTab === 'kanban' ? `0 8px 20px ${deepTeal}25` : 'none',
                            marginBottom: '0.25rem'
                        }}
                    >
                        <span style={{ opacity: activeTab === 'kanban' ? 1 : 0.6 }}><LayoutGrid size={18} /></span>
                        Tablero Kanban
                    </button>

                    {/* Primary Workflow Flows */}
                    {['orders', 'purchases', 'production', 'shipping'].map(tabId => {
                        const tab = [...valueStreamTabs, ...operationalHubTabs].find(t => t.id === tabId);
                        const isOperational = operationalHubTabs.some(o => o.id === tabId);
                        const themeColor = isOperational ? institutionOcre : deepTeal;
                        
                        return (
                            <button
                                key={tabId}
                                onClick={() => setActiveTab(tabId)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.8rem',
                                    padding: '0.8rem 1.25rem',
                                    border: 'none',
                                    background: activeTab === tabId ? themeColor : 'transparent',
                                    color: activeTab === tabId ? '#fff' : '#64748b',
                                    borderRadius: '14px',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: '700',
                                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                    transform: activeTab === tabId ? 'translateX(5px)' : 'none',
                                    boxShadow: activeTab === tabId ? `0 8px 20px ${themeColor}25` : 'none',
                                    marginBottom: tabId === 'shipping' ? '0.75rem' : '0.25rem'
                                }}
                            >
                                <span style={{ opacity: activeTab === tabId ? 1 : 0.6 }}>{tab.icon}</span>
                                {tab.label}
                            </button>
                        );
                    })}

                    {[...operationalHubTabs.filter(t => t.id !== 'production'), ...valueStreamTabs.filter(t => !['kanban', 'orders', 'purchases', 'shipping'].includes(t.id))].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.8rem',
                                padding: '0.8rem 1.25rem',
                                border: 'none',
                                background: activeTab === tab.id ? (operationalHubTabs.some(o => o.id === tab.id) ? institutionOcre : deepTeal) : 'transparent',
                                color: activeTab === tab.id ? '#fff' : '#64748b',
                                borderRadius: '14px',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: '700',
                                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                transform: activeTab === tab.id ? 'translateX(5px)' : 'none',
                                boxShadow: activeTab === tab.id ? `0 8px 20px ${operationalHubTabs.some(o => o.id === tab.id) ? institutionOcre : deepTeal}25` : 'none',
                                marginBottom: '0.25rem'
                            }}
                        >
                            <span style={{ opacity: activeTab === tab.id ? 1 : 0.6 }}>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}

                    {/* Master Data Toggle */}
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                        <button
                            onClick={() => setIsMasterDataOpen(!isMasterDataOpen)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                width: '100%',
                                padding: '0.8rem 1.25rem',
                                border: 'none',
                                background: 'rgba(2, 54, 54, 0.02)',
                                color: deepTeal,
                                borderRadius: '14px',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: '800',
                                textTransform: 'uppercase',
                                letterSpacing: '1px'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Database size={16}/> Master Data</div>
                            {isMasterDataOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                    </div>

                    {isMasterDataOpen && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem', paddingLeft: '0.5rem' }}>
                            {masterDataTabs.map(tab => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.7rem 1rem', border: 'none', background: activeTab === tab.id ? 'rgba(214, 189, 152, 0.1)' : 'transparent', color: activeTab === tab.id ? institutionOcre : '#94a3b8', borderRadius: '12px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', transition: 'all 0.2s' }}>
                                    {tab.icon} {tab.label}
                                </button>
                            ))}
                        </div>
                    )}
                </nav>

                <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                    <button onClick={() => { logout(); navigate('/'); }} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '1rem', background: '#fff1f1', color: '#ef4444', borderRadius: '16px', border: 'none', width: '100%', fontWeight: '800', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.3s' }} onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'} onMouseLeave={e => e.currentTarget.style.background = '#fff1f1'}>
                        <LogOut size={18} /> Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content Hub */}
            <main style={{ 
                flex: 1, 
                padding: '2rem 3vw', // Responsive horizontal padding
                overflowY: 'auto', 
                background: '#f8fafc',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(0,0,0,0.1) transparent'
            }}>
                <header style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '3rem', // Reduced from 5rem
                    paddingBottom: '2rem',
                    borderBottom: '1px solid #e2e8f0'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                        <div style={{ 
                            width: '64px', // Slightly smaller
                            height: '64px', 
                            borderRadius: '20px', 
                            background: activeTab === 'crm' ? premiumSalmon : deepTeal, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            boxShadow: `0 15px 30px ${activeTab === 'crm' ? institutionOcre : deepTeal}25`,
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 100%)' }} />
                            {(() => {
                                const IconComp = [...valueStreamTabs, ...operationalHubTabs, ...masterDataTabs, { id: 'crm', icon: <UserPlus size={32} /> }].find(t => t.id === activeTab)?.icon;
                                return IconComp ? React.cloneElement(IconComp, { size: 32, color: '#fff' }) : <Package size={32} color="#fff" />;
                            })()}
                        </div>
                        <div>
                            <h1 style={{ 
                                fontSize: '2.4rem', // Reduced from 3.2rem
                                color: deepTeal, 
                                margin: 0,
                                fontWeight: '800',
                                letterSpacing: '-1px',
                                lineHeight: 1.1
                            }}>
                                {activeTab === 'crm' ? 'Commercial Engine' : (
                                    valueStreamTabs.find(t => t.id === activeTab)?.label || 
                                    operationalHubTabs.find(t => t.id === activeTab)?.label || 
                                    masterDataTabs.find(t => t.id === activeTab)?.label || 
                                    'System Core'
                                ).toUpperCase()}
                            </h1>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.4rem' }}>
                                <p style={{ color: '#94a3b8', fontSize: '1rem', margin: 0, fontWeight: '600' }}>
                                    {activeTab === 'crm' ? 'Estrategia comercial y embudo de crecimiento' : 'Zeticas OS Management Console'}
                                </p>
                                <div style={{ height: '12px', width: '1px', background: '#cbd5e1' }} />
                                <div style={{ fontSize: '0.75rem', fontWeight: '800', color: institutionOcre, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {lastUpdate ? `Last Sync: ${lastUpdate}` : 'Real-time Active'}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                         <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '0.75rem 1.5rem', borderRadius: '18px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.55rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Security Rating</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: '800', fontSize: '0.9rem' }}>
                                <ShieldCheck size={16} /> AAA+
                            </div>
                        </div>
                    </div>
                </header>

                <div style={{ animation: 'fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                    {activeTab === 'crm' && <CRM />}
                    {activeTab === 'kanban' && <Kanban orders={orders} items={items} />}
                    {activeTab === 'products' && <Products />}
                    {activeTab === 'recipes' && <Recipes />}
                    {activeTab === 'suppliers' && <Suppliers items={items} setItems={setItems} />}
                    {activeTab === 'clients' && <Clients />}
                    {activeTab === 'purchases' && <Purchases items={items} setItems={setItems} purchaseOrders={purchaseOrders} setPurchaseOrders={setPurchaseOrders} providers={providers} />}
                    {activeTab === 'production' && <Production orders={orders} setOrders={setOrders} items={items} setItems={setItems} recipes={recipes} />}
                    {activeTab === 'inventory' && <Inventory items={items} setItems={setItems} />}
                    {activeTab === 'orders' && <Sales orders={orders} setOrders={setOrders} />}
                    {activeTab === 'costs' && <Costs items={items} setItems={setItems} />}
                    {activeTab === 'expenses' && <Expenses expenses={expenses} setExpenses={setExpenses} orders={orders} purchaseOrders={purchaseOrders} banks={banks} setBanks={setBanks} />}
                    {activeTab === 'reports' && <Reports orders={orders} taxSettings={taxSettings} setTaxSettings={setTaxSettings} expenses={expenses} purchaseOrders={purchaseOrders} items={items} recipes={recipes} />}
                    {activeTab === 'shipping' && <Shipping orders={orders} setOrders={setOrders} items={items} setItems={setItems} />}
                    {activeTab === 'cartera' && <Cartera />}
                    {activeTab === 'banks' && <Banks />}
                    {activeTab === 'cms' && <CMSContents />}
                </div>
            </main>

            <style>{`
                @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.15); }
                * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
            `}</style>
        </div>
    );
};

export default Gestion;
