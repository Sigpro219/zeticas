/**
 * Tenant detection utility to be used across the application.
 */
export const detectTenantId = () => {
    // 1. Detect from URL parameter (?tenant=delta) - Highest priority for testing
    const params = new URLSearchParams(window.location.search);
    const urlTenant = params.get('tenant');
    if (urlTenant) {
        localStorage.setItem('zeticas_current_tenant', urlTenant);
        return urlTenant;
    }

    // 2. Detect from Hostname (Production mapping)
    const host = window.location.hostname;
    if (host.includes('deltacore') || host.includes('deltacoretech') || host.includes('delta-coretech')) {
        return 'delta';
    }
    
    if (host.includes('zeticas')) {
        return 'zeticas';
    }

    // 3. Fallback to localStorage or default
    return localStorage.getItem('zeticas_current_tenant') || 'zeticas';
};
