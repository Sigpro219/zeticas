import React, { createContext, useContext, useMemo } from 'react';
import { useTenant } from './TenantContext';
import { useInventory } from './InventoryContext';
import { useSales } from './SalesContext';
import { useProcurement } from './ProcurementContext';
import { useFinance } from './FinanceContext';
import { useAnalytics } from './AnalyticsContext';
import { useProduction } from './ProductionContext';
import { useUsers } from './UsersContext';

export const CAMPAIGN_PRESETS = {
    'madre': {
        id: 'madre',
        name: 'Día de la Madre',
        primaryColor: '#FDF8F6',
        accentColor: '#D4785A',
        title: 'Para quien nos dio el gusto por lo auténtico',
        subtitle: 'Descubre nuestra selección artesanal diseñada para celebrar a mamá.',
    },
    'mujer': {
        id: 'mujer',
        name: 'Día de la Mujer',
        primaryColor: '#F8F4FF',
        accentColor: '#7C3AED',
        title: 'Artesanía con Fuerza y Propósito',
        subtitle: 'Honramos el talento y la dedicación de las mujeres en cada frasco.',
    },
    'amor': {
        id: 'amor',
        name: 'Amor y Amistad',
        primaryColor: '#FFF5F5',
        accentColor: '#E11D48',
        title: 'Dulces Momentos para Compartir',
        subtitle: 'Celebra la conexión con detalles que nacen del corazón.',
    },
    'navidad': {
        id: 'navidad',
        name: 'Navidad Zeticas',
        primaryColor: '#F0F9F1',
        accentColor: '#15803D',
        title: 'La Magia de Compartir en Familia',
        subtitle: 'Sabores tradicionales para una Navidad llena de luz y esperanza.',
    },
    'otono': {
        id: 'otono',
        name: 'Temporada de Cosecha',
        primaryColor: '#FFF7ED',
        accentColor: '#C2410C',
        title: 'El Aroma de la Tierra en tu Mesa',
        subtitle: 'Sabores otoñales y especiados para noches acogedoras.',
    }
};

const BusinessContext = createContext({});

/**
 * BusinessProvider (The Legacy Hub)
 * This component now acts as a composition layer that aggregates all modular contexts
 * to ensure backward compatibility with the existing ~31 pages that use useBusiness().
 */
export const BusinessProvider = ({ children }) => {
    const tenantValues = useTenant();
    const inventoryValues = useInventory();
    const salesValues = useSales();
    const procurementValues = useProcurement();
    const financeValues = useFinance();
    const analyticsValues = useAnalytics();
    const productionValues = useProduction();
    const usersValues = useUsers();

    // Derived settings specific to the Business Hub
    const taxSettings = useMemo(() => {
        return tenantValues.siteContent?.tax_settings || { iva: 19, retefuente: 2.5, ica: 9.6, renta: 35 };
    }, [tenantValues.siteContent]);

    // Combine all values into a single object
    const value = useMemo(() => ({
        ...tenantValues,
        ...inventoryValues,
        ...salesValues,
        ...procurementValues,
        ...financeValues,
        ...analyticsValues,
        ...productionValues,
        ...usersValues,
        taxSettings
    }), [
        tenantValues,
        inventoryValues,
        salesValues,
        procurementValues,
        financeValues,
        analyticsValues,
        productionValues,
        usersValues,
        taxSettings
    ]);

    return (
        <BusinessContext.Provider value={value}>
            {children}
        </BusinessContext.Provider>
    );
};

export const useBusiness = () => useContext(BusinessContext);
