import React, { useState, useEffect } from 'react';
import { MessageCircle, ArrowUp, Check, Leaf, Users, Factory, Tractor, Umbrella, HeartHandshake, Bookmark, Globe, Building2, Globe2, Share2, ListOrdered, Eye, Carrot, Fish, PencilRuler, Trees, Handshake, Venus, Mars, BookOpen, Network, Bug, Coffee, Wheat, Flower2, TreePalm, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { GiFishingNet, GiBeehive, GiSugarCane, GiBanana, GiCow, GiPalmTree, GiPineTree, GiCompass, GiSprout, GiPlantRoots, GiProcessor } from "react-icons/gi";
import { FaCoffee, FaPalette, FaLeaf, FaBuilding, FaUniversity, FaUmbrellaBeach, FaClipboardList, FaClipboardCheck, FaSearchPlus, FaHandshake, FaVenusMars, FaUsersCog, FaChalkboardTeacher, FaBookReader, FaHandHoldingHeart, FaGlobe, FaHeart, FaTractor, FaIndustry } from "react-icons/fa";
import { MdBrush } from "react-icons/md";
import { useBusiness, CAMPAIGN_PRESETS } from '../context/BusinessContext';
import PromoModal from '../components/PromoModal';

const HomeCZ = () => {
    const { siteContent } = useBusiness();
    
    // Dynamic content extraction
    const philosophy = siteContent?.philosophy || {};
    const support = siteContent?.support || {};
    const knowledge = siteContent?.knowledge || {};
    const impact = siteContent?.impact || {};
    const extra = siteContent?.extra || {};
    const campaign = siteContent?.campaign || {};

    const imagesConsulting = [
        '/assets/consultoria/863125fb-99a6-41bd-9da2-3079f747cf87.JPG',
        '/assets/consultoria/IMG_1653.JPG',
        '/assets/consultoria/IMG_2257.JPG',
        '/assets/consultoria/IMG_4002.JPG',
        '/assets/consultoria/IMG_4447.jpeg',
        '/assets/consultoria/IMG_4523.jpeg',
        '/assets/consultoria/IMG_4545.jpeg',
        '/assets/consultoria/IMG_4597.jpeg'
    ];
    const [currentImage, setCurrentImage] = useState(0);
    const aliados = Array.from({ length: 11 }, (_, i) => `/assets/aliados/aliado${i + 1}.png`);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentImage(prev => (prev + 1) % imagesConsulting.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [imagesConsulting.length]);

    const nextImage = () => setCurrentImage(prev => (prev + 1) % imagesConsulting.length);
    const prevImage = () => setCurrentImage(prev => (prev - 1 + imagesConsulting.length) % imagesConsulting.length);
    
    const yarumoUrl = '/assets/yarumo_tree.png';
    const logoCZ = 'https://www.zeticas.com/wp-content/uploads/2023/11/cropped-cropped-logo-removebg-preview-e1698878511967.png';
    const institutionalOcre = '#B59E74';
    const deepTeal = campaign?.active ? (CAMPAIGN_PRESETS[campaign.preset]?.accentColor || '#004B50') : '#004B50';
    const campaignActive = campaign?.active;
    const campaignTheme = campaign?.preset ? CAMPAIGN_PRESETS[campaign.preset] : null;

    return (
        <div className="home-cz" style={{ backgroundColor: campaignActive ? (campaignTheme?.primaryColor || '#fff') : '#fff', minHeight: '100vh', fontFamily: "'Quicksand', sans-serif" }}>
            <PromoModal campaign={campaign} />
            
            {/* 1. Hero Section */}
            <div id="inicio" style={{ scrollMarginTop: '150px' }}></div>
            <section style={{ 
                padding: '6rem 5% 10rem', 
                position: 'relative', 
                display: 'grid', 
                gridTemplateColumns: '1fr auto 1fr', 
                alignItems: 'center', 
                gap: '2rem' 
            }}>
                <div style={{ textAlign: 'center', padding: '0 2rem' }}>
                    <p style={{ fontStyle: 'italic', color: '#666', fontSize: '1.2rem', lineHeight: '1.8' }} className="font-serif">
                            {extra.hero_quote || '"Los árboles son solo un elemento del bosque, hacen parte de un ecosistema, que aprende, colabora, conecta, se comunica y responde; Nuestro “Yarumo” ancestral, pensativo y reflexivo nos permite ser parte dé ser cada día mejor."'}
                    </p>
                </div>
                <div style={{ position: 'relative', width: '280px', display: 'flex', justifyContent: 'center' }}>
                    <img src={yarumoUrl} alt="Yarumo Tree" style={{ width: '100%', height: 'auto', zIndex: 2 }} />
                </div>
                <div style={{ textAlign: 'center', padding: '0 2rem' }}>
                    <img src={logoCZ} alt="CZ Logo" style={{ height: '100px', marginBottom: '1.5rem', opacity: 0.8 }} />
                    <p style={{ color: '#444', fontSize: '1.05rem', lineHeight: '1.7' }}>
                        {extra.hero_desc || 'Apoyamos y acompañamos a comunidades y organizaciones para pensar y reflexionar, reconocer su potencial y vivir plenamente su territorio. Lo hacemos fortaleciendo capacidades, valorando su identidad, desarrollando productos y gestionando alianzas, con el fin de construir un tejido social profundo, conectado, productivo y en equilibrio con la naturaleza.'}
                    </p>
                </div>
            </section>

            {/* 2. Filosofía Section */}
            <section id="filosofia" style={{ padding: '8rem 5%', background: '#F8F9FA', scrollMarginTop: '130px' }}>
                <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
                    <h2 className="font-serif" style={{ color: deepTeal, fontSize: '3rem', marginBottom: '1.5rem' }}>{philosophy.title || 'Filosofía & Enfoque'}</h2>
                    <h3 style={{ color: '#4CAF50', fontSize: '1.8rem', fontWeight: '400' }}>{philosophy.subtitle || '{ SER para HACER }'}</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', maxWidth: '1200px', margin: '0 auto' }}>
                    {[
                        { title: 'POTENCIAL AUTÓCTONO', icon: <Check size={18} color="#9DB547" />, items: ['Volver a las raíces', 'Valoración de la sabiduría ancestral', 'Resaltar identidad cultural', 'Empoderar estructuras autónomas'] },
                        { title: 'MERCADOS CONSCIENTES', icon: <Users size={18} color="#9DB547" />, items: ['Comercio justo', 'Impacto comunitario', 'Desarrollo de productos con calidad', 'Mercados diferenciados', 'Principios de conservación', 'Experiencias de consumo'] },
                        { title: 'PRÁCTICAS SOSTENIBLES', icon: <Leaf size={18} color="#9DB547" />, items: ['Diversidad de cultivos', 'Autonomía agroalimentaria', 'Respeto por la tradición y cultura', 'Producción limpia', 'Circuitos cortos de valor', 'Trabajo colaborativo', 'Arraigo al territorio'] },
                        { title: 'ESPÍRITU LEAN AGILE', icon: <div style={{ background: '#9DB547', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={12} strokeWidth={4} /></div>, items: ['Gestión colegiada y dinámica', 'Misión y visión – Hoshin Kanri', 'Gestión visual y frecuente- mieruka + scrum', 'Mejor persona -mejor organización- kaizen', 'Flujo de valor – Nagare', 'Orientado a resultados responsables'] }
                    ].map((block, i) => (
                        <div key={i} style={{ background: '#fff', padding: '2.5rem', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', borderTop: `4px solid ${i % 2 === 0 ? institutionalOcre : deepTeal}` }}>
                            <h4 style={{ color: deepTeal, fontWeight: '800', marginBottom: '1.5rem', fontSize: '1.1rem' }}>{block.title}</h4>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {block.items.map((item, idx) => (
                                    <li key={idx} style={{ display: 'flex', gap: '12px', marginBottom: '0.9rem', fontSize: '1rem', color: '#444' }}>
                                        <div style={{ marginTop: '2px' }}>{block.icon}</div> <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </section>

            {/* 3. Quote Section */}
            <section style={{ padding: '8rem 5%', textAlign: 'center', background: '#fff', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '360px', height: '360px', backgroundImage: 'url(https://www.zeticas.com/wp-content/uploads/2025/05/yarumo.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', opacity: 0.1, zIndex: 1 }}></div>
                <div style={{ maxWidth: '850px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
                    <h2 className="font-serif" style={{ color: deepTeal, fontSize: '3rem', lineHeight: '1.3' }}>
                        {extra.quote_yarumo || 'Yarumo árbol del pensamiento y la sabiduría ancestral, su fortaleza radica en su crecimiento'}
                    </h2>
                </div>
            </section>

            {/* 4. Apoyo Section */}
            <section id="apoyo" style={{ padding: '8rem 5%', background: '#e0e2bd', position: 'relative', textAlign: 'center', overflow: 'hidden', scrollMarginTop: '130px' }}>
                <div style={{ 
                    position: 'absolute', 
                    top: '0', 
                    left: '50%', 
                    transform: 'translateX(-50%)', 
                    width: '100%',
                    height: '100%',
                    backgroundImage: 'url(/assets/raiz_sin_fondo.png)',
                    backgroundSize: 'contain',
                    backgroundPosition: 'top',
                    backgroundRepeat: 'no-repeat',
                    opacity: 0.15,
                    zIndex: 0
                }}></div>
                <h2 className="font-serif" style={{ color: deepTeal, fontSize: '3rem', marginBottom: '5.5rem' }}>{support.title || 'Apoyo & soporte'}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '5rem', maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
                        <div style={{ textAlign: 'left' }}>
                            <h4 style={{ color: deepTeal, marginBottom: '2rem', fontSize: '1.1rem', fontWeight: '800' }}>EXPERIENCIA EN DIFERENTES SECTORES</h4>
                            <p style={{ color: '#444', marginBottom: '1.5rem', fontWeight: '700', fontSize: '1rem' }}>Productos Forestales y no maderables</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {[
                                    { title: 'Industria', icon: <FaIndustry size={28} /> },
                                    { title: 'Agroindustria', icon: <FaTractor size={28} /> },
                                    { title: 'Turismo', icon: <FaUmbrellaBeach size={28} /> },
                                    { title: 'Servicios', icon: <FaHandHoldingHeart size={28} /> }
                                ].map((s, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '20px', color: '#333', fontWeight: '700', fontSize: '1rem' }}>
                                        <div style={{ width: '40px', display: 'flex', justifyContent: 'center', color: deepTeal }}>{s.icon}</div> {s.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <h4 style={{ color: deepTeal, marginBottom: '2rem', fontSize: '1.1rem', fontWeight: '800' }}>TIPO DE ORGANIZACIONES DONDE HEMOS APOYADO</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {[
                                { title: 'Privado', icon: <FaBuilding size={28} /> },
                                { title: 'Organizaciones internacionales', icon: <FaGlobe size={28} /> },
                                { title: 'Gobierno', icon: <FaUniversity size={28} /> },
                                { title: 'ONG´ s', icon: <FaHeart size={28} /> },
                                { title: 'Asociaciones – Economía solidaria', icon: <GiSprout size={28} /> }
                            ].map((o, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '20px', color: '#333', fontWeight: '700', fontSize: '1rem' }}>
                                    <div style={{ width: '40px', display: 'flex', justifyContent: 'center', color: deepTeal }}>{o.icon}</div> {o.title}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div style={{ marginTop: '7rem', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                    <h2 className="font-serif" style={{ color: deepTeal, fontSize: '2.5rem', marginBottom: '1.5rem' }}>{support.subtitle || 'Sinergias de vida'}</h2>
                    <p style={{ color: '#444', fontSize: '1.2rem', fontWeight: '500' }}>{support.description || 'Sistema megadiverso que aumentan la eficiencia en el ecosistema'}</p>
                </div>
            </section>

            {/* 5. Conocimiento Section */}
            <section id="conocimiento" style={{ padding: '8rem 5%', background: '#fff' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <h2 className="font-serif" style={{ color: deepTeal, fontSize: '3rem', marginBottom: '5rem', textAlign: 'center' }}>{knowledge.title || 'Conocimiento – Maestría'}</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4rem' }}>
                    <div style={{ textAlign: 'left' }}>
                        <h3 style={{ color: deepTeal, fontSize: '1.1rem', fontWeight: '800', marginBottom: '2rem' }}>GESTIÓN DE PROYECTOS</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {[{ title: 'Formulación', icon: <FaClipboardList size={24} /> }, { title: 'Evaluación', icon: <FaClipboardCheck size={24} /> }, { title: 'Seguimiento', icon: <FaSearchPlus size={24} /> }].map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#444', fontWeight: '700', fontSize: '1rem' }}>
                                    <div style={{ width: '30px', color: deepTeal }}>{item.icon}</div> {item.title}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <h3 style={{ color: deepTeal, fontSize: '1.1rem', fontWeight: '800', marginBottom: '2rem' }}>DESARROLLO CADENAS DE VALOR</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {[{ title: 'Productos agrícolas', icon: <FaLeaf size={24} /> }, { title: 'No maderables', icon: <GiPlantRoots size={24} /> }, { title: 'Pesca artesanal', icon: <GiFishingNet size={24} /> }, { title: 'Artesanías', icon: <MdBrush size={24} /> }, { title: 'Productos innovadores', icon: <GiProcessor size={24} /> }, { title: 'Forestal', icon: <GiPineTree size={24} /> }].map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#444', fontWeight: '700', fontSize: '1rem' }}>
                                    <div style={{ width: '30px', color: deepTeal }}>{item.icon}</div> {item.title}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <h3 style={{ color: deepTeal, fontSize: '1.1rem', fontWeight: '800', marginBottom: '2rem' }}>RELACIONAMIENTO COMUNITARIO & ACOMPAÑAMIENTO</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {[{ title: 'Construcción de confianza', icon: <FaHandshake size={24} /> }, { title: 'Enfoque de género', icon: <FaVenusMars size={24} /> }, { title: 'Equipos autónomos', icon: <FaUsersCog size={24} /> }, { title: 'Formación de líderes', icon: <FaChalkboardTeacher size={24} /> }, { title: 'Intercambio de saberes', icon: <FaBookReader size={24} /> }].map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#444', fontWeight: '700', fontSize: '1rem' }}>
                                    <div style={{ width: '40px', color: deepTeal }}>{item.icon}</div> {item.title}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
            {/* 6. Tronco Section */}
            <section style={{ 
                padding: '8rem 5%', 
                textAlign: 'center', 
                background: '#fff',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ 
                    position: 'absolute', 
                    top: '50%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)', 
                    width: '420px',
                    height: '420px',
                    backgroundImage: 'url(https://www.zeticas.com/wp-content/uploads/2025/05/yarumo.png)',
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    opacity: 0.05, 
                    zIndex: 1
                }}></div>
                <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
                    <p className="font-serif" style={{ color: '#444', fontSize: '2.5rem', lineHeight: '1.4', fontWeight: '500' }}>
                        {extra.quote_tronco || 'El tronco nos permite la nutrición y es el medio para alimentarse y llenarse de energía para florecer. No hay yarumos sin hormigas, los defienden'}
                    </p>
                </div>
            </section>

            {/* 7. Poetic Divider: Colaboración */}
            <section style={{ 
                padding: '8rem 5%', 
                backgroundColor: '#f1f4f9', 
                textAlign: 'center',
                position: 'relative'
            }}>
                <div style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    height: '100%',
                    backgroundImage: 'url(https://www.zeticas.com/wp-content/uploads/2025/05/yarumo.png)',
                    backgroundSize: '150px',
                    backgroundRepeat: 'repeat-x',
                    backgroundPosition: 'center',
                    opacity: 0.04,
                    zIndex: 1
                }}></div>
                <div style={{ position: 'relative', zIndex: 2, maxWidth: '900px', margin: '0 auto' }}>
                    <p className="font-serif" style={{ color: institutionalOcre, fontSize: '1.6rem', lineHeight: '1.6', fontWeight: '500', fontStyle: 'italic' }}>
                        {extra.quote_colab || 'Sentido de colaboración y cooperación mutua son fundamentales para lograr lo que te propones'}
                    </p>
                </div>
            </section>

            {/* 8. Impacto Section (Redesigned Layout) */}
            <section id="impacto" style={{ padding: '8rem 5%', background: '#fdfcf7', scrollMarginTop: '130px' }}>
                <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
                    <h2 className="font-serif" style={{ color: deepTeal, fontSize: '3rem', marginBottom: '1.5rem' }}>{impact.title || 'Impacto'}</h2>
                    <h3 style={{ color: deepTeal, fontSize: '1.2rem', fontWeight: '800' }}>{impact.subtitle || 'Trabajo comunitario en todas las regiones de Colombia'}</h3>
                </div>

                {/* Row 1: Carousel + Map */}
                <div style={{ display: 'flex', gap: '3rem', maxWidth: '1200px', margin: '0 auto', marginBottom: '6rem' }}>
                    {/* Carousel (70%) */}
                    <div style={{ flex: '0 0 70%', position: 'relative' }}>
                        <div style={{ width: '100%', height: '600px', background: '#eee', borderRadius: '20px', overflow: 'hidden', position: 'relative', boxShadow: '0 25px 50px rgba(0,0,0,0.12)' }}>
                             {imagesConsulting.map((img, index) => (
                                 <div 
                                    key={index} 
                                    style={{ 
                                        position: 'absolute', 
                                        top: 0, 
                                        left: 0, 
                                        width: '100%', 
                                        height: '100%', 
                                        opacity: index === currentImage ? 1 : 0, 
                                        transition: 'opacity 1s ease-in-out',
                                        zIndex: index === currentImage ? 1 : 0
                                    }}
                                 >
                                    <img 
                                        src={img} 
                                        alt={`Impacto ${index}`} 
                                        style={{ 
                                            width: '100%', 
                                            height: '100%', 
                                            objectFit: 'cover', 
                                            transform: index === currentImage ? 'scale(1.1)' : 'scale(1)', 
                                            transition: 'transform 8s ease-out'
                                        }} 
                                    />
                                 </div>
                             ))}
                             
                             <button 
                                onClick={prevImage} 
                                style={{ position: 'absolute', top: '50%', left: '20px', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.4)', border: 'none', borderRadius: '50%', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, color: '#fff' }}
                             >
                                <ChevronLeft size={30} />
                             </button>
                             <button 
                                onClick={nextImage} 
                                style={{ position: 'absolute', top: '50%', right: '20px', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.4)', border: 'none', borderRadius: '50%', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, color: '#fff' }}
                             >
                                <ChevronRight size={30} />
                             </button>
                        </div>
                    </div>

                    {/* Map (30%) */}
                    <div style={{ flex: '1', display: 'flex', alignItems: 'center' }}>
                        <img 
                            src="https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/products/Mapa_Regiones_Naturales_de_Colombia_small.jpg" 
                            alt="Mapa de impacto Colombia" 
                            style={{ width: '100%', height: 'auto', borderRadius: '20px', boxShadow: '0 15px 35px rgba(0,0,0,0.1)' }} 
                        />
                    </div>
                </div>

                {/* Row 2: Icons Grid (Centered) */}
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '3rem 2.5rem', textAlign: 'center' }}>
                    {[
                        { title: 'Pesca artesanal', icon: <GiFishingNet size={32} /> },
                        { title: 'Artesanías', icon: <MdBrush size={32} /> },
                        { title: 'Apicultura', icon: <GiBeehive size={32} /> },
                        { title: 'Café', icon: <FaCoffee size={32} /> },
                        { title: 'Caña / Panela', icon: <GiSugarCane size={32} /> },
                        { title: 'Flores', icon: <FaLeaf size={32} /> },
                        { title: 'Plátano', icon: <GiBanana size={32} /> },
                        { title: 'Palmas- Acai', icon: <GiPalmTree size={32} /> },
                        { title: 'Forestales', icon: <GiPineTree size={32} /> },
                        { title: 'Turismo', icon: <GiCompass size={32} /> },
                        { title: 'Pecuarios', icon: <GiCow size={32} /> }
                    ].map((item, i) => (
                        <div key={i} style={{ width: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <div style={{ color: deepTeal, background: '#fff', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.06)' }}>
                                {item.icon}
                            </div>
                            <span style={{ fontSize: '0.9rem', color: '#444', fontWeight: '700', lineHeight: '1.2' }}>{item.title}</span>
                        </div>
                    ))}
                </div>
            </section>
            
            {/* 9. Aliados y Socios Section */}
            <section id="aliados" style={{ padding: '8rem 0', background: '#fff', overflow: 'hidden', scrollMarginTop: '130px' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 5%', textAlign: 'center', marginBottom: '5.5rem' }}>
                    <h2 className="font-serif" style={{ color: deepTeal, fontSize: '3rem' }}>Aliados y socios</h2>
                </div>

                <div className="marquee-container" style={{ position: 'relative', width: '100%' }}>
                    <style>
                        {`
                        @keyframes marquee {
                            0% { transform: translateX(0); }
                            100% { transform: translateX(-50%); }
                        }
                        .marquee-inner {
                            display: flex;
                            width: max-content;
                            animation: marquee 38s linear infinite;
                        }
                        .marquee-inner:hover {
                            animation-play-state: paused;
                        }
                        `}
                    </style>
                    <div className="marquee-inner">
                        {[...aliados, ...aliados].map((logo, i) => (
                            <div key={i} style={{ width: '250px', padding: '0 40px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img 
                                    src={logo} 
                                    alt={`Aliado ${i + 1}`} 
                                    style={{ maxWidth: '100%', maxHeight: '100px', objectFit: 'contain' }} 
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </section>


        </div>
    );
};

export default HomeCZ;
