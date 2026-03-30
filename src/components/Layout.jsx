import React, { useState, useEffect } from 'react';
import { ShoppingCart, Menu, User, LogOut, LayoutDashboard, Instagram, Mail, Phone, ChevronUp, Linkedin } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useBusiness } from '../context/BusinessContext';

const logo = '/logo.png';
const logoCZ = '/assets/logos/logo-cz.png';

const deepTeal = "#025357";
const institutionOcre = "#D6BD98";

const UtilityBar = ({ isConsulting, isMobile, contact }) => (
    <div style={{
        background: isConsulting ? '#f8f9fa' : 'var(--color-utility)',
        padding: isMobile ? '0 1.5rem' : '0 5%',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.75rem',
        fontWeight: '600',
        color: deepTeal,
        borderBottom: '1px solid rgba(2, 83, 87, 0.08)',
        zIndex: 1100
    }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.8rem' : '1.2rem' }}>
                {!isMobile && <span style={{ opacity: 0.6, fontSize: '0.7rem' }}>CONTACTO</span>}
                {contact?.instagram && <a href={contact.instagram} target="_blank" rel="noreferrer" style={{ color: 'inherit', display: 'flex' }}><Instagram size={14} /></a>}
                {contact?.phone && <a href={`https://wa.me/${contact.phone.replace(/\+/g, '')}`} target="_blank" rel="noreferrer" style={{ color: 'inherit', display: 'flex' }}><Phone size={14} /></a>}
                {contact?.email && <a href={`mailto:${contact.email}`} style={{ color: 'inherit', display: 'flex' }}><Mail size={14} /></a>}
                {contact?.linkedin && <a href={contact.linkedin} target="_blank" rel="noreferrer" style={{ color: 'inherit', display: 'flex' }}><Linkedin size={14} /></a>}
            </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '100%' }}>
            <div style={{ 
                display: 'flex', 
                background: '#eee', 
                borderRadius: '20px', 
                padding: '2px', 
                height: '28px',
                alignItems: 'center'
            }}>
                <Link to="/" style={{
                    padding: isMobile ? '0 8px' : '0 12px',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '18px',
                    textDecoration: 'none',
                    fontSize: '0.6rem',
                    letterSpacing: '0.5px',
                    background: !isConsulting ? deepTeal : 'transparent',
                    color: !isConsulting ? '#fff' : '#888',
                    fontWeight: !isConsulting ? '800' : '500'
                }}>
                    CONSERVAS
                </Link>
                <Link to="/consultoria" style={{
                    padding: isMobile ? '0 8px' : '0 12px',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '18px',
                    textDecoration: 'none',
                    fontSize: '0.6rem',
                    letterSpacing: '0.5px',
                    background: isConsulting ? institutionOcre : 'transparent',
                    color: isConsulting ? deepTeal : '#888',
                    fontWeight: isConsulting ? '800' : '500'
                }}>
                    CONSULTORÍA
                </Link>
            </div>
        </div>
    </div>
);

