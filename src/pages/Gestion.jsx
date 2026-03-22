import React, { useState } from 'react';
import { LayoutGrid, Package, ChefHat, ClipboardList, Truck, FileText, DollarSign, BarChart3, ShoppingCart, UserPlus, LogOut, Receipt, Database, ChevronDown, ChevronUp, Landmark, ShieldCheck, Zap, Activity } from 'lucide-react';
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

    const activeTab = tab || localStorage.getItem('zeticas_last_tab') || 'kanban';

    // Premium Branding Colors
    const deepTeal = "#023636";
    const institutionOcre = "#D4785A";
    const premiumSalmon = "#E29783";
    const glassWhite = "rgba(255, 255, 255, 0.9)";

    const isMasterDataTab = ['products', 'recipes', 'suppliers', 'clients', 'costs', 'banks'].includes(activeTab);
    const [isMasterDataOpen, setIsMasterDataOpen] = useState(() => {
        const savedState = localStorage.getItem('zeticas_master_data_open');
        return savedState !== null ? JSON.parse(savedState) : isMasterDataTab;
    });

    React.useEffect(() => {
        if (!tab) {
            navigate(`/gestion/${activeTab}`, { replace: true });
        } else {
            localStorage.setItem('zeticas_last_tab', tab);
        }
    }, [tab, activeTab, navigate]);

    React.useEffect(() => {
        if (['products', 'recipes', 'suppliers', 'clients', 'costs', 'banks'].includes(activeTab)) {
            setIsMasterDataOpen(true);
            localStorage.setItem('zeticas_master_data_open', 'true');
        }
    }, [activeTab]);

    const setActiveTab = (tabId) => {
        navigate(`/gestion/${tabId}`);
    };

    const mainTabs = [
        { id: 'kanban', label: 'Tablero Kanban', icon: <LayoutGrid size={18} /> },
        { id: 'orders', label: 'Pedidos / Ventas', icon: <FileText size={18} /> },
        { id: 'purchases', label: 'Compras / OC', icon: <ShoppingCart size={18} /> },
        { id: 'production', label: 'Producción / ODP', icon: <ChefHat size={18} /> },
        { id: 'inventory', label: 'Inventarios', icon: <Package size={18} /> },
        { id: 'shipping', label: 'Logística / Despachos', icon: <Truck size={18} /> },
        { id: 'cartera', label: 'Cartera / Cobro', icon: <DollarSign size={18} /> },
        { id: 'expenses', label: 'Gastos / PYG', icon: <Receipt size={18} /> },
        { id: 'reports', label: 'Reportes Dashboard', icon: <BarChart3 size={18} /> },
    ];

    const masterDataTabs = [
        { id: 'products', label: 'Productos / SKU', icon: <Package size={18} /> },
        { id: 'recipes', label: 'Recetas (BOM)', icon: <ChefHat size={18} /> },
        { id: 'clients', label: 'Clientes', icon: <UserPlus size={18} /> },
        { id: 'suppliers', label: 'Proveedores', icon: <ClipboardList size={18} /> },
        { id: 'costs', label: 'Costos', icon: <DollarSign size={18} /> },
        { id: 'banks', label: 'Bancos', icon: <Landmark size={18} /> },
    ];

    return (
        <div style={{ display: 'flex', minHeight: 'calc(100vh - 5rem)', background: '#f1f5f9' }}>
            {/* Premium Sidebar */}
            <aside style={{
                width: '300px',
                padding: '3rem 1.5rem',
                background: '#fff',
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100vh - 100px)',
                position: 'sticky',
                top: '100px',
                borderRight: '1px solid #e2e8f0',
                boxShadow: '10px 0 30px rgba(0,0,0,0.02)',
                zIndex: 100
            }}>
                <div style={{ marginBottom: '3rem', padding: '0 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: deepTeal, opacity: 0.4, marginBottom: '0.5rem' }}>
                        <Activity size={14} />
                        <span style={{ fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px' }}>Operational Hub</span>
                    </div>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1, overflowY: 'auto' }}>
                    {/* CRM Highlighted */}
                    <button
                        onClick={() => setActiveTab('crm')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '1.2rem 1.5rem',
                            border: 'none',
                            background: activeTab === 'crm' ? `linear-gradient(135deg, ${premiumSalmon}, #D4785A)` : 'rgba(212, 120, 90, 0.05)',
                            color: activeTab === 'crm' ? '#fff' : institutionOcre,
                            borderRadius: '20px',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            fontWeight: '900',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            marginBottom: '1rem',
                            boxShadow: activeTab === 'crm' ? `0 10px 25px ${institutionOcre}30` : 'none',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}
                    >
                        <Zap size={20} /> Commercial / CRM
                    </button>

                    <div style={{ padding: '0 1.2rem 0.5rem', opacity: 0.3 }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: '900', color: deepTeal, textTransform: 'uppercase', letterSpacing: '2px' }}>Value Stream</span>
                    </div>

                    {mainTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '1rem 1.5rem',
                                border: 'none',
                                background: activeTab === tab.id ? deepTeal : 'transparent',
                                color: activeTab === tab.id ? '#fff' : '#64748b',
                                borderRadius: '18px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: '900',
                                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                transform: activeTab === tab.id ? 'translateX(5px)' : 'none',
                                boxShadow: activeTab === tab.id ? `0 8px 20px ${deepTeal}25` : 'none'
                            }}
                        >
                            <span style={{ opacity: activeTab === tab.id ? 1 : 0.6 }}>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}

                    {/* Master Data */}
                    <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #f1f5f9' }}>
                        <button
                            onClick={() => setIsMasterDataOpen(!isMasterDataOpen)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                width: '100%',
                                padding: '1rem 1.5rem',
                                border: 'none',
                                background: 'rgba(2, 54, 54, 0.02)',
                                color: deepTeal,
                                borderRadius: '18px',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: '900',
                                textTransform: 'uppercase',
                                letterSpacing: '1px'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}><Database size={18}/> Master Data</div>
                            {isMasterDataOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>

                    {isMasterDataOpen && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem', paddingLeft: '0.5rem' }}>
                            {masterDataTabs.map(tab => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem 1.2rem', border: 'none', background: activeTab === tab.id ? 'rgba(214, 189, 152, 0.1)' : 'transparent', color: activeTab === tab.id ? institutionOcre : '#94a3b8', borderRadius: '15px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '900', transition: 'all 0.2s' }}>
                                    {tab.icon} {tab.label}
                                </button>
                            ))}
                        </div>
                    )}
                </nav>

                <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
                    <button onClick={() => { logout(); navigate('/'); }} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem', background: '#fff1f1', color: '#ef4444', borderRadius: '20px', border: 'none', width: '100%', fontWeight: '900', cursor: 'pointer', transition: 'all 0.3s' }} onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}>
                        <LogOut size={18} /> Logout Session
                    </button>
                </div>
            </aside>

            {/* Main Content Hub */}
            <main style={{ flex: 1, padding: '4rem 6rem', overflowY: 'auto', background: '#f8fafc' }}>
                <header style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '5rem',
                    paddingBottom: '3rem',
                    borderBottom: '1px solid #e2e8f0'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
                        <div style={{ 
                            width: '84px', 
                            height: '84px', 
                            borderRadius: '26px', 
                            background: activeTab === 'crm' ? premiumSalmon : deepTeal, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            boxShadow: `0 20px 40px ${activeTab === 'crm' ? institutionOcre : deepTeal}30`,
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 100%)' }} />
                            {(() => {
                                const IconComp = [...mainTabs, ...masterDataTabs, { id: 'crm', icon: <UserPlus size={42} /> }].find(t => t.id === activeTab)?.icon;
                                return IconComp ? React.cloneElement(IconComp, { size: 42, color: '#fff' }) : <Package size={42} color="#fff" />;
                            })()}
                        </div>
                        <div>
                            <h1 style={{ 
                                fontSize: '3.2rem', 
                                color: deepTeal, 
                                margin: 0,
                                fontWeight: '900',
                                letterSpacing: '-2px',
                                lineHeight: 1
                            }}>
                                {activeTab === 'crm' ? 'Commercial Engine' : (mainTabs.find(t => t.id === activeTab)?.label || masterDataTabs.find(t => t.id === activeTab)?.label || 'System Core').toUpperCase()}
                            </h1>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', marginTop: '0.8rem' }}>
                                <p style={{ color: '#94a3b8', fontSize: '1.2rem', margin: 0, fontWeight: '700' }}>
                                    {activeTab === 'crm' ? 'Estrategia comercial y embudo de crecimiento' : 'Zeticas OS Management Console'}
                                </p>
                                <div style={{ height: '14px', width: '1px', background: '#cbd5e1' }} />
                                <div style={{ fontSize: '0.8rem', fontWeight: '900', color: institutionOcre, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    {lastUpdate ? `Last Sync: ${lastUpdate}` : 'Real-time Active'}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                         <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '1rem 2rem', borderRadius: '22px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.6rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Security Rating</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: '900' }}>
                                <ShieldCheck size={18} /> AAA+
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
                    {activeTab === 'purchases' && <Purchases orders={orders} setOrders={setOrders} items={items} setItems={setItems} purchaseOrders={purchaseOrders} setPurchaseOrders={setPurchaseOrders} recipes={recipes} providers={providers} />}
                    {activeTab === 'production' && <Production orders={orders} setOrders={setOrders} items={items} setItems={setItems} recipes={recipes} />}
                    {activeTab === 'inventory' && <Inventory items={items} setItems={setItems} />}
                    {activeTab === 'orders' && <Sales orders={orders} setOrders={setOrders} />}
                    {activeTab === 'costs' && <Costs items={items} setItems={setItems} />}
                    {activeTab === 'expenses' && <Expenses expenses={expenses} setExpenses={setExpenses} orders={orders} purchaseOrders={purchaseOrders} banks={banks} setBanks={setBanks} />}
                    {activeTab === 'reports' && <Reports orders={orders} taxSettings={taxSettings} setTaxSettings={setTaxSettings} expenses={expenses} purchaseOrders={purchaseOrders} items={items} recipes={recipes} />}
                    {activeTab === 'shipping' && <Shipping orders={orders} setOrders={setOrders} items={items} setItems={setItems} />}
                    {activeTab === 'cartera' && <Cartera />}
                    {activeTab === 'banks' && <Banks />}
                </div>
            </main>

            <style>{`
                @keyframes fadeUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
                ::-webkit-scrollbar { width: 8px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.1); }
            `}</style>
        </div>
    );
};

export default Gestion;
