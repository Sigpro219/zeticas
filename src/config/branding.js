export const BRANDING = {
    zeticas: {
        name: 'Zeticas',
        logo: '/logo.png',
        logoFilter: 'brightness(0) invert(1)', // Standard Zeticas logo is dark, needs invert for dark navbar
        accentColor: '#025357'
    },
    deltacore: {
        name: 'Delta CoreTech',
        logo: '/assets/logos/logo-dct.png',
        logoFilter: 'none',
        accentColor: '#025357'
    },
    consultoria: {
        name: 'CZ Consultoría',
        logo: '/assets/logos/logo-cz.png',
        logoFilter: 'none',
        accentColor: '#D6BD98'
    }
};

export const getTenantBranding = (tenantId, isConsulting = false) => {
    if (isConsulting) return BRANDING.consultoria;
    return BRANDING[tenantId] || BRANDING.zeticas;
};

// Global fallback to prevent ReferenceErrors
export const logo = BRANDING.zeticas.logo;