const Navbar = ({ isConsulting, isMobile }) => {
    const { cartCount } = useCart();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (!isMobile) setIsMobileMenuOpen(false);
    }, [isMobile]);

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
            width: '100%',
            height: isMobile ? '70px' : '85px',
            backgroundColor: isConsulting ? '#fff' : 'var(--color-primary)',
            borderBottom: isConsulting ? `4px solid ${institutionOcre}` : '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            transition: 'all 0.3s ease'
        }}>
            <div className="container" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                height: '100%',
                padding: isMobile ? '0 1.25rem' : '0 1.5rem'
            }}>
                <div className="logo" style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <Link to={isConsulting ? "/consultoria" : "/"} style={{ height: '100%', display: 'flex', alignItems: 'center', gap: '15px', textDecoration: 'none' }}>
                        <img src={isConsulting ? logoCZ : logo} alt={isConsulting ? "CZ" : "Zeticas"} style={{ 
                            height: isConsulting ? (isMobile ? '70%' : '90%') : (isMobile ? '45%' : '65%'), 
                            width: 'auto', 
                            objectFit: 'contain', 
                            filter: isConsulting ? 'none' : 'brightness(0) invert(1)'
                        }} />
                        {isConsulting && !isMobile && (
                            <div style={{ height: '35px', width: '1px', background: '#ddd' }}></div>
                        )}
                        {isConsulting && !isMobile && (
                            <span style={{ fontSize: '1.25rem', color: deepTeal, fontWeight: '800', letterSpacing: '1px' }}>Consultoría</span>
                        )}
                    </Link>
                </div>

                <div className="nav-right-section" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: isMobile ? '0.5rem' : '3.5rem' 
                }}>
                    {!isMobile && (
                        <div className="nav-links" style={{ 
                            display: 'flex', 
                            gap: '2.5rem', 
                            fontSize: '0.75rem', 
                            letterSpacing: '0.15em', 
                            textTransform: 'uppercase', 
                            fontWeight: '600', 
                            alignItems: 'center' 
                        }}>
                            {isConsulting ? (
                                <>
                                    <a href="/consultoria#inicio" style={{ textDecoration: 'none', color: deepTeal, opacity: 0.9 }}>Inicio</a>
                                    <a href="/consultoria#filosofia" style={{ textDecoration: 'none', color: deepTeal, opacity: 0.9 }}>Filosofía</a>
                                    <a href="/consultoria#apoyo" style={{ textDecoration: 'none', color: deepTeal, opacity: 0.9 }}>Servicios</a>
                                    <a href="/consultoria#impacto" style={{ textDecoration: 'none', color: deepTeal, opacity: 0.9 }}>Impacto</a>
                                    <a href="/consultoria#aliados" style={{ textDecoration: 'none', color: deepTeal, opacity: 0.9 }}>Aliados</a>
                                </>
                            ) : (
                                <>
                                    <Link to="/" style={{ textDecoration: 'none', color: '#fff', opacity: 0.9 }}>Inicio</Link>
                                    <Link to="/tienda" style={{ textDecoration: 'none', color: '#fff', opacity: 0.9 }}>Tienda</Link>
                                    <Link to="/catering" style={{ textDecoration: 'none', color: '#fff', opacity: 0.9 }}>Catering</Link>
                                    <Link to="/nosotros" style={{ textDecoration: 'none', color: '#fff', opacity: 0.9 }}>Nosotros</Link>
                                    <Link to="/consultoria" style={{ textDecoration: 'none', color: '#fff', opacity: 0.9 }}>Consultoría</Link>
                                    <Link to="/recurrentes" style={{
                                        textDecoration: 'none',
                                        color: '#fff',
                                        background: 'var(--color-secondary)',
                                        padding: '0.6rem 1.25rem',
                                        borderRadius: '50px',
                                        fontWeight: '800',
                                        fontSize: '0.7rem',
                                        marginLeft: '0.5rem'
                                    }}>RECURRENTES</Link>
                                </>
                            )}
                        </div>
                    )}

                    <div className="nav-icons" style={{ display: 'flex', gap: isMobile ? '0.4rem' : '1.2rem', color: isConsulting ? deepTeal : '#fff', alignItems: 'center' }}>
                    {!isConsulting && (
                        <Link to="/carrito" title="Ver Carrito" style={{ color: isConsulting ? deepTeal : '#fff', textDecoration: 'none', position: 'relative', display: 'flex', alignItems: 'center', padding: '0.5rem' }}>
                            <ShoppingCart size={18} strokeWidth={2} />
                            {cartCount > 0 && (
                                <span style={{
                                    position: 'absolute', top: '2px', right: '2px', background: 'var(--color-secondary)',
                                    color: '#fff', fontSize: '0.55rem', padding: '1px 5px', borderRadius: '10px', fontWeight: '900'
                                }}>{cartCount}</span>
                            )}
                        </Link>
                    )}

                    <div
                        style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {user ? (
                            <>
                                <button
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: isConsulting ? deepTeal : '#fff',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '0.5rem'
                                    }}
                                >
                                    <User size={18} strokeWidth={2} />
                                </button>

                                {showUserMenu && (
                                    <div style={{
                                        position: 'absolute', top: '50px', right: '-10px', background: '#fff',
                                        borderRadius: '12px', boxShadow: '0 15px 35px rgba(0,0,0,0.15)', width: '220px',
                                        padding: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px',
                                        zIndex: 2000, border: '1px solid #f1f5f9'
                                    }}>
                                        <div style={{ padding: '0.5rem 0.8rem 1rem', borderBottom: '1px solid #f1f5f9', marginBottom: '0.5rem' }}>
                                            <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#1e293b' }}>{user.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{user.email}</div>
                                        </div>
                                        <Link to="/gestion" onClick={() => setShowUserMenu(false)} className="user-dropdown-link" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.7rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', color: '#025357', fontWeight: '700' }}>
                                            <LayoutDashboard size={16} color="#025357" /> <span>Panel de Gestión</span>
                                        </Link>
                                        <button onClick={handleLogout} className="user-dropdown-link logout-btn" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.7rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', width: '100%' }}>
                                            <LogOut size={14} /> Cerrar Sesión
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <Link to="/login" style={{ color: isConsulting ? deepTeal : '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', padding: '0.5rem' }}>
                                <User size={18} strokeWidth={2} />
                            </Link>
                        )}
                    </div>

                        {isMobile && (
                            <button 
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                style={{ background: 'none', border: 'none', color: isConsulting ? deepTeal : '#fff', cursor: 'pointer', padding: '0.5rem' }}
                            >
                                <Menu size={20} strokeWidth={2} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Menu Drawer */}
            {isMobile && isMobileMenuOpen && (
                <div style={{
                    position: 'fixed',
                    top: '110px',
                    left: 0,
                    width: '100%',
                    height: 'calc(100vh - 110px)',
                    background: isConsulting ? '#fff' : 'var(--color-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '2rem 1.5rem',
                    gap: '1.2rem',
                    zIndex: 2000,
                    animation: 'fadeIn 0.3s ease',
                    overflowY: 'auto',
                    borderTop: isConsulting ? `1px solid ${institutionOcre}` : 'none'
                }}>
                    {isConsulting ? (
                        <>
                            <a href="/consultoria#inicio" onClick={() => setIsMobileMenuOpen(false)} style={{ textDecoration: 'none', color: deepTeal, fontSize: '1.1rem', fontWeight: '800', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.8rem' }}>Inicio</a>
                            <a href="/consultoria#filosofia" onClick={() => setIsMobileMenuOpen(false)} style={{ textDecoration: 'none', color: deepTeal, fontSize: '1.1rem', fontWeight: '800', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.8rem' }}>Filosofía</a>
                            <a href="/consultoria#apoyo" onClick={() => setIsMobileMenuOpen(false)} style={{ textDecoration: 'none', color: deepTeal, fontSize: '1.1rem', fontWeight: '800', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.8rem' }}>Servicios</a>
                            <a href="/consultoria#impacto" onClick={() => setIsMobileMenuOpen(false)} style={{ textDecoration: 'none', color: deepTeal, fontSize: '1.1rem', fontWeight: '800', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.8rem' }}>Impacto</a>
                            <a href="/consultoria#aliados" onClick={() => setIsMobileMenuOpen(false)} style={{ textDecoration: 'none', color: deepTeal, fontSize: '1.1rem', fontWeight: '800', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.8rem' }}>Aliados</a>
                        </>
                    ) : (
                        <>
                            <Link to="/" onClick={() => setIsMobileMenuOpen(false)} style={{ textDecoration: 'none', color: '#fff', fontSize: '1.1rem', fontWeight: '600', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.8rem' }}>Inicio</Link>
                            <Link to="/tienda" onClick={() => setIsMobileMenuOpen(false)} style={{ textDecoration: 'none', color: '#fff', fontSize: '1.1rem', fontWeight: '600', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.8rem' }}>Tienda</Link>
                            <Link to="/catering" onClick={() => setIsMobileMenuOpen(false)} style={{ textDecoration: 'none', color: '#fff', fontSize: '1.1rem', fontWeight: '600', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.8rem' }}>Catering</Link>
                            <Link to="/nosotros" onClick={() => setIsMobileMenuOpen(false)} style={{ textDecoration: 'none', color: '#fff', fontSize: '1.1rem', fontWeight: '600', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.8rem' }}>Nosotros</Link>
                            <Link to="/consultoria" onClick={() => setIsMobileMenuOpen(false)} style={{ textDecoration: 'none', color: '#fff', fontSize: '1.1rem', fontWeight: '600', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.8rem' }}>Consultoría</Link>
                            <Link to="/recurrentes" onClick={() => setIsMobileMenuOpen(false)} style={{ 
                                textDecoration: 'none', 
                                color: deepTeal, 
                                background: institutionOcre,
                                padding: '1rem',
                                borderRadius: '50px',
                                textAlign: 'center',
                                fontWeight: '900',
                                fontSize: '0.9rem',
                                marginTop: '1rem',
                                letterSpacing: '1px'
                            }}>CLIENTES RECURRENTES</Link>
                        </>
                    )}
                </div>
            )}

            <style>{`
                .user-dropdown-link:hover { background-color: #f1f5f9 !important; }
                .nav-icons .user-dropdown-link { color: #025357 !important; font-weight: 700 !important; }
                .nav-icons .user-dropdown-link.logout-btn { color: #ef4444 !important; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </nav>
    );
};

const Footer = ({ isConsulting, isMobile, contact }) => (
    <footer style={{ 
        padding: isMobile ? '2.5rem 1.5rem' : '6rem 5%', 
        backgroundColor: isConsulting ? institutionOcre : 'var(--color-primary)', 
        color: isConsulting ? deepTeal : '#fff',
        borderTop: isConsulting ? `1px solid rgba(2, 83, 87, 0.1)` : 'none'
    }}>
        <div className="container" style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: isMobile ? '1.8rem' : '4rem', 
            textAlign: isMobile ? 'center' : 'left' 
        }}>
            <div style={{ maxWidth: '350px', margin: isMobile ? '0 auto' : '0' }}>
                <img src={isConsulting ? logoCZ : logo} alt="Zeticas" style={{ 
                    height: isConsulting ? '50px' : '40px', 
                    margin: isMobile ? '0 auto 1.2rem' : '0 0 1.5rem',
                    display: 'block',
                    filter: isConsulting ? 'none' : 'brightness(0) invert(1)' 
                }} />
                {isConsulting && (
                    <div style={{ fontSize: '1.1rem', color: deepTeal, fontWeight: '800', marginBottom: '1.2rem', letterSpacing: '1px' }}>
                        Consultoría
                    </div>
                )}
                <p style={{ fontSize: '0.85rem', color: isConsulting ? '#555' : 'rgba(255,255,255,0.7)', lineHeight: '1.8' }}>Exaltando los ecosistemas colombianos a través de productos agroecológicos de alta calidad.</p>
            </div>
            <div>
                <h4 className="font-serif" style={{ fontSize: '1.1rem', marginBottom: isMobile ? '1rem' : '1.5rem', color: isConsulting ? deepTeal : '#fff' }}>Navegación</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <Link to="/tienda" style={{ color: isConsulting ? `${deepTeal}aa` : 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: '0.85rem' }}>Tienda</Link>
                    <Link to="/nosotros" style={{ color: isConsulting ? `${deepTeal}aa` : 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: '0.85rem' }}>Nuestra Historia</Link>
                    <Link to="/catering" style={{ color: isConsulting ? `${deepTeal}aa` : 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: '0.85rem' }}>Catering</Link>
                    <Link to="/consultoria" style={{ color: isConsulting ? `${deepTeal}aa` : 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: '0.85rem' }}>Consultoría</Link>
                </div>
            </div>
            <div>
                <h4 className="font-serif" style={{ fontSize: '1.1rem', marginBottom: isMobile ? '1rem' : '1.5rem', color: isConsulting ? deepTeal : '#fff' }}>Ubicación</h4>
                <p style={{ fontSize: '0.85rem', color: isConsulting ? `${deepTeal}99` : 'rgba(255,255,255,0.7)', marginBottom: '0.4rem' }}>Guasca, Cundinamarca</p>
                <p style={{ fontSize: '0.85rem', color: isConsulting ? `${deepTeal}99` : 'rgba(255,255,255,0.7)', marginBottom: isMobile ? '1rem' : '1.5rem' }}>Finca Mingalaba</p>
                <div style={{ display: 'flex', gap: '1.5rem', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                    {contact?.instagram && <a href={contact.instagram} target="_blank" rel="noreferrer" style={{ color: isConsulting ? deepTeal : '#fff', opacity: 0.8 }}><Instagram size={18} /></a>}
                    {contact?.email && <a href={`mailto:${contact.email}`} style={{ color: isConsulting ? deepTeal : '#fff', opacity: 0.8 }}><Mail size={18} /></a>}
                    {contact?.phone && <a href={`https://wa.me/${contact.phone.replace(/\+/g, '')}`} target="_blank" rel="noreferrer" style={{ color: isConsulting ? deepTeal : '#fff', opacity: 0.8 }}><Phone size={18} /></a>}
                    {contact?.linkedin && <a href={contact.linkedin} target="_blank" rel="noreferrer" style={{ color: isConsulting ? deepTeal : '#fff', opacity: 0.8 }}><Linkedin size={18} /></a>}
                </div>
            </div>
        </div>
        <div style={{ borderTop: isConsulting ? `1px solid rgba(2, 83, 87, 0.1)` : '1px solid rgba(255,255,255,0.1)', marginTop: isMobile ? '2rem' : '3rem', paddingTop: '1.5rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: isConsulting ? deepTeal : 'rgba(255,255,255,0.5)', opacity: 0.6 }}>© 2026 Zeticas. Sabana de Bogotá, Colombia.</p>
        </div>
    </footer>
);

export default function Layout({ children }) {
    const location = useLocation();
    const isConsulting = location.pathname.toLowerCase().includes('consultoria');
    const isGestion = location.pathname.toLowerCase().includes('gestion');
    const isMobile = useMediaQuery('(max-width: 992px)');
    
    const { siteContent } = useBusiness();
    const contact = siteContent?.web_shipping ? {
        instagram: siteContent.web_shipping.contact_instagram,
        email: siteContent.web_shipping.contact_email,
        phone: siteContent.web_shipping.contact_phone,
        linkedin: siteContent.web_shipping.contact_linkedin
    } : null;
    
    return (
        <div className="layout">
            <header style={{ position: 'fixed', top: 0, width: '100%', zIndex: 1200 }}>
                {!isGestion && <UtilityBar isMobile={isMobile} isConsulting={isConsulting} contact={contact} />}
                <Navbar isMobile={isMobile} isConsulting={isConsulting} />
            </header>
            <main style={{ paddingTop: isGestion ? (isMobile ? '70px' : '85px') : (isMobile ? '110px' : '125px') }}>
                {children}
            </main>
            {!isGestion && <Footer isMobile={isMobile} isConsulting={isConsulting} contact={contact} />}
            {!isGestion && <FloatingButtons isMobile={isMobile} />}
        </div>
    );
}

const FloatingButtons = ({ isMobile }) => {
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => setShowScrollTop(window.scrollY > 400);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    if (!showScrollTop) return null;

    return (
        <button
            onClick={scrollToTop}
            style={{
                position: 'fixed',
                bottom: isMobile ? '20px' : '30px',
                right: isMobile ? '20px' : '30px',
                backgroundColor: '#fff',
                color: 'var(--color-primary)',
                width: isMobile ? '45px' : '50px',
                height: isMobile ? '45px' : '50px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                zIndex: 2000,
                transition: 'all 0.3s ease'
            }}
        >
            <ChevronUp size={isMobile ? 20 : 24} />
        </button>
    );
};
