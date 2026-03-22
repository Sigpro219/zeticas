import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Hero from './components/Hero'
import ConsultingSection from './components/ConsultingSection'
import CateringBanner from './components/CateringBanner'
import PhilosophySection from './components/PhilosophySection'
import AlliesSection from './components/AlliesSection'
import Gestion from './pages/Gestion'
import Nosotros from './pages/Nosotros'
import Shop from './pages/Shop'
import ProductDetail from './pages/ProductDetail'
import Consulting from './pages/Consulting'
import Catering from './pages/Catering'
import Login from './pages/Login'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import RecurringCustomers from './pages/RecurringCustomers'
import HomeCZ from './pages/HomeCZ'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import { BusinessProvider } from './context/BusinessContext'
import Chatbot from './components/Chatbot'
import ScrollToTop from './components/ScrollToTop'
import './index.css'

function App() {
  return (
    <Router>
      <ScrollToTop />
      <BusinessProvider>
        <CartProvider>
          <AuthProvider>
            <Layout>
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
                <Route path="/gestion" element={<Gestion />} />
                <Route path="/gestion/:tab" element={<Gestion />} />
                <Route path="/recurrentes" element={<RecurringCustomers />} />
              </Routes>
              <Chatbot />
            </Layout>
          </AuthProvider>
        </CartProvider>
      </BusinessProvider>
    </Router>
  )
}

export default App
