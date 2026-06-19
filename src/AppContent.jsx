import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import SEOManager from './components/SEOManager';
import Chatbot from './components/Chatbot';
import Hero from './components/Hero';
import PhilosophySection from './components/PhilosophySection';
import CateringBanner from './components/CateringBanner';
import ConsultingSection from './components/ConsultingSection';
import AlliesSection from './components/AlliesSection';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Catering from './pages/Catering';
import Nosotros from './pages/Nosotros';
import HomeCZ from './pages/HomeCZ';
import Login from './pages/Login';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Gestion from './pages/Gestion';
import RecurringCustomers from './pages/RecurringCustomers';
import ProtectedRoute from './components/ProtectedRoute'; // Triggering rebuild
import { useBusiness } from './context/BusinessContext';

export default function AppContent() {
  const { logVisit, siteContent } = useBusiness();

  const isMaintenance = siteContent?.public_site?.config?.is_maintenance === true;

  React.useEffect(() => {
    if (logVisit) logVisit();
  }, [logVisit]);

  return (
    <Layout>
      <SEOManager />
      <Routes>
        <Route path="/" element={
          <>
            <Hero />
            <PhilosophySection />
            <CateringBanner />
            <ConsultingSection />
            <AlliesSection />
          </>
        } />
        <Route path="/tienda" element={isMaintenance ? <MaintenancePage /> : <Shop />} />
        <Route path="/producto/:id" element={isMaintenance ? <MaintenancePage /> : <ProductDetail />} />
        <Route path="/catering" element={<Catering />} />
        <Route path="/nosotros" element={<Nosotros />} />
        <Route path="/consultoria" element={<HomeCZ />} />
        <Route path="/login" element={<Login />} />
        <Route path="/carrito" element={isMaintenance ? <MaintenancePage /> : <Cart />} />
        <Route path="/checkout" element={isMaintenance ? <MaintenancePage /> : <Checkout />} />
        <Route path="/gestion" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><Gestion /></ProtectedRoute>} />
        <Route path="/gestion/:tab" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><Gestion /></ProtectedRoute>} />
        <Route path="/recurrentes" element={isMaintenance ? <MaintenancePage /> : <RecurringCustomers />} />
      </Routes>
      <Chatbot />
    </Layout>
  );
}

function MaintenancePage() {
  return (
    <div style={{ minHeight: '65vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem', textAlign: 'center', backgroundColor: 'var(--color-bg)' }}>
      <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '3.5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', border: '1px solid rgba(2, 83, 87, 0.1)' }}>
        <div style={{ fontSize: '3.5rem' }}>🌿</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.25rem', color: 'var(--color-primary)', fontWeight: 'bold', margin: '0' }}>
          Pausa Artesanal
        </h1>
        <div style={{ width: '50px', height: '2px', backgroundColor: 'var(--color-secondary)' }}></div>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.95rem', color: 'var(--color-text)', lineHeight: '1.6', margin: '0' }}>
          Estamos actualizando nuestros inventarios y cosechas para ofrecerte la mejor calidad de la Sabana de Bogotá.
        </p>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: 'var(--color-text-light)', fontStyle: 'italic', margin: '0' }}>
          Volveremos muy pronto con productos frescos.
        </p>
        <a 
          href="https://wa.me/573144336525?text=Hola%20Zeticas!%20Quiero%20hacer%20un%20pedido%20asistido%20ya%20que%20la%20tienda%20está%20en%20mantenimiento"
          target="_blank"
          rel="noopener noreferrer"
          className="premium-btn primary"
          style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontSize: '0.85rem', borderRadius: '12px', textDecoration: 'none', marginTop: '0.5rem' }}
        >
          💬 Compra Asistida por WhatsApp
        </a>
      </div>
    </div>
  );
}
