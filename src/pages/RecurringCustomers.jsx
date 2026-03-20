import React, { useState } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { useNavigate } from 'react-router-dom';
import {
    ShoppingBag, CreditCard, CheckCircle,
    ArrowRight, Activity, Calendar,
    MapPin, User, Mail, Smartphone,
    ChevronRight, Info, Search
} from 'lucide-react';
import { products as customProducts } from '../data/products';

const RecurringCustomers = () => {
    const { items, addOrder } = useBusiness();
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Info/Form, 2: Payment, 3: Success
    const [productSearch, setProductSearch] = useState('');

    const [formData, setFormData] = useState({
        name: 'Juan Perez',
        whatsapp: '3001234567',
        idNumber: '1020123456',
        email: 'juan.perez@ejemplo.com',
        address: 'Calle 123 # 45-67, Bogotá',
        frequency: 'Mensual',
        dayOfMonth: '1',
        products: []
    });

    const filteredCategories = React.useMemo(() => {
        const query = productSearch.toLowerCase().trim();
        const base = {
            'SAL': customProducts.filter(i => i.categoria === 'Sal'),
            'DULCE': customProducts.filter(i => i.categoria === 'Dulce')
        };
        if (!query) return base;
        return {
            'SAL': base.SAL.filter(p => p.nombre.toLowerCase().includes(query)),
            'DULCE': base.DULCE.filter(p => p.nombre.toLowerCase().includes(query))
        };
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
                products: [...prev.products, { id: productId, name: product.nombre, quantity, price: product.precio }]
            };
        });
    };

    const totalAmount = formData.products.reduce((acc, p) => acc + (p.price * p.quantity), 0);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.products.length === 0) {
            alert("Por favor selecciona al menos un producto");
            return;
        }
        setStep(2);
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
                source: 'Cliente Recurrente',
                isRecurring: true,
                frequency: formData.frequency,
                items: formData.products.map(p => ({
                    id: p.id,
                    name: p.name,
                    quantity: p.quantity,
                    price: p.price
                }))
            };
            // Guardar o Actualizar en Datos Maestros de Clientes
            const savedClients = localStorage.getItem('zeticas_clients_data');
            let clientsList = savedClients ? JSON.parse(savedClients) : [];

            const existingClientIndex = clientsList.findIndex(c => c.nit === formData.idNumber);
            const newClientData = {
                id: existingClientIndex !== -1 ? clientsList[existingClientIndex].id : Date.now(),
                name: formData.name,
                idType: 'CC',
                nit: formData.idNumber,
                source: 'Recurrente',
                address: formData.address,
                location: 'Bogotá',
                phone: formData.whatsapp,
                email: formData.email,
                contactName: formData.name,
                contactRole: 'Comprador',
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

            // Agregar a Pedidos
            addOrder(newOrder);
            setStep(3);
        }, 1500);
    };

    if (step === 3) {
        return (
            <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '2rem' }}>
                <div style={{ maxWidth: '500px', width: '100%', background: '#fff', padding: '3rem', borderRadius: '32px', boxShadow: '0 20px 50px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                    <div style={{ background: '#ecfdf5', color: '#10b981', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
                        <CheckCircle size={48} />
                    </div>
                    <h2 className="font-serif" style={{ fontSize: '2rem', color: '#1A3636', marginBottom: '1rem' }}>¡Bienvenido a la Familia Zeticas!</h2>
                    <p style={{ color: '#64748b', lineHeight: '1.6', marginBottom: '2rem' }}>
                        Tu suscripción recurrente ha sido activada con éxito. Recibirás tus productos de manera segura el día <strong>{formData.dayOfMonth}</strong> de cada mes.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        style={{ background: '#1A3636', color: '#fff', border: 'none', padding: '1rem 2rem', borderRadius: '12px', fontWeight: 'bold', width: '100%', cursor: 'pointer' }}
                    >
                        Volver al Inicio
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', paddingTop: '4rem', paddingBottom: '6rem' }}>
            <div className="container" style={{ maxWidth: '1000px' }}>

                {/* Header Section */}
                <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                    <span style={{ background: '#D6BD98', color: '#1A3636', padding: '6px 16px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Beneficio de Suscripción Zeticas
                    </span>
                    <h1 className="font-serif" style={{ fontSize: '3.5rem', color: '#1A3636', marginTop: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                        Clientes Recurrentes
                    </h1>
                    <p style={{ fontSize: '1.25rem', color: '#40534C', maxWidth: '700px', margin: '0 auto', lineHeight: '1.6' }}>
                        Conviértete en <strong>Cliente Referido</strong> y olvida las preocupaciones logísticas. Recibe tus conservas favoritas de forma segura, puntual y recurrente en la puerta de tu casa.
                    </p>
                </div>

                {step === 1 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                        {/* Form Section */}
                        <div style={{ background: '#fff', padding: '2.5rem', borderRadius: '32px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                            <h3 style={{ fontSize: '1.5rem', color: '#1A3636', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <User size={24} color="#D6BD98" /> Datos de Registro
                            </h3>
                            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.5rem' }}>NOMBRE COMPLETO</label>
                                    <input required type="text" placeholder="Ej: Juan Pérez" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', color: '#94a3b8' }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.5rem' }}>WHATSAPP</label>
                                        <input required type="tel" placeholder="300 123 4567" value={formData.whatsapp} onChange={e => setFormData({ ...formData, whatsapp: e.target.value })} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', color: '#94a3b8' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.5rem' }}>CÉDULA / NIT</label>
                                        <input required type="text" placeholder="1.020.123.456" value={formData.idNumber} onChange={e => setFormData({ ...formData, idNumber: e.target.value })} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', color: '#94a3b8' }} />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.5rem' }}>CORREO ELECTRÓNICO</label>
                                    <input required type="email" placeholder="juan@ejemplo.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', color: '#94a3b8' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.5rem' }}>DIRECCIÓN DE ENTREGA</label>
                                    <input required type="text" placeholder="Calle 123 # 45-67 Bogotá" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', color: '#94a3b8' }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.5rem' }}>FRECUENCIA</label>
                                        <select value={formData.frequency} onChange={e => setFormData({ ...formData, frequency: e.target.value })} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', background: '#fff', color: '#94a3b8' }}>
                                            <option>Mensual</option>
                                            <option>Quincenal</option>
                                            <option>Cada 2 Meses</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.5rem' }}>DÍA PREFERIDO (MES)</label>
                                        <select value={formData.dayOfMonth} onChange={e => setFormData({ ...formData, dayOfMonth: e.target.value })} style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', background: '#fff', color: '#94a3b8' }}>
                                            {[...Array(28)].map((_, i) => <option key={i + 1}>{i + 1}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <button type="submit" style={{ marginTop: '1rem', background: '#1A3636', color: '#fff', border: 'none', padding: '1.2rem', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                                    Continuar al Pago <ArrowRight size={20} />
                                </button>
                            </form>
                        </div>

                        {/* Product Selection Section */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <div style={{ background: '#E9EFEC', padding: '2rem', borderRadius: '32px', border: '1px solid #C4DAD2' }}>
                                <h3 style={{ fontSize: '1.25rem', color: '#1A3636', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <ShoppingBag size={20} color="#1A3636" /> Línea de Productos
                                </h3>

                                <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                                    <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                    <input
                                        type="text"
                                        placeholder="Buscar producto..."
                                        value={productSearch}
                                        onChange={e => setProductSearch(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '12px', border: '1px solid #C4DAD2', outline: 'none', fontSize: '0.9rem', background: '#fff' }}
                                    />
                                </div>

                                {Object.entries(filteredCategories).map(([cat, prods]) => (
                                    prods.length > 0 && (
                                        <div key={cat} style={{ marginBottom: '1.5rem' }}>
                                            <div style={{ fontSize: '0.7rem', fontWeight: '900', color: '#1A3636', marginBottom: '1rem', opacity: 0.6 }}>LÍNEA {cat}</div>
                                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                                                {prods.map(p => {
                                                    const current = formData.products.find(fp => fp.id === p.id);
                                                    return (
                                                        <div key={p.id} style={{ background: '#fff', padding: '1rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div>
                                                                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{p.nombre}</div>
                                                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>${p.precio.toLocaleString()} / und</div>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                                                <button onClick={() => handleProductChange(p.id, (current?.quantity || 0) - 1)} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer' }}>-</button>
                                                                <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{current?.quantity || 0}</span>
                                                                <button onClick={() => handleProductChange(p.id, (current?.quantity || 0) + 1)} style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: '#1A3636', color: '#fff', cursor: 'pointer' }}>+</button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>

                            <div style={{ background: '#1A3636', color: '#fff', padding: '2rem', borderRadius: '32px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.5rem' }}>TOTAL MENSUAL ESTIMADO</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>${totalAmount.toLocaleString()}</div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    <Info size={14} /> Envío incluido por ser recurrente
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Payment Step */
                    <div style={{ maxWidth: '600px', margin: '0 auto', background: '#fff', padding: '3rem', borderRadius: '32px', boxShadow: '0 20px 50px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ fontSize: '1.8rem', color: '#1A3636', marginBottom: '2rem', textAlign: 'center' }}>Pasarela de Pagos Segura</h3>
                        <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: '20px', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <span style={{ color: '#64748b' }}>Suscripción {formData.frequency}</span>
                                <span style={{ fontWeight: 'bold' }}>${totalAmount.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                <span>Envío Premium</span>
                                <span>¡GRATIS!</span>
                            </div>
                            <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '1rem', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: '900' }}>
                                <span>Total a Pagar</span>
                                <span>${totalAmount.toLocaleString()}</span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div style={{ border: '2px solid #1A3636', padding: '1.5rem', borderRadius: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <CreditCard color="#1A3636" />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 'bold' }}>Tarjeta de Crédito / Débito</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Visa, Mastercard, Amex</div>
                                </div>
                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #1A3636', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#1A3636' }}></div>
                                </div>
                            </div>
                            <button
                                onClick={handlePayment}
                                style={{ marginTop: '1rem', background: '#1A3636', color: '#fff', border: 'none', padding: '1.5rem', borderRadius: '16px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }}
                            >
                                Confirmar y Pagar Suscripción
                            </button>
                            <button
                                onClick={() => setStep(1)}
                                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem' }}
                            >
                                Volver a editar pedido
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecurringCustomers;
