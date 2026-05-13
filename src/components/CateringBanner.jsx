import React from 'react';
import { Link } from 'react-router-dom';
import { Truck } from 'lucide-react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useBusiness } from '../context/BusinessContext';

const CateringBanner = () => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const { siteContent } = useBusiness();
    const content = siteContent?.catering || {};

    return (
        <section className="catering-banner relative overflow-hidden botanical-bg" style={{
            '--bg-filter': 'rgba(0, 77, 77, 0.5)', // Petroleum Blue institutional
            '--bg-pattern-filter': 'grayscale(1) opacity(0.2)',
            padding: isMobile ? '6rem 0' : '8rem 0',
            position: 'relative'
        }}>
            {/* Top White Invasion Waves (From Section 2: White) */}
            <div style={{
                position: 'absolute',
                top: -1,
                left: 0,
                width: '100%',
                lineHeight: 0,
                zIndex: 1
            }}>
                <svg viewBox="0 0 1440 120" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto' }}>
                    <path fill="#ffffff" fillOpacity="0.2" d="M0,32L60,42.7C120,53,240,75,360,80C480,85,600,75,720,64C840,53,960,43,1080,48C1200,53,1320,75,1380,85.3L1440,96V0H0Z"></path>
                    <path fill="#ffffff" fillOpacity="0.5" d="M0,96L60,85.3C120,75,240,53,360,42.7C480,32,600,32,720,42.7C840,53,960,75,1080,80C1200,85,1320,75,1380,69.3L1440,64V0H0Z"></path>
                    <path fill="#ffffff" d="M0,32L60,26.7C120,21,240,11,360,16C480,21,600,43,720,42.7C840,43,960,21,1080,10.7C1200,0,1320,0,1380,0L1440,0V0H0Z"></path>
                </svg>
            </div>

            <div className="container" style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: isMobile ? '3rem' : '4rem',
                alignItems: 'center',
                position: 'relative',
                zIndex: 2,
                textAlign: isMobile ? 'center' : 'left'
            }}>
                <div style={{ position: 'relative', maxWidth: isMobile ? '320px' : 'none', margin: '0 auto' }}>
                    <img
                        src="https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/products/WhatsApp-Image-2025-08-01-at-9.58.08-AM-2.jpeg"
                        alt="ZETAmóvil Catering"
                        style={{
                            width: '100%',
                            height: 'auto',
                            borderRadius: '4px',
                            boxShadow: '0 30px 60px rgba(0,0,0,0.15)',
                            transform: isMobile ? 'none' : 'rotate(2deg)'
                        }}
                    />
                    <div style={{
                        position: 'absolute',
                        bottom: '-15px',
                        left: isMobile ? '50%' : '-20px',
                        transform: isMobile ? 'translateX(-50%)' : 'none',
                        background: 'var(--color-secondary)',
                        padding: isMobile ? '1.2rem' : '1.5rem',
                        borderRadius: '50%',
                        color: '#fff',
                        boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
                    }}>
                        <Truck size={isMobile ? 24 : 32} />
                    </div>
                </div>

                <div className="catering-content">
                    <span style={{
                        textTransform: 'uppercase',
                        letterSpacing: '0.25em',
                        fontSize: isMobile ? '0.7rem' : '0.8rem',
                        fontWeight: 'bold',
                        color: '#fff',
                        display: 'block',
                        marginBottom: '1rem',
                        opacity: 0.9
                    }}>
                        {content.top_text || 'Experiencias sobre Ruedas'}
                    </span>
                    <h2 className="font-serif" style={{
                        fontSize: isMobile ? '2.5rem' : '3.5rem',
                        color: '#fff',
                        marginBottom: '1.5rem',
                        lineHeight: '1.1'
                    }}>
                        {content.title || 'Nuestro Catering & ZETAmóvil'}
                    </h2>
                    <p style={{
                        fontSize: isMobile ? '1rem' : '1.1rem',
                        color: 'rgba(255,255,255,0.9)',
                        marginBottom: '2.5rem',
                        lineHeight: '1.7',
                        maxWidth: '500px',
                        margin: isMobile ? '0 auto 2.5rem' : '0 0 3rem'
                    }}>
                        {'Llevamos las recetas, sabores y diversidad de Zeticas a tus eventos. Preparaciones frescas con alianzas de proveedores locales y comunidades rurales. En nuestro tuk-tuk ofrecemos opciones rápidas y versátiles como sopas, sándwiches gourmet, granolas artesanales y dulces tradicionales.'}
                    </p>
                    <Link
                        to="/catering"
                        className="btn"
                        style={{
                            background: '#fff',
                            color: 'var(--color-primary)',
                            padding: isMobile ? '0.9rem 2.2rem' : '1rem 2.5rem',
                            fontWeight: '800',
                            textDecoration: 'none',
                            display: 'inline-block',
                            borderRadius: '50px',
                            fontSize: '0.8rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em'
                        }}
                    >
                        {content.cta_text || 'Conocer más'}
                    </Link>
                </div>
            </div>

            {/* Bottom White Invasion Waves (Towards Section 4: White) */}
            <div style={{
                position: 'absolute',
                bottom: -1,
                left: 0,
                width: '100%',
                lineHeight: 0,
                zIndex: 1,
                transform: 'scaleY(-1)'
            }}>
                <svg viewBox="0 0 1440 120" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto' }}>
                    <path fill="#ffffff" fillOpacity="0.2" d="M0,32L60,42.7C120,53,240,75,360,80C480,85,600,75,720,64C840,53,960,43,1080,48C1200,53,1320,75,1380,85.3L1440,96V0H0Z"></path>
                    <path fill="#ffffff" fillOpacity="0.5" d="M0,96L60,85.3C120,75,240,53,360,42.7C480,32,600,32,720,42.7C840,53,960,75,1080,80C1200,85,1320,75,1380,69.3L1440,64V0H0Z"></path>
                    <path fill="#ffffff" d="M0,32L60,26.7C120,21,240,11,360,16C480,21,600,43,720,42.7C840,43,960,21,1080,10.7C1200,0,1320,0,1380,0L1440,0V0H0Z"></path>
                </svg>
            </div>
        </section>
    );
};

export default CateringBanner;
