import React from 'react';
import { Phone, Mail, ShoppingCart, FileText, CheckCircle2, ChevronDown, Briefcase, X, Save } from 'lucide-react';

const DocumentBuilder = ({ 
    type = 'ORDEN DE COMPRA',
    docId,
    date,
    provider,
    client = {
        name: 'Bodega Zeticas',
        detail1: 'Zeticas SAS',
        detail2: 'NIT: 901.321.456-7',
        address: 'Calle 123 #45-67, Zona Industrial'
    },
    shippingInfo = {
        title: 'Enviar a',
        location: 'Bodega Zeticas',
        address: 'Calle 123 #45-67, Zona Industrial'
    },
    items = [],
    totals = {
        subtotal: 0,
        taxLabel: 'IVA (19%)',
        taxValue: 0,
        total: 0
    },
    actions = [],
    primaryColor = '#023636'
}) => {
    return (
        <div style={{ 
            background: '#fff', 
            border: '1px solid #e2e8f0', 
            borderRadius: '16px', 
            padding: '2.5rem', 
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)',
            position: 'relative',
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Header / Branding */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                borderBottom: `2px solid ${primaryColor}`, 
                paddingBottom: '1.5rem', 
                marginBottom: '1.5rem' 
            }}>
                <div>
                    <h1 style={{ margin: 0, fontFamily: 'serif', color: primaryColor, fontSize: '2.5rem', fontWeight: 'bold' }}>zeticas</h1>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
                        <strong>{client.detail1}</strong><br />
                        {client.detail2}<br />
                        {client.address}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-0.5px' }}>{type}</h2>
                    <div style={{ fontSize: '1.2rem', color: primaryColor, fontWeight: 'bold', marginTop: '0.5rem' }}>{docId}</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>Fecha: {date}</div>
                </div>
            </div>

            {/* Info Section: Provider & Shipping */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Proveedor / Cliente</div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#1e293b' }}>{provider.name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.3rem' }}>NIT: {provider.nit || 'Sin registro'}</div>
                    {provider.phone && (
                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Phone size={14} /> {provider.phone}
                        </div>
                    )}
                    {provider.email && (
                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Mail size={14} /> {provider.email}
                        </div>
                    )}
                </div>
                {shippingInfo && (
                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{shippingInfo.title}</div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#1e293b' }}>{shippingInfo.location}</div>
                        <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.2rem' }}>{shippingInfo.address}</div>
                    </div>
                )}
            </div>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
                <thead>
                    <tr style={{ background: primaryColor, color: '#fff', fontSize: '0.8rem' }}>
                        <th style={{ padding: '0.8rem', textAlign: 'left', fontWeight: '600', borderRadius: '6px 0 0 6px' }}>DESCRIPCIÓN</th>
                        <th style={{ padding: '0.8rem', textAlign: 'center', fontWeight: '600' }}>CANTIDAD</th>
                        <th style={{ padding: '0.8rem', textAlign: 'right', fontWeight: '600' }}>V. UNITARIO</th>
                        <th style={{ padding: '0.8rem', textAlign: 'right', fontWeight: '600', borderRadius: '0 6px 6px 0' }}>V. TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}>
                            <td style={{ padding: '1rem 0.8rem', color: '#334155', fontWeight: '500' }}>{item.name}</td>
                            <td style={{ padding: '1rem 0.8rem', textAlign: 'center', color: '#475569' }}>{item.quantity} {item.unit || ''}</td>
                            <td style={{ padding: '1rem 0.8rem', textAlign: 'right', color: '#475569' }}>${(item.unitCost || 0).toLocaleString('es-CO')}</td>
                            <td style={{ padding: '1rem 0.8rem', textAlign: 'right', fontWeight: '600', color: '#0f172a' }}>${((item.totalCost) || (item.quantity * item.unitCost) || 0).toLocaleString('es-CO')}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan="2"></td>
                        <td style={{ padding: '1rem 0.8rem', textAlign: 'right', fontSize: '0.85rem', color: '#64748b' }}>Subtotal:</td>
                        <td style={{ padding: '1rem 0.8rem', textAlign: 'right', fontWeight: '600', color: '#334155' }}>${(totals.subtotal || 0).toLocaleString('es-CO')}</td>
                    </tr>
                    <tr>
                        <td colSpan="2"></td>
                        <td style={{ padding: '0.5rem 0.8rem', textAlign: 'right', fontSize: '0.85rem', color: '#64748b' }}>{totals.taxLabel}:</td>
                        <td style={{ padding: '0.5rem 0.8rem', textAlign: 'right', fontWeight: '600', color: '#334155' }}>${(totals.taxValue || 0).toLocaleString('es-CO')}</td>
                    </tr>
                    <tr>
                        <td colSpan="2"></td>
                        <td style={{ padding: '1rem 0.8rem', textAlign: 'right', fontSize: '1.1rem', fontWeight: '900', color: primaryColor }}>TOTAL:</td>
                        <td style={{ padding: '1rem 0.8rem', textAlign: 'right', fontSize: '1.3rem', fontWeight: '900', color: primaryColor, background: '#f0fdf4', borderRadius: '4px' }}>${(totals.total || 0).toLocaleString('es-CO')}</td>
                    </tr>
                </tfoot>
            </table>

            {/* Optional Actions inside document */}
            {actions.length > 0 && (
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    gap: '1.5rem', 
                    marginTop: '1rem', 
                    paddingTop: '1.5rem', 
                    borderTop: '1px solid #e2e8f0',
                    flexWrap: 'wrap'
                }}>
                    {actions.map((action, idx) => (
                        <button 
                            key={idx}
                            onClick={action.onClick}
                            style={{ 
                                padding: '0.8rem 1.5rem', 
                                background: action.background || '#1e293b', 
                                color: '#fff', 
                                border: 'none', 
                                borderRadius: '8px', 
                                cursor: 'pointer', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.5rem', 
                                fontWeight: 'bold',
                                transition: 'opacity 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                        >
                            {action.icon}
                            {action.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DocumentBuilder;
