import React, { useState, useMemo, useEffect } from 'react';
import { 
    UserPlus, Calendar, BarChart3, MessageSquare, Clock, Edit2, X, CheckSquare, 
    ChevronDown, Check, Trash2, Download, TrendingUp, CheckCircle2, Phone, 
    Mail, FileText, ShoppingCart, Search, RefreshCw, Zap, MapPin, Plus, CheckCircle, Save
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const CRM = () => {
    const { addClient, leads, updateLead, deleteLead, items: masterProducts, loading: contextLoading } = useBusiness();
    
    // Premium Branding Colors
    const deepTeal = "#023636";
    const institutionOcre = "#D4785A";

    const [selectedLead, setSelectedLead] = useState(null);
    const [editingLead, setEditingLead] = useState(null);
    const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
    const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
    const [showTaskList, setShowTaskList] = useState(false);
    
    // Quotation State
    const [quoteItems, setQuoteItems] = useState([]);
    const [quoteDiscount, setQuoteDiscount] = useState(0);

    const stages = ['Nuevo Lead', 'Cotización Enviada', 'Clientes Ingresados'];

    const handleDrop = async (e, newStage) => {
        const leadId = e.dataTransfer.getData('leadId');
        if (!leadId) return;

        const lead = leads.find(l => l.id === leadId);
        if (newStage === 'Cotización Enviada' && (!lead.city || !lead.address)) {
            alert("No puedes enviar una cotización sin antes registrar la CIUDAD y DIRECCIÓN del prospecto.");
            setEditingLead(lead);
            return;
        }

        await updateLead(leadId, { stage: newStage });
    };

    const pendingTasksCount = useMemo(() => {
        return leads.filter(l => l.follow_up_date && !l.task_completed).length;
    }, [leads]);

    const handleCompleteTask = async (leadId) => {
        await updateLead(leadId, { task_completed: true });
    };

    const handleConvertToClient = async (lead) => {
        const confirmConversion = window.confirm(`¿Convertir a ${lead.name} en Cliente Maestro?`);
        if (!confirmConversion) return;

        const res = await addClient({
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            city: lead.city,
            type: lead.interest_type || 'General',
            nit: lead.nit || 'PENDIENTE',
            address: lead.address || 'PENDIENTE'
        });

        if (res.success) {
            await updateLead(lead.id, { stage: 'Clientes Ingresados' });
            alert("Cliente creado con éxito en Datos Maestros.");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("¿Estás seguro de eliminar este prospecto?")) {
            await deleteLead(id);
        }
    };

    const generatePDF = (lead, items, discount) => {
        const doc = new jsPDF();
        
        // Logo and Header
        // In a real environment, we'd load the base64 of /logo.png
        // For now, let's use a nice title header
        doc.setFillColor(2, 54, 54); // deepTeal
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("ZETICASSAS", 15, 25);
        doc.setFontSize(10);
        doc.text("PREMIUM PRESERVES & CONSULTING", 15, 32);
        
        doc.setTextColor(2, 54, 54);
        doc.setFontSize(18);
        doc.text("COTIZACIÓN COMERCIAL", 120, 55);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const date = new Date().toLocaleDateString();
        doc.text(`FECHA: ${date}`, 120, 62);
        doc.text(`REF: QT-${Math.floor(Math.random() * 9000) + 1000}`, 120, 67);

        // Client Info
        doc.setFont("helvetica", "bold");
        doc.text("CLIENTE:", 15, 80);
        doc.setFont("helvetica", "normal");
        doc.text(lead.name || "N/A", 45, 80);
        
        doc.setFont("helvetica", "bold");
        doc.text("CIUDAD:", 15, 85);
        doc.setFont("helvetica", "normal");
        doc.text(lead.city || "N/A", 45, 85);
        
        doc.setFont("helvetica", "bold");
        doc.text("EMAIL:", 15, 90);
        doc.setFont("helvetica", "normal");
        doc.text(lead.email || "N/A", 45, 90);

        // Table
        const tableData = items.map(i => [
            i.name,
            i.quantity,
            `$${(i.price || 0).toLocaleString()}`,
            `$${(i.price * i.quantity).toLocaleString()}`
        ]);

        autoTable(doc, {
            startY: 100,
            head: [['PRODUCTO / SKU', 'CANT', 'P. UNIT', 'TOTAL']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [212, 120, 90] }, // institutionOcre
            styles: { fontSize: 9 }
        });

        const finalY = doc.lastAutoTable.finalY + 10;
        const subtotal = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        const total = subtotal - discount;

        doc.setFont("helvetica", "bold");
        doc.text(`SUBTOTAL: $${subtotal.toLocaleString()}`, 140, finalY);
        if (discount > 0) doc.text(`DESCUENTO: -$${discount.toLocaleString()}`, 140, finalY + 7);
        doc.setFontSize(13);
        doc.text(`TOTAL A PAGAR: $${total.toLocaleString()}`, 140, finalY + 15);

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("Esta cotización tiene una validez de 15 días calendario.", 15, 280);
        doc.text("Zeticas SAS - Bogotá, Colombia - www.zeticas.com", 15, 285);

        doc.save(`Cotizacion_Zeticas_${lead.name.replace(/\s+/g, '_')}.pdf`);
        
        // Update Lead State
        updateLead(lead.id, { 
            stage: 'Cotización Enviada',
            last_quote_total: total,
            last_quote_date: date
        });
        
        // Generate WhatsApp Link
        const message = `Hola ${lead.name}, te saludo de Zeticas 🌿. Te adjunto la cotización por un total de $${total.toLocaleString()}. Quedamos atentos a tu confirmación.`;
        const waLink = `https://wa.me/${lead.phone}?text=${encodeURIComponent(message)}`;
        window.open(waLink, '_blank');
    };

    const getColumnColor = (stage) => {
        switch (stage) {
            case 'Nuevo Lead': return '#3b82f6';
            case 'Cotización Enviada': return institutionOcre;
            case 'Clientes Ingresados': return '#10b981';
            default: return deepTeal;
        }
    };

    return (
        <div style={{ padding: '0 1rem', height: '100%', display: 'flex', flexDirection: 'column', animation: 'fadeUp 0.6s ease-out' }}>
            
            {/* Top Bar with Pending Tasks Indicator */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', gap: '2rem' }}>
                <div style={{ display: 'flex', gap: '2rem', flex: 1 }}>
                    {[
                        { label: 'Prospectos Activos', val: leads.filter(l => l.stage !== 'Clientes Ingresados').length, color: '#3b82f6', icon: <UserPlus /> },
                        { label: 'Conversiones', val: leads.filter(l => l.stage === 'Clientes Ingresados').length, color: '#10b981', icon: <CheckCircle2 /> }
                    ].map((stat, idx) => (
                        <div key={idx} style={{ background: '#fff', padding: '1.5rem 2rem', borderRadius: '25px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '1.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.02)', flex: 1 }}>
                            <div style={{ width: '48px', height: '48px', background: `${stat.color}10`, color: stat.color, borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{stat.icon}</div>
                            <div>
                                <div style={{ fontSize: '1.8rem', fontWeight: '900', color: deepTeal }}>{stat.val}</div>
                                <div style={{ fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>{stat.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pending Tasks Calendar-style indicator */}
                <div 
                    onClick={() => setShowTaskList(!showTaskList)}
                    style={{ 
                        background: pendingTasksCount > 0 ? institutionOcre : '#fff', 
                        color: pendingTasksCount > 0 ? '#fff' : deepTeal,
                        padding: '1.5rem 2rem', borderRadius: '25px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '1.5rem', border: '1px solid #f1f5f9',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.05)', position: 'relative', transition: 'all 0.3s'
                    }}
                >
                    <Calendar size={28} />
                    <div>
                        <div style={{ fontSize: '1.8rem', fontWeight: '900' }}>{pendingTasksCount}</div>
                        <div style={{ fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase' }}>Tareas Pendientes</div>
                    </div>
                    {showTaskList && (
                        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '1rem', width: '350px', background: '#fff', borderRadius: '20px', boxShadow: '0 15px 45px rgba(0,0,0,0.15)', zIndex: 100, padding: '1.5rem', color: deepTeal }}>
                            <h4 style={{ margin: '0 0 1rem 0', display: 'flex', justifyContent: 'space-between' }}>
                                Seguimientos Pendientes
                                <X size={18} onClick={(e) => { e.stopPropagation(); setShowTaskList(false); }} />
                            </h4>
                            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                {leads.filter(l => l.follow_up_date && !l.task_completed).map(task => (
                                    <div key={task.id} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', fontSize: '0.85rem' }}>
                                        <div style={{ fontWeight: '800' }}>{task.name} - {task.follow_up_date}</div>
                                        <div style={{ color: '#64748b', margin: '4px 0' }}>{task.follow_up_note || 'Sin nota'}</div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleCompleteTask(task.id); }}
                                            style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '0.7rem', cursor: 'pointer', marginTop: '5px' }}
                                        >Marcar como cumplido</button>
                                    </div>
                                ))}
                                {pendingTasksCount === 0 && <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>No hay tareas pendientes</div>}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Kanban Board - Responsive Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', flex: 1, paddingBottom: '2rem', alignItems: 'flex-start' }}>
                {stages.map(stage => {
                    const columnLeads = leads.filter(l => l.stage === stage);
                    const color = getColumnColor(stage);
                    return (
                        <div key={stage} onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, stage)} style={{ background: 'rgba(241, 245, 249, 0.5)', borderRadius: '35px', border: '1px solid rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '400px' }}>
                            <div style={{ padding: '1.5rem 2rem', borderBottom: `4px solid ${color}`, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '900', color: deepTeal, textTransform: 'uppercase', letterSpacing: '1px' }}>{stage}</h3>
                                <div style={{ background: `${color}15`, color: color, padding: '4px 12px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '900' }}>{columnLeads.length}</div>
                            </div>
                            <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {columnLeads.map(lead => (
                                    <div 
                                        key={lead.id} 
                                        draggable 
                                        onDragStart={e => e.dataTransfer.setData('leadId', lead.id)}
                                        onClick={() => setEditingLead(lead)}
                                        style={{ background: '#fff', padding: '1.5rem', borderRadius: '25px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', cursor: 'pointer', border: '1px solid #f1f5f9', transition: 'all 0.3s' }}
                                        className="lead-card-hover"
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '900', color: '#1e293b' }}>{lead.name}</h4>
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(lead.id); }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.3 }}><Trash2 size={16}/></button>
                                        </div>
                                        
                                        <div style={{ color: '#64748b', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Phone size={14} opacity={0.5}/> {lead.phone || 'N/A'}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Mail size={14} opacity={0.5}/> {lead.email || 'N/A'}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><MapPin size={14} opacity={0.5}/> {lead.city || 'N/A'}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><ShoppingCart size={14} opacity={0.5}/> {lead.estimated_volume || 'N/A'}</div>
                                        </div>

                                        {lead.follow_up_date && !lead.task_completed && (
                                            <div style={{ marginTop: '1rem', padding: '8px', background: `${institutionOcre}10`, borderRadius: '10px', fontSize: '0.75rem', color: institutionOcre, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <Clock size={12}/> Tarea: {lead.follow_up_date}
                                            </div>
                                        )}

                                        <div style={{ marginTop: '1.2rem', display: 'flex', gap: '0.5rem' }}>
                                            {lead.stage === 'Cotización Enviada' && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleConvertToClient(lead); }}
                                                    style={{ flex: 1, background: '#10b981', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.6rem', fontWeight: '900', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                                                >
                                                    <CheckCircle size={14}/> CONVERTIR
                                                </button>
                                            )}
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); {
                                                    setQuoteItems([]);
                                                    setQuoteDiscount(0);
                                                    setIsQuotationModalOpen(lead);
                                                }}}
                                                style={{ flex: 1, background: deepTeal, color: '#fff', border: 'none', borderRadius: '10px', padding: '0.6rem', fontWeight: '900', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                                            >
                                                <FileText size={14}/> COTIZAR
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setIsFollowUpModalOpen(lead); }}
                                                style={{ background: '#f8fafc', color: deepTeal, border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.6rem', cursor: 'pointer' }}
                                            >
                                                <Calendar size={14}/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Edit / Detail Modal */}
            {editingLead && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', width: '500px', borderRadius: '35px', padding: '2.5rem', boxShadow: '0 25px 50px rgba(0,0,0,0.2)', position: 'relative' }}>
                        <button onClick={() => setEditingLead(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', cursor: 'pointer' }}><X /></button>
                        <h3 style={{ margin: '0 0 2rem 0', fontWeight: '900', color: deepTeal }}>Editar Prospecto</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <input type="text" value={editingLead.name || ''} onChange={(e) => setEditingLead({...editingLead, name: e.target.value})} placeholder="Nombre" style={modalInputStyle} />
                            <input type="text" value={editingLead.nit || ''} onChange={(e) => setEditingLead({...editingLead, nit: e.target.value})} placeholder="NIT / Identificación" style={modalInputStyle} />
                            <input type="text" value={editingLead.phone || ''} onChange={(e) => setEditingLead({...editingLead, phone: e.target.value})} placeholder="Teléfono" style={modalInputStyle} />
                            <input type="text" value={editingLead.email || ''} onChange={(e) => setEditingLead({...editingLead, email: e.target.value})} placeholder="Correo" style={modalInputStyle} />
                            <input type="text" value={editingLead.city || ''} onChange={(e) => setEditingLead({...editingLead, city: e.target.value})} placeholder="Ciudad" style={modalInputStyle} />
                            <input type="text" value={editingLead.address || ''} onChange={(e) => setEditingLead({...editingLead, address: e.target.value})} placeholder="Dirección de Entrega" style={modalInputStyle} />
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button onClick={() => setEditingLead(null)} style={{ flex: 1, padding: '1rem', borderRadius: '15px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>Cerrar</button>
                                <button onClick={async () => { await updateLead(editingLead.id, editingLead); setEditingLead(null); }} style={{ flex: 1, padding: '1rem', borderRadius: '15px', border: 'none', background: deepTeal, color: '#fff', fontWeight: '900', cursor: 'pointer' }}>Guardar Cambios</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quotation Generator Modal */}
            {isQuotationModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', width: '800px', height: '85vh', borderRadius: '35px', padding: '2.5rem', boxShadow: '0 25px 50px rgba(0,0,0,0.2)', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                        <button onClick={() => setIsQuotationModalOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', cursor: 'pointer' }}><X /></button>
                        <h3 style={{ margin: '0 0 1rem 0', fontWeight: '900', color: deepTeal }}>Generador de Cotización</h3>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '2rem' }}>Cliente: <strong>{isQuotationModalOpen.name}</strong></p>
                        
                        <div style={{ flex: 1, display: 'flex', gap: '2rem', overflow: 'hidden' }}>
                            {/* Product Selector */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: '900', marginBottom: '10px', color: institutionOcre }}>CATÁLOGO DE PRODUCTOS</div>
                                <div style={{ overflowY: 'auto', flex: 1, paddingRight: '10px' }}>
                                    {masterProducts.slice(0, 14).map(p => {
                                        const inQuote = quoteItems.find(qi => qi.id === p.id);
                                        return (
                                            <div key={p.id} style={{ padding: '1rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontWeight: '800', fontSize: '0.9rem' }}>{p.name || p.nombre}</div>
                                                    <div style={{ color: '#64748b', fontSize: '0.8rem' }}>${(p.price || 0).toLocaleString()}</div>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        if (inQuote) {
                                                            setQuoteItems(quoteItems.filter(qi => qi.id !== p.id));
                                                        } else {
                                                            setQuoteItems([...quoteItems, { id: p.id, name: p.name || p.nombre, price: p.price, quantity: 1 }]);
                                                        }
                                                    }}
                                                    style={{ background: inQuote ? '#ef4444' : deepTeal, color: '#fff', border: 'none', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer' }}
                                                >
                                                    {inQuote ? 'Quitar' : 'Añadir'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Selection Summary */}
                            <div style={{ flex: 1, background: '#f8fafc', borderRadius: '25px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: '900', marginBottom: '1rem', color: deepTeal }}>RESUMEN DE COTIZACIÓN</div>
                                <div style={{ flex: 1, overflowY: 'auto' }}>
                                    {quoteItems.map(item => (
                                        <div key={item.id} style={{ marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                                            <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>{item.name}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '5px' }}>
                                                <input 
                                                    type="number" 
                                                    value={item.quantity} 
                                                    onChange={(e) => {
                                                        const n = parseInt(e.target.value) || 0;
                                                        setQuoteItems(quoteItems.map(qi => qi.id === item.id ? {...qi, quantity: n} : qi));
                                                    }}
                                                    style={{ width: '50px', padding: '4px', textAlign: 'center' }}
                                                />
                                                <span style={{ fontSize: '0.8rem' }}>x ${(item.price || 0).toLocaleString()}</span>
                                                <span style={{ marginLeft: 'auto', fontWeight: '800' }}>${(item.price * item.quantity).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <div style={{ marginTop: '1.5rem', borderTop: '2px solid #e2e8f0', paddingTop: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <span>SUBTOTAL:</span>
                                        <strong>${quoteItems.reduce((s, i) => s + (i.price * i.quantity), 0).toLocaleString()}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                        <span>DESCUENTO:</span>
                                        <input type="number" value={quoteDiscount} onChange={(e) => setQuoteDiscount(parseInt(e.target.value) || 0)} style={{ width: '80px', textAlign: 'right', border: '1px solid #ddd' }} />
                                    </div>
                                    <button 
                                        disabled={quoteItems.length === 0}
                                        onClick={() => {
                                            if (!isQuotationModalOpen.city || !isQuotationModalOpen.address) {
                                                alert("Faltan datos de CIUDAD y DIRECCIÓN en el cliente. Por favor completa los Datos Maestros primero.");
                                                return;
                                            }
                                            generatePDF(isQuotationModalOpen, quoteItems, quoteDiscount);
                                            setIsQuotationModalOpen(false);
                                        }}
                                        style={{ width: '100%', background: institutionOcre, color: '#fff', border: 'none', borderRadius: '15px', padding: '1rem', fontWeight: '900', cursor: quoteItems.length === 0 ? 'not-allowed' : 'pointer', opacity: quoteItems.length === 0 ? 0.5 : 1 }}
                                    >
                                        GENERAR Y ENVIAR COTIZACIÓN
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Follow-up / Task Modal */}
            {isFollowUpModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', width: '450px', borderRadius: '35px', padding: '2.5rem', boxShadow: '0 25px 50px rgba(0,0,0,0.2)', position: 'relative' }}>
                        <button onClick={() => setIsFollowUpModalOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', cursor: 'pointer' }}><X /></button>
                        <h3 style={{ margin: '0 0 1rem 0', fontWeight: '900', color: deepTeal }}>Programar Seguimiento</h3>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '2rem' }}>Define una fecha y motivo para contactar a {isFollowUpModalOpen.name}.</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: '900', color: deepTeal }}>FECHA DE SEGUIMIENTO</label>
                            <input type="date" value={isFollowUpModalOpen.follow_up_date || ''} onChange={(e) => setIsFollowUpModalOpen({...isFollowUpModalOpen, follow_up_date: e.target.value})} style={modalInputStyle} />
                            <label style={{ fontSize: '0.8rem', fontWeight: '900', color: deepTeal }}>MOTIVO / TAREA</label>
                            <textarea value={isFollowUpModalOpen.follow_up_note || ''} onChange={(e) => setIsFollowUpModalOpen({...isFollowUpModalOpen, follow_up_note: e.target.value})} placeholder="Ej: Llamar para confirmar recibo de catálogo" style={{ ...modalInputStyle, height: '100px', resize: 'none' }} />
                            <button onClick={async () => { await updateLead(isFollowUpModalOpen.id, { follow_up_date: isFollowUpModalOpen.follow_up_date, follow_up_note: isFollowUpModalOpen.follow_up_note, task_completed: false }); setIsFollowUpModalOpen(false); }} style={{ padding: '1.2rem', borderRadius: '15px', border: 'none', background: institutionOcre, color: '#fff', fontWeight: '900', cursor: 'pointer', marginTop: '1rem' }}>Sincronizar Tarea</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
                .lead-card-hover:hover { transform: translateY(-4px); border-color: ${institutionOcre}40 !important; box-shadow: 0 12px 25px rgba(0,0,0,0.05) !important; }
                ::-webkit-scrollbar { height: 8px; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            `}</style>
        </div>
    );
};

const modalInputStyle = {
    width: '100%',
    padding: '1rem 1.5rem',
    borderRadius: '15px',
    border: '1px solid #f1f5f9',
    background: '#f8fafc',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box'
};

export default CRM;


