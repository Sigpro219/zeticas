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
    <div className="botanical-bg" style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1.5rem', textAlign: 'center' }}>
      <div className="glass-panel" style={{ 
        maxWidth: '480px', 
        width: '100%', 
        padding: 'clamp(2rem, 8vw, 3.5rem) clamp(1.5rem, 5vw, 2.5rem)', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: '1.75rem', 
        border: '1px solid rgba(2, 83, 87, 0.08)',
        boxShadow: '0 20px 40px -15px rgba(2, 83, 87, 0.08), 0 0 50px -10px rgba(243, 124, 121, 0.05)',
        position: 'relative',
        zIndex: 2
      }}>
        <div style={{ 
          width: '72px', 
          height: '72px', 
          borderRadius: '50%', 
          backgroundColor: 'rgba(175, 191, 113, 0.12)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          fontSize: '2.25rem', 
          border: '1px solid rgba(175, 191, 113, 0.2)',
          boxShadow: '0 4px 10px rgba(175, 191, 113, 0.05)'
        }}>
          🌿
        </div>
        
        <h1 style={{ 
          fontFamily: 'var(--font-serif)', 
          fontSize: 'clamp(1.8rem, 5vw, 2.25rem)', 
          color: 'var(--color-primary)', 
          fontWeight: 'bold', 
          margin: '0', 
          lineHeight: '1.25',
          letterSpacing: '-0.01em'
        }}>
          Pausa Artesanal
        </h1>
        
        <div style={{ width: '40px', height: '2.5px', backgroundColor: 'var(--color-secondary)', borderRadius: '2px' }}></div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
          <p style={{ 
            fontFamily: 'var(--font-sans)', 
            fontSize: 'clamp(0.9rem, 2.5vw, 0.98rem)', 
            color: 'var(--color-text)', 
            lineHeight: '1.6', 
            margin: '0',
            fontWeight: '400'
          }}>
            Estamos actualizando nuestros inventarios y cosechas para ofrecerte la mejor calidad de la Sabana de Bogotá.
          </p>
          
          <p style={{ 
            fontFamily: 'var(--font-sans)', 
            fontSize: '0.825rem', 
            color: 'var(--color-text-light)', 
            fontStyle: 'italic', 
            margin: '0',
            lineHeight: '1.5'
          }}>
            Volveremos muy pronto con productos frescos.
          </p>
        </div>
        
        <a 
          href="https://wa.me/573144336525?text=Hola%20Zeticas!%20Quiero%20hacer%20un%20pedido%20asistido%20ya%20que%20la%20tienda%20está%20en%20mantenimiento"
          target="_blank"
          rel="noopener noreferrer"
          className="premium-btn primary"
          style={{ 
            width: '100%', 
            height: '48px',
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '0.6rem', 
            padding: '0 1.5rem', 
            fontSize: '0.85rem', 
            borderRadius: '50px', 
            textDecoration: 'none', 
            marginTop: '0.75rem',
            boxSizing: 'border-box',
            fontWeight: '600'
          }}
        >
          💬 Compra Asistida por WhatsApp
        </a>
      </div>
    </div>
  );
}
