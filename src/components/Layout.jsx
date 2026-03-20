import React, { useState, useEffect } from 'react';
import { ShoppingCart, Menu, User, LogOut, Settings, LayoutDashboard } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
const logo = 'https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/assets/logo.png';

const Navbar = () => {
    const { cartCount } = useCart();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showUserMenu, setShowUserMenu] = useState(false);

    useEffect(() => {
        const handleClickOutside = () => setShowUserMenu(false);
        if (showUserMenu) {
            window.addEventListener('click', handleClickOutside);
        }
        return () => window.removeEventListener('click', handleClickOutside);
    }, [showUserMenu]);

    const handleLogout = () => {
        logout();
        setShowUserMenu(false);
        navigate('/');
    };

    return (
        <nav className="navbar navbar-dark" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 2rem',
            position: 'fixed',
            top: 0,
            width: '100%',
            height: '100px',
            zIndex: 1000,
            borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
            <div className="logo" style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                <Link to="/" style={{ height: '100%', display: 'flex', alignItems: 'center' }}>
                    <img src={logo} alt="Zeticas" style={{ height: '100%', width: 'auto', objectFit: 'contain', marginLeft: '4rem', marginTop: '-5px', transform: 'translateY(-2px)' }} />
                </Link>
            </div>
            <div className="nav-links" style={{ display: 'flex', gap: '2rem', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: '400', alignItems: 'center' }}>
                <Link to="/" style={{ textDecoration: 'none', color: '#fff' }}>Que Ofrecemos</Link>
                <Link to="/tienda" style={{ textDecoration: 'none', color: '#fff' }}>Tienda</Link>
                <Link to="/catering" style={{ textDecoration: 'none', color: '#fff' }}>Catering</Link>
                <Link to="/nosotros" style={{ textDecoration: 'none', color: '#fff' }}>Nosotros</Link>
                <Link to="/consultoria" style={{ textDecoration: 'none', color: '#fff' }}>Consultoría</Link>
                <Link to="/recurrentes" style={{
                    textDecoration: 'none',
                    color: '#1A3636',
                    background: '#D6BD98',
                    padding: '0.5rem 1.2rem',
                    borderRadius: '20px',
                    fontWeight: '700',
                    fontSize: '0.75rem',
                    textAlign: 'center',
                    lineHeight: '1.2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>Clientes<br />Recurrentes</Link>
            </div>
            <div className="nav-icons" style={{ display: 'flex', gap: '1.5rem', color: '#fff', alignItems: 'center', position: 'relative' }}>
                <div
                    style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {user ? (
                        /* LOGGED IN: Show toggle menu */
                        <>
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'inherit',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '0.5rem',
                                    position: 'relative'
                                }}
                            >
                                <User size={18} strokeWidth={1.5} />
                            </button>

                            {showUserMenu && (
                                <div style={{
                                    position: 'absolute', top: '45px', right: '-10px', background: '#fff',
                                    borderRadius: '12px', boxShadow: '0 15px 35px rgba(0,0,0,0.15)', width: '220px',
                                    padding: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px',
                                    zIndex: 2000, border: '1px solid #f1f5f9'
                                }}>
                                    <div style={{ padding: '0.5rem 0.8rem 1rem', borderBottom: '1px solid #f1f5f9', marginBottom: '0.5rem' }}>
                                        <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#1e293b' }}>{user.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{user.email}</div>
                                    </div>
                                    <Link to="/gestion" onClick={() => setShowUserMenu(false)} className="user-dropdown-link" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.7rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', color: '#004D4D', fontWeight: '700' }}>
                                        <LayoutDashboard size={16} color="#004D4D" /> <span style={{ color: '#004D4D', fontWeight: '700' }}>Panel de Gestión</span>
                                    </Link>
                                    <button onClick={handleLogout} className="user-dropdown-link logout-btn" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.7rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', width: '100%' }}>
                                        <LogOut size={14} /> Cerrar Sesión
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        /* NOT LOGGED IN: Direct link to login */
                        <Link
                            to="/login"
                            style={{
                                color: 'inherit',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0.5rem',
                                position: 'relative'
                            }}
                        >
                            <User size={18} strokeWidth={1.5} />
                        </Link>
                    )}
                </div>

                <Link to="/carrito" title="Ver Carrito" style={{ color: 'inherit', textDecoration: 'none', position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <ShoppingCart size={18} strokeWidth={1.5} />
                    {cartCount > 0 && (
                        <span style={{
                            position: 'absolute', top: '-8px', right: '-8px', background: 'var(--color-secondary)',
                            color: '#fff', fontSize: '0.66rem', padding: '2px 6px', borderRadius: '12px', fontWeight: 'bold'
                        }}>{cartCount}</span>
                    )}
                </Link>
                <div style={{ cursor: 'pointer' }}><Menu size={18} strokeWidth={1.5} /></div>
            </div>

            <style>{`
                .user-dropdown-link:hover { background-color: #f1f5f9 !important; }
                .nav-icons .user-dropdown-link { color: #004D4D !important; font-weight: 700 !important; }
                .nav-icons .user-dropdown-link.logout-btn { color: #ef4444 !important; }
            `}</style>
        </nav>
    );
};

const Footer = () => (
    <footer style={{ padding: '4rem 2rem', textAlign: 'center', backgroundColor: '#f9f9f9', marginTop: '4rem' }}>
        <p style={{ fontSize: '0.9rem', color: '#666' }}>© 2024 Zeticas. Sabana de Bogotá, Colombia.</p>
    </footer>
);

export default function Layout({ children }) {
    return (
        <div className="layout">
            <Navbar />
            <main style={{ paddingTop: '100px' }}>
                {children}
            </main>
            <Footer />
        </div>
    );
}
