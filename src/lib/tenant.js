/**
 * Tenant detection utility to be used across the application.
 */
export const detectTenantId = () => {
    const normalize = (id) => (id || '').replace(/-/g, '').toLowerCase();

    // 1. Detect from URL parameter (?tenant=delta) - Highest priority for testing
    const params = new URLSearchParams(window.location.search);
    const urlTenant = params.get('tenant');
    if (urlTenant) {
        const normalized = normalize(urlTenant);
        localStorage.setItem('zeticas_current_tenant', normalized);
        return normalized;
    }

    // 2. Detect from Port (Testing override)
    const port = window.location.port;
    if (port === '5174') {
        return 'deltacore';
    }

    // 3. Detect from Hostname (Production mapping)
    const host = window.location.hostname;
    if (host.includes('deltacore') || host.includes('deltacoretech') || host.includes('delta-coretech')) {
        return 'deltacore';
    }
    
    if (host.includes('zeticas') || host.includes('web.app') || host.includes('firebaseapp.com')) {
        return 'zeticas';
    }

    // 4. Fallback to localStorage or default
    return normalize(localStorage.getItem('zeticas_current_tenant') || 'zeticas');
};
