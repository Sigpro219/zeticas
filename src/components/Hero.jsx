import React from 'react';
import { Link } from 'react-router-dom';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useBusiness, CAMPAIGN_PRESETS } from '../context/BusinessContext';
import { Sparkles } from 'lucide-react';
import PromoModal from './PromoModal';

const Hero = () => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const { siteContent } = useBusiness();
    
    const content = siteContent?.hero || {};
    const campaign = siteContent?.campaign || {};
    const campaignActive = campaign?.active;
    const theme = campaignActive ? CAMPAIGN_PRESETS[campaign.preset] : null;

    const deepTeal = campaignActive ? (theme?.accentColor || '#004B50') : '#004B50';
    const softPrimary = campaignActive ? (theme?.primaryColor || '#FDF8F6') : 'rgba(175, 191, 113, 0.5)';

    if (campaignActive) {
        return (
            <section className="hero botanical-bg" style={{
                '--bg-filter': softPrimary,
                minHeight: '85vh',
                display: 'flex',
                alignItems: 'center',
                padding: isMobile ? '6rem 1rem' : '4rem 5%',
                position: 'relative',
                animation: 'fadeIn 0.8s ease'
            }}>
                <PromoModal campaign={campaign} />
                <div className="container" style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr',
                    gap: isMobile ? '3rem' : '6rem',
                    alignItems: 'center',
                    maxWidth: '1200px',
                    margin: '0 auto'
                }}>
                    <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: deepTeal, marginBottom: '2rem' }}>
                            <Sparkles size={24} />
                            <span style={{ fontSize: '0.9rem', fontWeight: '900', letterSpacing: '4px', textTransform: 'uppercase' }}>Campaña Exclusiva</span>
                        </div>
                        <h1 className="font-serif" style={{ fontSize: isMobile ? '3.5rem' : '5rem', color: '#004B50', lineHeight: 1, marginBottom: '2rem', fontWeight: '900' }}>
                            {campaign.hero_title || theme?.title}
                        </h1>
                        <p style={{ fontSize: '1.25rem', color: '#444', lineHeight: 1.6, marginBottom: '3.5rem', maxWidth: '600px' }}>
                            {campaign.hero_subtitle || theme?.subtitle}
                        </p>
                        <Link 
                            to={campaign.promo_sku_id ? `/producto/${campaign.promo_sku_id}` : '/tienda'} 
                            style={{ 
                                display: 'inline-flex',
                                background: deepTeal, 
                                padding: '1.4rem 3.5rem', 
                                borderRadius: '50px', 
                                color: '#fff', 
                                fontWeight: '800', 
                                textDecoration: 'none', 
                                textTransform: 'uppercase', 
                                letterSpacing: '2px',
                                boxShadow: '0 15px 35px rgba(0,0,0,0.1)'
                            }}
                        >
                            {campaign.modal_cta || 'Descubrir Ahora'}
                        </Link>
                    </div>
                    <div style={{ position: 'relative', borderRadius: '40px', overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.15)', aspectRatio: '4/5' }}>
                        <img 
                            src={campaign.hero_image_override || '/assets/promo_placeholder.jpg'} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            alt="Destacado de Campaña"
                        />
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="hero botanical-bg" style={{
            '--bg-filter': 'rgba(175, 191, 113, 0.5)',
            minHeight: isMobile ? 'auto' : '85vh',
            display: 'flex',
            alignItems: 'center',
            padding: isMobile ? '5rem 1rem 4rem' : '4rem 0',
            position: 'relative'
        }}>
            <div className="container" style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: isMobile ? '2rem' : '4rem',
                alignItems: 'center'
            }}>
                <div className="hero-content" style={{
                    position: 'relative',
                    background: 'rgba(255, 255, 255, 1.0)',
                    borderRadius: isMobile ? '24px' : '32px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 45px 100px -20px rgba(0, 0, 0, 0.15)',
                    zIndex: 10,
                    padding: 0,
                    textAlign: isMobile ? 'center' : 'left'
                }}>
                    <div style={{
                        padding: isMobile ? '2rem 1.25rem' : '4rem',
                        background: 'rgba(243, 124, 121, 0.88)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: 'inherit'
                    }}>
                        <span className="font-serif" style={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.75rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.95)', display: 'block' }}>
                            {content.top_text || 'Sabana de Bogotá • Colombia'}
                        </span>
                        <h1 className="hero-text" style={{ margin: '1rem 0', fontSize: isMobile ? '2.5rem' : '5rem', color: '#fff', lineHeight: '1', fontWeight: '800' }}>
                            {content.title || 'Zeticas'}
                        </h1>
                        <p style={{ maxWidth: '430px', margin: isMobile ? '0 auto 2rem' : '0 0 3rem', color: '#fff', fontSize: '1.2rem', lineHeight: '1.6' }}>
                            {content.description || 'Conservas premium y consultoría con propósito.'}
                        </p>
                        <Link to="/tienda" className="btn" style={{ background: '#025357', color: '#fff', padding: isMobile ? '0.8rem 1.8rem' : '1.2rem 2.8rem', fontWeight: '800', textDecoration: 'none', borderRadius: '50px' }}>
                            {content.cta_text || 'Explorar Colección'}
                        </Link>
                    </div>
                </div>
                <div className="hero-image" style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'center' }}>
                    <img src="/assets/product-jars.png" alt="Zeticas Trio" style={{ width: isMobile ? '65%' : '80%', display: 'block', objectFit: 'contain', mixBlendMode: 'multiply' }} />
                </div>
            </div>
            {/* Bottom White Invasion Waves (Always present) */}
            <div style={{
                position: 'absolute',
                bottom: -1,
                left: 0,
                width: '100%',
                lineHeight: 0,
                zIndex: 1,
                transform: 'scaleY(-1)'
            }}>
                <svg viewBox="0 0 1440 120" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto', display: 'block' }}>
                    <path fill="#ffffff" fillOpacity="0.2" d="M0,32L60,42.7C120,53,240,75,360,80C480,85,600,75,720,64C840,53,960,43,1080,48C1200,53,1320,75,1380,85.3L1440,96V0H0Z"></path>
                    <path fill="#ffffff" fillOpacity="0.5" d="M0,96L60,85.3C120,75,240,53,360,42.7C480,32,600,32,720,42.7C840,53,960,75,1080,80C1200,85,1320,75,1380,69.3L1440,64V0H0Z"></path>
                    <path fill="#ffffff" d="M0,32L60,26.7C120,21,240,11,360,16C480,21,600,43,720,42.7C840,43,960,21,1080,10.7C1200,0,1320,0,1380,0L1440,0V0H0Z"></path>
                </svg>
            </div>
        </section>
    );
};

export default Hero;
