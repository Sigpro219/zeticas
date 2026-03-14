import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, User, Bot, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState([
        { sender: 'bot', text: '¡Hola! Bienvenido a Zeticas Conservas Artesanales. Soy tu asistente virtual. ¿Me podrías indicar tu nombre completo para comenzar?' }
    ]);
    const initialLeadData = {
        name: '',
        city: '',
        interest_type: '',
        estimated_volume: 1,
        urgency_date: null,
        email: '',
        phone: ''
    };
    const [leadData, setLeadData] = useState(initialLeadData);

    const chatEndRef = useRef(null);

    const resetChat = () => {
        setIsOpen(false);
        setStep(0);
        setInputValue('');
        setLeadData(initialLeadData);
        setMessages([
            { sender: 'bot', text: '¡Hola! Bienvenido a Zeticas Conservas Artesanales. Soy tu asistente virtual. ¿Me podrías indicar tu nombre completo para comenzar?' }
        ]);
    };

    // Scroll al final del chat
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const addMessage = (text, sender) => {
        setMessages(prev => [...prev, { text, sender }]);
    };

    const handleSend = async (textOverride) => {
        const text = textOverride !== undefined ? textOverride : inputValue.trim();
        if (!text && step !== 4 && step !== 2) return; // Permitir saltar fechas quizás, o type options

        addMessage(text, 'user');
        setInputValue('');

        let updatedData = { ...leadData };

        // Máquina de estados para las preguntas
        switch (step) {
            case 0:
                updatedData.name = text;
                setLeadData(updatedData);
                setTimeout(() => {
                    addMessage(`¡Un gusto saludarte, ${text}! ¿A qué ciudad sería el envío o destino del pedido?`, 'bot');
                    setStep(1);
                }, 600);
                break;
            case 1:
                updatedData.city = text;
                setLeadData(updatedData);
                setTimeout(() => {
                    addMessage(`Perfecto. ¿Qué tipo de interés tienes en nuestros productos? (Selecciona una opción abajo)`, 'bot');
                    setStep(2);
                }, 600);
                break;
            case 2:
                updatedData.interest_type = text;
                setLeadData(updatedData);
                setTimeout(() => {
                    addMessage(`Entendido (${text}). ¿Cuántas unidades o cajas estimas que necesitas? (Ej: Cajas de 12 o Kits de 3. Solo ingresa el número estimado)`, 'bot');
                    setStep(3);
                }, 600);
                break;
            case 3:
                updatedData.estimated_volume = parseInt(text.replace(/\D/g, ''), 10) || 1;
                setLeadData(updatedData);
                setTimeout(() => {
                    addMessage(`Muy bien. ¿Para cuándo necesitas el pedido? (Ingresa la fecha aproximada DD/MM/AAAA o deja en blanco si es flexible)`, 'bot');
                    setStep(4);
                }, 600);
                break;
            case 4:
                // Intentar parsear fecha o null
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (dateRegex.test(text)) {
                    updatedData.urgency_date = text;
                } else {
                    updatedData.urgency_date = null; // flexible
                }
                setLeadData(updatedData);
                setTimeout(() => {
                    addMessage(`Anotado. Para poder enviarte la cotización y asignar tu requerimiento, ¿cuál es tu correo electrónico?`, 'bot');
                    setStep(5);
                }, 600);
                break;
            case 5:
                updatedData.email = text;
                setLeadData(updatedData);
                setTimeout(() => {
                    addMessage(`Finalmente, ¿Me puedes confirmar un número de teléfono o celular (ej. WhatsApp) para contactarte?`, 'bot');
                    setStep(6);
                }, 600);
                break;
            case 6:
                updatedData.phone = text;
                setLeadData(updatedData);
                setStep(7);

                // Enviar a la base de datos (Supabase leads table)
                setTimeout(async () => {
                    addMessage(`Procesando tu solicitud...`, 'bot');
                    try {
                        const { error } = await supabase.from('leads').insert([{
                            name: updatedData.name,
                            city: updatedData.city,
                            interest_type: updatedData.interest_type,
                            estimated_volume: updatedData.estimated_volume,
                            urgency_date: updatedData.urgency_date,
                            email: updatedData.email,
                            phone: updatedData.phone,
                            stage: 'Nuevo Lead'
                            // assigned_to se asignaría de forma automática por el backend o el RR logic.
                        }]);

                        if (error) {
                            console.error('Error al insertar lead', error);
                            if (error.code === '42P01' || error.code === 'PGRST205') {
                                // Fallback a LocalStorage si falta la tabla.
                                const localLeads = JSON.parse(localStorage.getItem('zeticas_local_leads') || '[]');
                                localLeads.unshift({
                                    id: crypto.randomUUID(),
                                    name: updatedData.name,
                                    city: updatedData.city,
                                    interest_type: updatedData.interest_type,
                                    estimated_volume: updatedData.estimated_volume,
                                    urgency_date: updatedData.urgency_date,
                                    email: updatedData.email,
                                    phone: updatedData.phone,
                                    stage: 'Nuevo Lead',
                                    created_at: new Date().toISOString(),
                                    value_projection: updatedData.estimated_volume * 30000 // Estimado
                                });
                                localStorage.setItem('zeticas_local_leads', JSON.stringify(localLeads));
                                window.dispatchEvent(new Event('local_leads_updated')); // Disparar actualización de CRM

                                addMessage(`¡Listo! un comercial de Zeticas se comunicará con usted, lo antes posible !!`, 'bot');
                                setTimeout(resetChat, 3500);
                            } else {
                                addMessage(`Ocurrió un pequeño inconveniente al registrar tus datos. Por favor, intenta de nuevo más tarde o comunícate a nuestro teléfono principal.`, 'bot');
                            }
                        } else {
                            window.dispatchEvent(new Event('lead_added_db'));
                            addMessage(`¡Listo! un comercial de Zeticas se comunicará con usted, lo antes posible !!`, 'bot');
                            setTimeout(resetChat, 3500);
                        }
                    } catch (err) {
                        console.error('Catch error', err);
                        addMessage(`Tuvimos un error al procesar tu solicitud. Un momento por favor.`, 'bot');
                    }
                }, 800);
                break;
            default:
                addMessage(`Tu solicitud ya ha sido registrada, ¡pronto nos comunicaremos!`, 'bot');
                break;
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    return (
        <>
            {/* Botón flotante para abrir el chat */}
            {!isOpen && (
                <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    {/* Burbuja de saludo opcional */}
                    <div style={{ background: '#fff', padding: '8px 16px', borderRadius: '18px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: '500', border: '1px solid #e2e8f0', marginBottom: '4px', animation: 'fadeInUp 0.5s ease' }}>
                        ¡Hola! 👋 ¿En qué puedo ayudarte?
                    </div>
                    <button
                        onClick={() => setIsOpen(true)}
                        style={{
                            background: 'linear-gradient(135deg, var(--color-primary) 0%, #2a5a5a 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '65px',
                            height: '65px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 10px 25px rgba(0,77,77,0.3)',
                            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)'; e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,77,77,0.4)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1) rotate(0deg)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,77,77,0.3)'; }}
                    >
                        <Bot size={35} strokeWidth={1.5} />
                    </button>
                </div>
            )}

            {/* Ventana del Chatbot */}
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    bottom: '90px',
                    right: '24px',
                    width: '360px',
                    height: '500px',
                    backgroundColor: '#fff',
                    borderRadius: '16px',
                    boxShadow: '0 12px 36px rgba(0,0,0,0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    zIndex: 9999,
                    border: '1px solid #e2e8f0'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '16px',
                        background: 'linear-gradient(135deg, var(--color-primary) 0%, #2a5a5a 100%)',
                        color: '#fff',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: '12px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Bot size={24} strokeWidth={1.5} />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>Zeticas CRM Bot</h4>
                                <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>Respuestas automatizadas</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Mensajes */}
                    <div style={{
                        flex: 1,
                        padding: '16px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        backgroundColor: '#f8fafc'
                    }}>
                        {messages.map((msg, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                            }}>
                                <div style={{
                                    maxWidth: '85%',
                                    padding: '10px 14px',
                                    borderRadius: '16px',
                                    fontSize: '0.9rem',
                                    lineHeight: '1.4',
                                    backgroundColor: msg.sender === 'user' ? 'var(--color-primary)' : '#fff',
                                    color: msg.sender === 'user' ? '#fff' : '#334155',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                    borderBottomRightRadius: msg.sender === 'user' ? '4px' : '16px',
                                    borderBottomLeftRadius: msg.sender === 'bot' ? '4px' : '16px',
                                    border: msg.sender === 'bot' ? '1px solid #e2e8f0' : 'none'
                                }}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}

                        {/* Opciones rápidas para Step 2 (Tipo de Interés) */}
                        {step === 2 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                                {['Personal', 'Corporativo', 'Mayorista'].map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => {
                                            setInputValue(opt);
                                            handleSend(opt);
                                        }}
                                        style={{
                                            background: '#fff',
                                            border: '1px solid var(--color-primary)',
                                            color: 'var(--color-primary)',
                                            padding: '8px',
                                            borderRadius: '8px',
                                            fontSize: '0.85rem',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-primary)'; e.currentTarget.style.color = '#fff'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div ref={chatEndRef}></div>
                    </div>

                    {/* Input Area */}
                    <div style={{
                        padding: '12px',
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        gap: '8px',
                        backgroundColor: '#fff',
                        alignItems: 'center'
                    }}>
                        <input
                            type={step === 4 ? "date" : "text"}
                            placeholder={step === 7 ? "Chat finalizado..." : "Escribe tu mensaje..."}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyPress}
                            disabled={step === 7 || step === 2} // Desactiva input libre si está en opciones select o final
                            style={{
                                flex: 1,
                                padding: '10px 14px',
                                borderRadius: '24px',
                                border: '1px solid #cbd5e1',
                                outline: 'none',
                                fontSize: '0.9rem'
                            }}
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={step === 7 || (!inputValue.trim() && step !== 4 && step !== 2) || step === 2}
                            style={{
                                background: 'var(--color-primary)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '50%',
                                width: '40px',
                                height: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                opacity: step === 7 ? 0.5 : 1
                            }}
                        >
                            <Send size={18} style={{ marginLeft: '2px' }} />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default Chatbot;
