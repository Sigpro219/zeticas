import React from 'react';
import { Link } from 'react-router-dom';
import { Truck } from 'lucide-react';

const CateringBanner = () => {
    return (
        <section className="catering-banner py-24 relative overflow-hidden botanical-bg" style={{
            '--bg-filter': 'rgba(0, 77, 77, 0.5)', // Petroleum Blue institutional
            '--bg-pattern-filter': 'grayscale(1) opacity(0.2)',
            padding: '12rem 0 8rem',
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
                gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '1fr 1fr',
                gap: '4rem',
                alignItems: 'center',
                position: 'relative',
                zIndex: 2
            }}>
                <div style={{ position: 'relative' }}>
                    <img
                        src="https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/products/WhatsApp-Image-2025-08-01-at-9.58.08-AM-2.jpeg"
                        alt="ZETAmóvil Catering"
                        style={{
                            width: '100%',
                            height: 'auto',
                            borderRadius: '4px',
                            boxShadow: '0 30px 60px rgba(0,0,0,0.15)',
                            transform: 'rotate(2deg)'
                        }}
                    />
                    <div style={{
                        position: 'absolute',
                        bottom: '-20px',
                        left: '-20px',
                        background: 'var(--color-secondary)',
                        padding: '1.5rem',
                        borderRadius: '50%',
                        color: '#fff',
                        boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
                    }}>
                        <Truck size={32} />
                    </div>
                </div>

                <div className="catering-content">
                    <span style={{
                        textTransform: 'uppercase',
                        letterSpacing: '0.3em',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        color: '#fff',
                        display: 'block',
                        marginBottom: '1rem',
                        opacity: 0.9
                    }}>
                        Experiencias sobre Ruedas
                    </span>
                    <h2 className="font-serif" style={{
                        fontSize: '3.5rem',
                        color: '#fff',
                        marginBottom: '1.5rem',
                        lineHeight: '1.1'
                    }}>
                        Nuestro <br /> Catering & ZETAmóvil
                    </h2>
                    <p style={{
                        fontSize: '1.1rem',
                        color: 'rgba(255,255,255,0.9)',
                        marginBottom: '3rem',
                        lineHeight: '1.8',
                        maxWidth: '500px'
                    }}>
                        Llevamos la esencia de Zeticas a tus eventos. Preparaciones frescas,
                        sándwiches gourmet y granolas artesanales servidas directamente desde nuestro icónico tuk-tuk.
                    </p>
                    <Link
                        to="/catering"
                        className="btn"
                        style={{
                            background: '#fff',
                            color: 'var(--color-primary)',
                            padding: '1rem 2.5rem',
                            fontWeight: '800',
                            textDecoration: 'none',
                            display: 'inline-block',
                            borderRadius: '50px',
                            fontSize: '0.85rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em'
                        }}
                    >
                        Conocer más
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
