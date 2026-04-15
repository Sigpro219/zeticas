import React, { useState, useMemo } from 'react';
import { useCart } from '../context/CartContext';
import { useBusiness } from '../context/BusinessContext';
import { Search, ShoppingBag, ArrowRight, X } from 'lucide-react';

import { useMediaQuery } from '../hooks/useMediaQuery';

const OptimizedImage = ({ src, alt, className, style }) => {
    const [loaded, setLoaded] = useState(false);
    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#f0f0f0', borderRadius: 'inherit', overflow: 'hidden' }}>
            {!loaded && (
                <div className="skeleton-pulse" style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'linear-gradient(90deg, #f0f0f0 25%, #f8f8f8 50%, #f0f0f0 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'skeleton-shimmer 1.5s infinite linear'
                }}></div>
            )}
            <img
                src={src}
                alt={alt}
                loading="lazy"
                onLoad={() => setLoaded(true)}
                className={className}
                style={{
                    ...style,
                    opacity: loaded ? 1 : 0,
                    transition: 'opacity 0.5s ease-in-out',
                }}
            />
        </div>
    );
};

const Shop = () => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const isTablet = useMediaQuery('(max-width: 1024px)');
    const { addToCart } = useCart();
    const { items } = useBusiness();
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [activeCategory, setActiveCategory] = useState('Todos');
    const [searchTerm, setSearchTerm] = useState('');

    // Transform library items to Shop format
    const shopProducts = useMemo(() => {
        return items
            .filter(i => i.category === 'Producto Terminado' && (i.published !== false))
            .map(i => ({
                id: i.id,
                nombre: i.name,
                precio: i.price,
                categoria: i.product_type || 'Otros',
                imagen_url: i.image_url || '/assets/placeholder-jar.png',
                imagen_url_2: i.image_url_2 || null,
                descripcion: i.description || 'Nuestra selecta conserva artesanal diseñada para elevar tus experiencias culinarias.',
                beneficios: i.benefits || 'Ingredientes 100% naturales, sin conservantes artificiales.',
                sku: i.sku,
                published: i.published !== undefined ? i.published : true
            }));
    }, [items]);

    const handleAddToCart = (product, qty = 1) => {
        // Since useCart usually takes {id, nombre, precio, quantity}
        for(let i = 0; i < qty; i++) {
            addToCart(product);
        }
        // Simple notification or feedback could go here
    };
    const [activeImage, setActiveImage] = useState(0);

    const openQuickView = (product) => {
        setSelectedProduct(product);
        setQuantity(1);
        setActiveImage(0); // Reset to first image
    };

    const getThumbnailUrl = (url) => url;

    const filteredProducts = shopProducts.filter(p => {
        const matchesFilter = activeCategory === 'Todos' || p.categoria === activeCategory;
        const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    return (
        <div className="shop-page botanical-bg" style={{ 
            minHeight: '100vh', 
            padding: '4rem 0 8rem',
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
                    
                    {/* Refined Control Bar */}
                    <div className="shop-controls" style={{ 
                        display: 'flex', 
                        flexDirection: isMobile ? 'column' : 'row',
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        marginBottom: '4rem',
                        borderBottom: '1px solid rgba(0,0,0,0.05)',
                        paddingBottom: isMobile ? '1.5rem' : '0.5rem',
                        position: 'relative',
                        gap: isMobile ? '1.5rem' : '2rem'
                    }}>
                        <nav style={{ 
                            display: 'flex', 
                            gap: isMobile ? '1.5rem' : '3rem',
                            order: isMobile ? 2 : 1 
                        }}>
                            {['Todos', 'Dulce', 'Sal'].map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: activeCategory === cat ? 'var(--color-primary)' : '#999',
                                        fontSize: isMobile ? '0.8rem' : '0.9rem',
                                        fontWeight: activeCategory === cat ? '800' : '500',
                                        cursor: 'pointer',
                                        padding: '0.5rem 0',
                                        position: 'relative',
                                        transition: 'all 0.3s ease',
                                        letterSpacing: '0.1em',
                                        textTransform: 'uppercase'
                                    }}
                                >
                                    {cat}
                                    {activeCategory === cat && (
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

                        <div style={{ 
                            position: isMobile ? 'static' : 'absolute', 
                            right: isMobile ? 'auto' : 0,
                            display: 'flex', 
                            alignItems: 'center',
                            gap: '12px',
                            order: isMobile ? 1 : 2,
                            width: isMobile ? '100%' : 'auto',
                            justifyContent: isMobile ? 'center' : 'flex-end'
                        }}>
                            {(activeCategory !== 'Todos' || searchTerm) && (
                                <button 
                                    onClick={() => { setActiveCategory('Todos'); setSearchTerm(''); }}
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
                        <div key={product.id} className="premium-product-card" onClick={() => openQuickView(product)} style={{
                            background: 'rgba(255, 255, 255, 0.6)',
                            backdropFilter: 'blur(10px)',
                            padding: '1rem',
                            borderRadius: '24px',
                            border: '1px solid rgba(255, 255, 255, 0.4)',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                            position: 'relative',
                            overflow: 'hidden',
                            cursor: 'pointer'
                        }}>
                            <div style={{
                                aspectRatio: '1',
                                background: '#f8f4f2',
                                borderRadius: '18px',
                                marginBottom: '1.5rem',
                                overflow: 'hidden',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <OptimizedImage
                                    src={getThumbnailUrl(product.imagen_url)}
                                    alt={product.nombre}
                                    style={{ 
                                        width: '90%', 
                                        height: '90%', 
                                        objectFit: 'contain', 
                                        transition: 'transform 0.8s',
                                        margin: 'auto'
                                    }}
                                />
                                <div className="card-overlay">
                                    <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: '800', letterSpacing: '0.2em' }}>DETALLES</span>
                                </div>
                            </div>


                            <div style={{ padding: '0 0.5rem 1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                    <div>
                                        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--color-secondary)', fontWeight: '700' }}>{product.categoria}</span>
                                        <h3 className="font-serif" style={{ fontSize: '1.6rem', color: 'var(--color-primary)', margin: '0.2rem 0' }}>{product.nombre}</h3>
                                    </div>
                                    <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--color-primary)' }}>${product.precio.toLocaleString('es-CO')}</span>
                                </div>
                                <p style={{ fontSize: '0.85rem', color: 'rgba(0,0,0,0.6)', lineHeight: '1.6', marginBottom: '2rem', height: '2.8rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                    {product.descripcion}
                                </p>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}
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
                                        gap: '0.8rem'
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

            {/* PRODUCT QUICK VIEW MODAL */}
            {selectedProduct && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(2, 54, 54, 0.4)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem'
                }} onClick={() => setSelectedProduct(null)}>
                    <div style={{
                        background: '#fff',
                        width: '100%',
                        maxWidth: '1000px',
                        height: isMobile ? '100%' : 'auto',
                        maxHeight: isMobile ? '100vh' : '94vh',
                        borderRadius: isMobile ? '0' : '32px',
                        display: 'grid',
                        gridTemplateColumns: isTablet ? '1fr' : '1.2fr 1fr',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        position: 'relative',
                        boxShadow: '0 40px 100px -20px rgba(0,0,0,0.3)',
                        animation: 'modalFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                    }} onClick={e => e.stopPropagation()}>
                        
                        {/* Close Button */}
                        <button 
                            onClick={() => setSelectedProduct(null)}
                            style={{
                                position: 'absolute',
                                top: '1.5rem', right: '1.5rem',
                                background: 'white',
                                border: 'none',
                                width: '40px', height: '40px',
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                                zIndex: 10,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }}
                        >
                            <X size={20} color="var(--color-primary)" />
                        </button>

                        {/* LEFT: Image Section */}
                        <div style={{ 
                            background: '#f8f4f2', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            padding: isMobile ? '1.5rem' : '2rem', 
                            gap: '1.5rem',
                            borderBottom: isTablet ? '1px solid #eee' : 'none'
                        }}>
                            <div style={{ flex: 1, borderRadius: '24px', overflow: 'hidden', background: '#fff', position: 'relative', cursor: 'zoom-in' }} className="zoom-container">
                                <OptimizedImage 
                                    src={activeImage === 0 ? selectedProduct.imagen_url : selectedProduct.imagen_url_2} 
                                    alt={selectedProduct.nombre} 
                                    style={{ width: '100%', height: '100%', objectFit: 'contain', transition: 'transform 0.5s ease' }} 
                                    className="main-modal-img"
                                />
                            </div>
                            
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                {/* Thumb 1 */}
                                <div 
                                    onClick={() => setActiveImage(0)}
                                    style={{ 
                                        width: '74px', height: '74px', borderRadius: '12px', 
                                        border: activeImage === 0 ? '2px solid var(--color-primary)' : '1px solid #ddd', 
                                        padding: '4px', background: '#fff', cursor: 'pointer',
                                        transition: 'all 0.2s', transform: activeImage === 0 ? 'scale(1.05)' : 'scale(1)',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <OptimizedImage src={selectedProduct.imagen_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                                </div>
                                
                                {/* Thumb 2 */}
                                {selectedProduct.imagen_url_2 && (
                                    <div 
                                        onClick={() => setActiveImage(1)}
                                        style={{ 
                                            width: '74px', height: '74px', borderRadius: '12px', 
                                            border: activeImage === 1 ? '2px solid var(--color-primary)' : '1px solid #ddd', 
                                            padding: '4px', background: '#fff', cursor: 'pointer',
                                            transition: 'all 0.2s', transform: activeImage === 1 ? 'scale(1.05)' : 'scale(1)',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <OptimizedImage src={selectedProduct.imagen_url_2} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: Content Section */}
                        <div style={{ padding: isMobile ? '2rem 1.5rem 3rem' : '3.5rem 3rem', display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--color-secondary)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>
                                {selectedProduct.categoria}
                            </span>
                            <h2 className="font-serif" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: 'var(--color-primary)', lineHeight: 1.1, marginBottom: '1.5rem' }}>
                                {selectedProduct.nombre}
                            </h2>
                            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '2rem' }}>
                                ${selectedProduct.precio.toLocaleString('es-CO')}
                            </div>

                            <p style={{ color: '#555', lineHeight: 1.8, fontSize: '0.95rem', marginBottom: '2rem' }}>
                                {selectedProduct.descripcion}
                            </p>

                            <div style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem', marginBottom: '2.5rem' }}>
                                <h4 style={{ fontSize: '0.7rem', fontWeight: '900', color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.8rem' }}>Notas y Beneficios</h4>
                                <div style={{ 
                                    padding: '1.2rem', background: '#fcf8f6', borderRadius: '16px', borderLeft: '3px solid var(--color-secondary)',
                                    fontSize: '0.9rem', color: '#444', fontStyle: 'italic', lineHeight: 1.6 
                                }}>
                                    "{selectedProduct.beneficios}"
                                </div>
                            </div>

                            <div style={{ marginTop: 'auto', display: 'flex', flexWrap: 'wrap', gap: '1.2rem', alignItems: 'center' }}>
                                {/* Quantity Selector */}
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    background: '#f8f8f8', 
                                    borderRadius: '14px',
                                    padding: '0.4rem',
                                    border: '1px solid #eee',
                                    width: isMobile ? '100%' : 'auto',
                                    justifyContent: isMobile ? 'space-between' : 'flex-start'
                                }}>
                                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ border: 'none', background: 'none', width: '36px', height: '36px', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--color-primary)' }}>-</button>
                                    <span style={{ width: '40px', textAlign: 'center', fontWeight: '800', fontSize: '1.1rem' }}>{quantity}</span>
                                    <button onClick={() => setQuantity(quantity + 1)} style={{ border: 'none', background: 'none', width: '36px', height: '36px', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--color-primary)' }}>+</button>
                                </div>

                                <button
                                    onClick={() => { handleAddToCart(selectedProduct, quantity); setSelectedProduct(null); }}
                                    style={{
                                        flex: isMobile ? 'none' : 1,
                                        width: isMobile ? '100%' : 'auto',
                                        background: 'var(--color-primary)',
                                        color: '#fff',
                                        border: 'none',
                                        padding: '1.2rem',
                                        borderRadius: '16px',
                                        fontWeight: '800',
                                        fontSize: '0.85rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.1em',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease'
                                    }}
                                    className="modal-add-btn"
                                >
                                    Añadir a la Canasta
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .premium-product-card:hover {
                    background: rgba(255, 255, 255, 0.9);
                    transform: translateY(-8px);
                    box-shadow: 0 25px 50px -12px rgba(2, 83, 87, 0.15);
                }
                .premium-product-card:hover img {
                    transform: scale(1.05);
                }
                .card-overlay {
                    position: absolute;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(2, 54, 54, 0.15);
                    display: flex; align-items: center; justify-content: center;
                    opacity: 0; transition: opacity 0.5s ease;
                }
                .premium-product-card:hover .card-overlay {
                    opacity: 1;
                }
                .add-to-cart-btn:hover {
                    background: var(--color-secondary);
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px rgba(212, 120, 90, 0.2);
                }
                .zoom-container:hover .main-modal-img {
                    transform: scale(1.2);
                }
                .modal-add-btn:hover {
                    background: var(--color-secondary);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 16px rgba(212, 120, 90, 0.2);
                }
                @keyframes slideIn {
                    from { width: 0; }
                    to { width: 100%; }
                }
                @keyframes modalFadeIn {
                    from { opacity: 0; transform: scale(0.95) translateY(20px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes skeleton-shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>
        </div>
    );
};

export default Shop;
