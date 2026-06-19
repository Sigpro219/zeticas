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
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-12 text-center bg-[#FDF8F6]">
      <div className="max-w-md w-full glass-panel p-8 md:p-12 rounded-3xl flex flex-col items-center justify-center gap-6 shadow-2xl border border-white/40 backdrop-blur-md bg-white/60">
        <div className="text-6xl animate-pulse">🌿</div>
        <h1 className="font-serif text-3xl md:text-4xl text-[#025357] font-bold leading-tight">
          Pausa Artesanal
        </h1>
        <div className="w-12 h-0.5 bg-[#D6BD98]"></div>
        <p className="font-sans text-sm md:text-base text-slate-600 leading-relaxed">
          Estamos actualizando nuestros inventarios y cosechas para ofrecerte la mejor calidad de la Sabana de Bogotá.
        </p>
        <p className="font-sans text-xs text-slate-500 italic">
          Volveremos muy pronto con productos frescos.
        </p>
        <a 
          href="https://wa.me/573144336525?text=Hola%20Zeticas!%20Quiero%20hacer%20un%20pedido%20asistido%20ya%20que%20la%20tienda%20está%20en%20mantenimiento"
          target="_blank"
          rel="noopener noreferrer"
          className="premium-btn primary w-full flex items-center justify-center gap-2 mt-4 py-3 rounded-xl font-sans text-sm font-semibold tracking-wide shadow-md hover:shadow-lg transition-all duration-300"
        >
          💬 Compra Asistida por WhatsApp
        </a>
      </div>
    </div>
  );
}
