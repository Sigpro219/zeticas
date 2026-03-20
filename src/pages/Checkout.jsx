import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useBusiness } from '../context/BusinessContext';
import { ArrowLeft, CreditCard, Wallet, ShieldCheck, CheckCircle, Truck, MapPin, Settings2 } from 'lucide-react';



const Checkout = () => {
    const { cart, cartTotal, clearCart } = useCart();
    const { addOrder } = useBusiness();
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Info, 2: Payment, 3: Success
    const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' or 'wompi'
    const [formData, setFormData] = useState({
        nombre: 'Maria Camila',
        apellido: 'Gomez',
        direccion: 'Carrera 15 # 85-20, Bogotá',
        ciudad: 'Bogotá',
        telefono: '3109876543'
    });

    // Parámetros de Envío
    const [shipConfig, setShipConfig] = useState({
        destino: 'Bogotá',
        distance: 58,  // Distancia inicial
        valorKg: 510,  // Valor por KG (usado como multiplicador por KM según el usuario)
        weightPerSku: 0.35 // 350 grs
    });

    const totalWeight = cart.reduce((acc, item) => acc + (item.quantity * shipConfig.weightPerSku), 0);
    const shippingCost = Math.round(shipConfig.distance * shipConfig.valorKg);
    const finalTotal = cartTotal + shippingCost;

    const handlePayment = (e) => {
        e.preventDefault();

        const newOrder = {
            id: `WEB-${Math.floor(Math.random() * 10000)}`,
            client: `${formData.nombre} ${formData.apellido}`,
            amount: finalTotal,
            date: new Date().toISOString().split('T')[0],
            status: 'Pendiente',
            source: 'Pagina WEB',
            items: cart.map(p => ({
                id: p.id,
                name: p.nombre,
                quantity: p.quantity,
                price: p.precio
            }))
        };

        const savedClients = localStorage.getItem('zeticas_clients_data');
        let clientsList = savedClients ? JSON.parse(savedClients) : [];

        // Usamos el teléfono como NIT provisional
        const clientId = formData.telefono || Date.now().toString();
        const existingClientIndex = clientsList.findIndex(c => c.nit === clientId);

        const newClientData = {
            id: existingClientIndex !== -1 ? clientsList[existingClientIndex].id : Date.now(),
            name: `${formData.nombre} ${formData.apellido}`,
            idType: 'CC',
            nit: clientId,
            source: 'Web',
            address: formData.direccion,
            location: formData.ciudad,
            phone: formData.telefono,
            email: 'No registrado',
            contactName: `${formData.nombre} ${formData.apellido}`,
            contactRole: 'Comprador Web',
            type: 'Natural',
            subType: 'B2C',
            balance: 0,
            status: 'Active'
        };

        if (existingClientIndex !== -1) {
            clientsList[existingClientIndex] = newClientData;
        } else {
            clientsList = [newClientData, ...clientsList];
        }

        localStorage.setItem('zeticas_clients_data', JSON.stringify(clientsList));
        addOrder(newOrder);

        setStep(3);
        setTimeout(() => {
            clearCart();
        }, 500);
    };

    if (step === 3) {
        return (
            <div className="checkout-page botanical-bg" style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', background: '#fff', padding: '5rem', borderRadius: '4px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', maxWidth: '600px' }}>
                    <CheckCircle size={80} color="var(--color-sage)" style={{ marginBottom: '2rem' }} />
                    <h1 className="font-serif" style={{ fontSize: '3rem', color: 'var(--color-primary)', marginBottom: '1rem' }}>¡Pedido Exitoso!</h1>
                    <p style={{ color: '#666', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '3rem' }}>
                        Muchas gracias por tu compra. Hemos enviado los detalles de tu pedido a tu correo electrónico.
                        ¡Pronto disfrutarás de lo mejor de la Sabana!
                    </p>
                    <button onClick={() => navigate('/')} className="btn btn-primary" style={{ padding: '1.2rem 3rem' }}>
                        Volver al Inicio
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="checkout-page botanical-bg" style={{ minHeight: '100vh', padding: '6rem 0' }}>
            <div className="container" style={{ maxWidth: '1000px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '4rem' }}>
                    <button onClick={() => setStep(step === 1 ? () => navigate('/carrito') : 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)' }}>
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="font-serif" style={{ fontSize: '3.5rem', color: 'var(--color-primary)' }}>Finalizar Compra</h1>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '4rem', alignItems: 'start' }}>
                    <div style={{ background: '#fff', padding: '3rem', borderRadius: '4px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                        <form onSubmit={handlePayment}>
                            {step === 1 ? (
                                <div className="shipping-info">
                                    <h2 className="font-serif" style={{ fontSize: '1.8rem', marginBottom: '2rem', color: 'var(--color-primary)' }}>Información de Envío</h2>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#888' }}>Nombre</label>
                                            <input type="text" required value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} style={{ padding: '0.8rem', border: '1px solid #ddd', borderRadius: '2px', color: '#94a3b8' }} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#888' }}>Apellido</label>
                                            <input type="text" required value={formData.apellido} onChange={e => setFormData({ ...formData, apellido: e.target.value })} style={{ padding: '0.8rem', border: '1px solid #ddd', borderRadius: '2px', color: '#94a3b8' }} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#888' }}>Dirección de Entrega</label>
                                        <input type="text" required value={formData.direccion} onChange={e => setFormData({ ...formData, direccion: e.target.value })} placeholder="Calle, número, apto..." style={{ padding: '0.8rem', border: '1px solid #ddd', borderRadius: '2px', color: '#94a3b8' }} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#888' }}>Ciudad</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.ciudad}
                                                onChange={e => setFormData({ ...formData, ciudad: e.target.value })}
                                                style={{ padding: '0.8rem', border: '1px solid #ddd', borderRadius: '2px', color: '#334155', outline: 'none' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#888' }}>Teléfono</label>
                                            <input type="tel" required value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} style={{ padding: '0.8rem', border: '1px solid #ddd', borderRadius: '2px', color: '#94a3b8' }} />
                                        </div>
                                    </div>

                                    {/* Módulo Interrapidisimo */}
                                    <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', marginBottom: '2.5rem', border: '1px solid #e2e8f0' }}>
                                        <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Truck size={18} /> Calcula costo de envío (Interrapidisimo)
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                <strong>PARTIDA:</strong> Interrapidisimo Guasca / Cundinamarca
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <strong>DESTINO:</strong>
                                                <input
                                                    type="text"
                                                    value={shipConfig.destino}
                                                    onChange={e => setShipConfig({ ...shipConfig, destino: e.target.value })}
                                                    style={{ border: 'none', background: 'transparent', borderBottom: '1px solid #cbd5e1', color: '#64748b', fontSize: '0.75rem', outline: 'none', padding: '0 2px', width: '100px' }}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', background: '#fff', padding: '1.2rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                    <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#94a3b8' }}>DISTANCIA (KM)</label>
                                                    <input type="number" value={shipConfig.distance} onChange={e => setShipConfig({ ...shipConfig, distance: Number(e.target.value) })} style={{ border: 'none', borderBottom: '2px solid #e2e8f0', width: '80px', fontWeight: 'bold', outline: 'none', fontSize: '1.1rem' }} />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                    <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#94a3b8' }}>VALOR KG</label>
                                                    <input type="number" value={shipConfig.valorKg} onChange={e => setShipConfig({ ...shipConfig, valorKg: Number(e.target.value) })} style={{ border: 'none', borderBottom: '2px solid #e2e8f0', width: '80px', fontWeight: 'bold', outline: 'none', fontSize: '1.1rem' }} />
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>PESO TOTAL</div>
                                                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{totalWeight.toFixed(2)} KG</div>
                                                </div>
                                                <div style={{ background: '#ecfdf5', color: '#10b981', padding: '0.8rem', borderRadius: '12px', textAlign: 'right' }}>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase' }}>COSTO ESTIMADO</div>
                                                    <div style={{ fontWeight: 'bold', fontSize: '1.3rem' }}>${shippingCost.toLocaleString('es-CO')}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="btn btn-primary"
                                        style={{ width: '100%', padding: '1.2rem' }}
                                    >
                                        CONTINUAR AL PAGO
                                    </button>
                                </div>
                            ) : (
                                <div className="payment-info">
                                    <h2 className="font-serif" style={{ fontSize: '1.8rem', marginBottom: '2rem', color: 'var(--color-primary)' }}>Método de Pago</h2>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '3rem' }}>
                                        <div
                                            onClick={() => setPaymentMethod('card')}
                                            style={{
                                                padding: '1.5rem',
                                                border: `2px solid ${paymentMethod === 'card' ? 'var(--color-secondary)' : '#eee'}`,
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '1.5rem',
                                                transition: 'all 0.3s ease',
                                                background: paymentMethod === 'card' ? '#fffaf8' : '#fff'
                                            }}
                                        >
                                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--color-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {paymentMethod === 'card' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-secondary)' }} />}
                                            </div>
                                            <CreditCard size={24} color="var(--color-primary)" />
                                            <div>
                                                <span style={{ fontWeight: 'bold', display: 'block' }}>Tarjeta Crédito / Débito</span>
                                                <span style={{ fontSize: '0.8rem', color: '#888' }}>Visa, Mastercard, Amex</span>
                                            </div>
                                        </div>

                                        <div
                                            onClick={() => setPaymentMethod('wompi')}
                                            style={{
                                                padding: '1.5rem',
                                                border: `2px solid ${paymentMethod === 'wompi' ? 'var(--color-secondary)' : '#eee'}`,
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '1.5rem',
                                                transition: 'all 0.3s ease',
                                                background: paymentMethod === 'wompi' ? '#fffaf8' : '#fff'
                                            }}
                                        >
                                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--color-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {paymentMethod === 'wompi' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-secondary)' }} />}
                                            </div>
                                            <Wallet size={24} color="#5e17eb" />
                                            <div>
                                                <span style={{ fontWeight: 'bold', display: 'block' }}>Wompi Bancolombia</span>
                                                <span style={{ fontSize: '0.8rem', color: '#888' }}>PSE, Corresponsal, Botón Bancolombia</span>
                                            </div>
                                        </div>
                                    </div>

                                    {paymentMethod === 'card' && (
                                        <div style={{ padding: '2rem', background: '#f9f9f9', borderRadius: '4px', marginBottom: '2rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#888' }}>Número de Tarjeta</label>
                                                <input type="text" placeholder="0000 0000 0000 0000" style={{ padding: '0.8rem', border: '1px solid #ddd', borderRadius: '2px' }} />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#888' }}>Vencimiento</label>
                                                    <input type="text" placeholder="MM/YY" style={{ padding: '0.8rem', border: '1px solid #ddd', borderRadius: '2px' }} />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#888' }}>CVV</label>
                                                    <input type="password" placeholder="***" style={{ padding: '0.8rem', border: '1px solid #ddd', borderRadius: '2px' }} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '3rem', color: 'var(--color-sage)', fontSize: '0.9rem' }}>
                                        <ShieldCheck size={20} />
                                        <span>Tu pago está protegido con encriptación SSL de 256 bits.</span>
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        style={{ width: '100%', padding: '1.2rem' }}
                                    >
                                        PAGAR ${finalTotal.toLocaleString('es-CO')}
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>

                    <div className="order-summary">
                        <div style={{ background: '#fff', padding: '2rem', borderRadius: '4px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                            <h2 className="font-serif" style={{ fontSize: '1.5rem', marginBottom: '2rem', color: 'var(--color-primary)' }}>Tu Pedido</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {cart.map(item => (
                                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                        <span style={{ color: '#444' }}>{item.quantity}x {item.nombre}</span>
                                        <span style={{ fontWeight: 'bold' }}>${(item.precio * item.quantity).toLocaleString('es-CO')}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ borderTop: '1px solid #eee', marginTop: '2rem', paddingTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
                                    <span>Subtotal</span>
                                    <span>${cartTotal.toLocaleString('es-CO')}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
                                    <span>Envío ({totalWeight.toFixed(1)}kg)</span>
                                    <span>${shippingCost.toLocaleString('es-CO')}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-primary)', marginTop: '1rem' }}>
                                    <span>Total</span>
                                    <span>${finalTotal.toLocaleString('es-CO')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
