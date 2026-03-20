import React, { useState, useEffect } from 'react';
import { UserPlus, Calendar, BarChart3, MessageSquare, Clock, Edit2, X, CheckSquare, ChevronDown, Check, Trash2, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useBusiness } from '../context/BusinessContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const CRM = () => {
    const { addClient } = useBusiness();
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tableError, setTableError] = useState(false);

    // Modal de Tareas / Seguimiento
    const [selectedLead, setSelectedLead] = useState(null);
    const [taskDate, setTaskDate] = useState('');
    const [taskNote, setTaskNote] = useState('');

    // Modal de Edición de Lead
    const [editingLead, setEditingLead] = useState(null);

    const [convertedLeads, setConvertedLeads] = useState(() => JSON.parse(localStorage.getItem('zeticas_converted_leads') || '[]'));

    // Dropdown de Tareas pendientes
    const [showTasks, setShowTasks] = useState(false);
    const [taskFilterDate, setTaskFilterDate] = useState('');

    // --- NUEVO: Cotizaciones ---
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
    const [quotationFilter, setQuotationFilter] = useState('Todos');
    const [searchProduct, setSearchProduct] = useState('');

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

        const handleLocalUpdate = () => {
            const localLeads = JSON.parse(localStorage.getItem('zeticas_local_leads') || '[]');
            setLeads(localLeads);
        };
        window.addEventListener('local_leads_updated', handleLocalUpdate);
        window.addEventListener('lead_added_db', fetchLeads);

        return () => {
            supabase.removeChannel(channel);
            window.removeEventListener('local_leads_updated', handleLocalUpdate);
            window.removeEventListener('lead_added_db', fetchLeads);
        };
    }, []);

    const fetchLeads = async () => {
        setLoading(true);
        setTableError(false);
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching leads:", error);
                if (error.code === '42P01' || error.code === 'PGRST205') {
                    setTableError(true);
                    const localLeads = JSON.parse(localStorage.getItem('zeticas_local_leads') || '[]');
                    setLeads(localLeads);
                }
            } else {
                setLeads(data || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDragStart = (e, leadId) => {
        e.dataTransfer.setData('leadId', leadId);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = async (e, newStage) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('leadId');
        if (!leadId) return;

        // Optimistic update
        setLeads(prev => prev.map(lead => lead.id === leadId ? { ...lead, stage: newStage } : lead));

        if (tableError) {
            const localLeads = JSON.parse(localStorage.getItem('zeticas_local_leads') || '[]');
            const updated = localLeads.map(lead => lead.id === leadId ? { ...lead, stage: newStage } : lead);
            localStorage.setItem('zeticas_local_leads', JSON.stringify(updated));
            return;
        }

        const { error } = await supabase
            .from('leads')
            .update({ stage: newStage })
            .eq('id', leadId);

        if (error) {
            console.error("Error updating lead stage:", error);
            fetchLeads(); // Revert on error
        }
    };

    const openTaskModal = (lead) => {
        setSelectedLead(lead);
        setTaskDate(lead.follow_up_date || '');
        setTaskNote(lead.follow_up_note || '');
    };

    const handleSaveTask = async () => {
        if (!selectedLead) return;

        // Optimistic update
        setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, follow_up_date: taskDate, follow_up_note: taskNote } : l));

        if (tableError) {
            const localLeads = JSON.parse(localStorage.getItem('zeticas_local_leads') || '[]');
            const updated = localLeads.map(l => l.id === selectedLead.id ? { ...l, follow_up_date: taskDate, follow_up_note: taskNote } : l);
            localStorage.setItem('zeticas_local_leads', JSON.stringify(updated));
            setSelectedLead(null);
            return;
        }

        // Intento de guardado en supabase (Dependerá de si se agregaron las columnas en la DB)
        // En un esquema completo esto iría a 'lead_tasks', se simplifica guardándolo en el lead para este demo.
        const { error } = await supabase
            .from('leads')
            .update({ follow_up_date: taskDate, follow_up_note: taskNote })
            .eq('id', selectedLead.id);

        if (error) {
            console.error("Error saving task, possibly columns follow_up_date missing in Supabase:", error);
            // Aun así lo dejamos en el estado para que sea visible en sesión.
        }

        setSelectedLead(null);
    };

    const handleEditLead = async (e) => {
        if (e) e.preventDefault();
        if (!editingLead) return;

        // Optimistic update
        setLeads(prev => prev.map(l => l.id === editingLead.id ? editingLead : l));

        if (tableError) {
            const localLeads = JSON.parse(localStorage.getItem('zeticas_local_leads') || '[]');
            const updated = localLeads.map(l => l.id === editingLead.id ? editingLead : l);
            localStorage.setItem('zeticas_local_leads', JSON.stringify(updated));
            setEditingLead(null);
            return;
        }

        const { error } = await supabase
            .from('leads')
            .update({
                name: editingLead.name,
                email: editingLead.email,
                phone: editingLead.phone,
                city: editingLead.city,
                interest_type: editingLead.interest_type,
                estimated_volume: editingLead.estimated_volume,
                urgency_date: editingLead.urgency_date
            })
            .eq('id', editingLead.id);

        if (error) {
            console.error("Error updating lead:", error);
            fetchLeads();
        }

        setEditingLead(null);
    };

    const handleDeleteLead = async (e, leadId) => {
        e.stopPropagation();
        if (!leadId) {
            alert("Error: ID de prospecto no encontrado.");
            return;
        }

        if (window.confirm('¿Estás seguro que deseas eliminar este prospecto?')) {
            console.log("Intentando eliminar lead ID:", leadId);

            // 1. Eliminación Optimista (UI)
            setLeads(prev => prev.filter(l => l.id !== leadId));

            // 2. Intentar eliminar de LocalStorage siempre (por seguridad o si es fallback)
            const localLeads = JSON.parse(localStorage.getItem('zeticas_local_leads') || '[]');
            const updatedLocal = localLeads.filter(l => l.id !== leadId);
            if (localLeads.length !== updatedLocal.length) {
                console.log("Lead eliminado de LocalStorage");
                localStorage.setItem('zeticas_local_leads', JSON.stringify(updatedLocal));
                if (tableError) return; // Si estamos en modo error, ya terminamos
            }

            // 3. Intentar eliminar de Supabase
            if (!tableError) {
                try {
                    const { error } = await supabase
                        .from('leads')
                        .delete()
                        .eq('id', leadId);

                    if (error) {
                        console.error("Error al borrar en Supabase:", error);
                        alert(`No se pudo borrar en la base de datos: ${error.message || 'Error desconocido'}`);
                        fetchLeads(); // Revertir UI
                    } else {
                        console.log("Lead eliminado exitosamente de Supabase");
                    }
                } catch (err) {
                    console.error("Excepción al borrar lead:", err);
                    alert("Ocurrió un error inesperado al intentar borrar el prospecto.");
                    fetchLeads();
                }
            }
        }
    };

    const handleCompleteTask = async (leadId) => {
        if (!window.confirm('¿Deseas dar por completada esta tarea?')) return;

        // Optimistic update
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, follow_up_date: null, follow_up_note: null, completed_tasks_count: (l.completed_tasks_count || 0) + 1 } : l));

        if (tableError) {
            const localLeads = JSON.parse(localStorage.getItem('zeticas_local_leads') || '[]');
            const updated = localLeads.map(l => l.id === leadId ? { ...l, follow_up_date: null, follow_up_note: null, completed_tasks_count: (l.completed_tasks_count || 0) + 1 } : l);
            localStorage.setItem('zeticas_local_leads', JSON.stringify(updated));
            return;
        }

        // Obtener count actual
        const lead = leads.find(l => l.id === leadId);
        const newCount = (lead?.completed_tasks_count || 0) + 1;

        const { error } = await supabase
            .from('leads')
            .update({ follow_up_date: null, follow_up_note: null, completed_tasks_count: newCount })
            .eq('id', leadId);

        if (error) {
            console.error("Error completing task:", error);
            fetchLeads(); // Revert
        }
    };

    const handleCreateClient = async () => {
        if (!selectedLead) return;
        if (window.confirm('¿Confirma ingresa cliente nuevo?')) {
            const clientData = {
                name: selectedLead.name,
                email: selectedLead.email || '',
                phone: selectedLead.phone || '',
                city: selectedLead.city || '',
                address: selectedLead.address || '',
                source: 'CRM',
                type: selectedLead.interest_type === 'Corporativo' ? 'Jurídica' : 'Natural',
                subType: selectedLead.interest_type === 'Corporativo' ? 'B2B' : 'B2C',
                nit: ''
            };

            const result = await addClient(clientData);

            if (result.success) {
                const newConverted = [...convertedLeads, selectedLead.id];
                if (!convertedLeads.includes(selectedLead.id)) {
                    setConvertedLeads(newConverted);
                    localStorage.setItem('zeticas_converted_leads', JSON.stringify(newConverted));
                }
                alert('¡Cliente creado exitosamente!');
            } else {
                alert('Error al crear el cliente: ' + result.error);
            }
            setSelectedLead(null);
        }
    };

    // --- NUEVO: Funciones de Cotización ---
    const openQuotationModal = (lead) => {
        setQuotationLead(lead);
        setQuotationItems([]);
        setIsQuotationModalOpen(true);
    };

    const addProductToQuotation = (product) => {
        const exists = quotationItems.find(i => i.id === product.id);
        if (exists) {
            setQuotationItems(quotationItems.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setQuotationItems([...quotationItems, { ...product, quantity: 1 }]);
        }
    };

    const updateQuotationItem = (id, field, value) => {
        setQuotationItems(quotationItems.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    const removeQuotationItem = (id) => {
        if (window.confirm('¿Deseas eliminar este producto de la cotización?')) {
            setQuotationItems(quotationItems.filter(i => i.id !== id));
        }
    };

    const handleSendQuotation = async (method) => {
        if (quotationItems.length === 0) {
            alert('Añade al menos un producto para cotizar.');
            return;
        }

        const total = quotationItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

        // Datos formales para WhatsApp y Email
        const itemsText = quotationItems.map(i => `• ${i.name} x${i.quantity}: $${(i.price * i.quantity).toLocaleString()}`).join('\n');
        const formalText = `*COTIZACIÓN COMERCIAL - ZETICAS SAS*\n\n` +
            `De: Zeticas S.A.S.\n` +
            `Para: ${quotationLead.name}\n` +
            `Fecha: ${new Date().toLocaleDateString()}\n\n` +
            `*Productos:*\n${itemsText}\n\n` +
            `*TOTAL A PAGAR: $${total.toLocaleString()}*\n\n` +
            `Quedamos atentos a su confirmación para proceder con el pedido.\n` +
            `Atentamente,\nZeticas SAS`;

        if (method === 'whatsapp') {
            window.open(`https://wa.me/${quotationLead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(formalText)}`, '_blank');
        } else if (method === 'email') {
            const subject = `Cotización Comercial Zeticas - ${quotationLead.name}`;
            window.open(`mailto:${quotationLead.email}?subject=Cotización Comercial Zeticas - ${quotationLead.name}&body=${encodeURIComponent(formalText.replace(/\*/g, ''))}`, '_blank');
        } else if (method === 'pdf') {
            const doc = new jsPDF();

            // Logo
            try {
                const logoUrl = 'https://obsvdzlsbbqmhpsxksnd.supabase.co/storage/v1/object/public/assets/logo.png';
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.src = logoUrl;
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });
                doc.addImage(img, 'PNG', 150, 10, 45, 12);
            } catch (e) { console.error("Logo error", e); }

            // Header - Título
            doc.setFontSize(22);
            doc.setTextColor(0, 77, 77); // Zeticas Teal
            doc.setFont('helvetica', 'bold');
            doc.text('COTIZACIÓN COMERCIAL', 14, 25);

            // Divider
            doc.setDrawColor(0, 77, 77);
            doc.setLineWidth(0.5);
            doc.line(14, 32, 196, 32);

            // Zeticas Info (Izquierda)
            doc.setFontSize(10);
            doc.setTextColor(51, 65, 85);
            doc.setFont('helvetica', 'bold');
            doc.text('DE: ZETICAS S.A.S.', 14, 42);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text('NIT: 901.234.567-8', 14, 47);
            doc.text('Bogotá, Colombia', 14, 52);
            doc.text('Email: comercial@zeticas.com', 14, 57);

            // Client Info (Derecha)
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(51, 65, 85);
            doc.text(`PARA: ${quotationLead.name.toUpperCase()}`, 120, 42);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text(`Tel: ${quotationLead.phone || 'N/A'}`, 120, 47);
            doc.text(`Ciudad: ${quotationLead.city || 'Colombia'}`, 120, 52);
            doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 120, 57);

            // Table
            const tableColumn = ["Producto", "Cantidad", "Precio Unit.", "Subtotal"];
            const tableRows = quotationItems.map(item => [
                item.name,
                item.quantity.toString(),
                `$${item.price.toLocaleString()}`,
                `$${(item.price * item.quantity).toLocaleString()}`
            ]);

            autoTable(doc, {
                startY: 65,
                head: [tableColumn],
                body: tableRows,
                theme: 'grid',
                headStyles: { fillColor: [0, 77, 77], textColor: [255, 255, 255], fontStyle: 'bold' },
                bodyStyles: { textColor: [51, 65, 85] },
                columnStyles: {
                    0: { halign: 'left' },
                    1: { halign: 'center' },
                    2: { halign: 'right' },
                    3: { halign: 'right', fontStyle: 'bold' }
                }
            });

            const finalY = (doc.lastAutoTable?.finalY || 65) + 15;
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 77, 77);
            doc.text(`TOTAL COTIZADO: $${total.toLocaleString()}`, 196, finalY, { align: 'right' });

            // Footer
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(148, 163, 184);
            doc.text('Esta cotización tiene una validez de 15 días calendario.', 105, 285, { align: 'center' });
            doc.text('Generado por Zeticas OS CRM', 105, 290, { align: 'center' });

            doc.save(`Cotizacion_Zeticas_${quotationLead.name.replace(/\s+/g, '_')}.pdf`);
        }

        // Marcar como "Cotización Enviada" si está en "Nuevo Lead"
        if (quotationLead.stage === 'Nuevo Lead') {
            handleDrop({ preventDefault: () => { }, dataTransfer: { getData: () => quotationLead.id } }, 'Cotización Enviada');
        }
    };

    const getColumnColor = (stage) => {
        switch (stage) {
            case 'Nuevo Lead': return '#3b82f6';
            case 'Cotización Enviada': return '#8b5cf6';
            case 'Clientes Ingresados': return '#10b981';
            case 'Negociación/Seguimiento': return '#f59e0b';
            case 'Venta Cerrada': return '#059669'; // Un verde un poco más oscuro
            case 'Perdido': return '#ef4444';
            default: return '#64748b';
        }
    };

    const pendingTasks = leads.filter(l => l.follow_up_date || l.follow_up_note).sort((a, b) => new Date(a.follow_up_date || 0) - new Date(b.follow_up_date || 0));

    return (
        <div style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <header style={{ marginBottom: '2rem', flexShrink: 0 }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <h2 className="font-serif" style={{ fontSize: '2.2rem', color: 'var(--color-primary)', margin: 0 }}>Comercial / CRM</h2>
                    <p style={{ color: '#666', fontSize: '0.95rem', marginTop: '0.4rem' }}>
                        Gestión de prospectos, embudo y tareas. Presiona un prospecto para agendar actividades.
                    </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        {(() => {
                            const totalProspectos = leads.filter(l => !['Venta Cerrada', 'Perdido'].includes(l.stage)).length;
                            const cotizacionesEnviadas = leads.filter(l => l.stage === 'Cotización Enviada').length;

                            // Cuentan los leads en etapa 'Venta Cerrada' y aquellos que han sido convertidos localmente
                            const clientesIngresados = new Set([
                                ...leads.filter(l => l.stage === 'Venta Cerrada').map(l => l.id),
                                ...convertedLeads.filter(id => leads.some(l => l.id === id))
                            ]).size;

                            // Max value for the progress bars
                            const maxVal = Math.max(totalProspectos, cotizacionesEnviadas, clientesIngresados, 1);

                            return (
                                <>
                                    <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold' }}>Total Prospectos Activos</div>
                                            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--color-primary)', marginTop: '0.2rem' }}>
                                                {totalProspectos}
                                            </div>
                                        </div>
                                        <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '4px', marginTop: '0.5rem', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${(totalProspectos / maxVal) * 100}%`, background: '#3b82f6', borderRadius: '4px', transition: 'width 0.5s ease-in-out' }}></div>
                                        </div>
                                    </div>

                                    <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold' }}>Cotizaciones Enviadas</div>
                                            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--color-primary)', marginTop: '0.2rem' }}>
                                                {cotizacionesEnviadas}
                                            </div>
                                        </div>
                                        <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '4px', marginTop: '0.5rem', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${(cotizacionesEnviadas / maxVal) * 100}%`, background: '#8b5cf6', borderRadius: '4px', transition: 'width 0.5s ease-in-out' }}></div>
                                        </div>
                                    </div>

                                    <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold' }}>Clientes Ingresados</div>
                                            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--color-primary)', marginTop: '0.2rem' }}>
                                                {clientesIngresados}
                                            </div>
                                        </div>
                                        <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '4px', marginTop: '0.5rem', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${(clientesIngresados / maxVal) * 100}%`, background: '#10b981', borderRadius: '4px', transition: 'width 0.5s ease-in-out' }}></div>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>

                    <div style={{ position: 'relative' }}>
                        <button onClick={() => setShowTasks(!showTasks)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 1rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 'bold', position: 'relative' }}>
                            <CheckSquare size={18} /> Tareas Pendientes <ChevronDown size={18} />
                            {pendingTasks.length > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-8px',
                                    right: '-8px',
                                    background: '#ef4444',
                                    color: 'white',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                    border: '2px solid #fff',
                                    animation: 'bounce 2s infinite'
                                }}>
                                    {pendingTasks.length}
                                </div>
                            )}
                        </button>

                        {showTasks && (
                            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)', width: '320px', zIndex: 9999, maxHeight: '350px', overflowY: 'auto' }}>
                                <div style={{ padding: '0.75rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', position: 'sticky', top: 0, zIndex: 10 }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Filtrar por fecha:</label>
                                    <input type="date" value={taskFilterDate} onChange={e => setTaskFilterDate(e.target.value)} style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                </div>
                                {pendingTasks.filter(t => !taskFilterDate || t.follow_up_date === taskFilterDate).length === 0 ? (
                                    <div style={{ padding: '1.5rem 1rem', textAlign: 'center', fontSize: '0.9rem', color: '#64748b' }}>No hay tareas programadas.</div>
                                ) : (
                                    pendingTasks.filter(t => !taskFilterDate || t.follow_up_date === taskFilterDate).map(t => (
                                        <div key={t.id} style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ fontWeight: 'bold', color: 'var(--color-primary)', fontSize: '0.95rem' }}>{t.name}</div>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button onClick={() => handleCompleteTask(t.id)} title="Completar Tarea" style={{ background: '#ecfdf5', color: '#10b981', border: '1px solid #a7f3d0', padding: '0.3rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                                        <Check size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            {t.follow_up_date && (
                                                <div style={{ color: '#ef4444', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '0.3rem' }}><Clock size={14} /> {t.follow_up_date}</div>
                                            )}
                                            <div style={{ color: '#475569', marginTop: '0.5rem', fontSize: '0.85rem', lineHeight: '1.4', background: '#f8fafc', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                                <strong>Observación:</strong><br />
                                                {t.follow_up_note || 'Sin detalles registrados para esta tarea.'}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {tableError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '1rem 2rem', borderRadius: '12px', textAlign: 'center', marginBottom: '1.5rem', flexShrink: 0 }}>
                    <h3 style={{ color: '#ef4444', margin: '0 0 0.5rem 0' }}>Estás en Modo de Prueba Temporal</h3>
                    <p style={{ color: '#7f1d1d', margin: 0, fontSize: '0.9rem' }}>
                        Falta ejecutar el script de Base de Datos en Supabase. Mientras tanto, el Chatbot y el CRM guardarán y leerán tus leads aquí mismo de forma temporal para que puedas probarlo.
                    </p>
                </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', flex: 1, minHeight: 0 }}>
                {stages.map(stage => {
                    const columnLeads = leads.filter(lead => lead.stage === stage);
                    const color = getColumnColor(stage);

                    return (
                        <div
                            key={stage}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, stage)}
                            style={{
                                flex: '0 0 260px',
                                background: '#f1f5f9',
                                borderRadius: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                                border: '1px solid #e2e8f0'
                            }}
                        >
                            <div style={{ padding: '0.8rem 1rem', borderBottom: `3px solid ${color}`, borderTopLeftRadius: '12px', borderTopRightRadius: '12px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', color: '#334155', fontWeight: 'bold' }}>{stage}</h3>
                                <span style={{ background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                    {columnLeads.length}
                                </span>
                            </div>

                            <div style={{ padding: '0.8rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {loading && leads.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>Cargando...</div>
                                ) : columnLeads.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', border: '1px dashed #cbd5e1', padding: '1rem', borderRadius: '8px' }}>
                                        Sin leads
                                    </div>
                                ) : (
                                    columnLeads.map(lead => {
                                        const isConverted = convertedLeads.includes(lead.id);
                                        return (
                                            <div
                                                key={lead.id}
                                                draggable
                                                onClick={() => openTaskModal(lead)}
                                                style={{
                                                    background: isConverted ? '#f0fdf4' : '#fff',
                                                    padding: '0.8rem',
                                                    borderRadius: '8px',
                                                    boxShadow: isConverted ? '0 4px 6px rgba(34, 197, 94, 0.2)' : '0 2px 4px rgba(0,0,0,0.05)',
                                                    border: isConverted ? '2px solid #22c55e' : '1px solid #e2e8f0',
                                                    cursor: 'grab',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.4rem',
                                                    position: 'relative'
                                                }}
                                                onDragStart={(e) => {
                                                    e.currentTarget.style.opacity = '0.5';
                                                    handleDragStart(e, lead.id);
                                                }}
                                                onDragEnd={(e) => {
                                                    e.currentTarget.style.opacity = '1';
                                                }}
                                            >
                                                <div
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '0.3rem', alignItems: 'center', zIndex: 20 }}
                                                >
                                                    {/* Tareas Pendientes */}
                                                    <div style={{ background: '#fee2e2', color: '#ef4444', fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: '10px' }} title="Tareas Pendientes">
                                                        {lead.follow_up_date ? 1 : 0}
                                                    </div>
                                                    {/* Tareas Completadas */}
                                                    <div style={{ background: '#dcfce7', color: '#16a34a', fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: '10px' }} title="Tareas Completadas">
                                                        {lead.completed_tasks_count || 0}
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setEditingLead(lead); }}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            padding: '4px',
                                                            color: '#64748b',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderRadius: '4px',
                                                            transition: 'background 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                                        title="Editar prospecto"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: '20px' }}>
                                                    <h4 style={{ margin: 0, fontSize: '0.85rem', color: isConverted ? '#166534' : 'var(--color-primary)', fontWeight: 'bold' }}>
                                                        {lead.name} {isConverted && '✅'}
                                                    </h4>
                                                </div>

                                                {lead.follow_up_date && (
                                                    <div style={{ fontSize: '0.7rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', background: '#fee2e2', padding: '4px 6px', borderRadius: '4px', alignSelf: 'flex-start' }}>
                                                        <Clock size={12} /> Seguimiento: {lead.follow_up_date}
                                                    </div>
                                                )}

                                                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                                                    <div><strong>Tel/WA:</strong> {lead.phone || 'N/A'}</div>
                                                    <div style={{ wordBreak: 'break-all' }}><strong>Email:</strong> {lead.email || 'N/A'}</div>
                                                    <div><strong>Ciudad:</strong> {lead.city || 'N/A'}</div>
                                                    <div><strong>Interés:</strong> {lead.interest_type || 'N/A'}</div>
                                                    <div><strong>Volumen:</strong> {lead.estimated_volume || 0} unid/cajas</div>
                                                    <div style={{ color: '#0369a1', fontWeight: 'bold', marginTop: '4px' }}><strong>📍 Fecha Entrega:</strong> {lead.urgency_date || 'Flexible'}</div>
                                                </div>

                                                <div style={{ marginTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        {lead.phone && (
                                                            <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: 'center', fontSize: '0.7rem', background: '#25D366', color: '#fff', padding: '6px 4px', borderRadius: '4px', textDecoration: 'none' }}>
                                                                WhatsApp
                                                            </a>
                                                        )}
                                                        {lead.email && (
                                                            <a href={`mailto:${lead.email}`} style={{ flex: 1, textAlign: 'center', fontSize: '0.7rem', background: '#3b82f6', color: '#fff', padding: '6px 4px', borderRadius: '4px', textDecoration: 'none' }}>
                                                                Email
                                                            </a>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => openQuotationModal(lead)}
                                                        style={{ width: '100%', fontSize: '0.75rem', background: 'var(--color-secondary)', color: '#fff', padding: '8px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                                    >
                                                        Crear Cotización
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal de Tareas */}
            {selectedLead && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', width: '400px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '1.2rem' }}>Agendar Tarea</h3>
                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Prospecto: {selectedLead.name}</div>
                            </div>
                            <button onClick={() => setSelectedLead(null)} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', borderRadius: '50%', padding: '6px', color: '#64748b' }}><X size={18} /></button>
                        </div>

                        <div style={{ marginBottom: '1.2rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#334155', fontWeight: 'bold' }}>Fecha de Seguimiento</label>
                            <input type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#334155', fontWeight: 'bold' }}>Observación / Tarea a ejecutar</label>
                            <textarea rows="4" value={taskNote} onChange={(e) => setTaskNote(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical', outline: 'none' }} placeholder="Ej: Llamar para confirmar si revisaron la cotización de los kits corporativos..." />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <button onClick={() => setSelectedLead(null)} style={{ flex: 1, padding: '0.75rem', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                Cancelar
                            </button>
                            <button onClick={handleSaveTask} style={{ flex: 1, padding: '0.75rem', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                Guardar Tarea
                            </button>
                        </div>
                        <button onClick={handleCreateClient} style={{ width: '100%', padding: '0.75rem', background: '#be185d', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 6px rgba(190, 24, 93, 0.2)' }}>
                            Ingresa como Cliente Nuevo
                        </button>
                    </div>
                </div>
            )}

            {/* Modal de Cotización */}
            {isQuotationModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', width: '800px', maxWidth: '95%', height: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                            <h3 className="font-serif" style={{ fontSize: '1.5rem', margin: 0 }}>Crear Cotización - {quotationLead.name}</h3>
                            <button onClick={() => setIsQuotationModalOpen(false)} style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}><X size={20} /></button>
                        </div>

                        <div style={{ display: 'flex', gap: '1.5rem', flex: 1, overflow: 'hidden' }}>
                            {/* Selector de Productos */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', borderRight: '1px solid #eee', paddingRight: '1.5rem' }}>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="text"
                                        placeholder="Buscar producto..."
                                        value={searchProduct}
                                        onChange={e => setSearchProduct(e.target.value)}
                                        style={{ flex: 1, padding: '0.6rem', borderRadius: '6px', border: '1px solid #ddd' }}
                                    />
                                    <select
                                        value={quotationFilter}
                                        onChange={e => setQuotationFilter(e.target.value)}
                                        style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #ddd' }}
                                    >
                                        <option value="Todos">Todos</option>
                                        <option value="Sal">Sal</option>
                                        <option value="Dulce">Dulce</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1, overflowY: 'auto' }}>
                                    {availableProducts
                                        .filter(p => (quotationFilter === 'Todos' || p.category === quotationFilter) && p.name.toLowerCase().includes(searchProduct.toLowerCase()))
                                        .map(p => (
                                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', borderBottom: '1px solid #f8fafc', background: '#fff' }}>
                                                <div>
                                                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{p.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>${p.price.toLocaleString()}</div>
                                                </div>
                                                <button onClick={() => addProductToQuotation(p)} style={{ padding: '4px 12px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Añadir</button>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>

                            {/* Detalle de Cotización */}
                            <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <h4 style={{ margin: 0, color: '#475569' }}>Productos Seleccionados</h4>
                                <div style={{ flex: 1, overflowY: 'auto', background: '#f8fafc', borderRadius: '8px', padding: '0.5rem' }}>
                                    {quotationItems.length === 0 ? (
                                        <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No hay productos añadidos aún.</div>
                                    ) : (
                                        quotationItems.map(item => (
                                            <div key={item.id} style={{ background: '#fff', padding: '0.8rem', borderRadius: '6px', marginBottom: '0.5rem', border: '1px solid #e2e8f0' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                                    <span style={{ fontSize: '0.9rem' }}>{item.name}</span>
                                                    <button onClick={() => removeQuotationItem(item.id)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ fontSize: '0.7rem', color: '#64748b' }}>Cant:</label>
                                                        <input type="number" value={item.quantity} onChange={e => updateQuotationItem(item.id, 'quantity', parseInt(e.target.value) || 0)} style={{ width: '100%', padding: '4px', fontSize: '0.85rem' }} />
                                                    </div>
                                                    <div style={{ flex: 2 }}>
                                                        <label style={{ fontSize: '0.7rem', color: '#64748b' }}>Precio:</label>
                                                        <input type="number" value={item.price} onChange={e => updateQuotationItem(item.id, 'price', parseInt(e.target.value) || 0)} style={{ width: '100%', padding: '4px', fontSize: '0.85rem' }} />
                                                    </div>
                                                    <div style={{ flex: 2, textAlign: 'right' }}>
                                                        <label style={{ fontSize: '0.7rem', color: '#64748b' }}>Total:</label>
                                                        <div style={{ fontWeight: 'bold' }}>${(item.price * item.quantity).toLocaleString()}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-primary)', marginBottom: '1rem' }}>
                                        <span>TOTAL:</span>
                                        <span>${quotationItems.reduce((sum, i) => sum + (i.price * i.quantity), 0).toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                        <button onClick={() => handleSendQuotation('pdf')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0.8rem', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                                            <Download size={18} /> Descargar PDF
                                        </button>
                                        <button onClick={() => handleSendQuotation('whatsapp')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0.8rem', background: '#25D366', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                                            WhatsApp
                                        </button>
                                        <button onClick={() => handleSendQuotation('email')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0.8rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                                            Enviar Email
                                        </button>
                                        <button onClick={() => { if (window.confirm('¿Deseas descartar esta cotización?')) setIsQuotationModalOpen(false) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0.8rem', background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                                            <Trash2 size={18} /> Eliminar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de Edición de Lead */}
            {editingLead && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <form onSubmit={handleEditLead} style={{ background: '#fff', padding: '2rem', borderRadius: '12px', width: '500px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflowY: 'auto', maxHeight: '90vh' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                            <h3 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '1.2rem' }}>Editar Prospecto</h3>
                            <button type="button" onClick={() => setEditingLead(null)} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', borderRadius: '50%', padding: '6px', color: '#64748b' }}><X size={18} /></button>
                        </div>

                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#475569', fontWeight: 'bold' }}>Nombre</label>
                                <input required value={editingLead.name} onChange={e => setEditingLead({ ...editingLead, name: e.target.value })} style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#475569', fontWeight: 'bold' }}>Teléfono</label>
                                    <input value={editingLead.phone} onChange={e => setEditingLead({ ...editingLead, phone: e.target.value })} style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#475569', fontWeight: 'bold' }}>Email</label>
                                    <input value={editingLead.email} onChange={e => setEditingLead({ ...editingLead, email: e.target.value })} style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#475569', fontWeight: 'bold' }}>Ciudad</label>
                                    <input value={editingLead.city} onChange={e => setEditingLead({ ...editingLead, city: e.target.value })} style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#475569', fontWeight: 'bold' }}>Interés</label>
                                    <select value={editingLead.interest_type} onChange={e => setEditingLead({ ...editingLead, interest_type: e.target.value })} style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                        <option value="Personal">Personal</option>
                                        <option value="Corporativo">Corporativo</option>
                                        <option value="Mayorista">Mayorista</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#475569', fontWeight: 'bold' }}>Volumen (unid)</label>
                                    <input type="number" value={editingLead.estimated_volume} onChange={e => setEditingLead({ ...editingLead, estimated_volume: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#475569', fontWeight: 'bold' }}>Fecha Entrega</label>
                                    <input type="date" value={editingLead.urgency_date || ''} onChange={e => setEditingLead({ ...editingLead, urgency_date: e.target.value })} style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.8rem', marginTop: '2rem' }}>
                            <button
                                type="button"
                                onClick={(e) => {
                                    handleDeleteLead(e, editingLead.id);
                                    setEditingLead(null);
                                }}
                                style={{
                                    padding: '0.8rem',
                                    background: '#fee2e2',
                                    color: '#ef4444',
                                    border: '1px solid #fca5a5',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                                title="Eliminar prospecto definitivamente"
                            >
                                <Trash2 size={18} />
                            </button>
                            <button type="button" onClick={() => setEditingLead(null)} style={{ flex: 1, padding: '0.8rem', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                Cancelar
                            </button>
                            <button type="submit" style={{ flex: 1, padding: '0.8rem', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                Guardar Cambios
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default CRM;
