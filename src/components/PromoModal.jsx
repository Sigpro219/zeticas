import React, { useState, useEffect } from 'react';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CAMPAIGN_PRESETS } from '../context/BusinessContext';

const PromoModal = ({ campaign }) => {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!campaign?.active) {
            setIsOpen(false);
            return;
        }

        // Use a dynamic key based on the preset so it reappears if the campaign type changes
        const promoKey = `zeticas_promo_${campaign.preset || 'default'}`;
        const hasSeenPromo = sessionStorage.getItem(promoKey);
        
        if (!hasSeenPromo) {
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [campaign]);

    const handleClose = () => {
        setIsOpen(false);
        const promoKey = `zeticas_promo_${campaign.preset || 'default'}`;
        sessionStorage.setItem(promoKey, 'true');
    };

    const handleAction = () => {
        handleClose();
        if (campaign.promo_sku_id) {
            navigate(`/producto/${campaign.promo_sku_id}`);
        } else {
            navigate('/tienda');
        }
    };

    if (!isOpen) return null;

    const preset = CAMPAIGN_PRESETS[campaign.preset] || {};
    let themeColor = campaign.preset === 'custom' ? campaign.custom_color : (preset.accentColor || '#004B50');
    
    // Safety check: if themeColor is too light or invalid, fallback to Zeticas Deep Teal
    if (!themeColor || themeColor.toLowerCase() === '#ffffff' || themeColor.toLowerCase() === '#fff') {
        themeColor = '#004B50';
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(12px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            animation: 'fadeIn 0.5s ease'
        }}>
            <div style={{
                background: '#fff',
                width: '100%',
                maxWidth: '550px',
                maxHeight: 'calc(100vh - 2rem)',
                borderRadius: '35px',
                overflow: 'hidden',
                boxShadow: '0 30px 70px rgba(0,0,0,0.4)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                animation: 'modalZoomIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                {/* Close handle */}
                <button 
                    onClick={handleClose}
                    style={{
                        position: 'absolute', top: '1.2rem', right: '1.2rem',
                        background: 'rgba(255,255,255,0.9)', border: 'none', width: '38px', height: '38px',
                        borderRadius: '50%', cursor: 'pointer', zIndex: 30,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
                    }}
                >
                    <X size={22} color="#004B50" />
                </button>

                {/* Scrollable Area */}
                <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Visual Banner (Composition) */}
                    <div style={{ height: '300px', minHeight: '200px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                        <img 
                            src={campaign.hero_image_override || '/assets/promo_placeholder.jpg'} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            alt="Campaña"
                        />
                        <div style={{ 
                            position: 'absolute', bottom: 0, left: 0, right: 0, 
                            background: 'linear-gradient(transparent, rgba(255,255,255,1))', 
                            height: '80px' 
                        }} />
                    </div>

                    {/* Content Area */}
                    <div style={{ padding: '0 3rem 3.5rem', textAlign: 'center', marginTop: '-20px', position: 'relative', zIndex: 10 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: themeColor, marginBottom: '1.2rem' }}>
                            <Sparkles size={18} />
                            <span style={{ fontSize: '0.75rem', fontWeight: '900', letterSpacing: '4px', textTransform: 'uppercase' }}>Invitación Especial</span>
                        </div>

                        <h2 className="font-serif" style={{ fontSize: '2.6rem', color: '#004B50', lineHeight: 1.1, marginBottom: '1.5rem' }}>
                            {campaign.modal_title || preset.title}
                        </h2>

                        <p style={{ color: '#64748b', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '2.5rem' }}>
                            {campaign.modal_subtitle || preset.subtitle}
                        </p>

                        <button
                            onClick={handleAction}
                            style={{
                                background: themeColor,
                                color: '#fff',
                                border: 'none',
                                padding: '1.2rem 3rem',
                                borderRadius: '20px',
                                fontWeight: '900',
                                fontSize: '0.9rem',
                                textTransform: 'uppercase',
                                letterSpacing: '2px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                width: '100%',
                                boxShadow: `0 10px 30px ${themeColor}66`
                            }}
                            className="promo-action-btn"
                        >
                            {campaign.modal_cta || 'Descubrir Ahora'}
                        </button>
                        
                        <button 
                            onClick={handleClose}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.85rem', marginTop: '1.5rem', fontWeight: '700', cursor: 'pointer' }}
                        >
                            Continuar navegando
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes modalZoomIn { 
                    from { opacity: 0; transform: scale(0.9) translateY(20px); } 
                    to { opacity: 1; transform: scale(1) translateY(0); } 
                }
                .promo-action-btn:active { transform: scale(0.98); }
                .promo-action-btn:hover { filter: brightness(1.1); transform: translateY(-2px); }
            `}</style>
        </div>
    );
};

export default PromoModal;
