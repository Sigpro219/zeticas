import React, { useState, useMemo } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { useNavigate } from 'react-router-dom';
import { 
    ShoppingBag, CheckCircle, 
    ArrowRight, ArrowLeft, Star, RefreshCw, ShieldCheck,
    CreditCard as PaymentIcon, Lock, Sparkles,
    Minus, Plus, Search
} from 'lucide-react';
import { products as customProducts } from '../data/products';

const deepTeal = "#025357";
const institutionOcre = "#D6BD98";
const lightSage = "#f8f9f5";

const RecurringCustomers = () => {
    const { addOrder } = useBusiness();
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Benefits, 2: Select Products, 3: Form/Payment, 4: Success
    const [productSearch, setProductSearch] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        whatsapp: '',
        idNumber: '',
        email: '',
        address: '',
        frequency: 'Mensual',
        dayOfMonth: '1',
        products: []
    });

    const filteredProducts = useMemo(() => {
        const query = productSearch.toLowerCase().trim();
        if (!query) return customProducts;
        return customProducts.filter(p => 
            p.nombre.toLowerCase().includes(query) || 
            p.categoria.toLowerCase().includes(query)
        );
    }, [productSearch]);

    const handleProductChange = (productId, quantity) => {
        setFormData(prev => {
            const existing = prev.products.find(p => p.id === productId);
            if (quantity <= 0) {
                return { ...prev, products: prev.products.filter(p => p.id !== productId) };
            }
            if (existing) {
                return {
                    ...prev,
                    products: prev.products.map(p => p.id === productId ? { ...p, quantity } : p)
                };
            }
            const product = customProducts.find(i => i.id === productId);
            return {
                ...prev,
                products: [...prev.products, { id: productId, name: product.nombre, quantity, price: product.precio, image: product.imagen_url }]
            };
        });
    };

    const subtotal = formData.products.reduce((acc, p) => acc + (p.price * p.quantity), 0);
    const discount = subtotal * 0.15; // 15% Subscription discount
    const totalAmount = subtotal - discount;

    const handleNextStep = () => {
        if (step === 2 && formData.products.length === 0) {
            alert("Por favor selecciona al menos un producto para tu suscripción.");
            return;
        }
        setStep(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleBackStep = () => {
        setStep(prev => prev - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePayment = () => {
        // Mock payment process
        setTimeout(() => {
            const newOrder = {
                id: `REC-${Math.floor(Math.random() * 10000)}`,
                client: formData.name,
                amount: totalAmount,
                date: new Date().toISOString().split('T')[0],
                status: 'Pendiente',
                source: 'Suscripción',
                isRecurring: true,
                frequency: formData.frequency,
                items: formData.products.map(p => ({
                    id: p.id,
                    name: p.name,
                    quantity: p.quantity,
                    price: p.price
                }))
            };
            addOrder(newOrder);
            setStep(4);
        }, 2000);
    };

    return (
        <div style={{ minHeight: '100vh', background: lightSage, paddingBottom: '10rem' }}>
            <div className="container" style={{ paddingTop: '4rem' }}>
                {/* Stepper Logic Top */}
                {step < 4 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '4rem', marginBottom: '4rem' }}>
                        {['Beneficios', 'Selección', 'Confirmación'].map((label, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', opacity: step === i + 1 ? 1 : 0.4, transition: 'all 0.4s' }}>
                                <div style={{ 
                                    width: '24px', height: '24px', borderRadius: '50%', 
                                    background: step >= i + 1 ? deepTeal : '#ccc', 
                                    color: '#fff', fontSize: '0.7rem', fontWeight: '900',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>{i + 1}</div>
                                <span style={{ fontSize: '0.75rem', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' }}>{label}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Back Button (if step > 1) */}
                {step > 1 && step < 4 && (
                    <button 
                        onClick={handleBackStep}
                        style={{ 
                            background: 'none', border: 'none', color: deepTeal, 
                            display: 'flex', alignItems: 'center', gap: '0.5rem', 
                            fontSize: '0.9rem', fontWeight: '800', cursor: 'pointer',
                            marginBottom: '2rem', padding: 0
                        }}
                    >
                        <ArrowLeft size={18} /> Volver
                    </button>
                )}

                {/* Step 1: Benefits */}
                {step === 1 && (
                    <div style={{ padding: '6rem 0', textAlign: 'center' }}>
                        <span style={{ 
                            background: 'rgba(214, 189, 152, 0.2)', 
                            color: deepTeal, 
                            padding: '8px 20px', 
                            borderRadius: '50px', 
                            fontSize: '0.8rem', 
                            fontWeight: '800', 
                            letterSpacing: '2px',
                            textTransform: 'uppercase',
                            display: 'inline-block',
                            marginBottom: '2rem'
                        }}>
                            Círculo de Excelencia Zeticas
                        </span>
                        <h1 className="font-serif" style={{ fontSize: '4.5rem', color: deepTeal, lineHeight: '1.1', marginBottom: '2rem' }}>
                            Tu despensa siempre <br /> llena de propósito
                        </h1>
                        <p style={{ fontSize: '1.25rem', color: '#555', maxWidth: '750px', margin: '0 auto 4rem', lineHeight: '1.6' }}>
                            Olvídate de los pedidos manuales. Únete a nuestro programa de suscripción y recibe la mejor selección agroecológica de forma recurrente, con beneficios exclusivos por tu lealtad.
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
                            {[
                                { icon: <Star />, title: "15% Descuento Permanente", text: "Ahorra en cada pedido recurrente desde el primer día.", color: institutionOcre },
                                { icon: <RefreshCw />, title: "Adiós a las Preocupaciones", text: "Programamos tus entregas según tu necesidad. Sin trámites adicionales.", color: deepTeal },
                                { icon: <ShieldCheck />, title: "Acceso Prioritario", text: "Sé el primero en recibir ediciones limitadas y nuevas cosechas.", color: "#4CAF50" }
                            ].map((item, i) => (
                                <div key={i} style={{ 
                                    background: '#fff', 
                                    padding: '3rem 2rem', 
                                    borderRadius: '32px', 
                                    boxShadow: '0 10px 40px rgba(0,0,0,0.04)',
                                    textAlign: 'center',
                                    transition: 'transform 0.3s ease',
                                    cursor: 'default'
                                }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-10px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                    <div style={{ color: item.color, marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                                        {React.cloneElement(item.icon, { size: 42 })}
                                    </div>
                                    <h4 style={{ color: deepTeal, fontSize: '1.2rem', fontWeight: '800', marginBottom: '1rem' }}>{item.title}</h4>
                                    <p style={{ color: '#777', fontSize: '0.95rem', lineHeight: '1.6' }}>{item.text}</p>
                                </div>
                            ))}
                        </div>

                        <button 
                            onClick={() => setStep(2)}
                            style={{ 
                                marginTop: '5rem', 
                                background: deepTeal, 
                                color: '#fff', 
                                border: 'none', 
                                padding: '1.5rem 4rem', 
                                borderRadius: '50px', 
                                fontSize: '1.1rem', 
                                fontWeight: '800', 
                                cursor: 'pointer',
                                boxShadow: `0 20px 40px rgba(2, 83, 87, 0.2)`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                margin: '5rem auto 0'
                            }}
                        >
                            Armar mi Suscripción <ArrowRight size={20} />
                        </button>
                    </div>
                )}

                {/* Step 2: Product Selection */}
                {step === 2 && (
                    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 380px', gap: '4rem' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                                <h2 className="font-serif" style={{ fontSize: '2.5rem', color: deepTeal }}>Elige tus productos</h2>
                                <div style={{ position: 'relative', width: '300px' }}>
                                    <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar en la línea..."
                                        value={productSearch}
                                        onChange={e => setProductSearch(e.target.value)}
                                        style={{ 
                                            width: '100%', padding: '0.8rem 1rem 0.8rem 3rem', 
                                            border: '1px solid #ddd', borderRadius: '50px', 
                                            outline: 'none', fontSize: '0.9rem' 
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                {filteredProducts.map(p => {
                                    const current = formData.products.find(fp => fp.id === p.id);
                                    return (
                                        <div key={p.id} style={{ 
                                            background: '#fff', 
                                            padding: '1.5rem', 
                                            borderRadius: '24px', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '1.5rem',
                                            boxShadow: current ? `0 10px 25px rgba(2, 83, 87, 0.08)` : '0 4px 15px rgba(0,0,0,0.03)',
                                            border: current ? `2px solid ${institutionOcre}` : '2px solid transparent',
                                            transition: 'all 0.3s ease'
                                        }}>
                                            <div style={{ 
                                                width: '64px', height: '64px', 
                                                background: '#f5f5f5', 
                                                borderRadius: '16px', 
                                                overflow: 'hidden',
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center',
                                                border: '1px solid #eee'
                                            }}>
                                                {p.imagen_url ? (
                                                    <img src={p.imagen_url} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <span style={{ fontSize: '1.5rem' }}>{p.categoria === 'Sal' ? '🥒' : '🍓'}</span>
                                                )}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '800', fontSize: '0.95rem', color: deepTeal, marginBottom: '4px' }}>{p.nombre}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#888' }}>${p.precio.toLocaleString()}</div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                <button onClick={() => handleProductChange(p.id, (current?.quantity || 0) + 1)} style={{ 
                                                    width: '32px', height: '32px', borderRadius: '50%', 
                                                    border: 'none', background: current ? deepTeal : '#eee', color: current ? '#fff' : '#444', 
                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                                                }}>
                                                    <Plus size={16} strokeWidth={3} />
                                                </button>
                                                {current && (
                                                    <>
                                                        <span style={{ fontWeight: '800', fontSize: '0.9rem' }}>{current.quantity}</span>
                                                        <button onClick={() => handleProductChange(p.id, (current?.quantity || 0) - 1)} style={{ 
                                                            width: '32px', height: '32px', borderRadius: '50%', 
                                                            border: '1px solid #eee', background: '#fff', color: '#444', 
                                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                                                        }}>
                                                            <Minus size={16} strokeWidth={3} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Sidebar Summary */}
                        <div style={{ position: 'sticky', top: '150px', height: 'fit-content' }}>
                            <div style={{ background: deepTeal, color: '#fff', padding: '2.5rem', borderRadius: '32px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                    <ShoppingBag size={20} /> Mi Canasta Recurrente
                                </h3>

                                {formData.products.length === 0 ? (
                                    <p style={{ opacity: 0.6, fontSize: '0.9rem', fontStyle: 'italic' }}>Explora nuestra línea de productos a la izquierda para armar tu pedido periódico.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                                        {formData.products.map(p => (
                                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
                                                    <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <span>{p.quantity}x {p.name}</span>
                                                </div>
                                                <span style={{ fontWeight: '700' }}>${(p.price * p.quantity).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', opacity: 0.8, fontSize: '0.9rem' }}>
                                        <span>Subtotal</span>
                                        <span>${subtotal.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.2rem', color: institutionOcre, fontWeight: '800' }}>
                                        <span>Descuento Círculo (15%)</span>
                                        <span>-${discount.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: '800' }}>
                                        <span>Total</span>
                                        <span>${totalAmount.toLocaleString()}</span>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleNextStep}
                                    disabled={formData.products.length === 0}
                                    style={{ 
                                        width: '100%', marginTop: '2.5rem', padding: '1.2rem', 
                                        borderRadius: '16px', background: institutionOcre, color: deepTeal, 
                                        border: 'none', fontWeight: '900', cursor: 'pointer',
                                        opacity: formData.products.length === 0 ? 0.5 : 1
                                    }}
                                >
                                    Continuar Registro
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Form and Payment */}
                {step === 3 && (
                    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '4rem' }}>
                        {/* Registration Form */}
                        <div>
                            <h2 className="font-serif" style={{ fontSize: '2.5rem', color: deepTeal, marginBottom: '2.5rem' }}>Finaliza tu suscripción</h2>
                            
                            <div style={{ display: 'grid', gap: '1.5rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: '900', color: deepTeal, marginBottom: '0.8rem', display: 'block', letterSpacing: '1px' }}>DÍA DE ENTREGA</label>
                                        <select value={formData.dayOfMonth} onChange={e => setFormData({ ...formData, dayOfMonth: e.target.value })} style={{ width: '100%', padding: '1rem', borderRadius: '15px', border: '2px solid #eee', outline: 'none' }}>
                                            {[...Array(28)].map((_, i) => <option key={i + 1} value={i + 1}>Día {i + 1}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: '900', color: deepTeal, marginBottom: '0.8rem', display: 'block', letterSpacing: '1px' }}>FRECUENCIA</label>
                                        <select value={formData.frequency} onChange={e => setFormData({ ...formData, frequency: e.target.value })} style={{ width: '100%', padding: '1rem', borderRadius: '15px', border: '2px solid #eee', outline: 'none' }}>
                                            <option>Quincenal</option>
                                            <option>Mensual</option>
                                            <option>Bimensual</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ background: '#fff', padding: '2rem', borderRadius: '24px', border: '2px solid #eee' }}>
                                    <h4 style={{ fontWeight: '800', marginBottom: '1.5rem', color: deepTeal, fontSize: '0.9rem' }}>INFORMACIÓN DE ENVÍO</h4>
                                    <div style={{ display: 'grid', gap: '1rem' }}>
                                        <input type="text" placeholder="Nombre completo" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #ddd' }} />
                                        <input type="text" placeholder="Correo electrónico" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #ddd' }} />
                                        <input type="text" placeholder="Dirección exacta" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #ddd' }} />
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <input type="text" placeholder="WhatsApp" value={formData.whatsapp} onChange={e => setFormData({ ...formData, whatsapp: e.target.value })} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #ddd' }} />
                                            <input type="text" placeholder="Cédula/NIT" value={formData.idNumber} onChange={e => setFormData({ ...formData, idNumber: e.target.value })} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #ddd' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment Summary */}
                        <div style={{ background: lightSage, padding: '2.5rem', borderRadius: '32px', height: 'fit-content' }}>
                            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: deepTeal, marginBottom: '2rem' }}>Resumen de Pago</h3>
                            
                            <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '20px', marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', fontSize: '1rem' }}>
                                    <span>Suscripción Anual</span>
                                    <span style={{ fontWeight: '800' }}>Activa</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4CAF50', fontWeight: '700', fontSize: '0.9rem' }}>
                                    <span>Envío por Zeticas</span>
                                    <span>$0</span>
                                </div>
                                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', fontSize: '1.8rem', fontWeight: '900', color: deepTeal }}>
                                    <span>Cobro {formData.frequency}</span>
                                    <span>${totalAmount.toLocaleString()}</span>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gap: '0.8rem' }}>
                                <div style={{ border: `2px solid ${deepTeal}`, padding: '1.2rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem', background: '#fff' }}>
                                    <PaymentIcon size={24} color={deepTeal} />
                                    <div style={{ flex: 1, fontSize: '0.85rem' }}>
                                        <div style={{ fontWeight: '800' }}>Tarjeta Guardada</div>
                                        <div style={{ opacity: 0.6 }}>Pasarela Wompi / Stripe Secured</div>
                                    </div>
                                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: deepTeal }}></div>
                                </div>

                                <button 
                                    onClick={handlePayment}
                                    style={{ 
                                        marginTop: '1.5rem', width: '100%', padding: '1.5rem', 
                                        background: deepTeal, color: '#fff', border: 'none', 
                                        borderRadius: '16px', fontWeight: '800', fontSize: '1.1rem',
                                        cursor: 'pointer', boxShadow: `0 15px 35px rgba(2, 83, 87, 0.2)` 
                                    }}
                                >
                                    Confirmar Suscripción
                                </button>
                                
                                <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    <Lock size={12} /> Transacción Encriptada 256-bit SSL
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Success */}
                {step === 4 && (
                    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                        <div style={{ maxWidth: '600px', width: '100%', background: '#fff', padding: '4rem', borderRadius: '40px', boxShadow: '0 30px 60px rgba(0,0,0,0.06)', textAlign: 'center' }}>
                            <div style={{ background: '#f0fdf4', color: '#16a34a', width: '100px', height: '100px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2.5rem', position: 'relative' }}>
                                <CheckCircle size={56} />
                                <div style={{ position: 'absolute', top: 0, right: 0 }}>
                                    <Sparkles color={institutionOcre} />
                                </div>
                            </div>
                            <h2 className="font-serif" style={{ fontSize: '3rem', color: deepTeal, marginBottom: '1.5rem' }}>¡Bienvenido al Círculo!</h2>
                            <p style={{ color: '#666', fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '3rem' }}>
                                Tu suscripción ha sido activada con éxito. Ya no tendrás que preocuparte por tus suministros agroecológicos; nos encargaremos de que lleguen a tu puerta cada {formData.frequency.toLowerCase()} el día {formData.dayOfMonth}.
                            </p>
                            <div style={{ background: lightSage, padding: '1.5rem', borderRadius: '20px', textAlign: 'left', marginBottom: '3rem' }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: '800', color: deepTeal, marginBottom: '0.5rem' }}>PRÓXIMO ENVÍO ESTIMADO</div>
                                <div style={{ fontSize: '1.1rem', color: '#333' }}>Día {formData.dayOfMonth} del próximo ciclo.</div>
                            </div>
                            <button
                                onClick={() => navigate('/')}
                                style={{ background: deepTeal, color: '#fff', border: 'none', padding: '1.2rem 3rem', borderRadius: '50px', fontWeight: '800', cursor: 'pointer', transition: 'transform 0.2s' }}
                                onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
                                onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                            >
                                Explorar más productos
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecurringCustomers;
