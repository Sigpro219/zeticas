import React from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';

const PhilosophySection = () => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    
    return (
        <section className="philosophy-section" style={{ 
            padding: isMobile ? '4rem 0' : '6rem 0',
            backgroundColor: '#ffffff', // Clean white background
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Strawberries Watermark Background (Aligned Left) */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: isMobile ? '-10%' : '5%', 
                transform: 'translateY(-50%) rotate(-10deg)',
                width: isMobile ? '250px' : '600px',
                height: isMobile ? '250px' : '600px',
                backgroundImage: 'url(/assets/strawberries.png)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                opacity: 0.08,
                zIndex: 0,
                pointerEvents: 'none',
                filter: 'saturate(0.3)'
            }}></div>

            <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                    maxWidth: '100%',
                    margin: '0 auto',
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: isMobile ? '2rem' : '1.5rem',
                    textAlign: 'center'
                }}>
                    {/* Left Artistic Bracket (Logical Half 1) */}
                    <div style={{
                        width: isMobile ? '80px' : '180px',
                        height: isMobile ? '120px' : '320px',
                        backgroundImage: 'url(/assets/brackets.png)',
                        backgroundSize: '200% 100%',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'left center',
                        opacity: 0.85,
                        userSelect: 'none',
                        flexShrink: 0,
                        transform: isMobile ? 'rotate(90deg)' : 'none'
                    }}></div>

                    <p className="font-serif" style={{
                        maxWidth: isMobile ? '100%' : '700px',
                        fontSize: isMobile ? '1.25rem' : '1.7rem',
                        lineHeight: isMobile ? '1.6' : '1.8',
                        color: 'var(--color-primary)',
                        fontStyle: 'italic',
                        fontWeight: '400',
                        margin: 0,
                        zIndex: 2,
                        padding: isMobile ? '0 1rem' : '0'
                    }}>
                        Zeticas promueve un estilo de vida de alimentos naturales, listos para consumir aprovechando los ciclos de cosecha de nuestra biodiversidad colombiana. A través de la consultoría busca rescatar, desarrollar y valorar ingredientes y recetas con las comunidades rurales.
                    </p>

                    {/* Right Artistic Bracket (Logical Half 2) */}
                    <div style={{
                        width: isMobile ? '80px' : '180px',
                        height: isMobile ? '120px' : '320px',
                        backgroundImage: 'url(/assets/brackets.png)',
                        backgroundSize: '200% 100%',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right center',
                        opacity: 0.85,
                        userSelect: 'none',
                        flexShrink: 0,
                        transform: isMobile ? 'rotate(90deg)' : 'none'
                    }}></div>
                </div>
            </div>
        </section>
    );
};

export default PhilosophySection;
