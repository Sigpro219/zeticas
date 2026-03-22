import React, { useState, useEffect } from 'react';
import { UserPlus, Calendar, BarChart3, MessageSquare, Clock, Edit2, X, CheckSquare, ChevronDown, Check, Trash2, Download, TrendingUp, CheckCircle2, Phone, Mail, FileText, ShoppingCart, Search, RefreshCw, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useBusiness } from '../context/BusinessContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const CRM = () => {
    const { addClient } = useBusiness();
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tableError, setTableError] = useState(false);
    
    // Premium Branding Colors
    const deepTeal = "#023636";
    const institutionOcre = "#D4785A";
    const premiumSalmon = "#E29783";
    const glassWhite = "rgba(255, 255, 255, 0.85)";

    const [selectedLead, setSelectedLead] = useState(null);
    const [taskDate, setTaskDate] = useState('');
    const [taskNote, setTaskNote] = useState('');
    const [editingLead, setEditingLead] = useState(null);
    const [convertedLeads, setConvertedLeads] = useState(() => JSON.parse(localStorage.getItem('zeticas_converted_leads') || '[]'));
    const [showTasks, setShowTasks] = useState(false);
    const [taskFilterDate, setTaskFilterDate] = useState('');

    const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
    const [quotationLead, setQuotationLead] = useState(null);
    const [quotationItems, setQuotationItems] = useState([]);
    const [availableProducts] = useState([
        { id: 1, name: 'Hummus de Garbanzo', category: 'Sal', price: 21000 },
        { id: 2, name: 'Antipasto tuna', category: 'Sal', price: 35000 },
        { id: 4, name: 'Antipasto Veggie', category: 'Sal', price: 20000 },
        { id: 13, name: 'Ponqué Navidad', category: 'Dulce', price: 22944 },
        { id: 14, name: 'Nidos de nuez', category: 'Dulce', price: 2102 },
        { id: 15, name: 'Florentinas', category: 'Dulce', price: 2366 },
    ]);

    const stages = [
        'Nuevo Lead',
        'Cotización Enviada',
        'Clientes Ingresados'
    ];

    useEffect(() => {
        fetchLeads();
        const channel = supabase
            .channel('public:leads')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, payload => {
                fetchLeads();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setLeads(data || []);
        } catch (error) {
            setTableError(true);
            const localLeads = JSON.parse(localStorage.getItem('zeticas_local_leads') || '[]');
            setLeads(localLeads);
        } finally { setLoading(false); }
    };

    const handleDrop = async (e, newStage) => {
        const leadId = e.dataTransfer.getData('leadId');
        if (!leadId) return;
        setLeads(prev => prev.map(lead => lead.id === leadId ? { ...lead, stage: newStage } : lead));
        await supabase.from('leads').update({ stage: newStage }).eq('id', leadId);
    };

    const handleSaveTask = async () => {
        if (!selectedLead) return;
        setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, follow_up_date: taskDate, follow_up_note: taskNote } : l));
        await supabase.from('leads').update({ follow_up_date: taskDate, follow_up_note: taskNote }).eq('id', selectedLead.id);
        setSelectedLead(null);
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
        <div style={{ padding: '0 0.5rem', height: '100%', display: 'flex', flexDirection: 'column', animation: 'fadeUp 0.6s ease-out' }}>
            
            {/* Action Metrics Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2.5rem', marginBottom: '4rem' }}>
                {[
                    { label: 'Prospectos Activos', val: leads.filter(l => l.stage !== 'Clientes Ingresados').length, color: '#3b82f6', icon: <UserPlus /> },
                    { label: 'Eficacia Comercial', val: leads.filter(l => l.stage === 'Cotización Enviada').length, color: institutionOcre, icon: <TrendingUp /> },
                    { label: 'Conversión Lograda', val: leads.filter(l => l.stage === 'Clientes Ingresados').length, color: '#10b981', icon: <CheckCircle2 /> }
                ].map((stat, idx) => (
                    <div key={idx} style={{ 
                        background: '#fff', 
                        padding: '2.5rem', 
                        borderRadius: '45px', 
                        border: '1px solid #f1f5f9', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '2rem',
                        boxShadow: '0 15px 35px rgba(0,0,0,0.02)',
                        transition: 'transform 0.3s'
                    }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                        <div style={{ width: '64px', height: '64px', background: `${stat.color}10`, color: stat.color, borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {React.cloneElement(stat.icon, { size: 32 })}
                        </div>
                        <div>
                            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: deepTeal, lineHeight: 1 }}>{stat.val}</div>
                            <div style={{ fontSize: '0.8rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '6px' }}>{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Kanban Engine */}
            <div style={{ display: 'flex', gap: '2.5rem', flex: 1, minHeight: '600px', overflowX: 'auto', paddingBottom: '2rem' }}>
                {stages.map(stage => {
                    const columnLeads = leads.filter(l => l.stage === stage);
                    const color = getColumnColor(stage);
                    return (
                        <div key={stage} onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, stage)} style={{ flex: '0 0 380px', background: 'rgba(241, 245, 249, 0.5)', borderRadius: '45px', border: '1px solid rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <div style={{ padding: '2rem', borderBottom: `4px solid ${color}`, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '900', color: deepTeal, textTransform: 'uppercase', letterSpacing: '1.5px' }}>{stage}</h3>
                                <div style={{ background: `${color}15`, color: color, padding: '6px 14px', borderRadius: '14px', fontSize: '0.85rem', fontWeight: '900' }}>{columnLeads.length}</div>
                            </div>
                            <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                {columnLeads.map(lead => (
                                    <div key={lead.id} draggable onDragStart={e => { e.dataTransfer.setData('leadId', lead.id); e.currentTarget.style.opacity = '0.5'; }} onDragEnd={e => e.currentTarget.style.opacity = '1'} onClick={() => setSelectedLead(lead)} style={{ background: '#fff', padding: '1.8rem', borderRadius: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', cursor: 'grab', position: 'relative', border: '1px solid #f8fafc', transition: 'all 0.3s' }} className="lead-card-hover">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem' }}>
                                            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: '#1e293b' }}>{lead.name}</h4>
                                            <div style={{ color: color, background: `${color}10`, padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: '900' }}>{lead.interest_type || 'GENERAL'}</div>
                                        </div>
                                        <div style={{ color: '#64748b', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}><Phone size={14} opacity={0.5}/> {lead.phone}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}><Mail size={14} opacity={0.5}/> {lead.email}</div>
                                        </div>
                                        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.8rem' }}>
                                            <button style={{ flex: 1, background: deepTeal, color: '#fff', border: 'none', borderRadius: '12px', padding: '0.8rem', fontWeight: '900', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}><Zap size={14}/> COTIZAR</button>
                                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MessageSquare size={16} opacity={0.5}/></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <style>{`
                @keyframes fadeUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
                .lead-card-hover:hover { transform: translateY(-4px); border-color: ${institutionOcre}40 !important; box-shadow: 0 12px 25px rgba(0,0,0,0.05) !important; }
            `}</style>
        </div>
    );
};

export default CRM;
