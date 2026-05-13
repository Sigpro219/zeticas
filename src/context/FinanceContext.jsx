import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onSnapshot, query, orderBy, updateDoc, deleteDoc, addDoc, getDoc, getDocs, where, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from './TenantContext';

const FinanceContext = createContext({});

export const FinanceProvider = ({ children }) => {
    const { tCol, tDoc, updateSyncTime, addAdminLog } = useTenant();
    
    const [banks, setBanks] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [bankTransactions, setBankTransactions] = useState([]);

    const updateBankBalance = useCallback(async (bankId, amount, type = 'income', description = '', category = '') => {
        try {
            const bankRef = tDoc('banks', bankId);
            await runTransaction(db, async (transaction) => {
                const bankDoc = await transaction.get(bankRef);
                if (!bankDoc.exists()) throw new Error("Banco no encontrado");

                const currentBalance = Number(bankDoc.data().balance || 0);
                const numAmount = Number(amount) || 0;
                const newBalance = type === 'income' ? currentBalance + numAmount : currentBalance - numAmount;

                if (isNaN(newBalance)) throw new Error("Cálculo de balance inválido (NaN)");

                transaction.update(bankRef, { balance: newBalance });

                const movementData = {
                    bank_id: bankId,
                    bank_name: bankDoc.data().name || 'Banco',
                    type,
                    amount: numAmount,
                    description,
                    category,
                    previous_balance: currentBalance,
                    new_balance: newBalance,
                    created_at: new Date().toISOString()
                };
                const newMoveRef = tDoc('bank_movements', `move_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
                transaction.set(newMoveRef, movementData);
            });
            return { success: true };
        } catch (err) {
            console.error("Error updating bank balance:", err);
            return { success: false, error: err.message };
        }
    }, [tDoc]);

    const receivePayment = useCallback(async (bankId, amount, description, category, commission = 0) => {
        try {
            const netAmount = Number(amount) - Number(commission);
            
            // 1. Register Net Income in Bank
            await updateBankBalance(bankId, netAmount, 'income', description, category);

            // 2. If there's a commission, register it as an expense for traceability (optional but good for P&G)
            if (commission > 0) {
                await addDoc(tCol('expenses'), {
                    date: new Date().toLocaleDateString('en-CA'),
                    category: 'Comisiones Bancarias',
                    description: `Comisión: ${description}`,
                    amount: Number(commission),
                    payment_method: 'Descuento Automático',
                    bank_id: bankId,
                    status: 'Pagado',
                    created_at: new Date().toISOString()
                });
            }
            return { success: true };
        } catch (err) {
            console.error("Error receiving payment:", err);
            return { success: false, error: err.message };
        }
    }, [tCol, updateBankBalance]);

    const transferFunds = useCallback(async (fromBankId, toBankId, amount, description) => {
        try {
            const fromBank = banks.find(b => b.id === fromBankId);
            const toBank = banks.find(b => b.id === toBankId);

            if (!fromBank || !toBank) throw new Error("Cuentas de origen o destino no encontradas");

            // 1. Deduct from Origin
            const resOut = await updateBankBalance(fromBankId, amount, 'expense', `Traslado a ${toBank.name}: ${description}`, 'Traslado entre Bancos');
            if (!resOut.success) throw new Error(resOut.error);

            // 2. Add to Destination
            const resIn = await updateBankBalance(toBankId, amount, 'income', `Traslado desde ${fromBank.name}: ${description}`, 'Traslado entre Bancos');
            if (!resIn.success) throw new Error(resIn.error);

            return { success: true };
        } catch (err) {
            console.error("Error transferring funds:", err);
            return { success: false, error: err.message };
        }
    }, [banks, updateBankBalance]);

    const addExpense = useCallback(async (data) => {
        try {
            const expenseData = {
                ...data,
                date: data.date || data.expense_date || new Date().toLocaleDateString('en-CA'),
                created_at: new Date().toISOString()
            };
            const docRef = await addDoc(tCol('expenses'), expenseData);

            if (expenseData.bank_id || expenseData.bankId) {
                await updateBankBalance(
                    expenseData.bank_id || expenseData.bankId,
                    Number(expenseData.amount),
                    'expense',
                    `Gasto: ${expenseData.description || expenseData.category}`,
                    expenseData.category
                );

                if (expenseData.category === 'Traslado entre Bancos' && expenseData.target_bank_id) {
                    await updateBankBalance(
                        expenseData.target_bank_id,
                        Number(expenseData.amount),
                        'income',
                        `Entrada por Traslado: ${expenseData.description}`,
                        'Traslado entre Bancos'
                    );
                }
            }
            return { success: true, id: docRef.id };
        } catch (err) { 
            console.error("Error adding expense:", err);
            return { success: false, error: err.message }; 
        }
    }, [tCol, updateBankBalance]);

    const updateExpense = useCallback(async (id, data) => {
        try {
            await updateDoc(tDoc('expenses', id), { 
                ...data, 
                date: data.date || data.expense_date,
                updated_at: new Date().toISOString() 
            });
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, [tDoc]);

    const deleteExpense = useCallback(async (id, user = null) => {
        try {
            const expenseRef = tDoc('expenses', id);
            const snap = await getDoc(expenseRef);
            if (!snap.exists()) throw new Error("Gasto no encontrado");
            const data = snap.data();

            if (data.bank_id || data.bankId) {
                await updateBankBalance(
                    data.bank_id || data.bankId,
                    Number(data.amount),
                    'income',
                    `Reversa Eliminación Gasto: ${data.description || data.category}`,
                    'Ajuste por Eliminación'
                );
            }

            await addAdminLog('DELETE_EXPENSE', {
                amount: data.amount,
                category: data.category,
                description: data.description,
                date: data.date
            }, user);

            await deleteDoc(expenseRef);
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, [tDoc, updateBankBalance, addAdminLog]);

    const addBank = useCallback(async (data) => {
        try {
            const docRef = await addDoc(tCol('banks'), { ...data, created_at: new Date().toISOString() });
            return { success: true, id: docRef.id };
        } catch (err) { return { success: false, error: err.message }; }
    }, [tCol]);

    const updateBank = useCallback(async (id, data) => {
        try {
            await updateDoc(tDoc('banks', id), { ...data, updated_at: new Date().toISOString() });
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, [tDoc]);

    const deleteBank = useCallback(async (id) => {
        try {
            await deleteDoc(tDoc('banks', id));
            return { success: true };
        } catch (err) { return { success: false, error: err.message }; }
    }, [tDoc]);

    const payPurchase = useCallback(async (poId, bankId, amount, providerName) => {
        try {
            let docId = poId, finalAmount = amount, finalProvider = providerName;
            const directRef = tDoc('purchase_orders', poId);
            const directSnap = await getDoc(directRef).catch(() => null);

            if (!directSnap || !directSnap.exists()) {
                const q = query(tCol('purchase_orders'), where('id', '==', poId));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    docId = snap.docs[0].id;
                    const data = snap.docs[0].data();
                    if (!finalAmount) finalAmount = data.total_amount || data.total_cost || 0;
                    if (!finalProvider) finalProvider = data.provider_name || data.providerName || 'Proveedor';
                }
            } else {
                const data = directSnap.data();
                if (!finalAmount) finalAmount = data.total_amount || data.total_cost || 0;
                if (!finalProvider) finalProvider = data.provider_name || data.providerName || 'Proveedor';
            }

            await updateDoc(tDoc('purchase_orders', docId), {
                payment_status: 'Pagado',
                paymentStatus: 'Pagado', // Legacy support to avoid read conflicts
                bank_id: bankId,
                updated_at: new Date().toISOString()
            });

            await addDoc(tCol('expenses'), {
                date: new Date().toLocaleDateString('en-CA'),
                category: 'Materia Prima / Compras',
                description: `Pago OC ${poId} - ${finalProvider}`,
                amount: Number(finalAmount),
                payment_method: 'Transferencia',
                bank_id: bankId,
                status: 'Pagado',
                related_purchase_id: docId,
                related_oc: poId,
                created_at: new Date().toISOString()
            });

            await updateBankBalance(bankId, Number(finalAmount), 'expense', `Pago OC ${poId} - ${finalProvider}`, 'Materia Prima / Compras');
            return { success: true };
        } catch (err) {
            console.error("Error in payPurchase:", err);
            return { success: false, error: err.message };
        }
    }, [tCol, tDoc, updateBankBalance]);

    // Subscriptions
    useEffect(() => {
        const unsubBanks = onSnapshot(tCol('banks'), (snapshot) => {
            setBanks(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
            updateSyncTime();
        });
        const unsubExpenses = onSnapshot(query(tCol('expenses'), orderBy('date', 'desc')), (snapshot) => {
            setExpenses(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
            updateSyncTime();
        });
        const unsubMovements = onSnapshot(query(tCol('bank_movements'), orderBy('created_at', 'desc')), (snapshot) => {
            setBankTransactions(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
            updateSyncTime();
        });
        return () => { unsubBanks(); unsubExpenses(); unsubMovements(); };
    }, [tCol, updateSyncTime]);

    const value = { 
        banks, 
        expenses, 
        bankTransactions,
        addExpense, 
        updateExpense, 
        deleteExpense, 
        addBank, 
        updateBank, 
        deleteBank, 
        updateBankBalance, 
        receivePayment,
        transferFunds,
        payPurchase 
    };

    return (
        <FinanceContext.Provider value={value}>
            {children}
        </FinanceContext.Provider>
    );
};

export const useFinance = () => useContext(FinanceContext);
