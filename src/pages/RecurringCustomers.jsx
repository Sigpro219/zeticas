import React, { useState, useMemo, useRef } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
    CheckCircle, 
    ArrowLeft,
    LogOut,
    ArrowRight, Star, RefreshCw, Truck,
    Lock, Sparkles,
    Minus, Plus, Search, User, Mail, UserPlus, LogIn,
    MapPin, Hash, Phone, Eye, EyeOff, Calendar, Clock
} from 'lucide-react';
import { colombia_cities } from '../data/colombia_cities';
import CryptoJS from 'crypto-js';

const deepTeal = "#025357";
const institutionOcre = "#D6BD98";
const lightSage = "#f8f9f5";

const ProductCarousel = ({ products }) => {
    if (!products || products.length === 0) return null;
    const displayProducts = [...products, ...products, ...products];
    return (
        <div className="premium-carousel-container">
            <div className="carousel-track-container">
                <div className="carousel-track">
                    {displayProducts.map((p, idx) => (
                        <div key={`${p.id}-${idx}`} className="carousel-item">
                            <div className="product-show-card">
                                <div className="product-image-box">
                                    {p.image_url ? <img src={p.image_url} alt={p.name} /> : <div className="placeholder-icon"><Sparkles /></div>}
                                </div>
                                <div className="product-info">
                                    <h4>{p.name}</h4>
                                    <p>{p.product_type || 'Zeticas'}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const RecurringCustomers = () => {
    const { 
        items, clients, siteContent, upsertMember, saveWebCheckout, 
        getWebCheckout, addOrder, updateBankBalance, banks, addBank 
    } = useBusiness();
    const { login, user, logout } = useAuth();
    const navigate = useNavigate();
    
    const [step, setStep] = useState(1);
    const [isHydrated, setIsHydrated] = useState(false);
    const [authMode, setAuthMode] = useState('register');
    const [productSearch, setProductSearch] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isChangingPlan, setIsChangingPlan] = useState(false);
    const [showGuideModal, setShowGuideModal] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const config = useMemo(() => siteContent.recurring || {}, [siteContent]);
    const planDurations = ["3 Meses", "6 Meses", "12 Meses"];

    // Maximum discount across all configured plans (dynamic, from CMS)
    const maxDiscount = useMemo(() => {
        const discounts = planDurations.map(d => Number(config[`plan_${d.split(' ')[0]}_discount`]) || 0);
        return Math.max(...discounts);
    }, [config]);

    const [authData, setAuthData] = useState({
        email: '', password: '', confirmPassword: '', name: '', phone: '', address: '', city: '', idNumber: ''
    });

    const [subscriptionData, setSubscriptionData] = useState({
        plan: '',
        frequency: 'Mensual',
        products: []
    });
    const [animatingPlan, setAnimatingPlan] = useState(null);
    const lastHydratedRef = useRef(null);
    
    // Sincronización proactiva con la base de datos de clientes
    const activeMember = useMemo(() => {
        if (!user || user.role !== 'member') return null;
        return clients.find(c => c.id === user.id || c.nit === user.nit) || user;
    }, [user, clients]);

    const availableProducts = useMemo(() => items.filter(i => i.category === 'Producto Terminado' && (i.published !== false)), [items]);

    const filteredProducts = useMemo(() => {
        const query = productSearch.toLowerCase().trim();
        if (!query) return availableProducts;
        return availableProducts.filter(p => p.name.toLowerCase().includes(query));
    }, [productSearch, availableProducts]);

    const handleProductChange = (productId, quantity) => {
        setSubscriptionData(prev => {
            const existing = prev.products.find(p => p.id === productId);
            if (quantity <= 0) return { ...prev, products: prev.products.filter(p => p.id !== productId) };
            if (existing) return { ...prev, products: prev.products.map(p => p.id === productId ? { ...p, quantity } : p) };
            const product = availableProducts.find(i => i.id === productId);
            if (!product) return prev; // Avoid errors if product not found
            return {
                ...prev,
                products: [...prev.products, { id: productId, name: product.name, quantity, price: product.price, image: product.image_url }]
            };
        });
    };

    const hydrateMemberData = (userData) => {
        if (!userData) return;

        // Map pantry IDs to full product objects with fallback to persist data
        const hydratedPantry = (userData.pantry || []).map(item => {
            const product = availableProducts.find(p => p.id === item.id);
            // Si lo encontramos en el catálogo, actualizamos precio/imagen. 
            // Si no, usamos lo que ya viene en el registro del cliente (Persistencia Primero).
            return { 
                id: item.id, 
                name: product?.name || item.name || 'Producto', 
                quantity: item.quantity, 
                price: product?.price || item.price || 0, 
                image: product?.image_url || item.image || '' 
            };
        }).filter(Boolean);

        const memberPlan = userData.membership?.plan || userData.plan || '';
        if (!memberPlan && !userData.pantry?.length) return; // Evitar hidratar si realmente no hay datos

        setSubscriptionData({
            plan: memberPlan,
            frequency: userData.frequency || 'Mensual',
            products: hydratedPantry
        });

        // Pre-fill authData for consistency
        setAuthData(prev => ({
            ...prev,
            email: userData.email || '',
            name: userData.name || '',
            phone: userData.phone || '',
            address: userData.address || '',
            city: userData.city || '',
            idNumber: userData.nit || ''
        }));

        setStep(4);
        setIsHydrated(true);
    };

    React.useEffect(() => {
        if (!activeMember || availableProducts.length === 0) return;

        // Detectamos si el origen de los datos es Firestore o solo el caché local (user)
        const isFromFirestore = clients.some(c => c.id === activeMember.id || c.nit === activeMember.nit);
        const sourceId = `${activeMember.id}-${isFromFirestore ? 'remote' : 'local'}-${activeMember.updated_at || activeMember.last_pantry_update || ''}`;

        // Si ya hidratamos con estos mismos datos exactos, no repetimos
        if (lastHydratedRef.current === sourceId) return;

        // Si tenemos datos decentes (o somos de Firestore), hidratamos
        const hasPlan = activeMember.membership?.plan || activeMember.plan;
        
        // REGLA DE SOBERANÍA: Permitimos re-hidratar si los nuevos datos vienen de Firestore 
        // y antes solo teníamos datos locales, O si el plan estaba vacío y ahora llegó.
        const shouldHydrate = !lastHydratedRef.current || (isFromFirestore && !lastHydratedRef.current.includes('remote')) || !subscriptionData.plan;

        if (shouldHydrate && (hasPlan || activeMember.pantry?.length > 0)) {
            hydrateMemberData(activeMember);
            lastHydratedRef.current = sourceId;
        }
    }, [activeMember, availableProducts, clients, subscriptionData.plan]);

    // Scroll to top on every step transition
    React.useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [step]);

    const handleBoldSuccess = async (chkID) => {
        setIsSaving(true);
        try {
            const res = await getWebCheckout(chkID);
            if (res.success && res.data) {
                const draft = res.data;
                // Finalize the member record based on confirmed draft
                await upsertMember({
                    nit: draft.nit || (user?.nit),
                    pantry: draft.pantry,
                    frequency: draft.frequency,
                    last_pantry_update: new Date().toISOString()
                });

                // 2. CREATE THE OFFICIAL ORDER RECORD (To ensure the 'orders' collection is populated)
                const newOrder = {
                    order_number: draft.orderId || `SUBS-${Date.now()}`,
                    client: draft.name || user?.name || "Socio Zeticas",
                    clientId: user?.id || draft.nit,
                    amount: draft.totals.total,
                    total_amount: draft.totals.total,
                    date: new Date().toLocaleDateString('en-CA'),
                    status: 'Pendiente',
                    payment_status: 'Pagado',
                    source: 'Suscripción Web',
                    shipping_address: draft.address || user?.address || "",
                    shipping_city: draft.city || user?.city || "",
                    shipping_phone: draft.phone || user?.phone || "",
                    items: draft.pantry.map(p => ({
                        id: p.id,
                        name: p.name,
                        quantity: p.quantity,
                        price: p.price
                    })),
                    membership_plan: draft.plan
                };
                await addOrder(newOrder);

                // 3. BANK SYNCHRONIZATION (DISTRIBUTION: BBVA, Bold, Interrapidisimo)
                try {
                    const BOLD_COMMISSION_PERCENT = 0.0299;
                    const BOLD_COMMISSION_FIXED = 900;
                    const IVA_SURCHARGE = 1.19;

                    const totalPaid = draft.totals.total;
                    const shippingPaid = Number(draft.totals.shipping) || 0;
                    
                    // Calculation of Bold's extraction
                    const commissionFee = Math.round((totalPaid * BOLD_COMMISSION_PERCENT + BOLD_COMMISSION_FIXED) * IVA_SURCHARGE);
                    
                    // The main income for BBVA is the remainder (Products - Commission)
                    // If there was shipping, that part goes to the new dedicated account
                    const remainderForBBVA = totalPaid - shippingPaid - commissionFee;

                    const bbvaBank = (banks || []).find(b => {
                        const name = (b.name || '').toLowerCase();
                        return name.includes('bbva') || name.includes('principal');
                    });
                    const commissionBank = (banks || []).find(b => {
                        const name = (b.name || '').toLowerCase();
                        return name.includes('bold') || name.includes('comision');
                    });
                    let shippingBank = (banks || []).find(b => {
                        const name = (b.name || '').toLowerCase();
                        return name.includes('interrapidisimo') || name.includes('envio');
                    });

                    // Proactive Creation of Shipping Account if it doesn't exist
                    if (shippingPaid > 0 && !shippingBank) {
                        console.log("🛠️ Creando cuenta para Costo de Envío...");
                        const newBankRes = await addBank({
                            name: 'Interrapidisimo Costo de Envío',
                            balance: 0,
                            real_time: 0,
                            type: 'Logística',
                            status: 'Active'
                        });
                        if (newBankRes.success) {
                            // Note: Since banks is a snapshot from context, it might not update 
                            // immediately in this closure. We use the ID directly from the response.
                            shippingBank = { id: newBankRes.id, name: 'Interrapidisimo Costo de Envío' };
                        }
                    }

                    console.log("📊 Auditoría Bancaria (Suscripción):", { 
                        total: totalPaid, 
                        bbva: remainderForBBVA, 
                        bold: commissionFee, 
                        shipping: shippingPaid 
                    });

                    // A. Registrar en BBVA (Ingreso Neto de Productos)
                    if (bbvaBank && remainderForBBVA > 0) {
                        await updateBankBalance(
                            bbvaBank.id, 
                            remainderForBBVA, 
                            'income', 
                            `Suscripción (Neto) - ${newOrder.order_number}`, 
                            'Ventas'
                        );
                    }

                    // B. Registrar en Bold (Comisiones)
                    if (commissionBank && commissionFee > 0) {
                        await updateBankBalance(
                            commissionBank.id, 
                            commissionFee, 
                            'income', 
                            `Comisión Bold - ${newOrder.order_number}`, 
                            'Comisiones'
                        );
                    }

                    // C. Registrar en Interrapidisimo (Costo de Envío)
                    if (shippingBank && shippingPaid > 0) {
                        await updateBankBalance(
                            shippingBank.id, 
                            shippingPaid, 
                            'income', 
                            `Envío Suscripción - ${newOrder.order_number}`, 
                            'Logística',
                            shippingBank // Pass the object directly (cachedBank)
                        );
                        console.log("✅ Costo de envío registrado en cuenta Interrapidisimo");
                    }
                } catch (bankErr) {
                    console.error("Error logging subscription distribution to bank:", bankErr);
                }

                alert("¡Pago exitoso! Tu suscripción ha sido actualizada y la orden ha sido registrada.");
                // We are already at Step 4, just stay here or show a success overlay
            }
        } catch (err) {
            console.error("Error finalizing after payment:", err);
            alert("Hubo un problema confirmando tu pago. Por favor contacta a soporte.");
        } finally {
            setIsSaving(false);
        }
    };

    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const chkID = params.get('chkID');
        const boldStatus = params.get('bold-status');

        if (chkID) {
            console.log("Retorno de Suscripción detectado. Esperando bancos...");
            
            // Wait for banks to load to ensure synchronization
            if (banks.length === 0) return;

            // Check for success statuses from Bold
            if (boldStatus === 'approved' || boldStatus === 'successful' || boldStatus === 'success' || !boldStatus) {
                handleBoldSuccess(chkID);
                // Clean URL ONLY after banks are ready
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }, [handleBoldSuccess, banks.length]);

    const currentPlanConfig = useMemo(() => {
        // Find plan config regardless of prefix (e.g. "12 Meses" -> "12")
        const planStr = subscriptionData.plan || '';
        const months = planStr.split(' ')[0];
        const shippingVal = String(config[`plan_${months}_shipping`] || '').toLowerCase();
        
        return {
            discount: Number(config[`plan_${months}_discount`]) || 0,
            threshold: Number(config[`plan_${months}_threshold`]) || 999999,
            freeShipping: months === '12' || shippingVal === 'gratis' || shippingVal === 'incluido' || shippingVal === '0'
        };
    }, [config, subscriptionData.plan, siteContent.web_shipping]);

    const subtotal = subscriptionData.products.reduce((acc, p) => acc + (p.price * p.quantity), 0);
    // Calculated discounted sum with item-level 50-multiple rounding
    const discountedProductsSum = subscriptionData.products.reduce((acc, p) => {
        const itemDiscounted = p.price * (1 - (currentPlanConfig.discount / 100));
        return acc + (Math.ceil(itemDiscounted / 50) * 50 * p.quantity);
    }, 0);
    
    const savings = subtotal - discountedProductsSum;
    const freeByPlan = currentPlanConfig.freeShipping;
    const freeByAmount = discountedProductsSum >= currentPlanConfig.threshold;
    const shippingCost = (freeByPlan || freeByAmount) ? 0 : (Number(siteContent.web_shipping?.tarifa_nacional) || 13500);
    const totalAmount = discountedProductsSum + shippingCost;

    const hasPendingChanges = useMemo(() => {
        if (!activeMember) return true;
        
        const currentPantryJson = JSON.stringify(subscriptionData.products.map(p => ({ id: p.id, quantity: p.quantity })).sort((a,b) => a.id.localeCompare(b.id)));
        const savedPantryJson = JSON.stringify((activeMember.pantry || []).map(p => ({ id: p.id, quantity: p.quantity })).sort((a,b) => a.id.localeCompare(b.id)));
        
        const currentPlan = subscriptionData.plan;
        const savedPlan = activeMember.membership?.plan || activeMember.plan || '';
        
        const currentFreq = subscriptionData.frequency;
        const savedFreq = activeMember.frequency || 'Mensual';

        return currentPantryJson !== savedPantryJson || currentPlan !== savedPlan || currentFreq !== savedFreq;
    }, [activeMember, subscriptionData]);

    const handleOnboardingLogin = async (e) => {
        if (e) e.preventDefault();
        try {
            const res = await login(authData.email, authData.password);
            if (res.success) {
                // login in AuthContext sets the user globally, 
                // the useEffect will handle hydration if they were already on Step 1,
                // but for the transition, we can call it manually if we have the data
                // For simplicity, navigate immediately; the useEffect will catch it
                // Or better: try to find the client data in the login response if we added it
                setStep(4);
            }
        } catch (err) { alert("Error: " + err.message); }
    };

    const handleOnboardingRegister = async (e) => {
        if (e) e.preventDefault();
        if (!authData.name || !authData.email || !authData.password || !authData.idNumber) {
            alert("Completa los campos obligatorios."); return;
        }
        if (authData.password !== authData.confirmPassword) {
            alert("Las contraseñas no coinciden."); return;
        }
        setIsSaving(true);
        try {
            // Normalize on the fly to match AuthContext expectations
            const cleanEmail = authData.email.toLowerCase().trim();
            const res = await upsertMember({
                ...authData, 
                email: cleanEmail,
                nit: authData.idNumber,
                membership: { plan: subscriptionData.plan, status: 'Active', created_at: new Date().toISOString() }
            });

            if (res.success) {
                // Try logging in with the normalized email
                try {
                    await login(cleanEmail, authData.password);
                    setStep(4);
                    setShowGuideModal(true);
                } catch (loginErr) {
                    console.error("Auto-login failed after registration:", loginErr);
                    alert("Cuenta creada con éxito. Por favor, intenta ingresar con tu correo y clave.");
                    setAuthMode('login');
                }
            }
        } catch (err) { 
            alert("Error al crear cuenta: " + err.message); 
        } finally { 
            setIsSaving(false); 
        }
    };

    const handlePlanSelection = (plan) => {
        setAnimatingPlan(plan);
        setTimeout(() => {
            setSubscriptionData(prev => ({ ...prev, plan }));
            setStep(3);
            setAnimatingPlan(null);
        }, 650);
    };

    const handleCancelSubscription = async () => {
        if (!activeMember) return;
        if (!window.confirm("¿Seguro que deseas cancelar tu suscripción? Perderás tus descuentos y beneficios de envío gratis.")) return;
        
        setIsSaving(true);
        try {
            await upsertMember({
                nit: activeMember.nit || activeMember.idNumber || activeMember.id,
                status: 'Inactive',
                is_member: false
            });
            alert("Suscripción cancelada exitosamente.");
            setAuthData({ email: '', password: '', confirmPassword: '', name: '', phone: '', address: '', city: '', idNumber: '' });
            logout();
            setStep(1);
        } catch (err) {
            alert("Error al cancelar: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const finalizeMembership = async () => {
        setIsSaving(true);
        try {
            await upsertMember({ 
                nit: activeMember?.nit || activeMember?.idNumber || authData.idNumber, 
                pantry: subscriptionData.products.map(p => ({ id: p.id, quantity: p.quantity })), 
                frequency: subscriptionData.frequency,
                membership: { 
                    plan: subscriptionData.plan, 
                    status: 'Active',
                    updated_at: new Date().toISOString()
                },
                last_pantry_update: new Date().toISOString() 
            });
            alert("¡Cambios guardados con éxito en tu suscripción!");
            setIsChangingPlan(false);
        } catch (err) { 
            console.error("Error al finalizar:", err);
            alert("Error: " + err.message); 
        }
        finally { setIsSaving(false); }
    };

    const handleBoldPayment = async () => {
        if (!user || user.role !== 'member') return;
        
        const shipSettings = siteContent.web_shipping || {};
        const isSandbox = shipSettings.bold_mode === 'sandbox';
        const apiKey = isSandbox ? shipSettings.bold_sandbox_identity : shipSettings.bold_prod_identity;
        const secretKey = isSandbox ? shipSettings.bold_sandbox_secret : shipSettings.bold_prod_secret;

        if (!apiKey || !secretKey) {
            alert("Error: Configuración de Bold incompleta. Por favor contacta al administrador.");
            return;
        }

        setIsSaving(true);
        try {
            const orderId = `SUBS-${user.nit || 'GUEST'}-${Date.now()}`;
            const amountStr = Math.round(totalAmount).toString();
            const currency = 'COP';

            // Sigma: {ID_DE_PEDIDO}{MONTO}{DIVISA}{LLAVE_SECRETA}
            const signaturePayload = `${orderId}${amountStr}${currency}${secretKey}`;
            const integritySignature = CryptoJS.SHA256(signaturePayload).toString();

            if (!window.BoldCheckout) {
                throw new Error("La librería de Bold no ha cargado correctamente.");
            }

            // Save draft for restoration on return
            const draftData = {
                memberId: user.id,
                nit: authData.idNumber,
                pantry: subscriptionData.products.map(p => ({ id: p.id, quantity: p.quantity })),
                frequency: subscriptionData.frequency,
                plan: subscriptionData.plan,
                totals: {
                    subtotal: subtotal,
                    shipping: shippingCost,
                    total: totalAmount,
                    savings: savings
                },
                orderId: orderId,
                type: 'subscription_update'
            };

            const resDraft = await saveWebCheckout(draftData);
            const checkoutId = resDraft.success ? resDraft.id : null;

            const finalRedirectionUrl = `${window.location.host.includes('localhost') ? 'http://' : 'https://'}${window.location.host}/recurrentes?chkID=${checkoutId}`;

            const checkout = new window.BoldCheckout({
                orderId: orderId,
                currency: currency,
                amount: amountStr,
                apiKey: apiKey,
                integritySignature: integritySignature,
                description: `Suscripción Zeticas - ${user.name}`,
                redirectionUrl: finalRedirectionUrl
            });

            // Local fallback
            localStorage.setItem('zeticas_pending_subscription', JSON.stringify({ ...draftData, checkoutId }));
            
            checkout.open();
        } catch (err) {
            console.error("Error al abrir Bold:", err);
            alert("Error al procesar pago: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const planMetrics = useMemo(() => {
        const member = activeMember || user;
        if (!member || member.role !== 'member') return null;
        
        // Soporte para created_at en la raíz o dentro de membership
        const rawCreatedAt = member.membership?.created_at || member.created_at;
        if (!rawCreatedAt) return null;

        const start = new Date(rawCreatedAt);
        const planStr = member.membership?.plan || member.plan || '';
        const months = parseInt(planStr) || 0;
        if (months === 0) return null;
        
        const end = new Date(new Date(start).setMonth(start.getMonth() + months));
        const now = new Date();
        
        const totalMs = end - start;
        const elapsedMs = now - start;
        const remainingMs = end - now;
        
        const totalDays = Math.ceil(totalMs / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
        const progress = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
        
        return {
            endDateStr: end.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }),
            daysRemaining,
            totalDays,
            progress,
            isExpired: daysRemaining <= 0,
            isApproaching: daysRemaining <= 30 && daysRemaining > 0
        };
    }, [activeMember, user]);

    const planEndDate = planMetrics?.endDateStr;

    return (
        <div style={{ minHeight: '100vh', background: lightSage, paddingBottom: '6rem' }}>
            <div className="container" style={{ paddingTop: '1.5rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1.2rem', marginBottom: '2rem' }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                            <div key={s} style={{ width: '10px', height: '10px', borderRadius: '50%', background: step === s ? deepTeal : '#eee', transition: 'all 0.3s ease', transform: step === s ? 'scale(1.2)' : 'scale(1)' }} />
                        ))}
                    </div>
                </div>

                {step === 1 && (
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 20px', background: 'white', borderRadius: '50px', color: deepTeal, fontWeight: '900', fontSize: '0.65rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}><Sparkles size={14} /> CÍRCULO DE SUSCRIPCIÓN</div>
                        <h1 className="font-serif" style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', color: deepTeal, lineHeight: 1, marginBottom: '1rem' }}>Propósito Artesanal</h1>
                        <p style={{ fontSize: '1.05rem', color: '#555', maxWidth: '750px', margin: '0 auto 2.5rem' }}>Transforma tu consumo recurrente en apoyo al campo con beneficios exclusivos.</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
                            <div className="benefit-card"><Star size={26} color={institutionOcre} /><h3>Descuento Real</h3><p>{maxDiscount > 0 ? <>Hasta <b style={{color: institutionOcre}}>{maxDiscount}% OFF</b> en tus productos.</> : 'Tu ahorro es permanente.'}</p></div>
                            <div className="benefit-card"><RefreshCw size={26} color={institutionOcre} /><h3>Cero Preocupaciones</h3><p>Programamos tu despensa.</p></div>
                            <div className="benefit-card"><Truck size={26} color={institutionOcre} /><h3>Logística Premium</h3><p>Envíos prioritarios.</p></div>
                        </div>
                        <ProductCarousel products={availableProducts} />
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '3.5rem' }}>
                            <button onClick={() => { 
                                setAuthData({ email: '', password: '', confirmPassword: '', name: '', phone: '', address: '', city: '', idNumber: '' });
                                setAuthMode('register'); 
                                setStep(2); 
                            }} style={{ background: deepTeal, color: '#fff', padding: '1.4rem 3rem', borderRadius: '50px', fontWeight: '900', border: 'none', cursor: 'pointer' }}>UNIRME AL CÍRCULO <UserPlus size={20} style={{marginLeft:'8px'}}/></button>
                            <button onClick={() => { setAuthMode('login'); setStep(3); }} style={{ background: '#fff', color: deepTeal, padding: '1.4rem 3rem', borderRadius: '50px', fontWeight: '900', border: `2px solid ${deepTeal}`, cursor: 'pointer' }}>MI PORTAL <LogIn size={20} style={{marginLeft:'8px'}}/></button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                        <div 
                            onClick={() => navigate('/')} 
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                cursor: 'pointer', 
                                color: deepTeal, 
                                fontWeight: '800', 
                                fontSize: '0.75rem', 
                                marginBottom: '1.5rem',
                                letterSpacing: '1px',
                                opacity: 0.6,
                                transition: 'all 0.3s ease',
                                width: 'fit-content'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.transform = 'translateX(-5px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = 0.6; e.currentTarget.style.transform = 'translateX(0)'; }}
                        >
                            <ArrowLeft size={16} />
                            <span>VOLVER AL INICIO</span>
                        </div>
                        <h2 className="font-serif" style={{ fontSize: '3rem', color: deepTeal, textAlign: 'center' }}>Escoge tu Plan</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginTop: '3rem' }}>
                            {planDurations.map(d => {
                                const months = d.split(' ')[0];
                                const dsc = config[`plan_${months}_discount`] || 0;
                                const isFree = config[`plan_${months}_shipping`] === true;
                                const threshold = Number(config[`plan_${months}_threshold`]) || (Number(siteContent.web_shipping?.threshold_free) || 60000);
                                const isSelected = subscriptionData.plan === d || animatingPlan === d;
                                
                                return (
                                    <div 
                                        key={d} 
                                        onClick={() => handlePlanSelection(d)} 
                                        className="plan-card"
                                        style={{ 
                                            background: '#fff', 
                                            padding: '3rem 2rem', 
                                            borderRadius: '32px', 
                                            textAlign: 'center', 
                                            cursor: 'pointer', 
                                            border: isSelected ? `3px solid ${institutionOcre}` : '1px solid #eee', 
                                            position: 'relative', 
                                            overflow: 'hidden',
                                            transform: animatingPlan === d ? 'scale(1.05)' : undefined,
                                            boxShadow: isSelected ? '0 20px 40px rgba(0,0,0,0.08)' : undefined
                                        }}
                                    >
                                        {isSelected && (
                                            <div style={{ 
                                                position: 'absolute', 
                                                top: '15px', 
                                                right: '15px',
                                                animation: 'fadeInScale 0.4s ease forwards'
                                            }}>
                                                <CheckCircle color={institutionOcre} size={24}/>
                                            </div>
                                        )}
                                        <h3 style={{ color: deepTeal, fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>{d}</h3>
                                        <div style={{ fontSize: '3.5rem', fontWeight: '900', color: institutionOcre, lineHeight: 1 }}>{dsc}%<span style={{fontSize:'1.5rem'}}>OFF</span></div>
                                        
                                        <div style={{ marginTop: '1.5rem', padding: '1rem', background: lightSage, borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: deepTeal, fontWeight: 700, fontSize: '0.9rem' }}>
                                                <Truck size={18} />
                                                <span>ENVÍO GRATIS</span>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600 }}>
                                                {isFree ? 'En todos tus pedidos' : `Sobre $${threshold.toLocaleString()}`}
                                            </span>
                                        </div>

                                        <button style={{ 
                                            background: isSelected ? deepTeal : '#eee', 
                                            color: isSelected ? '#fff' : '#888', 
                                            border: 'none', 
                                            padding: '1rem 2.5rem', 
                                            borderRadius: '50px', 
                                            fontWeight: '900', 
                                            marginTop: '2rem', 
                                            width: '100%', 
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease'
                                        }}>
                                            {isSelected ? 'PLAN SELECCIONADO' : 'SELECCIONAR'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div 
                            onClick={() => navigate('/')} 
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                cursor: 'pointer', 
                                color: deepTeal, 
                                fontWeight: '800', 
                                fontSize: '0.75rem', 
                                marginBottom: '1.5rem',
                                letterSpacing: '1px',
                                opacity: 0.6,
                                transition: 'all 0.3s ease',
                                width: 'fit-content'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.transform = 'translateX(-5px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = 0.6; e.currentTarget.style.transform = 'translateX(0)'; }}
                        >
                            <ArrowLeft size={16} />
                            <span>VOLVER AL INICIO</span>
                        </div>
                        <div style={{ background: '#fff', width: '100%', maxWidth: '500px', padding: '3rem', borderRadius: '40px', boxShadow: '0 20px 50px rgba(0,0,0,0.05)' }}>
                            <h2 style={{ textAlign: 'center', color: deepTeal, fontSize: '2.5rem', marginBottom: '1.5rem', fontFamily: 'serif' }}>{authMode === 'login' ? 'Bienvenido' : 'Crea tu Cuenta'}</h2>
                            {authMode === 'login' ? (
                                <form onSubmit={handleOnboardingLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '1rem' }}>
                                    <div className="input-group"><Mail size={20}/><input type="email" placeholder="Email" onChange={e => setAuthData({...authData, email: e.target.value})} required/></div>
                                    <div className="input-group"><Lock size={20}/><input type="password" placeholder="Clave" onChange={e => setAuthData({...authData, password: e.target.value})} required/></div>
                                    <button type="submit" style={{ background: deepTeal, color: '#fff', padding: '1.2rem', borderRadius: '16px', border: 'none', fontWeight: '900', fontSize: '1rem', cursor: 'pointer' }}>INGRESAR</button>
                                    <button type="button" onClick={() => setAuthMode('register')} style={{ background: 'none', border: 'none', color: deepTeal, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', marginTop: '0.5rem' }}>No tengo cuenta, quiero registrarme</button>
                                </form>
                            ) : (
                                <form onSubmit={handleOnboardingRegister} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '0', marginTop: '1rem' }}>

                                    {/* Row 1: Nombre + Teléfono */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Nombre Completo</label>
                                            <input
                                                type="text" autoComplete="off" required
                                                placeholder="Ej: María García"
                                                value={authData.name}
                                                onChange={e => setAuthData({...authData, name: e.target.value})}
                                                style={{ padding: '0.75rem 0', border: 'none', borderBottom: `1.5px solid ${authData.name ? deepTeal : '#e2e8f0'}`, background: 'transparent', fontSize: '0.95rem', color: deepTeal, fontWeight: 600, outline: 'none', width: '100%', transition: 'border-color 0.2s' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>WhatsApp</label>
                                            <input
                                                type="tel" autoComplete="off" required
                                                placeholder="310 000 0000"
                                                value={authData.phone}
                                                onChange={e => setAuthData({...authData, phone: e.target.value})}
                                                style={{ padding: '0.75rem 0', border: 'none', borderBottom: `1.5px solid ${authData.phone ? deepTeal : '#e2e8f0'}`, background: 'transparent', fontSize: '0.95rem', color: deepTeal, fontWeight: 600, outline: 'none', width: '100%', transition: 'border-color 0.2s' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Row 2: Email */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.5rem' }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Correo Electrónico</label>
                                        <input
                                            type="email" autoComplete="off" required
                                            placeholder="ejemplo@correo.com"
                                            value={authData.email}
                                            onChange={e => setAuthData({...authData, email: e.target.value})}
                                            style={{ padding: '0.75rem 0', border: 'none', borderBottom: `1.5px solid ${authData.email ? deepTeal : '#e2e8f0'}`, background: 'transparent', fontSize: '0.95rem', color: deepTeal, fontWeight: 600, outline: 'none', width: '100%', transition: 'border-color 0.2s' }}
                                        />
                                        {authData.email && (
                                            <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>
                                                <Sparkles size={11} style={{ marginRight: 4, color: institutionOcre }} />
                                                <b>{authData.email}</b> será tu usuario para ingresar al Círculo.
                                            </p>
                                        )}
                                    </div>

                                    {/* Row 3: NIT + Ciudad */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>NIT / Cédula</label>
                                            <input
                                                type="text" autoComplete="off" required
                                                placeholder="123456789"
                                                value={authData.idNumber}
                                                onChange={e => setAuthData({...authData, idNumber: e.target.value})}
                                                style={{ padding: '0.75rem 0', border: 'none', borderBottom: `1.5px solid ${authData.idNumber ? deepTeal : '#e2e8f0'}`, background: 'transparent', fontSize: '0.95rem', color: deepTeal, fontWeight: 600, outline: 'none', width: '100%', transition: 'border-color 0.2s' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ciudad</label>
                                            <select
                                                value={authData.city}
                                                onChange={e => setAuthData({...authData, city: e.target.value})}
                                                required
                                                style={{ padding: '0.75rem 0', border: 'none', borderBottom: `1.5px solid ${authData.city ? deepTeal : '#e2e8f0'}`, background: 'transparent', fontSize: '0.95rem', color: authData.city ? deepTeal : '#94a3b8', fontWeight: 600, outline: 'none', width: '100%', appearance: 'none', cursor: 'pointer' }}
                                            >
                                                <option value="">Seleccionar...</option>
                                                {colombia_cities.map(c => <option key={c.city} value={c.city}>{c.city}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Row 4: Dirección */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '2.5rem' }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Dirección de Entrega</label>
                                        <input
                                            type="text" autoComplete="off" required
                                            placeholder="Calle 123 # 45-67, Apto 201"
                                            value={authData.address}
                                            onChange={e => setAuthData({...authData, address: e.target.value})}
                                            style={{ padding: '0.75rem 0', border: 'none', borderBottom: `1.5px solid ${authData.address ? deepTeal : '#e2e8f0'}`, background: 'transparent', fontSize: '0.95rem', color: deepTeal, fontWeight: 600, outline: 'none', width: '100%', transition: 'border-color 0.2s' }}
                                        />
                                    </div>

                                    {/* Divider + Password Section */}
                                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.8rem', marginBottom: '1.5rem' }}>
                                        <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '1.5rem' }}>Creación de Contraseña</p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                            {/* Password */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Contraseña</label>
                                                <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1.5px solid ${authData.password ? deepTeal : '#e2e8f0'}`, transition: 'border-color 0.2s' }}>
                                                    <input
                                                        type={showPass ? 'text' : 'password'}
                                                        autoComplete="new-password" required
                                                        placeholder="Mínimo 6 caracteres"
                                                        value={authData.password}
                                                        onChange={e => setAuthData({...authData, password: e.target.value})}
                                                        style={{ flex: 1, padding: '0.75rem 0', border: 'none', background: 'transparent', fontSize: '0.95rem', color: deepTeal, fontWeight: 600, outline: 'none' }}
                                                    />
                                                    <button type="button" onClick={() => setShowPass(!showPass)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0 0.2rem' }}>
                                                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>
                                            </div>
                                            {/* Confirm */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: authData.confirmPassword && authData.password !== authData.confirmPassword ? '#ef4444' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                                    {authData.confirmPassword && authData.password !== authData.confirmPassword ? '⚠ No coinciden' : 'Confirmar'}
                                                </label>
                                                <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1.5px solid ${authData.confirmPassword ? (authData.password === authData.confirmPassword ? '#22c55e' : '#ef4444') : '#e2e8f0'}`, transition: 'border-color 0.2s' }}>
                                                    <input
                                                        type={showConfirm ? 'text' : 'password'}
                                                        autoComplete="new-password" required
                                                        placeholder="Repite la contraseña"
                                                        value={authData.confirmPassword}
                                                        onChange={e => setAuthData({...authData, confirmPassword: e.target.value})}
                                                        style={{ flex: 1, padding: '0.75rem 0', border: 'none', background: 'transparent', fontSize: '0.95rem', color: deepTeal, fontWeight: 600, outline: 'none' }}
                                                    />
                                                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0 0.2rem' }}>
                                                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={authData.password !== authData.confirmPassword || !authData.password}
                                        style={{
                                            background: deepTeal,
                                            color: '#fff',
                                            padding: '1.1rem 2rem',
                                            borderRadius: '14px',
                                            border: 'none',
                                            fontWeight: 900,
                                            fontSize: '0.9rem',
                                            letterSpacing: '0.5px',
                                            cursor: 'pointer',
                                            marginTop: '0.5rem',
                                            opacity: (authData.password !== authData.confirmPassword || !authData.password) ? 0.45 : 1,
                                            transition: 'opacity 0.2s'
                                        }}
                                    >
                                        CONTINUAR AL CÍRCULO →
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <div 
                                    onClick={() => navigate('/')} 
                                    style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '8px', 
                                        cursor: 'pointer', 
                                        color: deepTeal, 
                                        fontWeight: '800', 
                                        fontSize: '0.75rem', 
                                        letterSpacing: '1px',
                                        opacity: 0.6,
                                        transition: 'all 0.3s ease',
                                        width: 'fit-content'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.transform = 'translateX(-5px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.opacity = 0.6; e.currentTarget.style.transform = 'translateX(0)'; }}
                                >
                                    <ArrowLeft size={16} />
                                    <span>VOLVER AL INICIO</span>
                                </div>

                                <div 
                                    onClick={() => { logout(); setStep(1); setIsHydrated(false); lastHydratedRef.current = null; }} 
                                    style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '8px', 
                                        cursor: 'pointer', 
                                        color: '#ef4444', 
                                        fontWeight: '800', 
                                        fontSize: '0.75rem', 
                                        letterSpacing: '1px',
                                        opacity: 0.6,
                                        transition: 'all 0.3s ease',
                                        width: 'fit-content'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.opacity = 1; }}
                                    onMouseLeave={e => { e.currentTarget.style.opacity = 0.6; }}
                                >
                                    <LogOut size={16} />
                                    <span>SALIR DEL PORTAL</span>
                                </div>
                            </div>
                            <h2 style={{ color: deepTeal, fontFamily: 'serif', fontSize: '2.5rem' }}>
                                {activeMember ? `¡Bienvenido, ${activeMember.name?.split(' ')[0]}!` : 'Tu Despensa'}
                            </h2>
                            <p style={{ color: '#666', marginBottom: '2rem' }}>
                                {user?.role === 'member' ? 'Gestiona los productos y frecuencia de tu círculo aquí.' : 'Selecciona los productos que deseas recibir periódicamente.'}
                            </p>

                            {isChangingPlan ? (
                                <div style={{ background: '#fff', padding: '2.5rem', borderRadius: '35px', border: `2px solid ${institutionOcre}`, marginBottom: '2rem', animation: 'fadeIn 0.4s ease' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                        <h3 style={{ color: deepTeal, margin: 0 }}>Mejora tu plan</h3>
                                        <button onClick={() => setIsChangingPlan(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontWeight: 'bold' }}>CANCELAR</button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                                        {planDurations.map(p => {
                                            const months = p.split(' ')[0];
                                            const isActive = subscriptionData.plan === p;
                                            return (
                                                <div 
                                                    key={p} 
                                                    onClick={() => setSubscriptionData(prev => ({ ...prev, plan: p }))}
                                                    style={{ 
                                                        padding: '1.5rem', 
                                                        borderRadius: '20px', 
                                                        textAlign: 'center', 
                                                        border: `2px solid ${isActive ? institutionOcre : '#eee'}`,
                                                        background: isActive ? '#fdfaf5' : '#fff',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.3s ease'
                                                    }}
                                                >
                                                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: deepTeal }}>{p}</div>
                                                    <div style={{ fontSize: '0.8rem', color: institutionOcre, fontWeight: '700' }}>{config[`plan_${months}_discount`]}% DTO</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <button 
                                        onClick={() => setIsChangingPlan(false)}
                                        style={{ width: '100%', marginTop: '1.5rem', background: deepTeal, color: '#fff', padding: '1rem', borderRadius: '50px', border: 'none', fontWeight: '900', cursor: 'pointer' }}
                                    >
                                        CONFIRMAR CAMBIO
                                    </button>
                                </div>
                            ) : (
                                <div className="input-group" style={{ margin: '1rem 0 2rem' }}>
                                    <Search size={18}/>
                                    <input type="text" placeholder="Buscar productos para tu despensa..." onChange={e => setProductSearch(e.target.value)}/>
                                </div>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.2rem' }}>
                                {filteredProducts.map(p => {
                                    const current = subscriptionData.products.find(sp => sp.id === p.id);
                                    const originalPrice = p.price;
                                    const rawDiscounted = originalPrice * (1 - (currentPlanConfig.discount / 100));
                                    const discountedPrice = Math.ceil(rawDiscounted / 50) * 50;
                                    const isDulce = p.product_type?.toLowerCase().includes('dulce') || p.category?.toLowerCase().includes('dulce');

                                    return (
                                        <div key={p.id} style={{ 
                                            background: '#fff', 
                                            padding: '1rem', 
                                            borderRadius: '24px', 
                                            border: current ? `2px solid ${institutionOcre}` : '1px solid #eee',
                                            display: 'grid',
                                            gridTemplateColumns: '80px 1fr',
                                            gap: '1rem',
                                            alignItems: 'center',
                                            transition: 'all 0.3s ease',
                                            boxShadow: current ? '0 10px 20px rgba(2, 83, 87, 0.05)' : 'none'
                                        }}>
                                            <div style={{ width: '80px', height: '80px', background: '#f9f9f9', borderRadius: '16px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {p.image_url ? (
                                                    <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <Sparkles size={24} color={institutionOcre} style={{ opacity: 0.3 }} />
                                                )}
                                            </div>
                                            
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div style={{ 
                                                        fontSize: '0.65rem', 
                                                        fontWeight: '900', 
                                                        textTransform: 'uppercase', 
                                                        letterSpacing: '1px',
                                                        color: isDulce ? '#d946ef' : deepTeal,
                                                        background: isDulce ? '#fdf4ff' : lightSage,
                                                        padding: '2px 8px',
                                                        borderRadius: '50px'
                                                    }}>
                                                        {isDulce ? 'DULCE' : 'SAL'}
                                                    </div>
                                                </div>
                                                <div style={{ fontWeight: '800', fontSize: '0.85rem', color: deepTeal, lineHeight: 1.2 }}>{p.name}</div>
                                                
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: '0.7rem', color: '#bbb', textDecoration: 'line-through' }}>
                                                            ${originalPrice.toLocaleString()}
                                                        </span>
                                                        <span style={{ fontSize: '1rem', fontWeight: '900', color: institutionOcre }}>
                                                            ${discountedPrice.toLocaleString()}
                                                        </span>
                                                    </div>
                                                    
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#f0f0f0', padding: '4px', borderRadius: '12px' }}>
                                                        <button 
                                                            onClick={() => handleProductChange(p.id, (current?.quantity || 0) - 1)} 
                                                            style={{ background: '#fff', border: 'none', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}
                                                        >
                                                            <Minus size={14} color={deepTeal} />
                                                        </button>
                                                        <span style={{ fontWeight: '900', fontSize: '0.9rem', minWidth: '20px', textAlign: 'center' }}>
                                                            {current?.quantity || 0}
                                                        </span>
                                                        <button 
                                                            onClick={() => handleProductChange(p.id, (current?.quantity || 0) + 1)} 
                                                            style={{ background: deepTeal, border: 'none', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(2, 83, 87, 0.2)' }}
                                                        >
                                                            <Plus size={14} color="#fff" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div style={{ background: deepTeal, color: '#fff', padding: '2rem', borderRadius: '30px', height: 'fit-content', position: 'sticky', top: '20px' }}>
                            <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.8rem', marginBottom: '1rem' }}>Resumen</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Plan:</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <b>{subscriptionData.plan}</b>
                                        <button 
                                            onClick={() => setIsChangingPlan(true)}
                                            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: institutionOcre, padding: '2px 8px', borderRadius: '4px', fontSize: '0.6rem', cursor: 'pointer', fontWeight: '900' }}
                                        >
                                            CAMBIAR
                                        </button>
                                    </div>
                                </div>
                                {planEndDate && (
                                    <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: planMetrics.isExpired ? '#ff4d4d' : institutionOcre, marginBottom: '6px' }}>
                                            <span>{planMetrics.isExpired ? 'Expiró el:' : 'Vence:'}</span>
                                            <b>{planEndDate}</b>
                                        </div>
                                        
                                        {/* Elegant Progress Bar */}
                                        {!planMetrics.isExpired && (
                                            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                                                <div style={{ 
                                                    width: `${planMetrics.progress}%`, 
                                                    height: '100%', 
                                                    background: planMetrics.isApproaching ? institutionOcre : '#4ade80', 
                                                    borderRadius: '10px', 
                                                    transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    boxShadow: planMetrics.isApproaching ? `0 0 10px ${institutionOcre}88` : 'none'
                                                }} />
                                            </div>
                                        )}
                                        
                                        <div style={{ 
                                            fontSize: '0.65rem', 
                                            marginTop: '6px', 
                                            opacity: 0.7, 
                                            fontWeight: '700', 
                                            textTransform: 'uppercase', 
                                            letterSpacing: '0.5px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            color: planMetrics.isExpired ? '#ff4d4d' : (planMetrics.isApproaching ? institutionOcre : '#fff')
                                        }}>
                                            {planMetrics.isExpired ? (
                                                <>Tu membresía ha caducado. Renuévala para recuperar tus beneficios.</>
                                            ) : (
                                                <>
                                                    <Clock size={10} />
                                                    {planMetrics.daysRemaining} días restantes {planMetrics.isApproaching && '— ¡RENOVAR RECOMENDADO!'}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Descuento:</span><b>{currentPlanConfig.discount}%</b></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Envío:</span><b>{shippingCost === 0 ? 'GRATIS' : `$${shippingCost.toLocaleString()}`}</b></div>
                            </div>

                            <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '10px', margin: '1.5rem 0', borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)', py: '1rem' }}>
                                <p style={{ fontSize: '0.75rem', color: institutionOcre, fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>Tu Despensa</p>
                                {subscriptionData.products.length === 0 ? (
                                    <p style={{ fontSize: '0.8rem', opacity: 0.5, fontStyle: 'italic' }}>Sin productos seleccionados</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {subscriptionData.products.map(p => {
                                            const discPrice = Math.ceil((p.price * (1 - currentPlanConfig.discount/100)) / 50) * 50;
                                            return (
                                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                        <span style={{ background: institutionOcre, color: deepTeal, width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.75rem' }}>{p.quantity}</span>
                                                        <span style={{ fontWeight: '600' }}>{p.name}</span>
                                                    </div>
                                                    <span style={{ opacity: 0.8 }}>${(discPrice * p.quantity).toLocaleString()}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <h2 style={{ color: institutionOcre, margin: 0, lineHeight: 1 }}>Total: ${totalAmount.toLocaleString()}</h2>
                                        {savings > 0 && (
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#4ade80', fontSize: '0.85rem', fontWeight: '800' }}>
                                                <Sparkles size={14} />
                                                AHORRASTE ${savings.toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Highly Visual Frequency Toggle - Now enabled for all */}
                                <div style={{ marginTop: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '1.2rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <p style={{ fontSize: '0.65rem', color: institutionOcre, fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Calendar size={12} /> Frecuencia de Entrega
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                        {['Semanal', 'Quincenal', 'Mensual'].map(freq => {
                                            const canEditFrequency = isChangingPlan || user?.role !== 'member' || !activeMember?.frequency;
                                            const isActive = subscriptionData.frequency === freq;
                                            
                                            return (
                                                <button
                                                    key={freq}
                                                    onClick={() => !canEditFrequency ? null : setSubscriptionData({...subscriptionData, frequency: freq})}
                                                    disabled={!canEditFrequency}
                                                    style={{
                                                        background: isActive ? institutionOcre : 'rgba(255,255,255,0.1)',
                                                        color: isActive ? deepTeal : '#fff',
                                                        border: 'none',
                                                        padding: '0.8rem 0.2rem',
                                                        borderRadius: '12px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '800',
                                                        cursor: !canEditFrequency ? 'default' : 'pointer',
                                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        boxShadow: isActive ? `0 4px 12px ${institutionOcre}44` : 'none',
                                                        transform: isActive ? 'scale(1.05)' : 'scale(1)',
                                                        opacity: !canEditFrequency && !isActive ? 0.3 : 1
                                                    }}
                                                >
                                                    {freq}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '1.5rem' }}>
                                <button 
                                    onClick={hasPendingChanges ? finalizeMembership : (user?.role === 'member' ? handleBoldPayment : finalizeMembership)} 
                                    disabled={isSaving || (user?.role !== 'member' && subscriptionData.products.length === 0)} 
                                    style={{ 
                                        width: '100%', 
                                        padding: '1.4rem', 
                                        background: institutionOcre, 
                                        color: deepTeal, 
                                        border: 'none', 
                                        borderRadius: '20px', 
                                        fontWeight: '900', 
                                        fontSize: '1.1rem', 
                                        cursor: 'pointer', 
                                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)', 
                                        transition: 'all 0.3s ease' 
                                    }}
                                >
                                    {isSaving ? 'PROCESANDO...' : (hasPendingChanges ? 'GUARDAR MI SUSCRIPCIÓN' : 'PAGAR MI SUSCRIPCIÓN')}
                                </button>

                                {user?.role === 'member' && (
                                    <button 
                                        onClick={handleCancelSubscription}
                                        style={{ 
                                            background: 'none', 
                                            color: 'rgba(255,255,255,0.4)', 
                                            width: '100%', 
                                            padding: '0.5rem', 
                                            border: 'none', 
                                            textDecoration: 'underline',
                                            fontSize: '0.7rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        DEJAR DE SER MIEMBRO
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {step === 5 && (
                    <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                        <CheckCircle size={80} color="#16a34a" style={{ marginBottom: '2rem' }}/>
                        <h1 style={{ color: deepTeal }}>¡Bienvenido al Círculo!</h1>
                        <p>Tu cuenta ha sido creada. Pronto nos pondremos en contacto para coordinar tu primer envío.</p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '3rem' }}>
                            <button onClick={() => navigate('/')} style={{ background: deepTeal, color: '#fff', padding: '1rem 3rem', borderRadius: '50px', border: 'none', fontWeight: '900', cursor: 'pointer', transition: 'all 0.3s ease' }}>VOLVER AL INICIO</button>
                        </div>
                    </div>
                )}

                {/* Onboarding Guide Modal for New Users */}
                {showGuideModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, width: '100%', height: '100%',
                        background: 'rgba(2, 83, 87, 0.4)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2000,
                        padding: '1.5rem',
                        animation: 'fadeIn 0.4s ease'
                    }}>
                        <div style={{
                            background: '#fff',
                            maxWidth: '500px',
                            width: '100%',
                            borderRadius: '40px',
                            padding: '3rem',
                            textAlign: 'center',
                            boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
                            position: 'relative'
                        }}>
                            <div style={{ 
                                width: '80px', height: '80px', 
                                background: lightSage, color: institutionOcre, 
                                borderRadius: '50%', display: 'flex', 
                                alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 1.5rem'
                            }}>
                                <Sparkles size={40} />
                            </div>
                            <h2 style={{ color: deepTeal, fontFamily: 'serif', fontSize: '2rem', marginBottom: '1rem' }}>¡Cuenta Creada!</h2>
                            <p style={{ color: '#666', marginBottom: '2rem', fontSize: '0.95rem' }}>
                                Bienvenido al Círculo. Sigue estos 4 pasos para activar tu primera entrega:
                            </p>
                            
                            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '2.5rem' }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div style={{ background: institutionOcre, color: deepTeal, minWidth: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.8rem' }}>1</div>
                                    <p style={{ margin: 0, fontSize: '0.9rem', color: deepTeal }}><b>Escoge los productos</b> que quieres recibir recurrentemente agregándolos a tu despensa.</p>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div style={{ background: institutionOcre, color: deepTeal, minWidth: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.8rem' }}>2</div>
                                    <p style={{ margin: 0, fontSize: '0.9rem', color: deepTeal }}><b>Define la frecuencia</b> de entrega (semanal, quincenal o mensual) en el resumen lateral.</p>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div style={{ background: institutionOcre, color: deepTeal, minWidth: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.8rem' }}>3</div>
                                    <p style={{ margin: 0, fontSize: '0.9rem', color: deepTeal }}>Pulsa en <b>"Guardar mi suscripción"</b> para asegurar tu selección en nuestro sistema.</p>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div style={{ background: institutionOcre, color: deepTeal, minWidth: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.8rem' }}>4</div>
                                    <p style={{ margin: 0, fontSize: '0.9rem', color: deepTeal }}>¡Listo! El botón pasará a ser <b>"Pagar mi suscripción"</b>. Púlsalo para finalizar el proceso.</p>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => setShowGuideModal(false)}
                                style={{
                                    width: '100%',
                                    background: deepTeal,
                                    color: '#fff',
                                    padding: '1.2rem',
                                    borderRadius: '50px',
                                    border: 'none',
                                    fontWeight: '900',
                                    letterSpacing: '1px',
                                    cursor: 'pointer',
                                    boxShadow: '0 10px 20px rgba(2, 83, 87, 0.2)'
                                }}
                            >
                                ¡ENTENDIDO, COMENZAR!
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes fadeInScale { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
                @keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-33.33%); } }

                .plan-card { transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1); box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
                .plan-card:hover { transform: translateY(-8px); box-shadow: 0 25px 50px rgba(2, 83, 87, 0.08); border-color: ${institutionOcre} !important; }
                .plan-card:hover button { transform: scale(1.02); box-shadow: 0 10px 20px rgba(2, 83, 87, 0.15); }

                .benefit-card { background: #fff; padding: 2rem; border-radius: 20px; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.02); }
                .input-group { display: flex; align-items: center; gap: 12px; background: #f0f0f0; padding: 0 18px; border-radius: 14px; height: 56px; border: 1px solid #eef2f6; transition: all 0.3s ease; }
                .input-group:focus-within { border-color: ${institutionOcre}; background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                .input-group input, .input-group select { border: none; background: transparent; outline: none; width: 100%; font-weight: 600; color: ${deepTeal}; font-size: 1.05rem; }
                
                /* Premium Carousel Layout Fix */
                .premium-carousel-container { 
                    margin-top: 3.5rem; 
                    overflow: hidden; 
                    position: relative; 
                    width: 100vw; 
                    margin-left: calc(-50vw + 50%); 
                }
                
                .premium-carousel-container::before,
                .premium-carousel-container::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    width: 15%;
                    height: 100%;
                    z-index: 2;
                    pointer-events: none;
                }
                .premium-carousel-container::before {
                    left: 0;
                    background: linear-gradient(to right, ${lightSage}, transparent);
                }
                .premium-carousel-container::after {
                    right: 0;
                    background: linear-gradient(to left, ${lightSage}, transparent);
                }

                .carousel-track-container { position: relative; height: 320px; overflow: hidden; }
                .carousel-track {
                    display: flex;
                    width: fit-content;
                    animation: scroll 60s linear infinite;
                }
                .carousel-track:hover { animation-play-state: paused; }
                
                .carousel-item { width: 250px; padding: 0 0.8rem; flex-shrink: 0; }
                .product-show-card { 
                    background: #fff; 
                    border-radius: 24px; 
                    padding: 1.2rem; 
                    border: 1px solid #f2f2f2; 
                    transition: all 0.4s ease; 
                    height: 300px; 
                    display: flex; 
                    flex-direction: column; 
                    align-items: center; 
                    text-align: center;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.02);
                }
                .product-show-card:hover { border-color: ${institutionOcre}; transform: scale(1.02); box-shadow: 0 15px 40px rgba(0,0,0,0.06); }
                .product-image-box { width: 100%; height: 210px; background: #fafafa; border-radius: 16px; overflow: hidden; display: flex; align-items: center; justify-content: center; margin-bottom: 0.8rem; }
                .product-image-box img { width: 100%; height: 100%; object-fit: cover; }
                .product-info h4 { margin: 0; font-size: 0.95rem; color: ${deepTeal}; font-weight: 900; }
                .product-info p { margin: 0.3rem 0 0; font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 1px; }

                @media (max-width: 768px) {
                    .carousel-track { animation-duration: 40s; }
                    .carousel-item { width: 220px; }
                    .product-show-card { height: 260px; }
                    .product-image-box { height: 180px; }
                }
            `}</style>
        </div>
    );
};

export default RecurringCustomers;
