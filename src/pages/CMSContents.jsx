import React, { useState, useEffect } from 'react';
import { Save, Layout, Type, MessageSquare, CheckCircle, Globe, Truck, Users, Briefcase, Bookmark, Megaphone, Image as ImageIcon, Camera, UploadCloud, Zap } from 'lucide-react';
import { useBusiness, CAMPAIGN_PRESETS } from '../context/BusinessContext';
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const deepTeal = "#025357";
const institutionOcre = "#D6BD98";

const CMSField = ({ label, type, section, fieldKey, initialValue, onSave, options = [] }) => {
    const [localValue, setLocalValue] = useState(initialValue || '');
    const [hasChanged, setHasChanged] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        setLocalValue(initialValue || '');
    }, [initialValue]);

    const handleChange = (val) => {
        setLocalValue(val);
        setHasChanged(val !== initialValue);
    };

    const handleBlur = () => {
        if (hasChanged) {
            onSave(fieldKey, localValue);
            setHasChanged(false);
        }
    };

    const handleToggle = () => {
        const newValue = !localValue;
        setLocalValue(newValue);
        onSave(fieldKey, newValue);
    };

    const handleSelect = (val) => {
        setLocalValue(val);
        onSave(fieldKey, val);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const storageRef = ref(storage, `site_assets/${section}/${fieldKey}_${Date.now()}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            setLocalValue(downloadURL);
            onSave(fieldKey, downloadURL);
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("No se pudo subir la imagen. Verifica tu conexión.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div style={{ marginBottom: '2.5rem', background: '#fff', padding: '1.5rem', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <label style={{ fontWeight: '900', color: '#004B50', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {label}
                </label>
                {type === 'toggle' && (
                    <div 
                        onClick={handleToggle}
                        style={{ width: '44px', height: '24px', borderRadius: '12px', background: localValue ? '#004B50' : '#e2e8f0', cursor: 'pointer', position: 'relative', transition: 'all 0.3s' }}
                    >
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: localValue ? '23px' : '3px', transition: 'all 0.3s' }} />
                    </div>
                )}
            </div>
            
            {type === 'textarea' && (
                <textarea
                    value={localValue}
                    onChange={(e) => handleChange(e.target.value)}
                    onBlur={handleBlur}
                    style={{
                        width: '100%', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0',
                        background: '#f8fafc', fontSize: '0.95rem', color: '#1e293b', fontWeight: '500',
                        minHeight: '100px', resize: 'vertical', outline: 'none'
                    }}
                />
            )}
            
            {type === 'text' && (
                <input
                    type="text"
                    value={localValue}
                    onChange={(e) => handleChange(e.target.value)}
                    onBlur={handleBlur}
                    style={{
                        width: '100%', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0',
                        background: '#f8fafc', fontSize: '0.95rem', color: '#1e293b', fontWeight: '500', outline: 'none'
                    }}
                />
            )}

            {type === 'select' && (
                <select
                    value={localValue}
                    onChange={(e) => handleSelect(e.target.value)}
                    style={{
                        width: '100%', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0',
                        background: '#f8fafc', fontSize: '0.95rem', color: '#1e293b', fontWeight: '500', outline: 'none'
                    }}
                >
                    <option value="">Seleccionar...</option>
                    {options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            )}

            {type === 'image' && (
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <div style={{ width: '100px', height: '100px', borderRadius: '20px', background: '#f1f5f9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #cbd5e1' }}>
                        {localValue ? (
                            <img src={localValue} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <ImageIcon size={30} color="#94a3b8" />
                        )}
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ 
                            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.8rem 1.5rem', 
                            background: '#004B50', color: '#fff', borderRadius: '14px', fontSize: '0.85rem', 
                            fontWeight: '700', cursor: isUploading ? 'not-allowed' : 'pointer', transition: 'all 0.3s'
                        }}>
                             {isUploading ? <div className="spinner-small" /> : <UploadCloud size={18} />}
                             {isUploading ? 'Subiendo...' : 'Subir Imagen'}
                             <input type="file" onChange={handleImageUpload} style={{ display: 'none' }} disabled={isUploading} accept="image/*" />
                        </label>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '10px' }}>
                            Sube una fotografía de alta calidad (JPG, PNG). El sistema generará una URL segura automáticamente.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

const CMSContents = () => {
    const { siteContent, updateSiteContent, items } = useBusiness();
    const [activeTab, setActiveTab] = useState('campaign');
    const [lastStatus, setLastStatus] = useState('saved'); // 'saved', 'saving', 'error'

    const navigationGroups = [
        {
            title: 'Estrategia y SEO',
            items: [
                { id: 'campaign', label: 'Campaña de Temporada', icon: <Megaphone size={18} /> },
                { id: 'seo', label: 'SEO & Posicionamiento', icon: <Globe size={18} /> },
                { id: 'recurring', label: 'Clientes Recurrentes', icon: <Zap size={18} /> },
            ]
        },
        {
            title: 'Contenido del Sitio',
            items: [
                { id: 'hero', label: 'Hero / Inicio', icon: <Layout size={18} /> },
                { id: 'philosophy', label: 'Filosofía', icon: <Type size={18} /> },
                { id: 'support', label: 'Apoyo & Soporte', icon: <MessageSquare size={18} /> },
            ]
        }
    ];

    const handleSave = async (key, value) => {
        if (!key || value === undefined) {
            console.error(`[handleSave] Blocked undefined save attempt for key: ${key}`);
            return;
        }
        
        console.log(`[ContentSync] Synchronizing ${activeTab} -> ${key}:`, value);
        setLastStatus('saving');
        const result = await updateSiteContent(activeTab, key, value);
        
        if (result.success) {
            setLastStatus('saved');
        } else {
            setLastStatus('error');
            alert(`Error al guardar: ${result.error}. Asegúrate de que las políticas de BD (RLS) lo permitan.`);
        }
    };

    const allSections = navigationGroups.flatMap(g => g.items);
    const content = siteContent[activeTab] || {};

    return (
        <div style={{ padding: window.innerWidth < 768 ? '1.5rem' : '2.5rem', animation: 'fadeIn 0.5s ease', background: '#fbfcfd', minHeight: 'calc(100vh - 100px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                <div>
                    <h2 style={{ fontSize: window.innerWidth < 768 ? '1.8rem' : '2.4rem', fontWeight: '900', color: '#004B50', margin: 0, letterSpacing: '-1px' }}>Editor Global de Textos</h2>
                    <p style={{ color: '#64748b', fontSize: window.innerWidth < 768 ? '0.85rem' : '1rem', fontWeight: '600', marginTop: '5px' }}>Modifica toda la narrativa de la landing page sin código.</p>
                </div>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    {/* SEO ENGINE POWER SWITCH */}
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        background: '#fff', 
                        padding: '0.6rem 1.2rem', 
                        borderRadius: '20px', 
                        boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                        border: '1px solid #f1f5f9'
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1 }}>Motor SEO</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: (siteContent.seo?.engine_active !== false) ? '#025357' : '#64748b' }}>
                                {(siteContent.seo?.engine_active !== false) ? 'ENCENDIDO' : 'APAGADO'}
                            </span>
                        </div>
                        <div 
                            onClick={() => updateSiteContent('seo', 'engine_active', !(siteContent.seo?.engine_active !== false))}
                            style={{ 
                                width: '48px', 
                                height: '26px', 
                                borderRadius: '13px', 
                                background: (siteContent.seo?.engine_active !== false) ? '#025357' : '#e2e8f0', 
                                cursor: 'pointer', 
                                position: 'relative', 
                                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                boxShadow: (siteContent.seo?.engine_active !== false) ? '0 4px 10px rgba(2,83,87,0.3)' : 'none'
                             }}
                        >
                            <div style={{ 
                                width: '20px', 
                                height: '20px', 
                                borderRadius: '50%', 
                                background: '#fff', 
                                position: 'absolute', 
                                top: '3px', 
                                left: (siteContent.seo?.engine_active !== false) ? '25px' : '3px', 
                                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }} />
                        </div>
                    </div>

                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        background: '#fff', 
                        padding: '0.8rem 1.5rem', 
                        borderRadius: '20px', 
                        boxShadow: '0 4px 15px rgba(0,0,0,0.05)', 
                        color: lastStatus === 'saving' ? '#fbbf24' : lastStatus === 'error' ? '#ef4444' : '#10b981', 
                        fontWeight: '700', 
                        fontSize: '0.9rem',
                        transition: 'all 0.3s ease'
                    }}>
                        {lastStatus === 'saving' && <div className="spinner-small" />}
                        {lastStatus === 'saved' && <Save size={18} />}
                        {lastStatus === 'error' && <Layout size={18} />}
                        {lastStatus === 'saving' ? 'Sincronizando...' : lastStatus === 'error' ? 'Error al Guardar' : 'Cambios Sincronizados'}
                    </div>
                </div>
            </div>

            <div style={{ 
                display: 'flex', 
                flexDirection: window.innerWidth < 1024 ? 'column' : 'row',
                gap: window.innerWidth < 1024 ? '1.5rem' : '3rem' 
            }}>
                {/* Sidebar Navigation */}
                <div style={{ height: 'fit-content', width: window.innerWidth < 1024 ? '100%' : '300px' }}>
                    <div style={{ background: '#fff', borderRadius: '32px', padding: '1.2rem', boxShadow: '0 15px 40px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                        {navigationGroups.map((group, idx) => (
                            <div key={group.id} style={{ marginBottom: idx === 0 ? '1.5rem' : 0 }}>
                                <div style={{ padding: '0.8rem 1rem', fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '0.5rem' }}>
                                    {group.title}
                                </div>
                                {group.items.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '1rem', width: '100%',
                                            padding: '1rem 1.2rem', border: 'none', background: activeTab === item.id ? '#004B50' : 'transparent',
                                            color: activeTab === item.id ? '#fff' : '#64748b', borderRadius: '18px', cursor: 'pointer',
                                            fontSize: '0.85rem', fontWeight: '800', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                            marginBottom: '0.3rem', textAlign: 'left', boxShadow: activeTab === item.id ? '0 8px 20px rgba(0,75,80,0.15)' : 'none',
                                            transform: activeTab === item.id ? 'translateX(5px)' : 'none'
                                        }}
                                    >
                                        <span style={{ opacity: activeTab === item.id ? 1 : 0.5 }}>{item.icon}</span>
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Editor Surface */}
                <div style={{ 
                    background: '#fff', 
                    borderRadius: window.innerWidth < 768 ? '32px' : '48px', 
                    padding: window.innerWidth < 768 ? '2rem' : '4.5rem', 
                    boxShadow: '0 30px 60px rgba(0,0,0,0.04)', 
                    border: '1px solid #f1f5f9',
                    flex: 1
                }}>
                    <div style={{ marginBottom: '4rem', borderBottom: '1px solid #f8fafc', paddingBottom: '2.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#004B50', marginBottom: '0.5rem' }}>
                            {allSections.find(s => s.id === activeTab)?.icon}
                            <span style={{ fontWeight: '900', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px' }}>Personalización en Vivo</span>
                        </div>
                        <h3 style={{ fontSize: '2rem', fontWeight: '900', color: '#1e293b', margin: 0, letterSpacing: '-0.5px' }}>
                            {allSections.find(s => s.id === activeTab)?.label}
                        </h3>
                    </div>

                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        {activeTab === 'seo' && (
                             <div style={{ marginBottom: '2rem' }}>
                                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '24.5px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
                                    <h4 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', color: '#004B50' }}>
                                        <Globe size={20} /> Guía de Uso del Motor SEO
                                    </h4>
                                    <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#64748b', fontSize: '0.85rem', lineHeight: '1.6' }}>
                                        <li><strong>Título:</strong> Menos de 60 caracteres. Incluye la palabra clave principal al inicio.</li>
                                        <li><strong>Descripción:</strong> Entre 150-160 caracteres. Debe ser una invitación a entrar.</li>
                                        <li><strong>Imágenes OG:</strong> Recomendado 1200x630px para que se vean bien en WhatsApp e Instagram.</li>
                                    </ul>
                                </div>
                                <div style={{ 
                                    marginTop: '1rem', 
                                    paddingLeft: '1rem', 
                                    borderLeft: '4px solid #0ea5e9', 
                                    fontSize: '0.85rem', 
                                    fontStyle: 'italic',
                                    color: '#075985' 
                                }}>
                                    💡 Nota: Si la **Campaña de Temporada** está activa, el título y descripción del Home se actualizarán automáticamente con el mensaje de la campaña.
                                </div>
                            </div>
                        )}

                        {(() => {
                            const SECTION_FIELDS = {
                                hero: [
                                    { key: 'top_text', label: 'Texto Superior (Provincia)', type: 'text' },
                                    { key: 'title', label: 'Título Principal Zeticas', type: 'text' },
                                    { key: 'description', label: 'Descripción / Slogan', type: 'textarea' },
                                    { key: 'cta_text', label: 'Texto Botón Acción', type: 'text' },
                                ],
                                philosophy: [
                                    { key: 'title', label: 'Título Sección', type: 'text' },
                                    { key: 'subtitle', label: 'Subtítulo Destacado', type: 'text' },
                                ],
                                support: [
                                    { key: 'title', label: 'Título Sección', type: 'text' },
                                    { key: 'subtitle', label: 'Sinergias de Vida', type: 'text' },
                                    { key: 'description', label: 'Descripción Ecosistema', type: 'textarea' },
                                ],
                                campaign: [
                                    { key: 'active', label: 'Campaña Activa (Switch)', type: 'toggle' },
                                    { key: 'preset', label: 'Elegir Plantilla de Temporada', type: 'select', options: Object.values(CAMPAIGN_PRESETS).map(p => ({ value: p.id, label: p.name })).concat([{ value: 'custom', label: 'Personalizado' }]) },
                                    { key: 'promo_sku_id', label: 'Producto Estrella (Ancheta/Kit)', type: 'select', options: items.filter(i => i.category === 'Producto Terminado').map(i => ({ value: i.id, label: i.name })) },
                                    { key: 'modal_title', label: 'Título del Modal de Bienvenida', type: 'text' },
                                    { key: 'modal_subtitle', label: 'Subtítulo del Modal', type: 'textarea' },
                                    { key: 'modal_cta', label: 'Texto Botón (CTA)', type: 'text' },
                                    { key: 'hero_image_override', label: 'Foto del Hero (Subida)', type: 'image' },
                                    { key: 'hero_title', label: 'Título Hero (Campaña)', type: 'text' },
                                    { key: 'hero_subtitle', label: 'Subtítulo Hero (Campaña)', type: 'textarea' },
                                ],
                                seo: [
                                    { key: 'home_title', label: 'Título SEO (Home/Conservas)', type: 'text' },
                                    { key: 'home_description', label: 'Meta Descripción (Home)', type: 'textarea' },
                                    { key: 'og_image_home', label: 'Imagen de Compartir (Home)', type: 'image' },
                                    { key: 'consulting_title', label: 'Título SEO (Consultoría)', type: 'text' },
                                    { key: 'consulting_description', label: 'Meta Descripción (Consultoría)', type: 'textarea' },
                                    { key: 'og_image_consulting', label: 'Imagen de Compartir (Consultoría)', type: 'image' },
                                    { key: 'keywords', label: 'Palabras Clave (Keywords)', type: 'text' },
                                    { key: 'pos_artisan', label: 'Pilar 1: Conservas & Sentido Social', type: 'textarea' },
                                    { key: 'pos_sustainability', label: 'Pilar 2: Consultoría & Sostenibilidad', type: 'textarea' },
                                ],
                                recurring: [
                                    { key: 'active', label: 'Módulo de Membresía Activo', type: 'toggle' },
                                    { key: 'benefit_title', label: 'Título del Plan (ej: Círculo Zeticas)', type: 'text' },
                                    
                                    { type: 'spacer', label: '--- CONFIGURACIÓN POR PLANES ---' },
                                    
                                    // 3 Meses
                                    { key: 'plan_3_discount', label: '% Descuento', type: 'text', group: 'p3', header: 'Plan 3 Meses' },
                                    { key: 'plan_3_price', label: 'Costo Fijo Mensual ($)', type: 'text', group: 'p3' },
                                    { key: 'plan_3_threshold', label: 'Umbral Envío Gratis', type: 'text', group: 'p3' },
                                    { key: 'plan_3_shipping', label: 'Envío Gratis SIEMPRE', type: 'toggle', group: 'p3' },
                                    
                                    // 6 Meses
                                    { key: 'plan_6_discount', label: '% Descuento', type: 'text', group: 'p6', header: 'Plan 6 Meses' },
                                    { key: 'plan_6_price', label: 'Costo Fijo Mensual ($)', type: 'text', group: 'p6' },
                                    { key: 'plan_6_threshold', label: 'Umbral Envío Gratis', type: 'text', group: 'p6' },
                                    { key: 'plan_6_shipping', label: 'Envío Gratis SIEMPRE', type: 'toggle', group: 'p6' },
                                    
                                    // 12 Meses
                                    { key: 'plan_12_discount', label: '% Descuento', type: 'text', group: 'p12', header: 'Plan 12 Meses' },
                                    { key: 'plan_12_price', label: 'Costo Fijo Mensual ($)', type: 'text', group: 'p12' },
                                    { key: 'plan_12_threshold', label: 'Umbral Envío Gratis', type: 'text', group: 'p12' },
                                    { key: 'plan_12_shipping', label: 'Envío Gratis SIEMPRE', type: 'toggle', group: 'p12' },
                                ]
                            };

                            const fields = SECTION_FIELDS[activeTab] || [];
                            
                            // Group fields by 'group' property for compact layout
                            const groupedFields = [];
                            fields.forEach(f => {
                                if (f.group) {
                                    const last = groupedFields[groupedFields.length - 1];
                                    if (last && last.type === 'grid' && last.groupId === f.group) {
                                        last.items.push(f);
                                    } else {
                                        groupedFields.push({ type: 'grid', groupId: f.group, items: [f] });
                                    }
                                } else {
                                    groupedFields.push(f);
                                }
                            });

                            return groupedFields.map((field, idx) => {
                                if (field.type === 'spacer') {
                                    return (
                                        <div key={field.label} style={{ 
                                            padding: '2rem 0 1rem', borderBottom: '1px solid #f1f5f9', marginBottom: '2rem',
                                            fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', letterSpacing: '2px', textAlign: 'center'
                                        }}>
                                            {field.label}
                                        </div>
                                    );
                                }
                                if (field.type === 'grid') {
                                    return (
                                        <div key={`grid-${idx}`} style={{ marginBottom: '2.5rem' }}>
                                            {field.items[0]?.header && (
                                                <div style={{ fontSize: '0.9rem', fontWeight: '900', color: deepTeal, marginBottom: '1rem', paddingLeft: '0.5rem' }}>
                                                    {field.items[0].header}
                                                </div>
                                            )}
                                            <div style={{ 
                                                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                                                gap: '1.5rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '24px',
                                                border: '1px solid #f1f5f9'
                                            }}>
                                                {field.items.map(f => {
                                                    // Habilitar la "negación" del umbral si el envío es gratis siempre
                                                    if (f.key.endsWith('_threshold')) {
                                                        const months = f.key.split('_')[1];
                                                        if (content[`plan_${months}_shipping`] === true) return null;
                                                    }

                                                    return (
                                                        <CMSField
                                                            key={`${activeTab}-${f.key}`}
                                                            {...f}
                                                            initialValue={content[f.key]}
                                                            onSave={handleSave}
                                                            section={activeTab}
                                                            fieldKey={f.key}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                }
                                return (
                                    <CMSField
                                        key={`${activeTab}-${field.key}`}
                                        {...field}
                                        initialValue={content[field.key]}
                                        onSave={handleSave}
                                        section={activeTab}
                                        fieldKey={field.key}
                                    />
                                );
                            });
                        })()}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
                .spinner-small { width: 14px; height: 14px; border: 2px solid rgba(251, 191, 36, 0.2); border-top: 2px solid #fbbf24; border-radius: 50%; animation: spin 0.8s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default CMSContents;
