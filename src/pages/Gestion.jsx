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
    Globe,
    ChevronUp,
    ChevronDown,
    LogOut,
    Menu,
    Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { useBusiness } from '../context/BusinessContext';
import { useMediaQuery } from '../hooks/useMediaQuery';

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
import ShippingAdmin from './ShippingAdmin';
import UsersAdmin from './UsersAdmin';

const allTabs = [
    'kanban', 'orders', 'purchases', 'shipping', 'cartera', 'expenses', 'reports', 
    'production', 'inventory', 'recipes', 'costs', 'products', 'clients', 'suppliers', 'banks', 'crm', 'web_cms', 'web_shipping', 'users_admin'
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
    
    const isMobile = useMediaQuery('(max-width: 1024px)');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    let activeTab = tab || localStorage.getItem('zeticas_last_tab');
    if (!allTabs.includes(activeTab)) {
        activeTab = 'kanban';
    }

    // Premium Branding Colors
    const deepTeal = "#023636";
    const institutionOcre = "#D4785A";
    const premiumSalmon = "#E29783";

    const isMasterDataTab = ['products', 'recipes', 'suppliers', 'clients', 'costs', 'banks', 'web_cms', 'web_shipping', 'users_admin'].includes(activeTab);
    const [isMasterDataOpen, setIsMasterDataOpen] = useState(() => {
        const savedState = localStorage.getItem('zeticas_master_data_open');
        return savedState !== null ? JSON.parse(savedState) : isMasterDataTab;
    });

    const [isWebAdminOpen, setIsWebAdminOpen] = useState(() => {
        const savedState = localStorage.getItem('zeticas_web_admin_open');
        return savedState !== null ? JSON.parse(savedState) : ['web_cms', 'web_shipping'].includes(activeTab);
    });

    React.useEffect(() => {
        if (!tab || !allTabs.includes(tab)) {
            navigate(`/gestion/${activeTab}`, { replace: true });
        } else {
            localStorage.setItem('zeticas_last_tab', tab);
        }
    }, [tab, activeTab, navigate]);

    React.useEffect(() => {
        if (['products', 'recipes', 'suppliers', 'clients', 'costs', 'banks', 'web_cms', 'web_shipping', 'users_admin'].includes(activeTab)) {
            setIsMasterDataOpen(true);
            localStorage.setItem('zeticas_master_data_open', 'true');
        }
        if (['web_cms', 'web_shipping', 'users_admin'].includes(activeTab)) {
            setIsWebAdminOpen(true);
            localStorage.setItem('zeticas_web_admin_open', 'true');
        }
    }, [activeTab]);

    const setActiveTab = (tabId) => {
        navigate(`/gestion/${tabId}`);
        if (isMobile) {
            setIsSidebarOpen(false);
        }
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
    ];

    const webAdminTabs = [
        { id: 'web_cms', label: 'Contenido Web', icon: <Layout size={18} /> },
        { id: 'web_shipping', label: 'Config. de Envíos', icon: <Truck size={18} /> },
        { id: 'users_admin', label: 'Gestión de Usuarios', icon: <Users size={18} /> },
    ];

    return (
        <div style={{ 
            display: 'flex', 
            height: isMobile ? 'calc(100vh - 70px)' : 'calc(100vh - 85px)', 
            background: '#f1f5f9',
            overflow: 'hidden' 
        }}>
            {/* Mobile Top App Bar (Only visible internally if Navbar is hidden, but navbar is global. We add a specialized header) */}
            {isMobile && (
                <div style={{
                    position: 'fixed',
                    top: '70px', /* Below Global Layout Navbar */
                    left: 0,
                    width: '100%',
                    height: '60px',
                    background: '#fff',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 1.25rem',
                    zIndex: 90,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                    gap: '1rem'
                }}>
                    <button 
                        onClick={() => setIsSidebarOpen(true)}
                        style={{ background: 'none', border: 'none', color: deepTeal, padding: '0.5rem', display: 'flex' }}
                    >
                        <Menu size={24} />
                    </button>
                    <span style={{ fontWeight: '800', color: deepTeal, fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Zeticas OS
                    </span>
                </div>
            )}

            {/* Mobile Backdrop */}
            {isMobile && isSidebarOpen && (
                <div 
                    onClick={() => setIsSidebarOpen(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(2px)',
                        zIndex: 1999,
                        animation: 'fadeIn 0.2s ease'
                    }}
                />
            )}

            {/* Premium Sidebar (Drawer on Mobile) */}
            <aside style={{
                width: isMobile ? '80vw' : '280px',
                maxWidth: '320px',
                padding: '1.5rem 1.25rem',
                background: '#fff',
                display: 'flex',
                flexDirection: 'column',
                height: isMobile ? '100vh' : '100%',
                borderRight: '1px solid #e2e8f0',
                boxShadow: isMobile ? '15px 0 35px rgba(0,0,0,0.1)' : '10px 0 30px rgba(0,0,0,0.02)',
                position: isMobile ? 'fixed' : 'relative',
                top: 0,
                left: isMobile ? (isSidebarOpen ? '0' : '-100%') : '0',
                transition: 'left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                zIndex: 2000,
                flexShrink: 0
            }}>
                {isMobile && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                        <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', padding: '0.5rem' }}>
                            <ChevronUp size={24} style={{ transform: 'rotate(-90deg)', color: '#94a3b8' }} />
                        </button>
                    </div>
                )}
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
                            padding: '0.7rem 1.25rem',
                            border: 'none',
                            background: activeTab === 'kanban' ? deepTeal : 'transparent',
                            color: activeTab === 'kanban' ? '#fff' : '#64748b',
                            borderRadius: '14px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            transform: activeTab === 'kanban' ? 'translateX(5px)' : 'none',
                            boxShadow: activeTab === 'kanban' ? `0 8px 20px ${deepTeal}25` : 'none'
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
                                    padding: '0.7rem 1.25rem',
                                    border: 'none',
                                    background: activeTab === tabId ? themeColor : 'transparent',
                                    color: activeTab === tabId ? '#fff' : '#64748b',
                                    borderRadius: '14px',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: '700',
                                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                    transform: activeTab === tabId ? 'translateX(5px)' : 'none',
                                    boxShadow: activeTab === tabId ? `0 8px 20px ${themeColor}25` : 'none'
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
                                padding: '0.7rem 1.25rem',
                                border: 'none',
                                background: activeTab === tab.id ? (operationalHubTabs.some(o => o.id === tab.id) ? institutionOcre : deepTeal) : 'transparent',
                                color: activeTab === tab.id ? '#fff' : '#64748b',
                                borderRadius: '14px',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: '700',
                                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                transform: activeTab === tab.id ? 'translateX(5px)' : 'none',
                                boxShadow: activeTab === tab.id ? `0 8px 20px ${operationalHubTabs.some(o => o.id === tab.id) ? institutionOcre : deepTeal}25` : 'none'
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
                            
                            <button
                                onClick={() => {
                                    const newState = !isWebAdminOpen;
                                    setIsWebAdminOpen(newState);
                                    localStorage.setItem('zeticas_web_admin_open', JSON.stringify(newState));
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    width: '100%',
                                    padding: '0.8rem 1rem',
                                    marginTop: '0.5rem',
                                    border: 'none',
                                    background: 'transparent',
                                    color: deepTeal,
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    fontSize: '0.7rem',
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    opacity: 0.8
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <Globe size={14} /> Administración Web
                                </div>
                                {isWebAdminOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>

                            {isWebAdminOpen && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', paddingLeft: '0.5rem' }}>
                                    {webAdminTabs.map(tab => (
                                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.7rem 1rem', border: 'none', background: activeTab === tab.id ? 'rgba(214, 189, 152, 0.1)' : 'transparent', color: activeTab === tab.id ? institutionOcre : '#94a3b8', borderRadius: '12px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', transition: 'all 0.2s' }}>
                                            {tab.icon} {tab.label}
                                        </button>
                                    ))}
                                </div>
                            )}
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
                minWidth: 0,
                padding: isMobile ? '6rem 1rem 2rem' : '2rem 3vw', // Extra top padding on mobile for App Bar
                overflowY: 'auto',
                overflowX: 'hidden', 
                background: '#f8fafc',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(0,0,0,0.1) transparent',
                WebkitOverflowScrolling: 'touch'
            }}>
                <header style={{ 
                    display: 'flex', 
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between', 
                    alignItems: isMobile ? 'flex-start' : 'center', 
                    marginBottom: isMobile ? '1.5rem' : '3rem',
                    paddingBottom: isMobile ? '1.5rem' : '2rem',
                    borderBottom: '1px solid #e2e8f0',
                    gap: isMobile ? '1.5rem' : '0'
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
                                fontSize: isMobile ? '1.8rem' : '2.4rem', 
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
                                <p style={{ color: '#94a3b8', fontSize: isMobile ? '0.8rem' : '1rem', margin: 0, fontWeight: '600', maxWidth: isMobile ? '180px' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {activeTab === 'crm' ? 'Estrategia comercial y embudo de crecimiento' : 'Zeticas OS Management Console'}
                                </p>
                                <div style={{ height: '12px', width: '1px', background: '#cbd5e1' }} />
                                <div style={{ fontSize: '0.8rem', fontWeight: '500', color: '#94a3b8' }}>
                                    {lastUpdate ? `Actualizado: ${lastUpdate}` : 'Sincronizado'}
                                </div>
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
                    {activeTab === 'web_cms' && <CMSContents />}
                    {activeTab === 'web_shipping' && <ShippingAdmin />}
                    {activeTab === 'users_admin' && <UsersAdmin />}
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
