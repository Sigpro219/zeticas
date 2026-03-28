import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useBusiness } from '../context/BusinessContext';
import { useCart } from '../context/CartContext';
import { Search, ShoppingBag, ArrowLeft, Plus, Minus, ShieldCheck, Zap } from 'lucide-react';
import SkeletonLoader from '../components/SkeletonLoader';

const ProductDetail = () => {
    const { id } = useParams();
    const { items } = useBusiness();
    const { addToCart } = useCart();
    const [quantity, setQuantity] = useState(1);
    const [isZoomed, setIsZoomed] = useState(false);
    const [activeImage, setActiveImage] = useState(0);
    const [mainImageLoaded, setMainImageLoaded] = useState(false);
    const [thumbsLoaded, setThumbsLoaded] = useState({ 0: false, 1: false });

    const getThumbnailUrl = (url) => url || '/assets/placeholder-jar.png';

    const product = useMemo(() => {
        if (!items || items.length === 0) return null;
        const found = items.find(p => p.id === id);
        if (!found) return null;
        return {
            id: found.id,
            nombre: found.name,
            precio: found.price || 0,
            categoria: found.product_type || 'Otros',
            imagen_url: found.image_url || '/assets/placeholder-jar.png',
            imagen_url_2: found.image_url_2 || null,
            descripcion: found.description || 'Nuestra selecta conserva artesanal diseñada para elevar tus experiencias culinarias.',
            beneficios: found.benefits || 'Ingredientes 100% naturales, sin conservantes artificiales.',
            sku: found.sku
        };
    }, [id, items]);

    const relatedProducts = useMemo(() => {
        if (!product || !items) return [];
        return items
            .filter(item => item.product_type === product.categoria && item.id !== id && item.category === 'Producto Terminado' && item.published !== false)
            .map(item => ({
                id: item.id,
                nombre: item.name,
                precio: item.price || 0,
                image_url: item.image_url || '/assets/placeholder-jar.png'
            }))
            .slice(0, 3);
    }, [product, items, id]);

    useEffect(() => {
        if (product) {
            window.scrollTo(0, 0);
        }
    }, [product]);

    if (!product) return null;

    const handleAddToCart = () => {
        for (let i = 0; i < quantity; i++) {
            addToCart(product);
        }
    };

    return (
        <div className="product-detail-page botanical-bg" style={{ minHeight: '100vh', padding: '8rem 0' }}>
            <div className="container">
                <Link to="/tienda" className="back-link" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                    marginBottom: '2rem',
                    fontWeight: 'bold'
                }}>
                    <ArrowLeft size={20} /> Volver a la Tienda
                </Link>

                <div className="product-main" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '4rem',
                    background: '#fff',
                    padding: '3rem',
                    borderRadius: '8px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.05)'
                }}>                    {/* Product Image with Zoom & Thumbnails */}
                    <div className="product-image-section">
                        <div
                            className="image-zoom-container"
                            style={{
                                position: 'relative',
                                overflow: 'hidden',
                                borderRadius: '24px',
                                cursor: 'zoom-in',
                                border: '1px solid #f0f0f0',
                                background: '#f8f4f2',
                                aspectRatio: '1/1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            onMouseEnter={() => setIsZoomed(true)}
                            onMouseLeave={() => setIsZoomed(false)}
                            onClick={() => setIsZoomed(!isZoomed)}
                        >
                            {!mainImageLoaded && (
                                <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                                    <SkeletonLoader width="100%" height="100%" borderRadius="24px" />
                                </div>
                            )}
                            
                            {/* Image 1 (Always pre-loaded) */}
                            <img
                                src={product.imagen_url}
                                alt={product.nombre}
                                fetchpriority="high"
                                onLoad={() => setMainImageLoaded(true)}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    display: activeImage === 0 ? 'block' : 'none',
                                    transition: 'all 0.4s ease',
                                    transform: isZoomed && activeImage === 0 ? 'scale(1.5)' : 'scale(1)',
                                    opacity: mainImageLoaded ? 1 : 0
                                }}
                            />

                            {/* Image 2 (Pre-loaded in background) */}
                            {product.imagen_url_2 && (
                                <img
                                    src={product.imagen_url_2}
                                    alt={product.nombre}
                                    onLoad={() => setThumbsLoaded(prev => ({ ...prev, 1: true }))}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain',
                                        display: activeImage === 1 ? 'block' : 'none',
                                        transition: 'all 0.4s ease',
                                        transform: isZoomed && activeImage === 1 ? 'scale(1.5)' : 'scale(1)',
                                        opacity: (mainImageLoaded && thumbsLoaded[1]) ? 1 : 0
                                    }}
                                />
                            )}

                            <div style={{
                                position: 'absolute',
                                bottom: '1rem',
                                right: '1rem',
                                background: 'rgba(255,255,255,0.8)',
                                padding: '0.5rem',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                                opacity: mainImageLoaded ? 1 : 0,
                                zIndex: 2
                            }}>
                                <Search size={20} color="var(--color-primary)" />
                            </div>
                        </div>

                        {/* Secondary Image Thumbnails */}
                        {product.imagen_url_2 && (
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'center' }}>
                                <button 
                                    onClick={() => setActiveImage(0)}
                                    style={{ 
                                        width: '70px', height: '70px', borderRadius: '12px', border: activeImage === 0 ? '2px solid var(--color-primary)' : '1px solid #ddd', 
                                        padding: '4px', background: '#fff', cursor: 'pointer', overflow: 'hidden', position: 'relative'
                                    }}
                                >
                                    {!thumbsLoaded[0] && <SkeletonLoader width="100%" height="100%" borderRadius="8px" />}
                                    <img 
                                        src={product.imagen_url} 
                                        onLoad={() => setThumbsLoaded(prev => ({ ...prev, 0: true }))}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', opacity: thumbsLoaded[0] ? 1 : 0 }} 
                                    />
                                </button>
                                <button 
                                    onClick={() => setActiveImage(1)}
                                    style={{ 
                                        width: '70px', height: '70px', borderRadius: '12px', border: activeImage === 1 ? '2px solid var(--color-primary)' : '1px solid #ddd', 
                                        padding: '4px', background: '#fff', cursor: 'pointer', overflow: 'hidden', position: 'relative'
                                    }}
                                >
                                    {!thumbsLoaded[1] && <SkeletonLoader width="100%" height="100%" borderRadius="8px" />}
                                    <img 
                                        src={product.imagen_url_2} 
                                        onLoad={() => setThumbsLoaded(prev => ({ ...prev, 1: true }))}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', opacity: thumbsLoaded[1] ? 1 : 0 }} 
                                    />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Product Info */}
                    <div className="product-info-section">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.2rem' }}>
                            <span style={{
                                textTransform: 'uppercase',
                                fontSize: '0.75rem',
                                letterSpacing: '0.2em',
                                color: 'var(--color-secondary)',
                                fontWeight: '800',
                                background: 'rgba(212, 120, 90, 0.1)',
                                padding: '4px 12px',
                                borderRadius: '20px'
                            }}>
                                {product.categoria}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 'bold' }}>SKU: {product.sku}</span>
                        </div>
                        
                        <h1 className="font-serif" style={{
                            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                            color: 'var(--color-primary)',
                            marginBottom: '1rem',
                            lineHeight: '1.1'
                        }}>
                            {product.nombre}
                        </h1>
                        
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '2.5rem' }}>
                            <p style={{
                                fontSize: '2.2rem',
                                fontWeight: '800',
                                color: 'var(--color-primary)',
                                margin: 0
                            }}>
                                ${product.precio.toLocaleString('es-CO')}
                            </p>
                            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>IVA Incluido</span>
                        </div>

                        <div style={{
                            padding: '1.5rem',
                            background: '#fcf8f6',
                            borderRadius: '20px',
                            borderLeft: '4px solid var(--color-secondary)',
                            marginBottom: '2.5rem'
                        }}>
                            <h4 style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--color-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Nuestra Nota</h4>
                            <p style={{ margin: 0, color: '#444', fontStyle: 'italic', fontSize: '1rem', lineHeight: '1.6' }}>
                                "{product.beneficios}"
                            </p>
                        </div>

                        <p style={{
                            fontSize: '1.1rem',
                            color: '#555',
                            lineHeight: '1.8',
                            marginBottom: '3rem'
                        }}>
                            {product.descripcion}
                        </p>

                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '3rem' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: '#f8f8f8',
                                borderRadius: '14px',
                                padding: '0.4rem',
                                border: '1px solid #eee'
                            }}>
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    style={{ border: 'none', background: 'none', width: '40px', height: '40px', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--color-primary)' }}
                                >
                                    -
                                </button>
                                <span style={{ width: '40px', textAlign: 'center', fontWeight: '800', fontSize: '1.1rem' }}>
                                    {quantity}
                                </span>
                                <button
                                    onClick={() => setQuantity(quantity + 1)}
                                    style={{ border: 'none', background: 'none', width: '40px', height: '40px', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--color-primary)' }}
                                >
                                    +
                                </button>
                            </div>
                            <button
                                onClick={handleAddToCart}
                                style={{
                                    flex: 1,
                                    background: 'var(--color-primary)',
                                    color: '#fff',
                                    padding: '1.2rem',
                                    borderRadius: '16px',
                                    fontWeight: '800',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.8rem',
                                    fontSize: '0.9rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em'
                                }}
                            >
                                <ShoppingBag size={20} /> Añadir a la Canasta
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid #eee', paddingTop: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                <ShieldCheck size={20} color="var(--color-secondary)" />
                                <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: '500' }}>Pago 100% Seguro</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                <Zap size={20} color="var(--color-secondary)" />
                                <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: '500' }}>Envío Express Nacional</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Related Products */}
                <div className="related-products" style={{ marginTop: '8rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--color-secondary)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Más de Zeticas</span>
                        <h2 className="font-serif" style={{
                            fontSize: '3rem',
                            color: 'var(--color-primary)',
                            marginTop: '0.5rem'
                        }}>
                            Te podría gustar
                        </h2>
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '3rem'
                    }}>
                        {relatedProducts.map(rp => (
                            <Link to={`/producto/${rp.id}`} key={rp.id} style={{ textDecoration: 'none' }}>
                                <div className="rp-card" style={{
                                    background: '#fff',
                                    padding: '1.2rem',
                                    borderRadius: '24px',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
                                    transition: 'all 0.3s ease',
                                    border: '1px solid #f1f5f9'
                                }}>
                                    <div style={{ aspectRatio: '1', borderRadius: '16px', overflow: 'hidden', background: '#f8f4f2', marginBottom: '1.5rem' }}>
                                            <img 
                                                src={getThumbnailUrl(rp.image_url)} 
                                                alt={rp.nombre} 
                                                loading="lazy"
                                                decoding="async"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'all 0.5s ease' }} 
                                            />
                                    </div>
                                    <h3 style={{ fontSize: '1.4rem', color: 'var(--color-primary)', margin: '0 0 0.5rem' }}>{rp.nombre}</h3>
                                    <p style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--color-primary)', margin: 0 }}>
                                        ${rp.precio.toLocaleString('es-CO')}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
                .image-zoom-container:hover img {
                    transform: scale(1.5);
                }
                .rp-card:hover {
                    transform: translateY(-8px);
                    box-shadow: 0 20px 40px rgba(0,0,0,0.08);
                    border-color: var(--color-sagelight);
                }
                .back-link:hover {
                    color: var(--color-secondary) !important;
                    transform: translateX(-5px);
                }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .product-detail-page { animation: fadeIn 0.6s ease; }
            `}} />
        </div>
    );
};

export default ProductDetail;
