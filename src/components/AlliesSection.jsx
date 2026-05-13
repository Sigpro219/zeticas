import React from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useBusiness } from '../context/BusinessContext';

const allies = [
    { 
        name: 'Mercado Lourdes', 
        logo: '/assets/aliados/mercado_lourdes.png',
        location: 'Calle 64 #8-34, Bogotá'
    },
    { 
        name: 'Club Campestre Guaymaral', 
        logo: '/assets/aliados/club_campestre.jpg',
        location: 'Auto. Norte #245-01, Bogotá'
    },
    { 
        name: 'Corales Traiteur', 
        logo: '/assets/aliados/corales.png',
        location: 'Km 18.3 via la calera - sopó, La Calera'
    },
    { 
        name: 'Vereda Delikatessen Rural', 
        logo: '/assets/aliados/delikatessen.jpg',
        location: 'C.C. Potosí, Km 20 Vía La Calera - Sopó'
    },
    { 
        name: 'Bestial Market', 
        logo: '/assets/aliados/bestial.jpg',
        location: 'Cra. 9 #4-60, Villa de Leyva, Boyacá'
    }
];

const AlliesSection = () => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const { siteContent } = useBusiness();
    const content = siteContent?.allies || {};
    const displayList = (content.list && content.list.length > 0) ? content.list : allies;
    // Duplicate for infinite scroll
    const duplicateAllies = [...displayList, ...displayList, ...displayList];

    return (
        <section className="allies-section botanical-bg" style={{ 
            padding: isMobile ? '5.4rem 0' : '7.2rem 0',
            position: 'relative',
            '--bg-filter': 'rgba(243, 124, 121, 0.5)', 
            '--bg-pattern-filter': 'grayscale(1) opacity(0.2)' 
        }}>
            {/* White Invasion Transition Wave */}
            <div style={{
                position: 'absolute',
                top: -1,
                left: 0,
                width: '100%',
                lineHeight: 0,
                zIndex: 0
            }}>
                <svg viewBox="0 0 1440 160" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto' }}>
                    <path fill="#fff" fillOpacity="0.2" d="M0,80L48,85.3C96,91,192,101,288,90.7C384,80,480,48,576,42.7C672,37,768,59,864,74.7C960,91,1056,101,1152,96C1248,91,1344,69,1392,58.7L1440,48V0H1392C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
                    <path fill="#fff" fillOpacity="0.5" d="M0,64L48,58.7C96,53,192,43,288,48C384,53,480,75,576,80C672,85,768,75,864,64C960,53,1056,43,1152,48C1248,53,1344,75,1392,85.3L1440,96V0H1392C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
                    <path fill="#fff" d="M0,24L48,29.3C96,35,192,45,288,42.7C384,40,480,24,576,13.3C672,3,768,3,864,13.3C960,24,1056,45,1152,48C1248,51,1344,35,1392,26.7L1440,18V0H1392C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
                </svg>
            </div>

            <div className="container" style={{ textAlign: 'center', position: 'relative', zIndex: 1, paddingTop: isMobile ? '2rem' : '0' }}>
                <h2 className="font-serif" style={{ fontSize: isMobile ? '2.5rem' : '3.5rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>
                    {content.title || 'Donde Encontrarnos'}
                </h2>
                <p style={{ color: '#fff', opacity: 0.9, maxWidth: '600px', margin: isMobile ? '0 auto 3.5rem' : '0 auto 5rem', fontSize: isMobile ? '1.1rem' : '1.2rem', padding: '0 1rem' }}>
                    {content.description || 'Nuestros productos están presentes en los puntos más emblemáticos de la Sabana de Bogotá.'}
                </p>

                {/* Infinite Carousel Viewport */}
                <div className="scroll-viewport" style={{ padding: '1rem 0' }}>
                    <div className="scroll-container">
                        {duplicateAllies.map((ally, index) => (
                            <div key={index} className="brand-card" style={{ width: isMobile ? '240px' : '320px' }}>
                                <img src={ally.logo} alt={ally.name} style={{ maxWidth: isMobile ? '160px' : '200px' }} />
                                <div className="brand-info" style={{ 
                                    opacity: 0, 
                                    transition: 'all 0.5s ease',
                                    visibility: 'hidden',
                                    marginTop: '1.5rem',
                                    textAlign: 'center'
                                }}>
                                    <span style={{ 
                                        display: 'block', 
                                        fontWeight: '800', 
                                        fontSize: isMobile ? '1.1rem' : '1.25rem', 
                                        color: '#fff', 
                                        marginBottom: '0.4rem',
                                        textShadow: '0 2px 10px rgba(0,0,0,0.2)' 
                                    }}>
                                        {ally.name}
                                    </span>
                                    <span style={{ 
                                        fontSize: '0.8rem', 
                                        fontWeight: '700',
                                        color: 'var(--color-primary)', // Institutional Dark Teal/Green
                                        letterSpacing: '0.01em'
                                    }}>
                                        {ally.location}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Injected Hover Style for the Reveal */}
            <style>{`
                .brand-card:hover .brand-info {
                    opacity: 1 !important;
                    visibility: visible !important;
                    transform: translateY(0);
                }
                .brand-card .brand-info {
                    transform: translateY(15px);
                }
                @media (max-width: 768px) {
                    .brand-card img {
                        filter: none !important;
                        opacity: 1 !important;
                    }
                }
            `}</style>
        </section>
    );
};

export default AlliesSection;
