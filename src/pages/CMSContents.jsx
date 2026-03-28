import React, { useState, useEffect } from 'react';
import { Save, Layout, Type, MessageSquare, CheckCircle, Globe, Truck, Users, Briefcase, Bookmark, Megaphone, Image as ImageIcon, Camera, UploadCloud } from 'lucide-react';
import { useBusiness, CAMPAIGN_PRESETS } from '../context/BusinessContext';
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
    const [activeTab, setActiveTab] = useState('hero');
    const [isSaving, setIsSaving] = useState(false);
    const [lastStatus, setLastStatus] = useState('saved'); // 'saved', 'saving', 'error'

    const sections = [
        { id: 'hero', label: 'Hero / Inicio', icon: <Layout size={18} /> },
        { id: 'philosophy', label: 'Filosofía', icon: <Type size={18} /> },
        { id: 'support', label: 'Apoyo & Soporte', icon: <MessageSquare size={18} /> },
        { id: 'campaign', label: 'Campaña de Temporada', icon: <Megaphone size={18} /> },
    ];

    const handleSave = async (key, value) => {
        setIsSaving(true);
        setLastStatus('saving');
        const result = await updateSiteContent(activeTab, key, value);
        
        if (result.success) {
            setLastStatus('saved');
        } else {
            setLastStatus('error');
            alert(`Error al guardar: ${result.error}. Asegúrate de que las políticas de BD (RLS) lo permitan.`);
        }
        setIsSaving(false);
    };

    const sectionFields = {
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
            { 
                key: 'preset', 
                label: 'Elegir Plantilla de Temporada', 
                type: 'select', 
                options: Object.values(CAMPAIGN_PRESETS).map(p => ({ value: p.id, label: p.name })).concat([{ value: 'custom', label: 'Personalizado' }])
            },
            { 
                key: 'promo_sku_id', 
                label: 'Producto Estrella (Ancheta/Kit)', 
                type: 'select',
                options: items.filter(i => i.category === 'Producto Terminado').map(i => ({ value: i.id, label: i.name }))
            },
            { key: 'modal_title', label: 'Título del Modal de Bienvenida', type: 'text' },
            { key: 'modal_subtitle', label: 'Subtítulo del Modal', type: 'textarea' },
            { key: 'modal_cta', label: 'Texto Botón (CTA)', type: 'text' },
            { key: 'hero_image_override', label: 'Foto del Hero (Subida)', type: 'image' },
            { key: 'hero_title', label: 'Título Hero (Campaña)', type: 'text' },
            { key: 'hero_subtitle', label: 'Subtítulo Hero (Campaña)', type: 'textarea' },
        ]
    };

    const content = siteContent[activeTab] || {};

    return (
        <div style={{ padding: '2.5rem', animation: 'fadeIn 0.5s ease', background: '#fbfcfd', minHeight: 'calc(100vh - 100px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                <div>
                    <h2 style={{ fontSize: '2.4rem', fontWeight: '900', color: '#004B50', margin: 0, letterSpacing: '-1px' }}>Editor Global de Textos</h2>
                    <p style={{ color: '#64748b', fontSize: '1rem', fontWeight: '600', marginTop: '5px' }}>Modifica toda la narrativa de la landing page sin código.</p>
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
                    {lastStatus === 'error' && <Layout size={18} />} {/* Error icon equivalent */}
                    {lastStatus === 'saving' ? 'Sincronizando...' : lastStatus === 'error' ? 'Error al Guardar' : 'Cambios Sincronizados'}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 300px) 1fr', gap: '3rem' }}>
                {/* Sidebar Navigation */}
                <div style={{ height: 'fit-content' }}>
                    <div style={{ background: '#fff', borderRadius: '32px', padding: '1.2rem', boxShadow: '0 15px 40px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                        <div style={{ padding: '1rem', fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Zonas del Sitio</div>
                        {sections.map(section => (
                            <button
                                key={section.id}
                                onClick={() => setActiveTab(section.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '1.2rem', width: '100%',
                                    padding: '1.2rem 1.5rem', border: 'none', background: activeTab === section.id ? '#004B50' : 'transparent',
                                    color: activeTab === section.id ? '#fff' : '#64748b', borderRadius: '22px', cursor: 'pointer',
                                    fontSize: '0.95rem', fontWeight: '800', transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                    marginBottom: '0.5rem', textAlign: 'left', boxShadow: activeTab === section.id ? '0 10px 25px rgba(0,75,80,0.2)' : 'none',
                                    transform: activeTab === section.id ? 'translateX(5px)' : 'none'
                                }}
                            >
                                <span style={{ opacity: activeTab === section.id ? 1 : 0.5 }}>{section.icon}</span>
                                {section.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Editor Surface */}
                <div style={{ background: '#fff', borderRadius: '48px', padding: '4.5rem', boxShadow: '0 30px 60px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
                    <div style={{ marginBottom: '4rem', borderBottom: '1px solid #f8fafc', paddingBottom: '2.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#004B50', marginBottom: '0.5rem' }}>
                            {sections.find(s => s.id === activeTab)?.icon}
                            <span style={{ fontWeight: '900', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px' }}>Personalización en Vivo</span>
                        </div>
                        <h3 style={{ fontSize: '2rem', fontWeight: '900', color: '#1e293b', margin: 0, letterSpacing: '-0.5px' }}>
                            {sections.find(s => s.id === activeTab)?.label}
                        </h3>
                    </div>

                    <div style={{ maxWidth: '800px' }}>
                        {sectionFields[activeTab]?.map(field => (
                            <CMSField
                                key={`${activeTab}-${field.key}`}
                                {...field}
                                initialValue={content[field.key]}
                                onSave={handleSave}
                                section={activeTab}
                                fieldKey={field.key}
                            />
                        ))}
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
