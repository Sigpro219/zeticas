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
  const { logVisit } = useBusiness();

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
        <Route path="/tienda" element={<Shop />} />
        <Route path="/producto/:id" element={<ProductDetail />} />
        <Route path="/catering" element={<Catering />} />
        <Route path="/nosotros" element={<Nosotros />} />
        <Route path="/consultoria" element={<HomeCZ />} />
        <Route path="/login" element={<Login />} />
        <Route path="/carrito" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/gestion" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><Gestion /></ProtectedRoute>} />
        <Route path="/gestion/:tab" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><Gestion /></ProtectedRoute>} />
        <Route path="/recurrentes" element={<RecurringCustomers />} />
      </Routes>
      <Chatbot />
    </Layout>
  );
}
