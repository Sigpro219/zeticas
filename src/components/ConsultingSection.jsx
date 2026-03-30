import React from 'react';
import { Link } from 'react-router-dom';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useBusiness } from '../context/BusinessContext';
const savannaImg = 'https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/assets/savanna.png';

const ConsultingSection = () => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const { siteContent } = useBusiness();
    const content = siteContent?.consulting || {};

    return (
        <section className="consulting whitespace-xl" style={{ 
            backgroundColor: '#ffffff',
            padding: isMobile ? '6rem 0' : '8rem 0'
        }}>
            <div className="container" style={{
                display: 'flex',
                flexDirection: isMobile ? 'column-reverse' : 'row',
                gap: isMobile ? '3rem' : '4rem',
                alignItems: 'center'
            }}>
                <div className="consulting-content" style={{ flex: 1, textAlign: isMobile ? 'center' : 'left' }}>
                    <h2 className="font-serif" style={{ 
                        fontSize: isMobile ? '2.5rem' : '3rem', 
                        marginBottom: '1.5rem', 
                        lineHeight: '1.2' 
                    }}>
                        {content.title || 'Asesoría con Propósito'}
                    </h2>
                    <p style={{ color: '#666', marginBottom: '2rem', fontSize: isMobile ? '1rem' : '1.1rem' }}>
                        {content.description || 'No solo vendemos productos; impulsamos el crecimiento de la región. Ofrecemos consultoría especializada en sostenibilidad para empresas y acompañamiento integral a comunidades rurales a nivel nacional.'}
                    </p>
                    <ul style={{ 
                        listStyle: 'none', 
                        marginBottom: '3rem',
                        padding: 0, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '1rem',
                        alignItems: isMobile ? 'center' : 'flex-start'
                    }}>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-secondary)', flexShrink: 0 }}></span>
                            Impulso a productores campesinos
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-secondary)', flexShrink: 0 }}></span>
                            Estrategias de sostenibilidad corporativa
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-secondary)', flexShrink: 0 }}></span>
                            Optimización de cadena de valor local
                        </li>
                    </ul>
                    <Link to="/consultoria" className="btn btn-primary" style={{
                        padding: '1rem 2.5rem',
                        fontWeight: '800',
                        fontSize: '0.85rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        borderRadius: '50px'
                    }}>Conocer más</Link>
                </div>
                <div className="consulting-image" style={{ flex: 1, width: '100%' }}>
                    <img
                        src={savannaImg}
                        alt="Sabana de Bogotá Landscape"
                        style={{
                            width: '100%',
                            height: isMobile ? '280px' : '420px',
                            objectFit: 'cover',
                            borderRadius: '2px',
                            boxShadow: isMobile ? '0 10px 30px rgba(0,0,0,0.1)' : 'none'
                        }}
                    />
                </div>
            </div>
        </section>
    );
};

export default ConsultingSection;
