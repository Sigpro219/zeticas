import React from 'react';

const PhilosophySection = () => {
    return (
        <section className="philosophy-section" style={{ 
            padding: '10.8rem 0', // Reduced by 10%
            backgroundColor: '#ffffff', // Clean white background
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Strawberries Watermark Background (Aligned Left) */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '5%', 
                transform: 'translateY(-50%) rotate(-10deg)',
                width: isMobile() ? '300px' : '600px',
                height: isMobile() ? '300px' : '600px',
                backgroundImage: 'url(/assets/strawberries.png)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                opacity: 0.1,
                zIndex: 0,
                pointerEvents: 'none',
                filter: 'saturate(0.3)'
            }}></div>

            <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                    maxWidth: isMobile() ? '100%' : '800px', // Narrowed for 400px text
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: isMobile() ? '0.5rem' : '1.5rem', // Controlled gap
                    textAlign: 'center'
                }}>
                    {/* Left Artistic Bracket (Logical Half 1) */}
                    <div style={{
                        width: isMobile() ? '100px' : '180px', // Scaling up
                        height: isMobile() ? '180px' : '320px', // Scaling up
                        backgroundImage: 'url(/assets/brackets.png)',
                        backgroundSize: '200% 100%',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'left center',
                        opacity: 0.85,
                        userSelect: 'none',
                        flexShrink: 0
                    }}></div>

                    <p className="font-serif" style={{
                        maxWidth: isMobile() ? '90%' : '460px', // Adjusted to 460px for exact 5-line wrap
                        fontSize: isMobile() ? '1.2rem' : '1.7rem',
                        lineHeight: '1.8',
                        color: 'var(--color-primary)',
                        fontStyle: 'italic',
                        fontWeight: '400',
                        margin: 0,
                        zIndex: 2
                    }}>
                        Zeticas promueve un estilo de vida en armonía, consciente y diverso; recordando recetas tradicionales, rescatando ingredientes y valorando nuestro ecosistema.
                    </p>

                    {/* Right Artistic Bracket (Logical Half 2) */}
                    <div style={{
                        width: isMobile() ? '100px' : '180px', // Scaling up
                        height: isMobile() ? '180px' : '320px', // Scaling up
                        backgroundImage: 'url(/assets/brackets.png)',
                        backgroundSize: '200% 100%',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right center',
                        opacity: 0.85,
                        userSelect: 'none',
                        flexShrink: 0
                    }}></div>
                </div>
            </div>
        </section>
    );
};

const isMobile = () => typeof window !== 'undefined' && window.innerWidth <= 768;

export default PhilosophySection;
