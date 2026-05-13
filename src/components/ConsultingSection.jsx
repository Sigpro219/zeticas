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
            padding: isMobile ? '4rem 0' : '6rem 0'
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
                        {'Consultoría con Propósito'}
                    </h2>
                    <p style={{ color: '#666', marginBottom: '2rem', fontSize: isMobile ? '1rem' : '1.1rem', lineHeight: '1.6' }}>
                        {'Nuestra pasión va más allá de nuestros productos, impulsamos lideres y emprendedores a un desarrollo rural sostenible, de acuerdo a sus contextos, con apoyo de largo aliento para relaciones de confianza y lograr resultados de crecimiento juntos.'}
                    </p>
                    <ul style={{ 
                        listStyle: 'none', 
                        marginBottom: '3rem',
                        padding: 0, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '1.2rem',
                        alignItems: isMobile ? 'center' : 'flex-start',
                        color: '#666',
                        fontSize: '1.05rem'
                    }}>
                        {[
                            'Optimización de cadena de valor local',
                            'Desarrollo de productos para aprovechar la biodiversidad local',
                            'Desarrollo de modelos de socio bioeconomía',
                            'Modelos empresariales sostenibles bajo el espíritu LEAN'
                        ].map((item, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-secondary)', flexShrink: 0 }}></span>
                                {item}
                            </li>
                        ))}
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
