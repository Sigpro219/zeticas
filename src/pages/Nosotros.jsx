import React from 'react';
const teamPhoto = 'https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/products/fotoNos-770x1024.png';
const bgHojas = 'https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/products/hojas3-scaled.png';
const farmPhoto = 'https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/products/DSC03651-scaled.jpg';

const Nosotros = () => {
    return (
        <div className="nosotros-page botanical-bg" style={{ minHeight: '100vh', padding: '5rem 0' }}>
            <div className="container">
                {/* Hero Section for Nosotros */}
                <section className="nosotros-hero" style={{ marginBottom: '8rem' }}>
                    <h1 className="font-serif" style={{ color: 'var(--color-primary)', fontSize: '5rem', marginBottom: '4rem', textAlign: 'center' }}>Nosotros</h1>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '4rem', alignItems: 'center' }}>
                        <div className="nosotros-content salmon-box" style={{ 
                            boxShadow: '20px 20px 60px rgba(0,0,0,0.1)', 
                            padding: '4rem',
                            borderRadius: '24px' 
                        }}>
                            <p style={{ color: '#fff', fontSize: '1.2rem', lineHeight: '1.8', opacity: 0.9 }}>
                                Zeticas nace de la pasión por nuestra tierra y el deseo de transformar la riqueza de la Sabana de Bogotá en productos excepcionales que cuentan una historia de sostenibilidad y respeto.
                            </p>
                        </div>
                        <div className="nosotros-image">
                            <img
                                src={teamPhoto}
                                alt="Equipo Zeticas"
                                style={{ width: '100%', height: 'auto', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                            />
                        </div>
                    </div>
                </section>

                {/* Detailed Story Section */}
                <section className="nosotros-details" style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', padding: '4rem', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', borderRadius: '24px' }}>
                    <h2 className="font-serif" style={{ fontSize: '2.5rem', marginBottom: '2rem', textAlign: 'center' }}>Camila Zambrano</h2>
                    <p style={{ marginBottom: '2rem', fontSize: '1.1rem', color: '#444' }}>
                        Ingeniera de Producción Agroindustrial con 15 años de experiencia en desarrollo rural. Camila ha unido su conocimiento técnico con una passion profunda por la biodiversidad colombiana.
                    </p>

                    <h3 className="font-serif" style={{ fontSize: '1.8rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>Nuestra Misión</h3>
                    <p style={{ marginBottom: '2rem', fontSize: '1.1rem', color: '#666' }}>
                        Exaltar los ecosistemas colombianos a través de productos agroecológicos. Valoramos lo local, eliminando aditivos y conservantes para llevar la pureza del campo a su mesa.
                    </p>

                    <h3 className="font-serif" style={{ fontSize: '1.8rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>Impacto Social</h3>
                    <p style={{ marginBottom: '2rem', fontSize: '1.1rem', color: '#666' }}>
                        Somos un motor de cambio en Guasca, Cundinamarca. Promovemos el empleo local, priorizando a mujeres cabeza de familia y trabajando mano a mano con productores agroecológicos de la región.
                    </p>

                    <div style={{ padding: '2rem', borderLeft: '4px solid var(--color-secondary)', background: '#fdf8f6', marginTop: '3rem' }}>
                        <p style={{ fontStyle: 'italic', color: 'var(--color-primary)', fontSize: '1.1rem' }}>
                            "Zeticas no es solo una marca de conservas; es un compromiso con el futuro del campo colombiano y el bienestar de quienes lo trabajan."
                        </p>
                    </div>
                </section>

                {/* ZetaMovil Section */}
                <section style={{ marginTop: '8rem', textAlign: 'center', position: 'relative' }}>
                    <div style={{
                        position: 'absolute',
                        top: '-100px',
                        left: '-10%',
                        width: '300px',
                        height: '300px',
                        backgroundImage: `url(${bgHojas})`,
                        backgroundSize: 'contain',
                        backgroundNoRepeat: 'no-repeat',
                        opacity: 0.1,
                        zIndex: -1
                    }}></div>
                    <img
                        src={farmPhoto}
                        alt="Finca Zeticas"
                        style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '24px', marginBottom: '3rem', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                    />
                    <h2 className="font-serif" style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>El Zetamóvil</h2>
                    <p style={{ maxWidth: '600px', margin: '0 auto 3rem', color: '#666' }}>
                        Nuestra forma de llevar el campo a la ciudad. Participamos en ferias y eventos, transformando nuestras conservas gourmet en experiencias instantáneas: sándwiches, granolas y más.
                    </p>
                </section>
            </div>
        </div>
    );
};

export default Nosotros;
