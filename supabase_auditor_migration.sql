-- ================================================================
-- MIGRACIÓN: Auditoría y Flujo Integral Zeticas OS
-- Fecha: 2026-03-19
-- Descripción: Centraliza persistencia de facturación, carteras y trazabilidad bancaria.
-- ================================================================

-- 1. Mejorar tabla de pedidos para Facturación Logística
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_bank_id UUID REFERENCES banks(id);

-- 2. Crear tabla de Transacciones Bancarias para Auditoría P&G
CREATE TABLE IF NOT EXISTS bank_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_id UUID REFERENCES banks(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('INCOME', 'EXPENSE')),
    description TEXT,
    related_id TEXT, -- ID de Orden o Compra relacionada
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', now())
);

-- 3. Índices para reportes rápidos de P&G
CREATE INDEX IF NOT EXISTS idx_transactions_bank ON bank_transactions(bank_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON bank_transactions(created_at);

-- 4. RLS para Transacciones
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON bank_transactions;
CREATE POLICY "Allow all for authenticated users" ON bank_transactions
    FOR ALL USING (true) WITH CHECK (true);
