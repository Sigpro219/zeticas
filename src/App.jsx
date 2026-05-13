import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import { BusinessProvider } from './context/BusinessContext'
import ScrollToTop from './components/ScrollToTop'
import ErrorBoundary from './components/ErrorBoundary'
import { TenantProvider } from './context/TenantContext'
import { InventoryProvider } from './context/InventoryContext'
import { SalesProvider } from './context/SalesContext'
import { ProcurementProvider } from './context/ProcurementContext'
import { FinanceProvider } from './context/FinanceContext'
import { AnalyticsProvider } from './context/AnalyticsContext'
import { ProductionProvider } from './context/ProductionContext'
import { UsersProvider } from './context/UsersContext'
import AppContent from './AppContent'

function App() {
  return (
    <Router>
      <ScrollToTop />
      <ErrorBoundary>
        <TenantProvider>
          <InventoryProvider>
            <SalesProvider>
              <ProcurementProvider>
                <ProductionProvider>
                  <FinanceProvider>
                    <AnalyticsProvider>
                      <UsersProvider>
                        <BusinessProvider>
                          <CartProvider>
                            <AuthProvider>
                              <AppContent />
                            </AuthProvider>
                          </CartProvider>
                        </BusinessProvider>
                      </UsersProvider>
                    </AnalyticsProvider>
                  </FinanceProvider>
                </ProductionProvider>
              </ProcurementProvider>
            </SalesProvider>
          </InventoryProvider>
        </TenantProvider>
      </ErrorBoundary>
    </Router>
  )
}

export default App
