import React, { useState, useEffect } from 'react';
import { Save, Truck, MapPin, Anchor, Scale, Calculator, Info, CheckCircle, ChevronDown, ChevronUp, ShieldCheck, Eye, EyeOff, Globe } from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';

const ShippingField = ({ label, icon, value, onChange, prefix, suffix }) => (
    <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.6rem', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {icon} {label}
        </label>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            {prefix && <span style={{ position: 'absolute', left: '1.2rem', color: '#64748b', fontWeight: '700' }}>{prefix}</span>}
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{
                    flex: 1, 
                    padding: '1rem', 
                    paddingLeft: prefix ? '2.5rem' : '1.2rem',
                    paddingRight: suffix ? '4rem' : '1.2rem',
                    borderRadius: '14px', 
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc', 
                    fontSize: '1rem', 
                    color: '#334155', 
                    fontWeight: '700',
                    outline: 'none', 
                    transition: 'all 0.3s'
                }}
            />
            {suffix && <span style={{ position: 'absolute', right: '1.2rem', color: '#94a3b8', fontWeight: '600', fontSize: '0.75rem' }}>{suffix}</span>}
        </div>
    </div>
);

const ShippingAdmin = () => {
    const { siteContent, updateSiteContent, units, unitConversions, saveConversion } = useBusiness();
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingMatrix, setIsSavingMatrix] = useState(false);
    const [matrixChanges, setMatrixChanges] = useState({});

    const [config, setConfig] = useState({
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
        bold_prod_secret: '',
        contact_instagram: '',
        contact_email: '',
        contact_phone: '',
        contact_linkedin: ''
    });

    const [showKeys, setShowKeys] = useState({
        sandbox_identity: false,
        sandbox_secret: false,
        prod_identity: false,
        prod_secret: false
    });

    useEffect(() => {
        if (siteContent.web_shipping) {
            setConfig({
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
                bold_prod_secret: siteContent.web_shipping.bold_prod_secret || '',
                contact_instagram: siteContent.web_shipping.contact_instagram || '',
                contact_email: siteContent.web_shipping.contact_email || '',
                contact_phone: siteContent.web_shipping.contact_phone || '',
                contact_linkedin: siteContent.web_shipping.contact_linkedin || ''
            });
        }
    }, [siteContent.web_shipping]);

    const handleSaveAll = async () => {
        setIsSaving(true);
        try {
            const promises = Object.entries(config).map(([key, val]) => {
                const safeVal = (val === null || val === undefined) ? '' : val.toString();
                return updateSiteContent('web_shipping', key, safeVal);
            });
            await Promise.all(promises);
            alert("¡Configuración guardada exitosamente!");
        } catch (err) {
            console.error("Error saving ship settings", err);
            alert("Error al guardar la configuración.");
        }
        setIsSaving(false);
    };

    const updateValue = (key, val) => {
        setConfig(prev => ({ ...prev, [key]: val }));
    };

    // Simulator
    const [simJars, setSimJars] = useState(3);
    const totalWeight = simJars * config.weight_per_sku;
    const roundedWeight = Math.ceil(totalWeight);
    const costLocal = roundedWeight * config.tarifa_local;
    const costRegional = roundedWeight * config.tarifa_regional;
    const costNacional = roundedWeight * config.tarifa_nacional;

    const handleMatrixChange = (from, to, value) => {
        setMatrixChanges(prev => ({
            ...prev,
            [`${from}_${to}`]: value
        }));
    };

    const handleSaveConversions = async () => {
        setIsSavingMatrix(true);
        try {
            const promises = Object.entries(matrixChanges).map(([key, val]) => {
                const [from, to] = key.split('_');
                return saveConversion(from, to, val);
            });
            await Promise.all(promises);
            setMatrixChanges({});
            alert("¡Matriz de equivalencias actualizada!");
        } catch (err) {
            console.error("Error saving matrix", err);
            alert("Error al guardar la matriz.");
        }
        setIsSavingMatrix(false);
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.8rem', color: '#023636', margin: 0, fontWeight: '800' }}>Configuración del Sistema y E-commerce</h2>
                    <p style={{ color: '#64748b', marginTop: '0.4rem', fontWeight: '500' }}>Modelo de cobro por Trayectos y Redondeo de Peso</p>
                </div>
                <button 
                    onClick={handleSaveAll}
                    disabled={isSaving}
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem 1.8rem', 
                        background: '#023636', color: '#fff', border: 'none', borderRadius: '16px', 
                        fontWeight: '700', cursor: isSaving ? 'not-allowed' : 'pointer',
                        boxShadow: '0 10px 20px rgba(2, 54, 54, 0.2)', transition: 'all 0.3s'
                    }}
                >
                    {isSaving ? 'Guardando...' : <><Save size={18} /> Guardar Todo</>}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    
                    {/* Tariffs Card */}
                    <div style={{ background: '#fff', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ fontSize: '1.1rem', color: '#023636', marginBottom: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <Anchor size={20} color="#D4785A" /> Tarifas por Kilo (Interrapidisimo)
                        </h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                            <ShippingField label="Trayecto Local" value={config.tarifa_local} prefix="$" onChange={v => updateValue('tarifa_local', v)} />
                            <ShippingField label="Trayecto Regional" value={config.tarifa_regional} prefix="$" onChange={v => updateValue('tarifa_regional', v)} />
                            <ShippingField label="Trayecto Nacional" value={config.tarifa_nacional} prefix="$" onChange={v => updateValue('tarifa_nacional', v)} />
                        </div>
                        
                        <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                                <Info size={16} color="#64748b" />
                                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>Nota de Redondeo Interno</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', lineHeight: '1.5' }}>
                                El sistema aplica <strong>Math.ceil()</strong> al peso total. Ejemplo: 1.2kg se cobra como 2kg, igual que en la oficina de Interrapidisimo.
                            </p>
                        </div>
                    </div>

                    {/* Global Rules Card */}
                    <div style={{ background: '#fff', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ fontSize: '1.1rem', color: '#023636', marginBottom: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <Scale size={20} color="#D4785A" /> Reglas de Negocio
                        </h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <ShippingField label="Umbral Envío Gratis" value={config.threshold_free} prefix="$" onChange={v => updateValue('threshold_free', v)} />
                            <ShippingField label="Peso por Frasco (Kg)" value={config.weight_per_sku} suffix="KG" onChange={v => updateValue('weight_per_sku', v)} />
                        </div>
                    </div>

                    <div style={{ background: '#fff', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem', color: '#023636', margin: 0, fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <ShieldCheck size={20} color="#D4785A" /> Pasarela de Pago (Bold)
                            </h3>
                            <div 
                                onClick={async () => {
                                    const nextMode = config.bold_mode === 'production' ? 'sandbox' : 'production';
                                    await updateSiteContent('web_shipping', 'bold_mode', nextMode);
                                    // Update local config immediately so UI doesn't wait for snapshot
                                    updateValue('bold_mode', nextMode);
                                }}
                                style={{
                                    padding: '0.4rem 1.2rem',
                                    borderRadius: '50px',
                                    background: config.bold_mode === 'production' ? '#fef2f2' : '#f0fdf4',
                                    color: config.bold_mode === 'production' ? '#ef4444' : '#16a34a',
                                    fontSize: '0.75rem',
                                    fontWeight: '900',
                                    cursor: 'pointer',
                                    border: `2px solid ${config.bold_mode === 'production' ? '#fee2e2' : '#dcfce7'}`,
                                    textTransform: 'uppercase',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    userSelect: 'none'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 15px rgba(0,0,0,0.12)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
                            >
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: config.bold_mode === 'production' ? '#ef4444' : '#16a34a', boxShadow: `0 0 10px ${config.bold_mode === 'production' ? '#ef4444' : '#16a34a'}` }} />
                                {config.bold_mode === 'production' ? 'PRODUCCIÓN' : 'SANDBOX (PRUEBAS)'}
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Sandbox Configuration */}
                            <div style={{ padding: '1.5rem', borderRadius: '20px', background: config.bold_mode === 'sandbox' ? '#f8fafc' : '#fafafa', border: `2px solid ${config.bold_mode === 'sandbox' ? '#e2e8f0' : '#f1f5f9'}`, opacity: config.bold_mode === 'sandbox' ? 1 : 0.6, transition: 'all 0.4s' }}>
                                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', fontWeight: '800', color: '#475569' }}>MODO PRUEBA (SANDBOX)</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        <label style={{ fontSize: '0.65rem', fontWeight: '800', color: '#94a3b8' }}>LLAVE IDENTIDAD (PUBLIC)</label>
                                        <div style={{ position: 'relative' }}>
                                            <input 
                                                type={showKeys.sandbox_identity ? "text" : "password"} 
                                                placeholder="pub_test_..."
                                                value={config.bold_sandbox_identity || ''} 
                                                onChange={(e) => updateValue('bold_sandbox_identity', e.target.value)}
                                                style={{ width: '100%', padding: '0.7rem', paddingRight: '2.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem', fontFamily: 'monospace' }}
                                            />
                                            <div 
                                                onClick={() => setShowKeys(prev => ({ ...prev, sandbox_identity: !prev.sandbox_identity }))}
                                                style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#94a3b8' }}
                                            >
                                                {showKeys.sandbox_identity ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        <label style={{ fontSize: '0.65rem', fontWeight: '800', color: '#94a3b8' }}>LLAVE SECRETA (SECRET)</label>
                                        <div style={{ position: 'relative' }}>
                                            <input 
                                                type={showKeys.sandbox_secret ? "text" : "password"}
                                                placeholder="sec_test_..."
                                                value={config.bold_sandbox_secret || ''} 
                                                onChange={(e) => updateValue('bold_sandbox_secret', e.target.value)}
                                                style={{ width: '100%', padding: '0.7rem', paddingRight: '2.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem', fontFamily: 'monospace' }}
                                            />
                                            <div 
                                                onClick={() => setShowKeys(prev => ({ ...prev, sandbox_secret: !prev.sandbox_secret }))}
                                                style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#94a3b8' }}
                                            >
                                                {showKeys.sandbox_secret ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Production Configuration */}
                            <div style={{ padding: '1.2rem', borderRadius: '16px', background: config.bold_mode === 'production' ? '#fffaf8' : '#fafafa', border: `1px solid ${config.bold_mode === 'production' ? '#ffedd5' : '#f1f5f9'}`, opacity: config.bold_mode === 'production' ? 1 : 0.6 }}>
                                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', fontWeight: '800', color: '#c2410c' }}>MODO REAL (PRODUCCIÓN)</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        <label style={{ fontSize: '0.65rem', fontWeight: '800', color: '#94a3b8' }}>LLAVE IDENTIDAD (PUBLIC)</label>
                                        <div style={{ position: 'relative' }}>
                                            <input 
                                                type={showKeys.prod_identity ? "text" : "password"}
                                                placeholder="pub_prod_..."
                                                value={config.bold_prod_identity || ''} 
                                                onChange={(e) => updateValue('bold_prod_identity', e.target.value)}
                                                style={{ width: '100%', padding: '0.7rem', paddingRight: '2.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem', fontFamily: 'monospace' }}
                                            />
                                            <div 
                                                onClick={() => setShowKeys(prev => ({ ...prev, prod_identity: !prev.prod_identity }))}
                                                style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#94a3b8' }}
                                            >
                                                {showKeys.prod_identity ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        <label style={{ fontSize: '0.65rem', fontWeight: '800', color: '#94a3b8' }}>LLAVE SECRETA (SECRET)</label>
                                        <div style={{ position: 'relative' }}>
                                            <input 
                                                type={showKeys.prod_secret ? "text" : "password"}
                                                placeholder="sec_prod_..."
                                                value={config.bold_prod_secret || ''} 
                                                onChange={(e) => updateValue('bold_prod_secret', e.target.value)}
                                                style={{ width: '100%', padding: '0.7rem', paddingRight: '2.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem', fontFamily: 'monospace' }}
                                            />
                                            <div 
                                                onClick={() => setShowKeys(prev => ({ ...prev, prod_secret: !prev.prod_secret }))}
                                                style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#94a3b8' }}
                                            >
                                                {showKeys.prod_secret ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', lineHeight: '1.4' }}>
                                <Info size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                Bold.co &gt; Integraciones &gt; Llaves de integración. 
                                La <strong>Firma de Integridad</strong> se genera automáticamente para cada compra.
                            </p>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Simulation Card */}
                    <div style={{ background: 'linear-gradient(135deg, #023636 0%, #034d4d 100%)', padding: '2.5rem', borderRadius: '24px', color: '#fff', boxShadow: '0 20px 40px rgba(2, 54, 54, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem', opacity: 0.8 }}>
                            <Calculator size={20} />
                            <span style={{ fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Simulador de Escenario</span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                            <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>Si un cliente compra</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '12px' }}>
                                <button onClick={() => setSimJars(Math.max(1, simJars-1))} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>-</button>
                                <span style={{ fontWeight: '800', fontSize: '1.2rem' }}>{simJars}</span>
                                <button onClick={() => setSimJars(simJars+1)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>+</button>
                            </div>
                            <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>frascos:</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.6, marginBottom: '0.3rem' }}>PESO REAL</div>
                                <div style={{ fontWeight: '800', fontSize: '1.4rem' }}>{totalWeight.toFixed(2)} KG</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.6, marginBottom: '0.3rem' }}>PESO A COBRAR (Redondeado)</div>
                                <div style={{ fontWeight: '800', fontSize: '1.4rem', color: '#fbbf24' }}>{roundedWeight} KG</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ opacity: 0.7 }}>A Guasca (Mismo municipio):</span>
                                <span style={{ fontWeight: '800', fontSize: '1.2rem' }}>${costLocal.toLocaleString('es-CO')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ opacity: 0.7 }}>A Bogotá / Regional:</span>
                                <span style={{ fontWeight: '800', fontSize: '1.2rem' }}>${costRegional.toLocaleString('es-CO')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ opacity: 0.7 }}>A Medellín / Nacional:</span>
                                <span style={{ fontWeight: '800', fontSize: '1.2rem' }}>${costNacional.toLocaleString('es-CO')}</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', gap: '1.2rem' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', flexShrink: 0 }}>
                            <Info size={24} />
                        </div>
                        <div>
                            <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.9rem', color: '#0f172a', fontWeight: '800' }}>Configuración Geográfica</h4>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: '1.5' }}>
                                Guasca está configurado como <strong>Local</strong>. Bogotá, Cundinamarca y Boyacá son <strong>Regional</strong>. El resto del mapa es <strong>Nacional</strong>.
                            </p>
                        </div>
                    </div>

                    {/* NEW: Social & Contact Card */}
                    <div style={{ background: '#fff', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ fontSize: '1.1rem', color: '#023636', marginBottom: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <Globe size={20} color="#D4785A" /> Contacto & Redes Sociales
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>INSTAGRAM (URL)</label>
                                <input 
                                    type="text" 
                                    placeholder="https://instagram.com/tu_usuario"
                                    value={config.contact_instagram || ''} 
                                    onChange={(e) => updateValue('contact_instagram', e.target.value)}
                                    style={smallInputStyle}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>CORREO ELECTRÓNICO</label>
                                <input 
                                    type="email" 
                                    placeholder="contacto@zeticas.com"
                                    value={config.contact_email || ''} 
                                    onChange={(e) => updateValue('contact_email', e.target.value)}
                                    style={smallInputStyle}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>WHATSAPP / TELÉFONO</label>
                                    <input 
                                        type="text" 
                                        placeholder="+573000000000"
                                        value={config.contact_phone || ''} 
                                        onChange={(e) => updateValue('contact_phone', e.target.value)}
                                        style={smallInputStyle}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569' }}>LINKEDIN (URL)</label>
                                    <input 
                                        type="text" 
                                        placeholder="https://linkedin.com/company/..."
                                        value={config.contact_linkedin || ''} 
                                        onChange={(e) => updateValue('contact_linkedin', e.target.value)}
                                        style={smallInputStyle}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Matriz de Equivalencias de Unidades */}
            <div style={{ marginTop: '3rem', background: '#fff', padding: '2.5rem', borderRadius: '32px', border: '1px solid #e2e8f0', boxShadow: '0 20px 50px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h3 style={{ fontSize: '1.4rem', color: '#023636', margin: 0, fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <Scale size={24} color="#D4785A" /> Matriz de Equivalencias de Unidades
                        </h3>
                        <p style={{ color: '#64748b', marginTop: '0.4rem', fontWeight: '500', fontSize: '0.85rem' }}>
                            Define cuánto pesa o mide una unidad de conteo para estandarizar recetas y compras.
                        </p>
                    </div>
                </div>

                <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                <th style={{ padding: '1.2rem', borderBottom: '2px solid #e2e8f0', width: '220px' }}>
                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: '900', textTransform: 'uppercase' }}>Unidad de Conteo (Origen)</div>
                                </th>
                                {/* Standard Reference Columns */}
                                {['kg', 'gr', 'lt', 'ml'].map(id => {
                                    const u = (units || []).find(u => u.id === id);
                                    if (!u) return null;
                                    return (
                                        <th key={u.id} style={{ padding: '1.2rem', borderBottom: '2px solid #e2e8f0', textAlign: 'center', background: '#f0fdf4' }}>
                                            <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: '900' }}>{u.name.toUpperCase()}</div>
                                            <div style={{ fontSize: '0.6rem', color: '#15803d' }}>REF SI</div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {(units || []).filter(u => u.category === 'Conteo').map(rowUnit => (
                                <tr key={rowUnit.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '1.2rem', background: '#fcfcfc' }}>
                                        <div style={{ fontWeight: '900', color: '#1e293b', fontSize: '0.9rem' }}>{rowUnit.name}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>{rowUnit.id}</div>
                                    </td>
                                    {['kg', 'gr', 'lt', 'ml'].map(id => {
                                        const colUnit = (units || []).find(u => u.id === id);
                                        if (!colUnit) return null;
                                        const isSame = rowUnit.id === colUnit.id;
                                        const convs = unitConversions || {};
                                        const currentVal = isSame ? 1 : (matrixChanges[`${rowUnit.id}_${colUnit.id}`] ?? convs[rowUnit.id]?.[colUnit.id] ?? '');

                                        return (
                                            <td key={colUnit.id} style={{ padding: '0.5rem', textAlign: 'center', background: '#f0fdf420' }}>
                                                {isSame ? (
                                                    <div style={{ color: '#16653450', fontWeight: '900', fontSize: '0.8rem' }}>1.0</div>
                                                ) : (
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        value={currentVal}
                                                        onChange={(e) => handleMatrixChange(rowUnit.id, colUnit.id, e.target.value)}
                                                        placeholder="0.00"
                                                        style={{
                                                            width: '85px',
                                                            padding: '0.6rem',
                                                            textAlign: 'center',
                                                            borderRadius: '8px',
                                                            border: '1px solid #dcfce7',
                                                            background: currentVal ? '#fff' : 'transparent',
                                                            fontSize: '0.85rem',
                                                            fontWeight: '900',
                                                            color: '#166534',
                                                            outline: 'none',
                                                            boxShadow: currentVal ? '0 2px 5px rgba(0,0,0,0.05)' : 'none'
                                                        }}
                                                    />
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem 1.2rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <Info size={16} color="#64748b" />
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>
                            Las conversiones de Peso (kg ↔ gr) y Volumen (lt ↔ ml) son <strong>automáticas</strong>.
                        </span>
                    </div>
                    <button
                        onClick={handleSaveConversions}
                        disabled={isSavingMatrix}
                        style={{
                            padding: '0.8rem 2rem',
                            background: '#D4785A',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '14px',
                            fontWeight: '800',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.8rem',
                            boxShadow: '0 10px 20px rgba(212, 120, 90, 0.2)'
                        }}
                    >
                        {isSavingMatrix ? 'Sincronizando...' : <><Save size={18} /> Guardar Matriz de Relación</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

const smallInputStyle = {
    width: '100%', 
    padding: '0.8rem', 
    borderRadius: '10px', 
    border: '1px solid #e2e8f0', 
    fontSize: '0.85rem', 
    background: '#f8fafc',
    color: '#334155',
    fontWeight: '600'
};

export default ShippingAdmin;
