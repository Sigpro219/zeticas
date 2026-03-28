import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useBusiness } from '../context/BusinessContext';
import { ArrowLeft, CreditCard, Wallet, ShieldCheck, CheckCircle, Truck, MapPin, Settings2, Info } from 'lucide-react';
import { colombia_cities } from '../data/colombia_cities';
import CryptoJS from 'crypto-js';

const Checkout = () => {
    const { cart, cartTotal, clearCart } = useCart();
    const { addOrder, siteContent } = useBusiness();
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Info, 2: Payment, 3: Success
    const [formData, setFormData] = useState({
        nombreCompleto: '',
        direccion: '',
        ciudad: '',
        departamento: '',
        telefono: ''
    });

    // Parámetros de Envío desde Administración Web
    const [shipSettings, setShipSettings] = useState({
        tarifa_local: 5400,
        tarifa_regional: 7200,
        tarifa_nacional: 13500,
        threshold_free: 120000,
        weight_per_sku: 0.400,
        origin_city: 'Guasca',
        bold_mode: 'sandbox',
        bold_sandbox_identity: '',
        bold_sandbox_secret: '',
        bold_prod_identity: '',
        bold_prod_secret: ''
    });

    useEffect(() => {
        if (siteContent && siteContent.web_shipping) {
            setShipSettings({
                tarifa_local: Number(siteContent.web_shipping.tarifa_local) || 5400,
                tarifa_regional: Number(siteContent.web_shipping.tarifa_regional) || 7200,
                tarifa_nacional: Number(siteContent.web_shipping.tarifa_nacional) || 13500,
                threshold_free: Number(siteContent.web_shipping.threshold_free) || 120000,
                weight_per_sku: Number(siteContent.web_shipping.weight_per_sku) || 0.400,
                origin_city: siteContent.web_shipping.origin_city || 'Guasca',
                bold_mode: siteContent.web_shipping.bold_mode || 'sandbox',
                bold_sandbox_identity: siteContent.web_shipping.bold_sandbox_identity || '',
                bold_sandbox_secret: siteContent.web_shipping.bold_sandbox_secret || '',
                bold_prod_identity: siteContent.web_shipping.bold_prod_identity || '',
                bold_prod_secret: siteContent.web_shipping.bold_prod_secret || ''
            });
        }
    }, [siteContent]);

    // Calcular costos
    const totalWeight = cart.reduce((acc, item) => acc + (item.quantity * shipSettings.weight_per_sku), 0);
    const roundedWeight = Math.ceil(totalWeight);
    
    // Detectar Zona
    const getShippingCost = () => {
        if (cartTotal >= shipSettings.threshold_free) return 0;
        
        const destination = colombia_cities.find(c => 
            c.city.toLowerCase() === formData.ciudad.toLowerCase()
        );

        let rate = shipSettings.tarifa_nacional;
        if (destination) {
            if (destination.city === shipSettings.origin_city) rate = shipSettings.tarifa_local;
            else if (destination.state === 'Cundinamarca' || destination.state === 'Boyacá') rate = shipSettings.tarifa_regional;
        }

        return roundedWeight * rate;
    };

    const shippingCost = getShippingCost();
    const finalTotal = cartTotal + shippingCost;
    const missingForFree = Math.max(0, shipSettings.threshold_free - cartTotal);

    const handleBoldCheckout = () => {
        const isSandbox = shipSettings.bold_mode === 'sandbox';
        const apiKey = isSandbox ? shipSettings.bold_sandbox_identity : shipSettings.bold_prod_identity;
        const secretKey = isSandbox ? shipSettings.bold_sandbox_secret : shipSettings.bold_prod_secret;

        if (!apiKey || !secretKey) {
            alert("Error: Configuración de Bold incompleta. Por favor contacta al administrador.");
            return;
        }

        const orderId = `ZET-${Date.now()}`;
        const amountStr = Math.round(finalTotal).toString();
        const currency = 'COP';

        // Firma de Integridad: {ID_DE_PEDIDO}{MONTO}{DIVISA}{LLAVE_SECRETA}
        const signaturePayload = `${orderId}${amountStr}${currency}${secretKey}`;
        const integritySignature = CryptoJS.SHA256(signaturePayload).toString();

        console.log("Iniciando Bold Checkout Real...", { orderId, amountStr, integritySignature, mode: shipSettings.bold_mode });

        try {
            if (window.BoldCheckout) {
                const checkout = new window.BoldCheckout({
                    orderId: orderId,
                    currency: currency,
                    amount: amountStr,
                    apiKey: apiKey,
                    integritySignature: integritySignature,
                    description: `Compra Zeticas - ${formData.nombreCompleto}`,
                    redirectionUrl: window.location.origin + '/checkout?status=success'
                });
                checkout.open();
            } else {
                alert("Error: La librería de Bold no ha cargado correctamente. Recarga la página.");
            }
        } catch (err) {
            console.error("Error al abrir Bold Checkout", err);
            alert("Hubo un error al conectar con la pasarela de pago.");
        }
    };

    const handleSuccess = () => {
        const newOrder = {
            id: `WEB-${Math.floor(Math.random() * 10000)}`,
            client: formData.nombreCompleto,
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
            name: formData.nombreCompleto,
            idType: 'CC',
            nit: clientId,
            source: 'Web',
            address: formData.direccion,
            location: formData.ciudad,
            phone: formData.telefono,
            email: 'No registrado',
            contactName: formData.nombreCompleto,
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

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('status') === 'success') {
            handleSuccess();
        }
    }, []);

    const handlePaymentSubmit = (e) => {
        e.preventDefault();
        handleBoldCheckout();
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
                        <form onSubmit={handlePaymentSubmit}>
                            {step === 1 ? (
                                <div className="shipping-info">
                                    <h2 className="font-serif" style={{ fontSize: '1.8rem', marginBottom: '2rem', color: 'var(--color-primary)' }}>Información de Envío</h2>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#888' }}>Nombre Completo</label>
                                        <input type="text" required value={formData.nombreCompleto} onChange={e => setFormData({ ...formData, nombreCompleto: e.target.value })} placeholder="Ej: Juan Perez" style={{ padding: '0.8rem', border: '1px solid #ddd', borderRadius: '4px', color: '#334155', fontWeight: 'bold' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#888' }}>Dirección de Entrega</label>
                                        <input type="text" required value={formData.direccion} onChange={e => setFormData({ ...formData, direccion: e.target.value })} placeholder="Calle 123 # 45-67..." style={{ padding: '0.8rem', border: '1px solid #ddd', borderRadius: '2px', color: '#334155' }} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#888' }}>Ciudad / Municipio</label>
                                            <input
                                                list="cities-list"
                                                type="text"
                                                required
                                                value={formData.ciudad}
                                                onChange={e => setFormData({ ...formData, ciudad: e.target.value })}
                                                placeholder="Ej: Bogotá, Guasca..."
                                                style={{ padding: '0.8rem', border: '1px solid #ddd', borderRadius: '4px', color: '#334155', fontWeight: 'bold' }}
                                            />
                                            <datalist id="cities-list">
                                                {colombia_cities.map((c, i) => (
                                                    <option key={i} value={c.city}>{c.state}</option>
                                                ))}
                                            </datalist>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#888' }}>Teléfono</label>
                                            <input type="tel" required value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} placeholder="310 000 0000" style={{ padding: '0.8rem', border: '1px solid #ddd', borderRadius: '4px' }} />
                                        </div>
                                    </div>

                                    {/* Módulo Envío Interrapidisimo */}
                                    <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '20px', marginBottom: '2.5rem', border: '1px dotted var(--color-primary)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                                            <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '800' }}>
                                                <Truck size={20} /> ENVÍO INTERRAPIDISIMO
                                            </h4>
                                            {shippingCost === 0 ? (
                                                <span style={{ background: '#10b981', color: '#fff', padding: '0.2rem 0.8rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '900' }}>¡GRATIS!</span>
                                            ) : (
                                                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold' }}>Envío Estándar</span>
                                            )}
                                        </div>

                                        {missingForFree > 0 && (
                                            <div style={{ marginBottom: '1rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.4rem', color: '#64748b', fontWeight: '700' }}>
                                                    <span>Faltan <strong>${missingForFree.toLocaleString('es-CO')}</strong> para envío gratis</span>
                                                    <span>{Math.round((cartTotal / shipSettings.threshold_free) * 100)}%</span>
                                                </div>
                                                <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${Math.min(100, (cartTotal / shipSettings.threshold_free) * 100)}%`, height: '100%', background: 'var(--color-secondary)' }} />
                                                </div>
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#fff', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fffaf8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                                                <MapPin size={20} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#1e293b' }}>
                                                    {formData.ciudad || 'Selecciona ciudad'}
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '600' }}>
                                                    {shippingCost === 0 ? 'Aplica envío gratuito por monto' : 'Entrega nacional garantizada'}
                                                </div>
                                            </div>
                                            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--color-primary)' }}>
                                                    {shippingCost === 0 ? '$0' : `$${shippingCost.toLocaleString('es-CO')}`}
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
                                            style={{
                                                padding: '1.5rem',
                                                border: `2px solid var(--color-secondary)`,
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '1.5rem',
                                                transition: 'all 0.3s ease',
                                                background: '#fffaf8'
                                            }}
                                        >
                                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--color-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-secondary)' }} />
                                            </div>
                                            <Wallet size={24} color="#7c3aed" />
                                            <div>
                                                <span style={{ fontWeight: 'bold', display: 'block' }}>Pasarela Segura (Bold)</span>
                                                <span style={{ fontSize: '0.8rem', color: '#888' }}>Tarjetas de Crédito, PSE, Nequi y Daviplata</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ padding: '2rem', background: '#f8fafc', borderRadius: '8px', marginBottom: '2rem', border: '1px dashed #e2e8f0' }}>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
                                            Al hacer clic en el botón, serás redirigido a la pasarela segura de <strong>Bold</strong> para completar tu pago de forma protegida.
                                        </p>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '3rem', color: 'var(--color-sage)', fontSize: '0.9rem' }}>
                                        <ShieldCheck size={20} />
                                        <span>Tu pago está protegido con encriptación SSL de 256 bits y certificación PCI-DSS.</span>
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        style={{ width: '100%', padding: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}
                                    >
                                        PAGAR CON BOLD ${finalTotal.toLocaleString('es-CO')}
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
                                    <span>Costo de envío</span>
                                    <span style={{ color: shippingCost === 0 ? '#10b981' : '#666', fontWeight: shippingCost === 0 ? 'bold' : 'normal' }}>
                                        {shippingCost === 0 ? 'GRATIS' : `$${shippingCost.toLocaleString('es-CO')}`}
                                    </span>
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
