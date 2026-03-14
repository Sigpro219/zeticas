import React, { useState } from 'react';
import { LayoutGrid, Package, ChefHat, ClipboardList, Truck, FileText, DollarSign, BarChart3, ShoppingCart, UserPlus, LogOut, Receipt, Database, ChevronDown, ChevronUp, Landmark } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
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
    const { logout } = useAuth();
    const {
        items, setItems,
        orders, setOrders,
        expenses, setExpenses,
        purchaseOrders, setPurchaseOrders,
        banks, setBanks,
        taxSettings, setTaxSettings,
        recipes, providers
    } = useBusiness();

    const [activeTab, setActiveTab] = useState(() => {
        return localStorage.getItem('zeticas_active_tab') || 'kanban';
    });

    // Auto-open master data menu if the active tab belongs to it
    const isMasterDataTab = ['products', 'recipes', 'suppliers', 'clients', 'costs', 'banks'].includes(activeTab);
    const [isMasterDataOpen, setIsMasterDataOpen] = useState(() => {
        const savedState = localStorage.getItem('zeticas_master_data_open');
        return savedState !== null ? JSON.parse(savedState) : isMasterDataTab;
    });

    React.useEffect(() => {
        localStorage.setItem('zeticas_active_tab', activeTab);
        if (['products', 'recipes', 'suppliers', 'clients', 'costs', 'banks'].includes(activeTab)) {
            setIsMasterDataOpen(true);
            localStorage.setItem('zeticas_master_data_open', 'true');
        }
    }, [activeTab]);

    const handleToggleMasterData = () => {
        const newState = !isMasterDataOpen;
        setIsMasterDataOpen(newState);
        localStorage.setItem('zeticas_master_data_open', JSON.stringify(newState));
    };

    const mainTabs = [
        { id: 'kanban', label: 'Tablero Kanban', icon: <LayoutGrid size={18} /> },
        { id: 'orders', label: 'Pedidos', icon: <FileText size={18} /> },
        { id: 'purchases', label: 'Compras', icon: <ShoppingCart size={18} /> },
        { id: 'production', label: 'Producción', icon: <ChefHat size={18} /> },
        { id: 'inventory', label: 'Inventarios', icon: <Package size={18} /> },
        { id: 'shipping', label: 'Logística / Despachos', icon: <Truck size={18} /> },
        { id: 'cartera', label: 'Cartera', icon: <DollarSign size={18} /> },
        { id: 'expenses', label: 'Gastos / PYG', icon: <Receipt size={18} /> },
        { id: 'reports', label: 'Informes de Gestión', icon: <BarChart3 size={18} /> },
    ];

    const masterDataTabs = [
        { id: 'products', label: 'Productos / SKU', icon: <Package size={18} /> },
        { id: 'recipes', label: 'Recetas (BOM)', icon: <ChefHat size={18} /> },
        { id: 'suppliers', label: 'Proveedores', icon: <ClipboardList size={18} /> },
        { id: 'clients', label: 'Clientes', icon: <UserPlus size={18} /> },
        { id: 'costs', label: 'Costos', icon: <DollarSign size={18} /> },
        { id: 'banks', label: 'Bancos', icon: <Landmark size={18} /> },
    ];

    return (
        <div className="gestion-container" style={{ display: 'flex', minHeight: 'calc(100vh - 5rem)' }}>
            {/* Sidebar */}
            <aside style={{
                width: '260px',
                borderRight: '1px solid #eee',
                padding: '2rem 1rem',
                backgroundColor: '#fafafa',
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100vh - 100px)',
                position: 'sticky',
                top: '100px',
                overflowY: 'auto'
            }}>
                <button
                    onClick={() => setActiveTab('crm')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        border: 'none',
                        background: activeTab === 'crm' ? 'var(--color-primary)' : 'var(--color-secondary)',
                        color: '#fff',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        marginBottom: '1.5rem',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                >
                    <UserPlus size={20} />
                    Comercial / CRM
                </button>

                <h2 className="font-serif" style={{ fontSize: '1.2rem', marginBottom: '1rem', paddingLeft: '0.5rem' }}>Operaciones</h2>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {mainTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem 1rem',
                                border: 'none',
                                background: activeTab === tab.id ? 'var(--color-primary)' : 'transparent',
                                color: activeTab === tab.id ? '#fff' : 'var(--color-text)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '0.9rem',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}

                    {/* Master Data Collapsible */}
                    <button
                        onClick={() => setIsMasterDataOpen(!isMasterDataOpen)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--color-text)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            marginTop: '0.5rem',
                            borderTop: '1px solid #eee',
                            paddingTop: '1rem'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Database size={18} />
                            DATOS MAESTROS
                        </div>
                        {isMasterDataOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {isMasterDataOpen && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', paddingLeft: '1rem' }}>
                            {masterDataTabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.6rem 1rem',
                                        border: 'none',
                                        background: activeTab === tab.id ? 'var(--color-primary)' : 'transparent',
                                        color: activeTab === tab.id ? '#fff' : '#64748b',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        fontSize: '0.85rem',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    )}
                </nav>
                <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
                    <button
                        onClick={() => { logout(); navigate('/'); }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            border: '1px solid #fee2e2',
                            background: '#fff',
                            color: '#ef4444',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: '0.9rem',
                            width: '100%',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#fef2f2'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#fff'}
                    >
                        <LogOut size={18} />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, padding: '2rem', overflowY: 'auto', background: '#fff' }}>
                {activeTab === 'crm' && <CRM />}
                {activeTab === 'kanban' && <Kanban orders={orders} items={items} />}
                {activeTab === 'products' && <Products />}
                {activeTab === 'recipes' && <Recipes />}
                {activeTab === 'suppliers' && <Suppliers items={items} setItems={setItems} />}
                {activeTab === 'clients' && <Clients />}
                {activeTab === 'purchases' && <Purchases orders={orders} setOrders={setOrders} items={items} setItems={setItems} purchaseOrders={purchaseOrders} setPurchaseOrders={setPurchaseOrders} recipes={recipes} providers={providers} />}
                {activeTab === 'production' && <Production orders={orders} setOrders={setOrders} items={items} setItems={setItems} />}
                {activeTab === 'inventory' && <Inventory items={items} setItems={setItems} />}
                {activeTab === 'orders' && <Sales orders={orders} setOrders={setOrders} />}
                {activeTab === 'costs' && <Costs items={items} setItems={setItems} />}
                {activeTab === 'expenses' && <Expenses expenses={expenses} setExpenses={setExpenses} orders={orders} purchaseOrders={purchaseOrders} banks={banks} setBanks={setBanks} />}
                {activeTab === 'reports' && <Reports orders={orders} taxSettings={taxSettings} setTaxSettings={setTaxSettings} expenses={expenses} purchaseOrders={purchaseOrders} />}
                {activeTab === 'shipping' && <Shipping orders={orders} setOrders={setOrders} items={items} setItems={setItems} />}
                {activeTab === 'cartera' && <Cartera />}
                {activeTab === 'banks' && <Banks />}
            </main>
        </div>
    );
};

export default Gestion;
