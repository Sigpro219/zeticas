import { MessageCircle, ArrowUp, Check, Leaf, Users, Factory, Tractor, Umbrella, HeartHandshake, Bookmark, Globe, Building2, Globe2, Share2, ListOrdered, Eye, Carrot, Fish, PencilRuler, Trees, Handshake, Venus, Mars, BookOpen, Network, Bug, Coffee, Wheat, Flower2, TreePalm } from 'lucide-react';

const HomeCZ = () => {
    const yarumoUrl = '/assets/yarumo_tree.png';
    const logoCZ = 'https://www.zeticas.com/wp-content/uploads/2023/11/cropped-cropped-logo-removebg-preview-e1698878511967.png';
    const institutionalOcre = '#B59E74';
    const deepTeal = '#004B50';

    return (
        <div className="home-cz" style={{ backgroundColor: '#fff', minHeight: '100vh', fontFamily: "'Quicksand', sans-serif" }}>
            
            {/* 1. Header & Hero Section */}
            <header style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 5%', background: '#fff' }}>
                    <span style={{ color: deepTeal, fontWeight: '700', fontSize: '1.1rem' }}>Conservas</span>
                    <img src={logoCZ} alt="Zeticas CZ" style={{ height: '50px' }} />
                    <button style={{ background: deepTeal, color: '#fff', border: 'none', padding: '0.6rem 2rem', borderRadius: '4px', fontWeight: '700', cursor: 'pointer' }}>AQUÍ</button>
                </div>
                <nav style={{ background: institutionalOcre, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem 0', gap: '2.5rem' }}>
                    {['FILOSOFÍA', 'APOYO', 'CONOCIMIENTO', 'IMPACTO', 'CONTACTO'].map(item => (
                        <a key={item} href={`#${item.toLowerCase()}`} style={{ color: '#fff', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600', letterSpacing: '0.1em' }}>{item}</a>
                    ))}
                </nav>
                <section style={{ padding: '6rem 5% 10rem', position: 'relative', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '2rem' }}>
                    <div style={{ textAlign: 'center', padding: '0 2rem' }}>
                        <p style={{ fontStyle: 'italic', color: '#666', fontSize: '1.2rem', lineHeight: '1.8' }} className="font-serif">
                             "Los árboles son solo un elemento del bosque, hacen parte de un ecosistema, que aprende, colabora, conecta, se comunica y responde; Nuestro “Yarumo” ancestral, pensativo y reflexivo nos permite ser parte dé ser cada día mejor."
                        </p>
                    </div>
                    <div style={{ position: 'relative', width: '280px', display: 'flex', justifyContent: 'center' }}>
                        <img src={yarumoUrl} alt="Yarumo Tree" style={{ width: '100%', height: 'auto', zIndex: 2 }} />
                    </div>
                    <div style={{ textAlign: 'center', padding: '0 2rem' }}>
                        <img src={logoCZ} alt="CZ Logo" style={{ height: '100px', marginBottom: '1.5rem', opacity: 0.8 }} />
                        <p style={{ color: '#444', fontSize: '1.05rem', lineHeight: '1.7' }}>
                            Apoyamos y acompañamos a comunidades y organizaciones para pensar y reflexionar, reconocer su potencial y vivir plenamente su territorio. Lo hacemos fortaleciendo capacidades, valorando su identidad, desarrollando productos y gestionando alianzas, con el fin de construir un tejido social profundo, conectado, productivo y en equilibrio con la naturaleza.
                        </p>
                    </div>
                </section>
            </header>

            {/* 2. Filosofía Section */}
            <section id="filosofía" style={{ padding: '8rem 5%', background: '#F8F9FA' }}>
                <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
                    <h2 className="font-serif" style={{ color: deepTeal, fontSize: '3rem', marginBottom: '1rem' }}>Filosofía & Enfoque</h2>
                    <h3 style={{ color: '#4CAF50', fontSize: '1.8rem', fontWeight: '400' }}>{'{ SER para HACER }'}</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', maxWidth: '1200px', margin: '0 auto' }}>
                    {[
                        { title: 'POTENCIAL AUTÓCTONO', icon: <Check size={18} color="#9DB547" />, items: ['Volver a las raíces', 'Valoración de la sabiduría ancestral', 'Resaltar identidad cultural', 'Empoderar estructuras autónomas'] },
                        { title: 'MERCADOS CONSCIENTES', icon: <Users size={18} color="#9DB547" />, items: ['Comercio justo', 'Impacto comunitario', 'Desarrollo de productos con calidad', 'Mercados diferenciados', 'Principios de conservación', 'Experiencias de consumo'] },
                        { title: 'PRÁCTICAS SOSTENIBLES', icon: <Leaf size={18} color="#9DB547" />, items: ['Diversidad de cultivos', 'Autonomía agroalimentaria', 'Respeto por la tradición y cultura', 'Producción limpia', 'Circuitos cortos de valor', 'Trabajo colaborativo', 'Arraigo al territorio'] },
                        { title: 'ESPIRITU LEAN AGILE', icon: <div style={{ background: '#9DB547', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={12} strokeWidth={4} /></div>, items: ['Gestión colegiada y dinámica', 'Misión y visión – Hoshin Kanri', 'Gestión visual y frecuente- mieruka + scrum', 'Mejor persona -mejor organización- kaizen', 'Flujo de valor – Nagare', 'Orientado a resultados responsables'] }
                    ].map((block, i) => (
                        <div key={i} style={{ background: '#fff', padding: '1.75rem', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', borderTop: `4px solid ${i % 2 === 0 ? institutionalOcre : deepTeal}` }}>
                            <h4 style={{ color: deepTeal, fontWeight: '800', marginBottom: '1.5rem', fontSize: '1rem' }}>{block.title}</h4>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {block.items.map((item, idx) => (
                                    <li key={idx} style={{ display: 'flex', gap: '12px', marginBottom: '0.9rem', fontSize: '0.9rem', color: '#444' }}>
                                        <div style={{ marginTop: '2px' }}>{block.icon}</div> <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </section>

            {/* 3. Quote Section */}
            <section style={{ padding: '5rem 5%', textAlign: 'center', background: '#fff', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '360px', height: '360px', backgroundImage: 'url(https://www.zeticas.com/wp-content/uploads/2025/05/yarumo.png)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', opacity: 0.1, zIndex: 1 }}></div>
                <div style={{ maxWidth: '850px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
                    <h2 className="font-serif" style={{ color: deepTeal, fontSize: '3.2rem', lineHeight: '1.25' }}>Yarumo árbol del pensamiento y la sabiduría ancestral, su fortaleza radica en su crecimiento</h2>
                </div>
            </section>

            {/* 4. Apoyo Section */}
            <section id="apoyo" style={{ padding: '6rem 5%', background: '#e0e2bd', backgroundImage: 'url(https://www.zeticas.com/wp-content/uploads/2025/05/roots-illustration.png)', backgroundSize: 'cover', backgroundBlendMode: 'multiply', position: 'relative', textAlign: 'center' }}>
                <h2 className="font-serif" style={{ color: deepTeal, fontSize: '3rem', marginBottom: '4rem' }}>Apoyo & soporte</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '5rem', maxWidth: '1100px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'left' }}>
                        <h4 style={{ color: deepTeal, marginBottom: '2rem', fontSize: '1rem', fontWeight: '800' }}>EXPERIENCIA EN DIFERENTES SECTORES</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {[
                                { title: 'Industria', icon: <Factory size={28} /> },
                                { title: 'Agroindustria', icon: <Tractor size={28} /> },
                                { title: 'Turismo', icon: <Umbrella size={28} /> },
                                { title: 'Servicios', icon: <HeartHandshake size={28} /> }
                            ].map((s, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '20px', color: '#333', fontWeight: '800', fontSize: '0.9rem' }}>
                                    <div style={{ width: '40px', display: 'flex', justifyContent: 'center', color: deepTeal }}>{s.icon}</div> {s.title.toUpperCase()}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <h4 style={{ color: deepTeal, marginBottom: '2rem', fontSize: '1rem', fontWeight: '800' }}>TIPO DE ORGANIZACIONES</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {[
                                { title: 'Privado', icon: <Bookmark size={28} /> },
                                { title: 'Internacionales', icon: <Globe size={28} /> },
                                { title: 'Gobierno', icon: <Building2 size={28} /> },
                                { title: 'ONG´ s', icon: <Globe2 size={28} /> },
                                { title: 'Asociaciones', icon: <Share2 size={28} /> }
                            ].map((o, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '20px', color: '#333', fontWeight: '800', fontSize: '0.9rem' }}>
                                    <div style={{ width: '40px', display: 'flex', justifyContent: 'center', color: deepTeal }}>{o.icon}</div> {o.title.toUpperCase()}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. Conocimiento Section */}
            <section id="conocimiento" style={{ padding: '8rem 5%', background: '#fff' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4rem', maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'left' }}>
                        <h3 style={{ color: deepTeal, fontSize: '1.2rem', fontWeight: '800', marginBottom: '2.5rem' }}>GESTIÓN DE PROYECTOS</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {[{ title: 'Formulación', icon: <ListOrdered size={24} /> }, { title: 'Evaluación', icon: <Check size={24} /> }, { title: 'Seguimiento', icon: <Eye size={24} /> }].map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#333', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                    <div style={{ width: '30px', color: deepTeal }}>{item.icon}</div> {item.title}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <h3 style={{ color: deepTeal, fontSize: '1.2rem', fontWeight: '800', marginBottom: '2.5rem' }}>DESARROLLO CADENAS DE VALOR</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {[{ title: 'Productos agrícolas', icon: <Carrot size={24} /> }, { title: 'No maderables', icon: <Leaf size={24} /> }, { title: 'Pesca artesanal', icon: <Fish size={24} /> }, { title: 'Artesanías', icon: <PencilRuler size={24} /> }, { title: 'Productos innovadores', icon: <Factory size={24} /> }, { title: 'Forestal', icon: <Trees size={24} /> }].map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#333', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                    <div style={{ width: '30px', color: deepTeal }}>{item.icon}</div> {item.title}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <h3 style={{ color: deepTeal, fontSize: '1.2rem', fontWeight: '800', marginBottom: '2.5rem' }}>RELACIONAMIENTO COMUNITARIO</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {[{ title: 'Construcción de confianza', icon: <Handshake size={24} /> }, { title: 'Enfoque de género', icon: <div style={{ display: 'flex', gap: '2px' }}><Venus size={18} /><Mars size={18} /></div> }, { title: 'Equipos autónomos', icon: <Users size={24} /> }, { title: 'Formación de líderes', icon: <Network size={24} /> }, { title: 'Intercambio de saberes', icon: <BookOpen size={24} /> }].map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#333', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                    <div style={{ width: '40px', color: deepTeal }}>{item.icon}</div> {item.title}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
            {/* 6. Tronco Section */}
            <section style={{ 
                padding: '6rem 5%', 
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
                    <p className="font-serif" style={{ color: '#444', fontSize: '2.2rem', lineHeight: '1.4', fontWeight: '500' }}>
                        El tronco nos permite la nutrición y es el medio para alimentarse y llenarse de energía para florecer. No hay yarumos sin hormigas, los defienden
                    </p>
                </div>
            </section>

            {/* 7. Poetic Divider: Colaboración */}
            <section style={{ 
                padding: '4rem 5%', 
                backgroundColor: '#f1f4f9', 
                textAlign: 'center',
                position: 'relative',
                borderBottom: '25px solid #ebecc5'
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
                    <p className="font-serif" style={{ color: institutionalOcre, fontSize: '1.45rem', lineHeight: '1.6', fontWeight: '500', fontStyle: 'italic' }}>
                        Sentido de colaboración y cooperación mutua son fundamentales para lograr lo que te propones
                    </p>
                </div>
            </section>

            {/* 8. Impacto Section (Moved to the end) */}
            <section id="impacto" style={{ padding: '6rem 5%', background: '#fff' }}>
                <div style={{ textAlign: 'left', marginBottom: '4rem' }}>
                    <h2 className="font-serif" style={{ color: deepTeal, fontSize: '3rem', marginBottom: '1rem' }}>Impacto</h2>
                    <h3 style={{ color: deepTeal, fontSize: '1.2rem', fontWeight: '800' }}>Trabajo comunitario en todas las regiones de Colombia</h3>
                </div>

                <div style={{ display: 'flex', gap: '4rem', maxWidth: '1400px', margin: '0 auto' }}>
                    <div style={{ width: '250px', flexShrink: 0 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            {[
                                { title: 'Pesca artesanal', icon: <Fish size={24} /> },
                                { title: 'Artesanías', icon: <PencilRuler size={24} /> },
                                { title: 'Apicultura', icon: <Bug size={24} /> },
                                { title: 'Café', icon: <Coffee size={24} /> },
                                { title: 'Caña / Panela', icon: <Wheat size={24} /> },
                                { title: 'Flores', icon: <Flower2 size={24} /> },
                                { title: 'Plátano', icon: <Carrot size={24} /> },
                                { title: 'Palmas- Acai', icon: <TreePalm size={24} /> },
                                { title: 'Forestales', icon: <Trees size={24} /> },
                                { title: 'Turismo', icon: <Globe size={24} /> },
                                { title: 'Pecuarios', icon: <HeartHandshake size={24} /> }
                            ].map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#333', fontWeight: '800', fontSize: '0.85rem' }}>
                                    <div style={{ width: '30px', display: 'flex', justifyContent: 'center', color: deepTeal }}>{item.icon}</div> {item.title}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ flexGrow: 1, position: 'relative' }}>
                        <div style={{ width: '100%', height: '700px', background: '#eee', borderRadius: '12px', overflow: 'hidden' }}>
                             <img src="https://images.unsplash.com/photo-1596405838058-ada2dd667da5?auto=format&fit=crop&q=80&w=1200" alt="Comunidad" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                        </div>
                    </div>
                </div>
            </section>
            
            <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', zIndex: 100 }}>
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ background: '#888', color: '#fff', border: 'none', width: '45px', height: '45px', borderRadius: '4px', cursor: 'pointer' }}><ArrowUp size={24} /></button>
                <a href="https://wa.me/3144336525" target="_blank" rel="noopener noreferrer" style={{ background: '#25D366', color: '#fff', padding: '10px 20px', borderRadius: '30px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold' }}>
                    <MessageCircle size={24} /> <span>¡Escríbenos!</span>
                </a>
            </div>
        </div>
    );
};

export default HomeCZ;
