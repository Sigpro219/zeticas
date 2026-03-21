import React from 'react';
import { Link } from 'react-router-dom';
const savannaImg = 'https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/assets/savanna.png';

const ConsultingSection = () => {
    return (
        <section className="consulting whitespace-xl" style={{ 
            backgroundColor: '#ffffff',
            padding: '10.8rem 0 8rem' // Reduced bottom for more compact flow
        }}>
            <div className="container" style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '1fr 1fr', // Basic responsive check
                gap: '4rem',
                alignItems: 'center'
            }}>
                <div className="consulting-content">
                    <h2 className="font-serif" style={{ fontSize: '3rem', marginBottom: '2rem', lineHeight: '1.2' }}>
                        Asesoría con <br /><span className="text-salmon">Propósito</span>
                    </h2>
                    <p style={{ color: '#666', marginBottom: '2rem', fontSize: '1.1rem' }}>
                        No solo vendemos productos; impulsamos el crecimiento de la región. Ofrecemos consultoría especializada en sostenibilidad para empresas y apoyo técnico a productores locales de la Sabana de Bogotá.
                    </p>
                    <ul style={{ listStyle: 'none', marginBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-secondary)' }}></span>
                            Impulso a productores campesinos
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-secondary)' }}></span>
                            Estrategias de sostenibilidad corporativa
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-secondary)' }}></span>
                            Optimización de cadena de valor local
                        </li>
                    </ul>
                    <Link to="/consultoria" className="btn btn-primary" style={{
                        padding: '1rem 2.5rem',
                        fontWeight: '800',
                        fontSize: '0.85rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        borderRadius: '50px' // Polishing button
                    }}>Conocer más</Link>
                </div>
                <div className="consulting-image">
                    <img
                        src={savannaImg}
                        alt="Sabana de Bogotá Landscape"
                        style={{
                            width: '100%',
                            height: '420px', // Slightly reduced height
                            objectFit: 'cover',
                            borderRadius: '2px'
                        }}
                    />
                </div>
            </div>
        </section>
    );
};

export default ConsultingSection;
