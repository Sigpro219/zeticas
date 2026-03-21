import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { products } from '../data/products';
import { useCart } from '../context/CartContext';
import { Search, ShoppingCart, ArrowLeft, Plus, Minus } from 'lucide-react';

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const [product, setProduct] = useState(null);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [quantity, setQuantity] = useState(1);
    const [isZoomed, setIsZoomed] = useState(false);

    // Optimization: Supabase Image Transformation helper
    const getOptimizedUrl = (url) => {
        // Reverting to direct link as render/image/public is failing
        return url;
    };

    useEffect(() => {
        const foundProduct = products.find(p => p.id === id);
        if (foundProduct) {
            setProduct(foundProduct);
            // Related products: same category, different ID
            const related = products.filter(p => p.categoria === foundProduct.categoria && p.id !== id).slice(0, 4);
            setRelatedProducts(related);
            window.scrollTo(0, 0);
        } else {
            navigate('/tienda');
        }
    }, [id, navigate]);

    if (!product) return null;

    const handleAddToCart = () => {
        for (let i = 0; i < quantity; i++) {
            addToCart(product);
        }
        navigate('/carrito');
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
                }}>
                    {/* Product Image with Zoom */}
                    <div className="product-image-section">
                        <div
                            className="image-zoom-container"
                            style={{
                                position: 'relative',
                                overflow: 'hidden',
                                borderRadius: '4px',
                                cursor: 'zoom-in',
                                border: '1px solid #f0f0f0'
                            }}
                            onMouseEnter={() => setIsZoomed(true)}
                            onMouseLeave={() => setIsZoomed(false)}
                            onClick={() => setIsZoomed(!isZoomed)}
                        >
                            <img
                                src={getOptimizedUrl(product.imagen_url, 800)}
                                alt={product.nombre}
                                decoding="async"
                                style={{
                                    width: '100%',
                                    height: 'auto',
                                    display: 'block',
                                    transition: 'transform 0.4s ease',
                                    transform: isZoomed ? 'scale(1.5)' : 'scale(1)'
                                }}
                            />
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
                                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                            }}>
                                <Search size={20} color="var(--color-primary)" />
                            </div>
                        </div>
                    </div>

                    {/* Product Info */}
                    <div className="product-info-section">
                        <span style={{
                            textTransform: 'uppercase',
                            fontSize: '0.8rem',
                            letterSpacing: '0.2em',
                            color: 'var(--color-sage)',
                            fontWeight: 'bold',
                            display: 'block',
                            marginBottom: '1rem'
                        }}>
                            Zeticas: {product.categoria}
                        </span>
                        <h1 className="font-serif" style={{
                            fontSize: '3rem',
                            color: 'var(--color-primary)',
                            marginBottom: '1rem',
                            lineHeight: '1.1'
                        }}>
                            {product.nombre}
                        </h1>
                        <p style={{
                            fontSize: '1.8rem',
                            fontWeight: 'bold',
                            color: 'var(--color-secondary)',
                            marginBottom: '2rem'
                        }}>
                            ${product.precio.toLocaleString('es-CO')}
                        </p>
                        <div style={{
                            height: '2px',
                            background: '#f0f0f0',
                            width: '50px',
                            marginBottom: '2rem'
                        }}></div>
                        <p style={{
                            fontSize: '1.1rem',
                            color: '#666',
                            lineHeight: '1.8',
                            marginBottom: '2.5rem'
                        }}>
                            {product.descripcion}
                        </p>

                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '3rem' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                border: '1px solid #ddd',
                                borderRadius: '4px'
                            }}>
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    style={{ padding: '0.8rem', border: 'none', background: 'none', cursor: 'pointer' }}
                                >
                                    <Minus size={16} />
                                </button>
                                <span style={{ padding: '0 1rem', fontWeight: 'bold', minWidth: '40px', textAlign: 'center' }}>
                                    {quantity}
                                </span>
                                <button
                                    onClick={() => setQuantity(quantity + 1)}
                                    style={{ padding: '0.8rem', border: 'none', background: 'none', cursor: 'pointer' }}
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                            <button
                                onClick={handleAddToCart}
                                className="btn"
                                style={{
                                    flex: 1,
                                    background: 'var(--color-primary)',
                                    color: '#fff',
                                    padding: '1rem 2rem',
                                    borderRadius: '4px',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.8rem',
                                    fontSize: '1rem'
                                }}
                            >
                                <ShoppingCart size={20} /> Añadir al Carrito
                            </button>
                        </div>

                        <div style={{ fontSize: '0.9rem', color: '#999' }}>
                            <p>Categoría: <strong>{product.categoria}</strong></p>
                            <p>Envío: a todo el país</p>
                        </div>
                    </div>
                </div>

                {/* Related Products */}
                <div className="related-products" style={{ marginTop: '6rem' }}>
                    <h2 className="font-serif" style={{
                        fontSize: '2.5rem',
                        color: 'var(--color-primary)',
                        textAlign: 'center',
                        marginBottom: '3rem'
                    }}>
                        Productos Relacionados
                    </h2>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                        gap: '2rem'
                    }}>
                        {relatedProducts.map(rp => (
                            <Link to={`/producto/${rp.id}`} key={rp.id} style={{ textDecoration: 'none' }}>
                                <div className="rp-card" style={{
                                    background: '#fff',
                                    padding: '1rem',
                                    borderRadius: '4px',
                                    boxShadow: '0 5px 20px rgba(0,0,0,0.03)',
                                    transition: 'transform 0.3s ease'
                                }}>
                                    <img 
                                        src={getOptimizedUrl(rp.imagen_url, 400)} 
                                        alt={rp.nombre} 
                                        loading="lazy"
                                        decoding="async"
                                        style={{ width: '100%', height: 'auto', borderRadius: '2px', marginBottom: '1rem' }} 
                                    />
                                    <h3 style={{ fontSize: '1.1rem', color: 'var(--color-primary)', margin: '0 0 0.5rem' }}>{rp.nombre}</h3>
                                    <p style={{ fontWeight: 'bold', color: 'var(--color-secondary)', margin: 0 }}>
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
                    transform: translateY(-5px);
                }
                .back-link:hover {
                    color: var(--color-secondary) !important;
                }
            `}} />
        </div>
    );
};

export default ProductDetail;
