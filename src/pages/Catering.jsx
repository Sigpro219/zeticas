import React from 'react';
import { Truck, Utensils, Heart, Users, MessageCircle, Calendar, MapPin } from 'lucide-react';

import { useMediaQuery } from '../hooks/useMediaQuery';

const Catering = () => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const isTablet = useMediaQuery('(max-width: 1024px)');
    const galleryImages = [
        "https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/products/WhatsApp-Image-2025-08-01-at-9.58.08-AM.jpeg", // ZETAmóvil
        "https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/products/WhatsApp-Image-2025-08-01-at-9.58.11-AM.jpeg", // Food closeup
        "https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/products/WhatsApp-Image-2025-08-01-at-9.58.10-AM.jpeg", // Setup
        "https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/products/WhatsApp-Image-2025-08-01-at-9.58.12-AM.jpeg"  // More food
    ];

    const allies = [
        { name: 'Nuquí', url: '/assets/insumos/nuqui.jpg' },
        { name: 'Clementina', url: '/assets/insumos/clementina.jpg' },
        { name: 'Farm Fresh', url: '/assets/insumos/farm_fresh.jpg' },
        { name: 'Holandes', url: '/assets/insumos/holandes.png' },
        { name: 'Castilac', url: '/assets/insumos/castilac.png' },
        { name: 'Terra Santa', url: '/assets/insumos/terra_santa.jpg' },
        { name: 'Masa Madre', url: '/assets/insumos/masa_madre.jpg' }
    ];
    
    // Triple for seamless permanent loop
    const duplicateAllies = [...allies, ...allies, ...allies];

    return (
        <div className="catering-page botanical-bg" style={{ 
            minHeight: '100vh', 
            padding: isMobile ? '3rem 0' : '5rem 0',
            backgroundColor: '#FDF8F6'
        }}>
            <div className="container">
                {/* 1. Immersive Hero */}
                <section style={{
                    display: 'flex',
                    flexDirection: isTablet ? 'column' : 'row',
                    gap: isTablet ? '3rem' : '6rem',
                    alignItems: 'center',
                    marginBottom: isMobile ? '4rem' : '8rem'
                }}>
                    <div>
                        <span style={{ 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.3em', 
                            fontSize: '0.8rem', 
                            color: 'var(--color-secondary)',
                            fontWeight: '700',
                            display: 'block',
                            marginBottom: '1.5rem'
                        }}>
                            Experiencias Itinerantes
                        </span>
                        <h1 className="font-serif" style={{ 
                            color: 'var(--color-primary)', 
                            fontSize: isMobile ? '2.8rem' : 'clamp(3rem, 8vw, 5.5rem)', 
                            lineHeight: 1,
                            marginBottom: '2.5rem' 
                        }}>
                            Catering <br/>Sostenible
                        </h1>
                        <p style={{ 
                            color: 'rgba(0,0,0,0.7)', 
                            fontSize: isMobile ? '1.1rem' : '1.25rem', 
                            lineHeight: '1.8',
                            maxWidth: '650px'
                        }}>
                            Llevamos las recetas, sabores y diversidad de Zeticas a tus eventos. Preparaciones frescas con alianzas de proveedores locales y comunidades rurales. <br/><br/>
                            Con nuestro <strong>ZETAmóvil</strong>, convertimos cualquier espacio en una estación de comida consciente, natural y artesanal.
                        </p>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <div style={{
                            width: '100%',
                            aspectRatio: '16/10',
                            borderRadius: '30px',
                            overflow: 'hidden',
                            boxShadow: '0 30px 60px rgba(2, 83, 87, 0.15)',
                            position: 'relative',
                            zIndex: 2
                        }}>
                            <img
                                src={galleryImages[0]}
                                alt="ZETAmóvil Zeticas"
                                style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'cover',
                                    objectPosition: 'left center' 
                                }}
                            />
                        </div>
                        {/* Decorative Glass Box */}
                        <div style={{
                            position: 'absolute',
                            bottom: '-40px',
                            left: '-40px',
                            background: 'rgba(255, 255, 255, 0.7)',
                            backdropFilter: 'blur(10px)',
                            padding: '2rem',
                            borderRadius: '20px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                            zIndex: 3,
                            display: 'none' // Hide on small screens
                        }} className="desktop-only">
                           <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', color: 'var(--color-primary)' }}>
                               <MapPin size={24} />
                               <span style={{ fontSize: '0.9rem', fontWeight: '800' }}>Sabana de Bogotá</span>
                           </div>
                        </div>
                    </div>
                </section>

                {/* 2. Service Cards (Premium Refinement) */}
                <section style={{ marginBottom: window.innerWidth < 768 ? '4rem' : '8rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2.5rem' }}>
                        {[
                            { 
                                icon: <Truck size={28} />, 
                                title: 'ZETAmóvil', 
                                text: 'Nuestro ZETAmóvil puede ser muy útil para atender y llevar a diferentes espacios para complacer a los comensales con preparaciones frescas y directas.',
                                color: 'var(--color-primary)'
                            },
                            { 
                                icon: <Utensils size={28} />, 
                                title: 'Menú Saludable', 
                                text: 'Nos especializamos en granolas y sánduches para un uso versátil de nuestras conservas; enfocados en dietas específicas (veganos, vegetarianos u omnívoros).',
                                color: 'var(--color-secondary)'
                            },
                            { 
                                icon: <Users size={28} />, 
                                title: 'Eventos con Sello', 
                                text: 'En alianza con emprendedores locales, ofrecemos una gama de alimentos saludables para atender eventos con alternativas dulces y saladas.',
                                color: 'var(--color-sage)'
                            }
                        ].map((item, i) => (
                            <div key={i} style={{ 
                                background: '#FFFFFF', 
                                padding: '1.75rem 1.5rem', 
                                borderRadius: '12px', 
                                border: '1px solid #f2f2f2',
                                borderTop: `4px solid ${item.color}`,
                                textAlign: 'left',
                                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                                position: 'relative'
                            }} className="service-card-refinement">
                                <div style={{ 
                                    color: item.color, 
                                    marginBottom: '1.25rem', 
                                    display: 'flex', 
                                    justifyContent: 'flex-start',
                                    background: `${item.color}10`,
                                    width: 'fit-content',
                                    padding: '0.6rem',
                                    borderRadius: '10px'
                                }}>
                                    {item.icon}
                                </div>
                                <h3 className="font-serif" style={{ color: 'var(--color-primary)', fontSize: '1.4rem', marginBottom: '0.75rem' }}>{item.title}</h3>
                                <p style={{ color: 'rgba(0,0,0,0.6)', fontSize: '0.9rem', lineHeight: '1.5' }}>{item.text}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 3. Allied Products (Infinite Loop) */}
                <section style={{ marginBottom: isMobile ? '4rem' : '8rem', marginTop: '3rem', overflow: 'hidden' }}>
                    <h2 className="font-serif" style={{ 
                        color: 'var(--color-primary)', 
                        fontSize: isMobile ? '1.8rem' : '2.5rem', 
                        marginBottom: isMobile ? '2rem' : '3.5rem',
                        textAlign: 'left'
                    }}>
                        Productos aliados:
                    </h2>
                    
                    <div className="scroll-viewport" style={{ width: '100%' }}>
                        <div className="scroll-container" style={{ display: 'flex', gap: isMobile ? '1.5rem' : '2.8rem', animationDuration: '75s' }}>
                            {duplicateAllies.map((ally, i) => (
                                <div key={i} style={{ 
                                    minWidth: isMobile ? '200px' : '355px', 
                                    height: isMobile ? '120px' : '180px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    padding: '1.25rem',
                                    transition: 'transform 0.3s ease'
                                }} className="ally-logo-wrapper">
                                    <img 
                                        src={ally.url} 
                                        alt={ally.name} 
                                        style={{ 
                                            maxWidth: '100%', 
                                            maxHeight: '100%', 
                                            objectFit: 'contain',
                                            filter: 'none',
                                            opacity: 1
                                        }} 
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 4. Final CTA (Minimalist Elegance) */}
                <section style={{ textAlign: 'center', marginBottom: isMobile ? '4rem' : '8rem' }}>
                    <div style={{ 
                        background: '#FFFFFF',
                        padding: isMobile ? '2.5rem 1.5rem' : '4rem 3rem', 
                        borderRadius: '24px',
                        border: '1px solid #f0f0f0',
                        position: 'relative',
                        overflow: 'hidden',
                        maxWidth: '900px',
                        margin: '0 auto'
                    }}>
                        <div style={{ position: 'relative', zIndex: 2 }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                                <Calendar size={32} style={{ color: 'var(--color-secondary)' }} />
                            </div>
                            <h2 className="font-serif" style={{ color: 'var(--color-primary)', fontSize: isMobile ? '1.8rem' : '2.4rem', marginBottom: '1rem' }}>
                                ¿Hablamos de tu próximo evento?
                            </h2>
                            <p style={{ color: 'rgba(0,0,0,0.6)', fontSize: '1rem', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2.5rem', lineHeight: '1.6' }}>
                                Desde ferias boutique hasta celebraciones privadas. Estamos listos para llevar el sabor de Zeticas a tu mesa.
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <a 
                                    href="https://wa.me/3144336525?text=%C2%A1Hola%20Zeticas!%20Me%20gustar%C3%ADa%20recibir%20informaci%C3%B3n%20sobre%20sus%20servicios%20de%20catering%20y%20eventos%20para%20mi%20pr%C3%B3xima%20celebraci%C3%B3n.%20%C2%BFMe%20podr%C3%ADan%20ayudar%3F" 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    style={{ 
                                        background: 'var(--color-primary)', 
                                        color: '#fff', 
                                        padding: '0.9rem 2.5rem', 
                                        textDecoration: 'none', 
                                        fontWeight: '700', 
                                        borderRadius: '50px',
                                        fontSize: '0.85rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.1em',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        transition: 'transform 0.3s ease'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    <MessageCircle size={18} /> WhatsApp Directo
                                </a>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .service-card-refinement:hover {
                    transform: translateY(-8px);
                    box-shadow: 0 20px 40px rgba(2, 83, 87, 0.08) !important;
                    border-color: rgba(2, 83, 87, 0.1) !important;
                }
                @media (max-width: 991px) {
                    .desktop-only { display: none !important; }
                }
            `}</style>
        </div>
    );
};

export default Catering;
