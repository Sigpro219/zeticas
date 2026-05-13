import React, { useState, useEffect } from 'react';
import { Linkedin, Mail, ArrowDown, Users, Leaf, Handshake, Globe, MapPin } from 'lucide-react';

const sections = [
    { id: 'filosofia', label: 'Filosofía', title: '{ SER para HACER }' },
    { id: 'apoyo', label: 'Apoyo', title: 'Apoyo & Soporte' },
    { id: 'conocimiento', label: 'Conocimiento', title: 'Conocimiento – Maestría' },
    { id: 'impacto', label: 'Impacto', title: 'Impacto en el Territorio' },
    { id: 'contacto', label: 'Contacto', title: 'Conversemos' }
];

const Consulting = () => {
    const [activeSection, setActiveSection] = useState('intro');

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            const offset = 120; // Account for fixed navbar
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = element.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
            setActiveSection(id);
        }
    };

    return (
        <div className="consulting-page botanical-bg" style={{ minHeight: '100vh', scrollBehavior: 'smooth' }}>
            {/* Local Sticky Navigation */}
            <div style={{
                position: 'sticky',
                top: '100px', // Below main navbar
                zIndex: 900,
                background: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid #eee',
                padding: '1rem 0'
            }}>
                <div className="container" style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
                    {sections.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => scrollToSection(s.id)}
                            style={{
                                background: 'none',
                                border: 'none',
                                borderBottom: activeSection === s.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                                color: activeSection === s.id ? 'var(--color-primary)' : '#666',
                                padding: '0.5rem 0',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: activeSection === s.id ? 'bold' : 'normal',
                                transition: 'all 0.3s ease',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em'
                            }}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="container" style={{ padding: '4rem 0' }}>
                {/* Hero Section */}
                <header id="intro" style={{ textAlign: 'center', marginBottom: '8rem', maxWidth: '900px', margin: '0 auto 8rem' }}>
                    <div style={{ marginBottom: '3rem' }}>
                        <img
                            src="https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/products/863125fb-99a6-41bd-9da2-3079f747cf87.jpg"
                            alt="Equipo Zeticas"
                            style={{ width: '400px', height: 'auto', marginBottom: '2rem', borderRadius: '4px' }}
                        />
                    </div>
                    <h1 className="font-serif" style={{ color: 'var(--color-primary)', fontSize: '3.5rem', marginBottom: '2.5rem', lineHeight: '1.2' }}>
                        Consultoría con Propósito
                    </h1>
                    <p style={{ fontSize: '1.25rem', color: '#444', lineHeight: '1.8', fontStyle: 'italic', marginBottom: '2rem' }}>
                        "Los árboles son solo un elemento del bosque, hacen parte de un ecosistema, que aprende, colabora, conecta, se comunica y responde;"
                    </p>
                    <p style={{ fontSize: '1.1rem', color: '#666', lineHeight: '1.8' }}>
                        Yarumo ancestral, representa el modelo de pensamiento reflexivo, para acompañar a las comunidades, organizaciones y empresas para ser cada día mejor.
                    </p>
                </header>

                {/* Filosofia Section */}
                <section id="filosofia" style={{ marginBottom: '10rem', scrollMarginTop: '150px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '6rem', alignItems: 'center' }}>
                        <div className="salmon-box">
                            <h2 className="font-serif" style={{ color: '#fff', fontSize: '2.5rem', marginBottom: '2rem' }}>{sections[0].title}</h2>
                            <p style={{ color: '#fff', fontSize: '1.1rem', opacity: 0.9 }}>
                                Nuestro enfoque se centra en la valoración del saber ancestral y el empoderamiento de estructuras autónomas.
                                Mercados conscientes bajo el espíritu Lean Agile.
                            </p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            {[
                                { t: 'Potencial Autóctono', d: 'Volver a las raíces y resaltar la identidad cultural.' },
                                { t: 'Mercados Conscientes', d: 'Comercio justo e impacto comunitario real.' },
                                { t: 'Prácticas Sostenibles', d: 'Producción limpia y autonomía agroalimentaria.' },
                                { t: 'Lean Agile', d: 'Gestión colegiada, Scrum y mejora continua (Kaizen).' }
                            ].map((item, i) => (
                                <div key={i} style={{ padding: '1.5rem', borderLeft: '3px solid var(--color-sage)', background: '#fff' }}>
                                    <h4 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }}>{item.t}</h4>
                                    <p style={{ fontSize: '0.9rem', color: '#666' }}>{item.d}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Apoyo Section */}
                <section id="apoyo" style={{ marginBottom: '10rem', padding: '4rem', background: '#f8f9f8', borderRadius: '4px' }}>
                    <h2 className="font-serif" style={{ color: 'var(--color-primary)', fontSize: '2.5rem', marginBottom: '4rem', textAlign: 'center' }}>{sections[1].title}</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem' }}>
                        <div>
                            <h3 style={{ color: 'var(--color-secondary)', marginBottom: '1.5rem' }}>Sectores de Impacto</h3>
                            <ul style={{ listStyle: 'none', padding: 0, lineHeight: '2' }}>
                                <li>• Industria y Agroindustria</li>
                                <li>• Turismo Sostenible</li>
                                <li>• Servicios y Productos Forestales</li>
                                <li>• Economía Solidaria</li>
                            </ul>
                        </div>
                        <div>
                            <h3 style={{ color: 'var(--color-secondary)', marginBottom: '1.5rem' }}>Organizaciones</h3>
                            <ul style={{ listStyle: 'none', padding: 0, lineHeight: '2' }}>
                                <li>• Sector Privado y Gobierno</li>
                                <li>• Organizaciones Internacionales</li>
                                <li>• ONGs y Asociaciones</li>
                                <li>• Cooperativas Comunitarias</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Conocimiento Section */}
                <section id="conocimiento" style={{ marginBottom: '10rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <h2 className="font-serif" style={{ color: 'var(--color-primary)', fontSize: '2.5rem', marginBottom: '2rem' }}>{sections[2].title}</h2>
                        <p style={{ maxWidth: '800px', margin: '0 auto', fontSize: '1.1rem', color: '#666' }}>
                            "El tronco es el medio para alimentarse y llenarse de energía para florecer. No hay yarumos sin hormigas, los defienden."
                        </p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
                        {[
                            { t: 'Gestión de Proyectos', d: 'Formulación, evaluación y seguimiento técnico riguroso.' },
                            { t: 'Cadenas de Valor', d: 'Pesca artesanal, artesanías e innovación alimentaria.' },
                            { t: 'Relacionamiento', d: 'Construcción de confianza bajo enfoque de género.' }
                        ].map((item, i) => (
                            <div key={i} style={{ background: '#fff', padding: '2.5rem', boxShadow: '0 10px 40px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                                <h4 style={{ color: 'var(--color-primary)', fontSize: '1.2rem', marginBottom: '1rem' }}>{item.t}</h4>
                                <p style={{ fontSize: '0.9rem', color: '#777', lineHeight: '1.6' }}>{item.d}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Impacto Section */}
                <section id="impacto" style={{ marginBottom: '10rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '6rem' }}>
                        <h2 className="font-serif" style={{ color: 'var(--color-primary)', fontSize: '3rem', marginBottom: '1.5rem' }}>{sections[3].title}</h2>
                        <p style={{ color: '#444', fontSize: '1.2rem', maxWidth: '800px', margin: '0 auto', lineHeight: '1.6', fontStyle: 'italic' }}>
                            "Negocio inclusivo con acuerdos justos y competitivos con comunidades, valorando su potencial."
                        </p>
                    </div>

                    {/* Pillars */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2.5rem', marginBottom: '8rem' }}>
                        <div style={{ background: '#fff', padding: '2.5rem', borderRadius: '4px', boxShadow: '0 15px 40px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                            <div style={{ background: 'var(--color-secondary)', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#fff' }}>
                                <Handshake size={24} />
                            </div>
                            <h4 className="font-serif" style={{ fontSize: '1.5rem', color: 'var(--color-primary)', marginBottom: '1rem' }}>Modelo de Negocio</h4>
                            <p style={{ color: '#666', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                Acuerdos justos y competitivos, permitiendo que cada productor valore su propio potencial.
                            </p>
                        </div>

                        <div style={{ background: '#fff', padding: '2.5rem', borderRadius: '4px', boxShadow: '0 15px 40px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                            <div style={{ background: 'var(--color-primary)', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#fff' }}>
                                <Users size={24} />
                            </div>
                            <h4 className="font-serif" style={{ fontSize: '1.5rem', color: 'var(--color-primary)', marginBottom: '1rem' }}>Impacto Social</h4>
                            <p style={{ color: '#666', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                98% de materia prima nacional y prioridad a mujeres cabeza de hogar.
                            </p>
                        </div>

                        <div style={{ background: '#fff', padding: '2.5rem', borderRadius: '4px', boxShadow: '0 15px 40px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                            <div style={{ background: 'var(--color-sage)', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#fff' }}>
                                <Leaf size={24} />
                            </div>
                            <h4 className="font-serif" style={{ fontSize: '1.5rem', color: 'var(--color-primary)', marginBottom: '1rem' }}>Ambiental</h4>
                            <p style={{ color: '#666', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                Materias primas agroecológicas y manejo de residuos vía compostaje.
                            </p>
                        </div>
                    </div>

                    {/* Map & Territory */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6rem', alignItems: 'center' }}>
                        <div>
                            <h3 className="font-serif" style={{ color: 'var(--color-primary)', fontSize: '2.5rem', marginBottom: '2rem' }}>Presencia en el Territorio</h3>
                            <p style={{ marginBottom: '2rem', fontSize: '1.1rem', color: '#666', lineHeight: '1.8' }}>
                                Desde la <strong>Finca Mingalaba (Guasca)</strong>, impactamos positivamente el territorio nacional fortaleciendo cadenas de café, miel, caña y pesca.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                <div>
                                    <h5 style={{ color: 'var(--color-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={16} /> Bogotá</h5>
                                    <p style={{ fontSize: '0.85rem', color: '#777' }}>Mercado Lourdes<br />Guaymaral</p>
                                </div>
                                <div>
                                    <h5 style={{ color: 'var(--color-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={16} /> Región</h5>
                                    <p style={{ fontSize: '0.85rem', color: '#777' }}>Sopó & Villa de Leyva</p>
                                </div>
                            </div>
                        </div>
                        <div style={{ background: '#fff', padding: '1rem', borderRadius: '4px', boxShadow: '0 15px 50px rgba(0,0,0,0.1)' }}>
                            <img
                                src="https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/products/Mapa_Regiones_Naturales_de_Colombia_small.jpg"
                                alt="Mapa de impacto Colombia"
                                style={{ width: '100%', height: 'auto' }}
                            />
                        </div>
                    </div>
                </section>

                {/* Contacto Section */}
                <section id="contacto" style={{ textAlign: 'center', padding: '6rem 0' }}>
                    <div className="salmon-box" style={{ maxWidth: '600px', margin: '0 auto', padding: '4rem' }}>
                        <h2 className="font-serif" style={{ color: '#fff', fontSize: '2.5rem', marginBottom: '1rem' }}>{sections[4].title}</h2>
                        <h3 style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '3rem', fontWeight: '300' }}>Camila Zambrano</h3>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
                            <a href="https://linkedin.com" target="_blank" rel="noreferrer" style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                                <Linkedin size={20} /> LinkedIn
                            </a>
                            <a href="mailto:hola@zeticas.com" style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                                <Mail size={20} /> Correo
                            </a>
                        </div>
                    </div>
                </section>
            </div>

            {/* Scrolling Hook for Tab Activation */}
            <ScrollEffect onScroll={(id) => setActiveSection(id)} />
        </div>
    );
};

// Helper component for scroll detection
const ScrollEffect = ({ onScroll }) => {
    useEffect(() => {
        const handleScroll = () => {
            const scrollPos = window.scrollY + 200;
            sections.forEach(s => {
                const el = document.getElementById(s.id);
                if (el && el.offsetTop <= scrollPos && el.offsetTop + el.offsetHeight > scrollPos) {
                    onScroll(s.id);
                }
            });
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [onScroll]);
    return null;
};

export default Consulting;
