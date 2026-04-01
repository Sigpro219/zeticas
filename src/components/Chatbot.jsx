import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Send, User, Bot, ExternalLink, MessageCircle } from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';

const Chatbot = () => {
    const { addLead, ownCompany } = useBusiness();
    const location = useLocation();
    const isGestion = location.pathname.includes('/gestion');
    const [isOpen, setIsOpen] = useState(false);

    // Clean phone number: remove non-digits and ensure 57 prefix if it's a Colombian mobile
    const getOfficialWhatsApp = () => {
        let phone = ownCompany?.phone || '3144336525';
        const digits = phone.replace(/\D/g, '');
        if (digits.length === 10) return `57${digits}`;
        return digits;
    };

    const WHATSAPP_NUMBER = getOfficialWhatsApp();

    const [step, setStep] = useState('CHOICE'); // Choice / B2B_FLOW / FAST_HELP
    const [subStep, setSubStep] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState([
        { sender: 'bot', text: '¡Hola! 🌿 Soy el asistente de Zeticas. Es un gusto saludarte. ¿Cómo podemos ayudarte hoy?' }
    ]);
    
    const initialLeadData = {
        name: '',
        city: '',
        interest_type: '',
        estimated_volume: '',
        email: '',
        phone: ''
    };
    const [leadData, setLeadData] = useState(initialLeadData);
    const [isHovered, setIsHovered] = useState(false);
    const chatEndRef = useRef(null);

    const resetChat = () => {
        setIsOpen(false);
        setStep('CHOICE');
        setSubStep(0);
        setInputValue('');
        setLeadData(initialLeadData);
        setMessages([{ sender: 'bot', text: '¡Hola! 🌿 Soy el asistente de Zeticas. Es un gusto saludarte. ¿Cómo podemos ayudarte hoy?' }]);
    };

    useEffect(() => {
        if (chatEndRef.current && isOpen) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    if (isGestion) return null;

    const addMessage = (text, sender) => {
        setMessages(prev => [...prev, { text, sender }]);
    };

    const generateWhatsAppLink = (data, isGeneral = false) => {
        let text = "";
        if (isGeneral) {
            text = "Hola Zeticas! 👋 Tengo una duda sobre sus productos y me gustaría hablar con un encargado.";
        } else {
            text = `Hola Zeticas! 👋 Soy ${data.name}. Me interesa comprar ${data.interest_type} para la ciudad de ${data.city}. Estimo un volumen de ${data.estimated_volume || 'N/A'}. Mi correo es ${data.email}. Quedo atento!`;
        }
        return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
    };

    const handleChoice = (choice) => {
        addMessage(choice, 'user');
        
        if (choice === 'Duda Rápida / Atención') {
            setStep('FAST_HELP');
            setTimeout(() => {
                addMessage("¡Perfecto! Te voy a comunicar de inmediato con el encargado. Solo pulsa el botón de abajo para iniciar el chat. 👇", 'bot');
            }, 600);
        } else {
            setStep('B2B_FLOW');
            setLeadData(prev => ({ ...prev, interest_type: choice }));
            setTimeout(() => {
                addMessage(`¡Excelente elección! Nos encanta trabajar con nuevos distribuidores y aliados. Para darte una atención personalizada, ¿cuál es tu nombre o el de tu negocio?`, 'bot');
            }, 600);
        }
    };

    const handleB2BStep = async (text) => {
        if (!text.trim() && subStep !== 2) return;
        addMessage(text, 'user');
        setInputValue('');
        
        let updatedData = { ...leadData };

        switch (subStep) {
            case 0: // Name
                updatedData.name = text;
                setLeadData(updatedData);
                setSubStep(1);
                setTimeout(() => addMessage(`¡Gusto en saludarte, ${text}! ¿En qué ciudad te encuentras o dónde sería el destino?`, 'bot'), 600);
                break;
            case 1: // City
                updatedData.city = text;
                setLeadData(updatedData);
                setSubStep(2);
                setTimeout(() => addMessage(`Anotado. ¿Qué volumen o cantidad de productos necesitas para iniciar?`, 'bot'), 600);
                break;
            case 2: // Volume
                updatedData.estimated_volume = text;
                setLeadData(updatedData);
                setSubStep(3);
                setTimeout(() => addMessage(`Perfecto. ¿Cuál es tu número de teléfono o WhatsApp para contactarte?`, 'bot'), 600);
                break;
            case 3: // Phone
                updatedData.phone = text;
                setLeadData(updatedData);
                setSubStep(4);
                setTimeout(() => addMessage(`Casi terminamos. Por último, déjanos tu correo electrónico para enviarte la lista de precios y el catálogo formal.`, 'bot'), 600);
                break;
            case 4: // Email
                updatedData.email = text;
                setLeadData(updatedData);
                setSubStep(5);
                setTimeout(async () => {
                    addMessage(`¡Listo! He registrado tu interés en nuestro panel de gestión. Ahora te pondré en contacto directo con el encargado para agilizar tu pedido. 👇`, 'bot');
                    
                    // CRM Save
                    try {
                        await addLead({
                            name: updatedData.name,
                            city: updatedData.city,
                            interest_type: updatedData.interest_type,
                            estimated_volume: updatedData.estimated_volume,
                            phone: updatedData.phone,
                            email: updatedData.email,
                            stage: 'Nuevo Lead'
                        });
                    } catch (e) { console.error("Error saving lead", e); }
                    
                }, 800);
                break;
            default:
                break;
        }
    };

    return (
        <>
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    style={{
                        position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
                        background: 'white', color: 'var(--color-primary)', border: '3px solid var(--color-primary)',
                        borderRadius: '50%', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', boxShadow: '0 12px 30px rgba(2, 83, 87, 0.25)',
                        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        transform: isHovered ? 'scale(1.1) rotate(5deg)' : 'scale(1) rotate(0deg)',
                        overflow: 'hidden'
                    }}
                >
                    <img src="/bot_icon.png" alt="Bot" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                </button>
            )}

            {isOpen && (
                <div style={{
                    position: 'fixed', bottom: '90px', right: '24px', width: '360px', height: '520px',
                    backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 15px 45px rgba(0,0,0,0.15)',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 9999, border: '1px solid #e2e8f0'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '16px', background: 'var(--color-primary)', color: '#fff',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ background: '#fff', borderRadius: '50%', width: '32px', height: '32px', overflow: 'hidden' }}>
                                <img src="/bot_icon.png" alt="Bot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', letterSpacing: '0.05em' }}>RECEPCIÓN ZETICAS</h4>
                        </div>
                        <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={20} /></button>
                    </div>

                    {/* Messages Body */}
                    <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#fcfaf9' }}>
                        {messages.map((msg, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                                <div style={{
                                    maxWidth: '85%', padding: '12px 16px', borderRadius: '18px', fontSize: '0.92rem',
                                    backgroundColor: msg.sender === 'user' ? 'var(--color-primary)' : '#fff',
                                    color: msg.sender === 'user' ? '#fff' : 'var(--color-text)',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                    border: msg.sender === 'bot' ? '1px solid #eee' : 'none'
                                }}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}

                        {/* INITIAL CHOICES */}
                        {step === 'CHOICE' && messages.length === 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                                {['Comprar al Por Mayor', 'Consultoría / Aliados', 'Duda Rápida / Atención'].map(btn => (
                                    <button 
                                        key={btn}
                                        onClick={() => handleChoice(btn)}
                                        style={{
                                            background: '#fff', border: '2px solid var(--color-primary)', color: 'var(--color-primary)',
                                            padding: '10px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '800', cursor: 'pointer',
                                            transition: 'all 0.2s ease', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-primary)'; e.currentTarget.style.color = '#fff' }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = 'var(--color-primary)' }}
                                    >
                                        {btn}
                                        <ExternalLink size={14} opacity={0.5} />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* FAST HELP FINAL BUTTON */}
                        {step === 'FAST_HELP' && (
                            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center' }}>
                                <a 
                                    href={generateWhatsAppLink({}, true)} 
                                    target="_blank" rel="noreferrer"
                                    style={{
                                        background: '#25D366', color: '#fff', textDecoration: 'none',
                                        padding: '12px 24px', borderRadius: '50px', fontWeight: '900',
                                        display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 20px rgba(37, 211, 102, 0.3)'
                                    }}
                                >
                                    <MessageCircle size={20} /> IR A WHATSAPP
                                </a>
                            </div>
                        )}

                        {/* B2B FLOW FINAL BUTTON (Step 5) */}
                        {step === 'B2B_FLOW' && subStep === 5 && (
                            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center' }}>
                                <a 
                                    href={generateWhatsAppLink(leadData)} 
                                    target="_blank" rel="noreferrer"
                                    style={{
                                        background: 'var(--color-primary)', color: '#fff', textDecoration: 'none',
                                        padding: '12px 24px', borderRadius: '50px', fontWeight: '900',
                                        display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 20px rgba(2, 83, 87, 0.3)'
                                    }}
                                >
                                    <MessageCircle size={20} /> HABLAR CON ENCARGADO
                                </a>
                            </div>
                        )}
                        {/* BACK BUTTON (ONLY IF NOT AT CHOICE STEP) */}
                        {step !== 'CHOICE' && (
                            <button 
                                onClick={resetChat}
                                style={{
                                    alignSelf: 'center',
                                    marginTop: 'auto',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--color-text-light)',
                                    fontSize: '0.75rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    cursor: 'pointer',
                                    opacity: 0.6,
                                    textDecoration: 'underline',
                                    padding: '10px'
                                }}
                            >
                                Regresar al menú principal
                            </button>
                        )}
                        <div ref={chatEndRef}></div>
                    </div>

                    {/* Input Area (Only for B2B flow) */}
                    {step === 'B2B_FLOW' && subStep < 5 && (
                        <div style={{ padding: '15px', borderTop: '1px solid #eee', display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <input 
                                type="text"
                                placeholder="Escribe aquí..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleB2BStep(inputValue)}
                                style={{ flex: 1, padding: '12px 18px', borderRadius: '50px', border: '1px solid #ddd', outline: 'none', fontSize: '0.9rem' }}
                            />
                            <button 
                                onClick={() => handleB2BStep(inputValue)}
                                style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '50%', width: '45px', height: '45px', cursor: 'pointer' }}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default Chatbot;
