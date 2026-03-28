import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Trash2, Plus, Minus, ArrowLeft, ShoppingBag } from 'lucide-react';

const Cart = () => {
    const { cart, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart();
    const navigate = useNavigate();

    const handleClearCart = () => {
        if (window.confirm("¿Estás seguro de que deseas vaciar todo el carrito? Esta acción no se puede deshacer.")) {
            clearCart();
        }
    };

    if (cart.length === 0) {
        return (
            <div className="cart-page botanical-bg" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', background: '#fff', padding: '4rem', borderRadius: '4px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                    <ShoppingBag size={64} color="var(--color-sage)" style={{ marginBottom: '2rem' }} />
                    <h2 className="font-serif" style={{ fontSize: '2.5rem', color: 'var(--color-primary)', marginBottom: '1rem' }}>Tu carrito está vacío</h2>
                    <p style={{ color: '#666', marginBottom: '3rem' }}>Parece que aún no has añadido ninguna de nuestras conservas.</p>
                    <Link to="/tienda" className="btn btn-primary" style={{ padding: '1rem 3rem' }}>Ir a la Tienda</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="cart-page botanical-bg" style={{ minHeight: '100vh', padding: '6rem 0' }}>
            <div className="container">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button onClick={() => navigate('/tienda')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)' }}>
                            <ArrowLeft size={24} />
                        </button>
                        <h1 className="font-serif" style={{ fontSize: '3.5rem', color: 'var(--color-primary)' }}>Tu Carrito</h1>
                    </div>
                    
                    <button 
                        onClick={handleClearCart}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: '#fff1f2',
                            color: '#e11d48',
                            border: '1px solid #fda4af',
                            padding: '0.6rem 1.2rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#ffe4e6'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#fff1f2'; }}
                    >
                        <Trash2 size={16} />
                        VACIAR CARRITO
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '4rem', alignItems: 'start' }}>
                    <div className="cart-items" style={{ background: '#fff', padding: '2rem', borderRadius: '4px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                        {cart.map((item) => (
                            <div key={item.id} style={{
                                display: 'grid',
                                gridTemplateColumns: '100px 1fr auto',
                                gap: '2rem',
                                padding: '2rem 0',
                                borderBottom: '1px solid #eee',
                                alignItems: 'center'
                            }}>
                                <img src={item.imagen_url} alt={item.nombre} style={{ width: '100%', borderRadius: '2px' }} />
                                <div>
                                    <h3 className="font-serif" style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--color-primary)' }}>{item.nombre}</h3>
                                    <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1rem' }}>Zeticas: {item.categoria}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} style={{ background: '#f5f5f5', border: 'none', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Minus size={14} />
                                        </button>
                                        <span style={{ fontWeight: 'bold' }}>{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ background: '#f5f5f5', border: 'none', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '1rem' }}>
                                        ${(item.precio * item.quantity).toLocaleString('es-CO')}
                                    </p>
                                    <button onClick={() => {
                                        if (!window.confirm("¿Estás seguro que quieres eliminar este producto del carrito?")) {
                                            return;
                                        }
                                        removeFromCart(item.id);
                                    }} style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer' }}>
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="cart-summary" style={{ position: 'sticky', top: '140px' }}>
                        <div className="salmon-box" style={{ padding: '3rem', borderRadius: '4px', boxShadow: '0 30px 60px rgba(0,0,0,0.1)' }}>
                            <h2 className="font-serif" style={{ color: '#fff', fontSize: '2rem', marginBottom: '2rem' }}>Resumen</h2>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: '#fff', opacity: 0.9 }}>
                                <span>Subtotal</span>
                                <span>${cartTotal.toLocaleString('es-CO')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', color: '#fff', opacity: 0.9 }}>
                                <span>Envío</span>
                                <span>Calculado en el checkout</span>
                            </div>
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '2rem', marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', color: '#fff' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>Total</span>
                                <span style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>${cartTotal.toLocaleString('es-CO')}</span>
                            </div>
                            <button
                                onClick={() => navigate('/checkout')}
                                style={{
                                    width: '100%',
                                    background: '#fff',
                                    color: 'var(--color-secondary)',
                                    border: 'none',
                                    padding: '1.2rem',
                                    fontWeight: 'bold',
                                    borderRadius: '2px',
                                    cursor: 'pointer',
                                    fontSize: '1rem'
                                }}
                            >
                                PROCEDER AL PAGO
                            </button>
                            <button
                                onClick={() => navigate('/tienda')}
                                style={{
                                    width: '100%',
                                    background: 'transparent',
                                    color: '#fff',
                                    border: '1px solid rgba(255,255,255,0.5)',
                                    padding: '1.2rem',
                                    fontWeight: 'bold',
                                    borderRadius: '2px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    marginTop: '1rem',
                                    transition: 'all 0.2s',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = '#fff'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; }}
                            >
                                Seguir Comprando
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Cart;
