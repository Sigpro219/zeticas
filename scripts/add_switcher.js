import fs from 'fs';

const filePath = 'src/components/Layout.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Regex that matches the Link block regardless of Exact indentation
const regex = /<Link to="\/gestion"[\s\S]*?Panel de Gestión<\/span>\s*<\/Link>/;

const replacement = `<Link to="/gestion" onClick={() => setShowUserMenu(false)} className="user-dropdown-link" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.7rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', color: '#025357', fontWeight: '700' }}>
                                            <LayoutDashboard size={16} color="#025357" /> <span>Panel de Gestión</span>
                                        </Link>

                                        <div style={{ padding: '0.4rem', background: '#f8f9fa', borderRadius: '10px', marginTop: '0.4rem', marginBottom: '0.4rem', border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: '800', padding: '2px 8px', textTransform: 'uppercase' }}>Cambiar Entorno</div>
                                            <button 
                                               onClick={() => { setTenantId('zeticas'); setShowUserMenu(false); localStorage.setItem('zeticas_current_tenant', 'zeticas'); }} 
                                               style={{ width: '100%', textAlign: 'left', background: tenantId === 'zeticas' ? '#fff' : 'transparent', border: 'none', padding: '6px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: tenantId === 'zeticas' ? '800' : '500', color: tenantId === 'zeticas' ? '#025357' : '#64748b', transition: 'all 0.2s', cursor: 'pointer', boxShadow: tenantId === 'zeticas' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none' }}>
                                                Zeticas (Principal)
                                            </button>
                                            <button 
                                               onClick={() => { setTenantId('deltacore'); setShowUserMenu(false); localStorage.setItem('zeticas_current_tenant', 'deltacore'); }} 
                                               style={{ width: '100%', textAlign: 'left', background: tenantId === 'deltacore' ? '#fff' : 'transparent', border: 'none', padding: '6px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: tenantId === 'deltacore' ? '800' : '500', color: tenantId === 'deltacore' ? '#025357' : '#64748b', transition: 'all 0.2s', cursor: 'pointer', boxShadow: tenantId === 'deltacore' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none' }}>
                                                Delta CoreTech
                                            </button>
                                        </div>`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(filePath, content);
    console.log('✅ Layout.jsx updated with Tenant Switcher (Regex).');
} else {
    console.error('❌ Target regex not found in Layout.jsx');
}
