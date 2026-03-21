import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { products } from '../data/products';
import { Search, ShoppingBag, ArrowRight, X } from 'lucide-react';

const Shop = () => {
    const { addToCart } = useCart();
    const navigate = useNavigate();
    const [filter, setFilter] = useState('Todos');
    const [searchTerm, setSearchTerm] = useState('');

    // Optimization: Supabase Image Transformation
    const getThumbnailUrl = (url) => {
        // Reverting to direct link as render/image/public is failing
        return url;
    };

    const handleAddToCart = (product) => {
        addToCart(product);
        navigate('/carrito');
    };

    const handleProductClick = (id) => {
        navigate(`/producto/${id}`);
    };

    const filteredProducts = products.filter(p => {
        const matchesFilter = filter === 'Todos' || p.categoria === filter;
        const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    return (
        <div className="shop-page botanical-bg" style={{ 
            minHeight: '100vh', 
            padding: '8rem 0',
            backgroundColor: '#FDF8F6',
            position: 'relative'
        }}>
            {/* Background Texture Overlay */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundImage: 'url(/assets/botanical_pattern.png)',
                opacity: 0.05,
                zIndex: 0,
                pointerEvents: 'none'
            }}></div>

            <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                <header style={{ textAlign: 'center', marginBottom: '6rem' }}>
                    <span style={{ 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.3em', 
                        fontSize: '0.8rem', 
                        color: 'var(--color-secondary)',
                        fontWeight: '700',
                        display: 'block',
                        marginBottom: '1.5rem'
                    }}>
                        Colección Artesanal
                    </span>
                    <h1 className="font-serif" style={{ 
                        color: 'var(--color-primary)', 
                        fontSize: 'clamp(3rem, 10vw, 5.5rem)', 
                        marginBottom: '3.5rem',
                        lineHeight: 1
                    }}>
                        Nuestra Despensa
                    </h1>
                    
                    {/* Refined Control Bar: Filters (Center) + Integrated Search & Clear (Right) */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        marginBottom: '4rem',
                        borderBottom: '1px solid rgba(0,0,0,0.05)',
                        paddingBottom: '0.5rem',
                        position: 'relative',
                        gap: '2rem'
                    }}>
                        {/* Centered Filter Categories */}
                        <nav style={{ display: 'flex', gap: '3rem' }}>
                            {['Todos', 'Dulce', 'Sal'].map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setFilter(cat)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: filter === cat ? 'var(--color-primary)' : '#999',
                                        fontSize: '0.9rem',
                                        fontWeight: filter === cat ? '800' : '500',
                                        cursor: 'pointer',
                                        padding: '0.5rem 0',
                                        position: 'relative',
                                        transition: 'all 0.3s ease',
                                        letterSpacing: '0.1em',
                                        textTransform: 'uppercase'
                                    }}
                                >
                                    {cat}
                                    {filter === cat && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '-1px',
                                            left: 0,
                                            width: '100%',
                                            height: '2.5px',
                                            backgroundColor: 'var(--color-primary)',
                                            animation: 'slideIn 0.3s ease'
                                        }}></div>
                                    )}
                                </button>
                            ))}
                        </nav>

                        {/* Integrated Search & Clear Action (Right side absolute or flex) */}
                        <div style={{ 
                            position: 'absolute', 
                            right: 0,
                            display: 'flex', 
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            {(filter !== 'Todos' || searchTerm) && (
                                <button 
                                    onClick={() => { setFilter('Todos'); setSearchTerm(''); }}
                                    style={{
                                        background: 'rgba(2, 83, 87, 0.05)', border: 'none', 
                                        color: 'var(--color-primary)',
                                        width: '24px', height: '24px', borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', opacity: 0.7
                                    }}
                                    title="Limpiar filtros"
                                >
                                    <X size={14} />
                                </button>
                            )}
                            <div style={{ position: 'relative', width: '180px' }}>
                                <Search size={14} style={{ position: 'absolute', right: '0rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-primary)', opacity: 0.5 }} />
                                <input
                                    type="text"
                                    placeholder="Buscar sabor..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem 1.5rem 0.5rem 0',
                                        border: 'none',
                                        background: 'transparent',
                                        outline: 'none',
                                        fontSize: '0.85rem',
                                        textAlign: 'right',
                                        color: 'var(--color-primary)',
                                        fontWeight: '600'
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </header>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '3.5rem'
                }}>
                    {filteredProducts.map((product) => (
                        <div key={product.id} className="premium-product-card" style={{
                            background: 'rgba(255, 255, 255, 0.6)',
                            backdropFilter: 'blur(10px)',
                            padding: '1rem',
                            borderRadius: '24px',
                            border: '1px solid rgba(255, 255, 255, 0.4)',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            {/* Product Image Stage */}
                            <div 
                                onClick={() => handleProductClick(product.id)}
                                style={{
                                    aspectRatio: '1',
                                    background: '#f8f4f2',
                                    borderRadius: '18px',
                                    marginBottom: '1.5rem',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <img
                                    src={getThumbnailUrl(product.imagen_url)}
                                    alt={product.nombre}
                                    loading="lazy"
                                    decoding="async"
                                    style={{ 
                                        width: '100%', 
                                        height: '100%', 
                                        objectFit: 'cover', 
                                        transition: 'transform 0.8s cubic-bezier(0.165, 0.84, 0.44, 1)' 
                                    }}
                                />
                                <div className="card-overlay">
                                    <ShoppingBag size={24} color="#fff" />
                                </div>
                            </div>

                            {/* Info Block */}
                            <div style={{ padding: '0 0.5rem 1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                    <div>
                                        <span style={{ 
                                            fontSize: '0.65rem', 
                                            textTransform: 'uppercase', 
                                            letterSpacing: '0.2em', 
                                            color: 'var(--color-secondary)',
                                            fontWeight: '700' 
                                        }}>
                                            {product.categoria}
                                        </span>
                                        <h3 className="font-serif" style={{ 
                                            fontSize: '1.6rem', 
                                            color: 'var(--color-primary)', 
                                            margin: '0.2rem 0',
                                            cursor: 'pointer' 
                                        }} onClick={() => handleProductClick(product.id)}>
                                            {product.nombre}
                                        </h3>
                                    </div>
                                    <span style={{ 
                                        fontSize: '1.25rem', 
                                        fontWeight: '800', 
                                        color: 'var(--color-primary)' 
                                    }}>
                                        ${product.precio.toLocaleString('es-CO')}
                                    </span>
                                </div>
                                
                                <p style={{ 
                                    fontSize: '0.85rem', 
                                    color: 'rgba(0,0,0,0.6)', 
                                    lineHeight: '1.6',
                                    marginBottom: '2rem',
                                    height: '2.8rem',
                                    overflow: 'hidden',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical'
                                }}>
                                    {product.descripcion}
                                </p>

                                <button
                                    onClick={() => handleAddToCart(product)}
                                    style={{
                                        width: '100%',
                                        background: 'var(--color-primary)',
                                        color: '#fff',
                                        border: 'none',
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        fontWeight: '800',
                                        fontSize: '0.75rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.15em',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.8rem',
                                        transition: 'all 0.3s ease'
                                    }}
                                    className="add-to-cart-btn"
                                >
                                    Añadir a la Canasta
                                    <ArrowRight size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                .premium-product-card:hover {
                    background: rgba(255, 255, 255, 0.9);
                    transform: translateY(-8px);
                    box-shadow: 0 25px 50px -12px rgba(2, 83, 87, 0.15);
                }
                .premium-product-card:hover img {
                    transform: scale(1.1);
                }
                .card-overlay {
                    position: absolute;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(2, 83, 87, 0.3);
                    display: flex; align-items: center; justify-content: center;
                    opacity: 0; transition: opacity 0.5s ease;
                }
                .premium-product-card:hover .card-overlay {
                    opacity: 1;
                }
                .add-to-cart-btn:hover {
                    background: var(--color-secondary);
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px rgba(243, 124, 121, 0.2);
                }
                @keyframes slideIn {
                    from { width: 0; }
                    to { width: 100%; }
                }
            `}</style>
        </div>
    );
};

export default Shop;
