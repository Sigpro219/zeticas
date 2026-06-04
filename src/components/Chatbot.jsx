import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Send, User, Bot, ExternalLink, MessageCircle, MapPin } from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { colombia_cities } from '../data/colombia_cities';
import { supabase } from '../lib/supabase';

const Chatbot = () => {
    const { addLead, ownCompany, siteContent } = useBusiness();
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
    const [isTyping, setIsTyping] = useState(false);
    const [messages, setMessages] = useState([
        { sender: 'bot', text: '¡Hola! 🌿 Soy el asistente de Zeticas. Es un gusto saludarte. ¿Cómo podemos ayudarte hoy?' }
    ]);
    
    const initialLeadData = {
        name: '',
        city: '',
        interest_type: '',
        estimated_volume: '',
        email: '',
        phone: '',
        address: ''
    };
    const [leadData, setLeadData] = useState(initialLeadData);
    const [isHovered, setIsHovered] = useState(false);
    const chatEndRef = useRef(null);

    const resetChat = () => {
        setIsOpen(false);
        setStep('CHOICE');
        setSubStep(0);
        setInputValue('');
        setIsTyping(false);
        setLeadData(initialLeadData);
        setMessages([{ sender: 'bot', text: '¡Hola! 🌿 Soy el asistente de Zeticas. Es un gusto saludarte. ¿Cómo podemos ayudarte hoy?' }]);
    };

    useEffect(() => {
        if (chatEndRef.current && isOpen) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen, isTyping]);

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

    const getShippingCost = (city) => {
        const s = siteContent?.web_shipping || {};
        const shipSettings = {
            tarifa_local: Number(s.tarifa_local) || 5500,
            tarifa_regional: Number(s.tarifa_regional) || 8500,
            tarifa_nacional: Number(s.tarifa_nacional) || 14500,
            origin_city: s.origin_city || 'Guasca'
        };

        if (!city) return 0;
        
        const destination = colombia_cities.find(c => 
            c.city.toLowerCase() === city.toLowerCase()
        );

        let rate = shipSettings.tarifa_nacional;
        if (destination) {
            if (destination.city === shipSettings.origin_city) rate = shipSettings.tarifa_local;
            else if (destination.state === 'Cundinamarca' || destination.state === 'Boyacá') rate = shipSettings.tarifa_regional;
        }
        return rate;
    };

    const handleChoice = (choice) => {
        addMessage(choice, 'user');
        
        if (choice === 'Duda Rápida / Atención') {
            setStep('FAST_HELP');
            setIsTyping(true);
            setTimeout(() => {
                setIsTyping(false);
                addMessage("¡Perfecto! Te voy a comunicar de inmediato con el encargado. Solo pulsa el botón de abajo para iniciar el chat. 👇", 'bot');
            }, 800);
        } else {
            setStep('B2B_FLOW');
            setLeadData(prev => ({ ...prev, interest_type: choice }));
            setIsTyping(true);
            setTimeout(() => {
                setIsTyping(false);
                addMessage(`¡Excelente elección! Nos encanta trabajar con nuevos distribuidores y aliados. Para darte una atención personalizada, ¿cuál es tu nombre o el de tu negocio?`, 'bot');
            }, 800);
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
                setIsTyping(true);
                setTimeout(() => {
                    setIsTyping(false);
                    addMessage(`¡Gusto en saludarte, ${text}! ¿En qué ciudad te encuentras o dónde sería el destino?`, 'bot');
                }, 800);
                break;
            case 1: { // City
                updatedData.city = text;
                setLeadData(updatedData);
                const shipFee = getShippingCost(text);
                setSubStep(2);
                setIsTyping(true);
                setTimeout(() => {
                    setIsTyping(false);
                    const threshold = siteContent?.web_shipping?.threshold_free || 120000;
                    const feeMsg = shipFee === 0 ? "¡Excelente! Estamos en la misma zona." : `Anotado. Flete para ${text}: $${shipFee.toLocaleString()}. (Envío GRATIS sobre $${Number(threshold).toLocaleString()}).`;
                    addMessage(`${feeMsg} Para una entrega precisa, ¿cuál es tu dirección exacta?`, 'bot');
                }, 1000);
                break;
            }
            case 2: // Address
                updatedData.address = text;
                setLeadData(updatedData);
                setSubStep(3);
                setIsTyping(true);
                setTimeout(() => {
                    setIsTyping(false);
                    addMessage(`Perfecto. ¿Qué volumen o cantidad de productos necesitas aproximadamente?`, 'bot');
                }, 800);
                break;
            case 3: // Volume
                updatedData.estimated_volume = text;
                setLeadData(updatedData);
                setSubStep(4);
                setIsTyping(true);
                setTimeout(() => {
                    setIsTyping(false);
                    addMessage(`Entendido. ¿Cuál es tu número de teléfono o WhatsApp?`, 'bot');
                }, 800);
                break;
            case 4: // Phone
                const cleanPhone = text.replace(/\D/g, '');
                if (cleanPhone.length !== 10) {
                    setIsTyping(true);
                    setTimeout(() => {
                        setIsTyping(false);
                        addMessage(`⚠️ El número telefónico debe tener exactamente 10 dígitos (ej: 3144336525). Por favor inténtalo de nuevo:`, 'bot');
                    }, 600);
                    return;
                }
                updatedData.phone = cleanPhone;
                setLeadData(updatedData);
                setSubStep(5);
                setIsTyping(true);
                setTimeout(() => {
                    setIsTyping(false);
                    addMessage(`Por último, déjanos tu correo electrónico para enviarte la lista de precios.`, 'bot');
                }, 800);
                break;
            case 5: // Email
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(text.trim())) {
                    setIsTyping(true);
                    setTimeout(() => {
                        setIsTyping(false);
                        addMessage(`⚠️ El formato del correo no es válido (ej: cliente@correo.com). Por favor escríbelo de nuevo:`, 'bot');
                    }, 600);
                    return;
                }
                updatedData.email = text.trim();
                setLeadData(updatedData);
                setSubStep(6);
                setIsTyping(true);
                setTimeout(async () => {
                    setIsTyping(false);
                    addMessage(`¡Excelente! He registrado tu interés. Un encargado se pondrá en contacto contigo muy pronto. ¡Gracias por elegir Zeticas! 🌿`, 'bot');
                    
                    const leadPayload = {
                        name: updatedData.name,
                        city: updatedData.city,
                        address: updatedData.address,
                        interest_type: updatedData.interest_type,
                        estimated_volume: Number(updatedData.estimated_volume) || updatedData.estimated_volume || 1,
                        phone: updatedData.phone,
                        email: updatedData.email,
                        status: 'NUEVO',
                        stage: 'Nuevo Lead'
                    };
                    
                    // CRM Save Dual (Firestore + Supabase)
                    try {
                        await addLead(leadPayload);
                        await supabase.from('leads').insert([leadPayload]);
                    } catch (e) { 
                        console.error("Error saving lead dual", e); 
                    }
                    
                }, 1200);
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

                        {isTyping && (
                            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <div style={{
                                    maxWidth: '85%', padding: '12px 16px', borderRadius: '18px', fontSize: '0.92rem',
                                    backgroundColor: '#fff', color: 'var(--color-text)',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #eee',
                                    display: 'flex', alignItems: 'center', gap: '4px'
                                }}>
                                    <style>{`
                                        @keyframes chatbotBounce {
                                            0%, 80%, 100% { transform: scale(0); }
                                            40% { transform: scale(1.0); }
                                        }
                                    `}</style>
                                    <span style={{ width: '6px', height: '6px', backgroundColor: '#94a3b8', borderRadius: '50%', display: 'inline-block', animation: 'chatbotBounce 1.4s infinite ease-in-out both' }}></span>
                                    <span style={{ width: '6px', height: '6px', backgroundColor: '#94a3b8', borderRadius: '50%', display: 'inline-block', animation: 'chatbotBounce 1.4s infinite ease-in-out both', animationDelay: '0.2s' }}></span>
                                    <span style={{ width: '6px', height: '6px', backgroundColor: '#94a3b8', borderRadius: '50%', display: 'inline-block', animation: 'chatbotBounce 1.4s infinite ease-in-out both', animationDelay: '0.4s' }}></span>
                                </div>
                            </div>
                        )}

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
                    {step === 'B2B_FLOW' && subStep < 6 && (
                        <div style={{ padding: '15px', borderTop: '1px solid #eee', display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <input 
                                type="text" 
                                list={subStep === 1 ? "bot-cities-list" : undefined}
                                placeholder={subStep === 1 ? "Escribe tu ciudad..." : subStep === 2 ? "Dirección exacta..." : "Escribe aquí..."}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleB2BStep(inputValue)}
                                style={{ flex: 1, padding: '12px 18px', borderRadius: '50px', border: '1px solid #ddd', outline: 'none', fontSize: '0.9rem' }}
                            />
                            {subStep === 1 && (
                                <datalist id="bot-cities-list">
                                    {colombia_cities.map((c, i) => (
                                        <option key={i} value={c.city}>{c.state}</option>
                                    ))}
                                </datalist>
                            )}
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
