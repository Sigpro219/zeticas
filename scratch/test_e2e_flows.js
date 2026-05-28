import { initializeApp } from "firebase/app";
import { 
  getFirestore, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, 
  collection, query, where, increment, runTransaction 
} from "firebase/firestore";
import dotenv from "dotenv";

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyAeHMdtEt04RtYarEx_h19gcCUzsIUUpSc",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "delta-core-cloud-45ea0.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "delta-core-cloud-45ea0",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "delta-core-cloud-45ea0.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "378250949856",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:378250949856:web:7a0ce44de64bc9a5becc85"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const tenantId = "zeticas";

// Test Document IDs for clean tracking
const TEST_CLIENT_ID = "CLI-TEST-AUDIT";
const TEST_PRODUCT_ID = "PT-TEST-AUDIT";
const TEST_MATERIAL_ID = "MP-TEST-AUDIT";
const TEST_RECIPE_ID = "REC-TEST-AUDIT";
const TEST_KIT_ID = "KIT-TEST-AUDIT";
const TEST_ORDER_NUMBER = "ORD-TEST-AUDIT";

// Track documents created/updated during the run for guaranteed cleanup
const createdDocRefs = [];
const bankBalanceReversals = {};

async function auditFlows() {
  console.log("==================================================");
  console.log("🚀 STARTING TRANSACTION AND FLOW AUDIT SCRIPT");
  console.log(`Project ID: ${firebaseConfig.projectId}`);
  console.log(`Tenant: ${tenantId}`);
  console.log("==================================================");

  try {
    // -------------------------------------------------------------------------
    // 0. FETCH INITIAL BANK DATA AND REQUISITE ACCOUNTS
    // -------------------------------------------------------------------------
    console.log("\n--- [STEP 0] Inspecting Bank Accounts ---");
    const banksSnap = await getDocs(collection(db, "tenants", tenantId, "banks"));
    let bbvaBank = null;
    let boldBank = null;
    let shippingBank = null;

    banksSnap.forEach(d => {
      const data = d.data();
      const name = (data.name || "").toLowerCase();
      console.log(`Bank Account: ${d.id} | Name: "${data.name}" | Balance: ${data.balance} | Type: ${data.type}`);
      
      if (name.includes("bbva") || name.includes("principal")) {
        bbvaBank = { id: d.id, ...data };
      }
      if (name.includes("bold") || name.includes("comision")) {
        boldBank = { id: d.id, ...data };
      }
      if (name.includes("interrapidisimo") || name.includes("envio")) {
        shippingBank = { id: d.id, ...data };
      }
    });

    if (!bbvaBank) throw new Error("Missing BBVA/Principal bank account");
    if (!boldBank) throw new Error("Missing Bold Commission bank account");
    
    // Proactively mock shipping bank if it doesn't exist
    if (!shippingBank) {
      console.log("⚠️ Interrapidisimo bank account not found, we will create a temporary one.");
      const shRef = doc(db, "tenants", tenantId, "banks", "0TCQHPBSyywlGSFv41gv");
      await setDoc(shRef, {
        name: "Interrapidisimo Costo de Envío",
        balance: 0,
        type: "Logística",
        status: "Active",
        created_at: new Date().toISOString()
      });
      shippingBank = { id: "0TCQHPBSyywlGSFv41gv", name: "Interrapidisimo Costo de Envío", balance: 0 };
      createdDocRefs.push(shRef);
    }

    console.log(`Selected BBVA Bank ID: ${bbvaBank.id}`);
    console.log(`Selected Bold Bank ID: ${boldBank.id}`);
    console.log(`Selected Shipping Bank ID: ${shippingBank.id}`);

    // Save initial bank balances
    const initialBBVABal = bbvaBank.balance || 0;
    const initialBoldBal = boldBank.balance || 0;
    const initialShippingBal = shippingBank.balance || 0;

    // -------------------------------------------------------------------------
    // 1. MATHEMATICAL FORMULAS VERIFICATION (CART, SHIPPING, WEIGHT & COMMISSION)
    // -------------------------------------------------------------------------
    console.log("\n--- [STEP 1] Auditing Mathematical Calculations & Shipping Thresholds ---");
    
    const shipSettings = {
      tarifa_local: 5400,
      tarifa_regional: 7200,
      tarifa_nacional: 13500,
      threshold_free: 120000,
      weight_per_sku: 0.400,
      origin_city: "Guasca"
    };

    // Test Cart Items: 3 units of PT-TEST-AUDIT (Price 35,000 COP)
    const cart = [
      { id: TEST_PRODUCT_ID, nombre: "Producto Prueba", quantity: 3, precio: 35000 }
    ];

    // formula A: Cart Total
    const cartTotal = cart.reduce((acc, item) => acc + (item.quantity * item.precio), 0);
    const expectedCartTotal = 3 * 35000;
    console.log(`Cart Total: Calculated=${cartTotal} COP | Expected=${expectedCartTotal} COP`);
    if (cartTotal !== expectedCartTotal) throw new Error("Mathematical discrepancy in Cart Total calculation!");

    // formula B: Order Weight
    const totalWeight = cart.reduce((acc, item) => acc + (item.quantity * shipSettings.weight_per_sku), 0);
    const roundedWeight = Math.ceil(totalWeight);
    const expectedWeight = 3 * 0.400; // 1.2 kg
    const expectedRoundedWeight = 2; // Math.ceil(1.2) = 2
    console.log(`Total Weight: ${totalWeight} kg (Expected ${expectedWeight} kg)`);
    console.log(`Rounded Weight: ${roundedWeight} kg (Expected ${expectedRoundedWeight} kg)`);
    if (roundedWeight !== expectedRoundedWeight) throw new Error("Discrepancy in rounded weight calculation!");

    // formula C: Free Shipping Thresholds & Rates
    // Case 1: Below threshold, regional delivery (e.g. state Boyacá)
    const shippingCostBoyaca = roundedWeight * shipSettings.tarifa_regional;
    const expectedCostBoyaca = 2 * 7200; // 14400 COP
    console.log(`Shipping cost to Boyacá: ${shippingCostBoyaca} COP (Expected ${expectedCostBoyaca} COP)`);
    if (shippingCostBoyaca !== expectedCostBoyaca) throw new Error("Boyacá shipping rate formula calculation failed!");

    // Case 2: Above threshold (Cart Total >= 120000)
    const cartAboveThreshold = [
      { id: TEST_PRODUCT_ID, nombre: "Producto Prueba", quantity: 4, precio: 35000 } // 140,000 COP
    ];
    const cartTotalAbove = cartAboveThreshold.reduce((acc, item) => acc + (item.quantity * item.precio), 0);
    const shippingCostAbove = cartTotalAbove >= shipSettings.threshold_free ? 0 : (roundedWeight * shipSettings.tarifa_regional);
    console.log(`Shipping cost above threshold: ${shippingCostAbove} COP (Expected 0 COP)`);
    if (shippingCostAbove !== 0) throw new Error("Free shipping threshold logic failed!");

    // formula D: Bold Commission Calculation
    const BOLD_COMMISSION_PERCENT = 0.0299;
    const BOLD_COMMISSION_FIXED = 900;
    const IVA_SURCHARGE = 1.19;
    
    // total paid = cart total (105,000) + shipping (14,400) = 119,400 COP
    const totalPaid = cartTotal + shippingCostBoyaca; 
    const expectedTotalPaid = 119400;
    if (totalPaid !== expectedTotalPaid) throw new Error("Total Paid does not match expected cart total + shipping cost!");

    const commissionFee = Math.round((totalPaid * BOLD_COMMISSION_PERCENT + BOLD_COMMISSION_FIXED) * IVA_SURCHARGE);
    // (119400 * 0.0299 + 900) * 1.19 = (3570.06 + 900) * 1.19 = 4470.06 * 1.19 = 5319.3714 -> Math.round = 5319
    const expectedCommission = 5319;
    console.log(`Bold Commission Fee: Calculated=${commissionFee} COP | Expected=${expectedCommission} COP`);
    if (commissionFee !== expectedCommission) throw new Error("Bold commission fee formula calculation discrepancy!");

    console.log("✅ Math calculations and thresholds verified successfully.");

    // -------------------------------------------------------------------------
    // 2. CREATING A TEST CLIENT
    // -------------------------------------------------------------------------
    console.log("\n--- [STEP 2] Creating a Test Client ---");
    const clientRef = doc(db, "tenants", tenantId, "clients", TEST_CLIENT_ID);
    const clientPayload = {
      id: TEST_CLIENT_ID,
      client_number: TEST_CLIENT_ID,
      name: "Cliente Pruebas Auditoria",
      email: "test_auditoria@zeticas.com",
      phone: "3001234567",
      nit: "999999-9",
      source: "Web",
      status: "Active",
      created_at: new Date().toISOString()
    };
    await setDoc(clientRef, clientPayload);
    createdDocRefs.push(clientRef);
    console.log(`Created test client: ${TEST_CLIENT_ID}`);

    // Verify client exists
    const clientSnap = await getDoc(clientRef);
    if (!clientSnap.exists()) throw new Error("Client document creation failed!");
    console.log("Client verified in Firestore.");

    // -------------------------------------------------------------------------
    // 3. TRANSACTION / BANK BALANCES & EXPENSES AUDIT (FLOWS A & B)
    // -------------------------------------------------------------------------
    console.log("\n--- [STEP 3] Auditing Bank Balances & Commissions (Flow A: Checkout Page) ---");
    // Web Checkout Split Distribution:
    // Bold Commission Bank gets: commissionFee (5319)
    // Shipping Bank gets: shippingCost (14400)
    // Principal BBVA Bank gets: totalPaid - shippingCost - commissionFee = 119400 - 14400 - 5319 = 99681 COP
    const boldIncome = commissionFee;
    const shippingIncome = shippingCostBoyaca;
    const bbvaNetIncome = totalPaid - shippingIncome - boldIncome;

    console.log(`Flow A Expected bank updates: BBVA=+${bbvaNetIncome}, Bold=+${boldIncome}, Shipping=+${shippingIncome}`);

    // Update balances in Firestore
    await updateBankBalance(bbvaBank.id, bbvaNetIncome, "income");
    await updateBankBalance(boldBank.id, boldIncome, "income");
    await updateBankBalance(shippingBank.id, shippingIncome, "income");

    // Fetch updated balances
    const updatedBBVABank = await getDoc(doc(db, "tenants", tenantId, "banks", bbvaBank.id));
    const updatedBoldBank = await getDoc(doc(db, "tenants", tenantId, "banks", boldBank.id));
    const updatedShippingBank = await getDoc(doc(db, "tenants", tenantId, "banks", shippingBank.id));

    const finalBBVABal = updatedBBVABank.data().balance;
    const finalBoldBal = updatedBoldBank.data().balance;
    const finalShippingBal = updatedShippingBank.data().balance;

    console.log(`BBVA Bank: Initial=${initialBBVABal} | Final=${finalBBVABal} | Diff=${finalBBVABal - initialBBVABal} (Expected +${bbvaNetIncome})`);
    console.log(`Bold Bank: Initial=${initialBoldBal} | Final=${finalBoldBal} | Diff=${finalBoldBal - initialBoldBal} (Expected +${boldIncome})`);
    console.log(`Shipping Bank: Initial=${initialShippingBal} | Final=${finalShippingBal} | Diff=${finalShippingBal - initialShippingBal} (Expected +${shippingIncome})`);

    // Record for reversal
    bankBalanceReversals[bbvaBank.id] = bbvaNetIncome;
    bankBalanceReversals[boldBank.id] = boldIncome;
    bankBalanceReversals[shippingBank.id] = shippingIncome;

    // Assertions Flow A
    if (finalBBVABal - initialBBVABal !== bbvaNetIncome) throw new Error("BBVA Bank balance update error!");
    if (finalBoldBal - initialBoldBal !== boldIncome) throw new Error("Bold Bank balance update error!");
    if (finalShippingBal - initialShippingBal !== shippingIncome) throw new Error("Shipping Bank balance update error!");

    // Audit if an Expense document was registered for the Bold Commission during checkout
    const expensesCol = collection(db, "tenants", tenantId, "expenses");
    const checkoutExpenseQuery = query(expensesCol, where("category", "==", "Comisiones Bancarias"));
    const checkoutExpenseSnap = await getDocs(checkoutExpenseQuery);
    
    // We search if any was created with a description related to our test
    let foundCheckoutExpense = false;
    checkoutExpenseSnap.forEach(d => {
      if (d.data().description && d.data().description.includes("ORD-TEST-AUDIT")) {
        foundCheckoutExpense = true;
        createdDocRefs.push(d.ref);
      }
    });

    console.log(`Flow A (Checkout): Was Bold Commission registered as an expense? ${foundCheckoutExpense ? "YES" : "NO"}`);
    if (!foundCheckoutExpense) {
      console.log("❗ DISCREPANCY DETECTED: Bold Commission was NOT registered as an expense in the 'expenses' collection during the web checkout split payment flow (only registered as bank income).");
    }

    // --- Flow B: Manual Payment / Administrative Receive Payment ---
    console.log("\n--- [STEP 3.5] Auditing Bank Balances & Commissions (Flow B: Administrative receivePayment) ---");
    // Under FinanceContext.receivePayment(bankId, amount, description, category, commission):
    // 1. Net amount (totalPaid - commissionFee) is added as income to the bank account.
    // 2. The commission is registered as an expense in the 'expenses' collection.
    const flowBNetAmount = totalPaid - commissionFee; // 119400 - 5319 = 114081 COP
    
    // Record current bank balance before Flow B
    const bbvaBalBeforeFlowB = finalBBVABal;

    console.log(`Flow B Expected bank updates: BBVA=+${flowBNetAmount} (Net), Expense=+${commissionFee}`);

    // Run simulated receivePayment
    await receivePayment(bbvaBank.id, totalPaid, "Pago manual orden ORD-TEST-AUDIT", "Ventas", commissionFee);

    // Verify BBVA Balance
    const bbvaBankFlowB = await getDoc(doc(db, "tenants", tenantId, "banks", bbvaBank.id));
    const bbvaBalAfterFlowB = bbvaBankFlowB.data().balance;
    console.log(`BBVA Bank Flow B: Before=${bbvaBalBeforeFlowB} | After=${bbvaBalAfterFlowB} | Diff=${bbvaBalAfterFlowB - bbvaBalBeforeFlowB} (Expected +${flowBNetAmount})`);
    
    // Accumulate Flow B reversal
    bankBalanceReversals[bbvaBank.id] += flowBNetAmount;

    if (bbvaBalAfterFlowB - bbvaBalBeforeFlowB !== flowBNetAmount) {
      throw new Error("Flow B: BBVA Bank balance update error!");
    }

    // Verify Expense Collection has registered the commission expense
    const manualExpenseQuery = query(expensesCol, where("category", "==", "Comisiones Bancarias"));
    const manualExpenseSnap = await getDocs(manualExpenseQuery);
    
    let foundManualExpense = null;
    manualExpenseSnap.forEach(d => {
      const data = d.data();
      if (data.description && data.description.includes("ORD-TEST-AUDIT")) {
        foundManualExpense = { id: d.id, ...data };
        createdDocRefs.push(d.ref); // save for cleanup
      }
    });

    if (foundManualExpense) {
      console.log(`✅ Flow B (Administrative): Commission expense registered correctly! ID: ${foundManualExpense.id}, Amount: ${foundManualExpense.amount}`);
      if (foundManualExpense.amount !== commissionFee) throw new Error("Flow B: Commission expense amount is incorrect!");
    } else {
      throw new Error("Flow B: Commission expense document was NOT created!");
    }

    // Clean up created bank movements
    const movementsSnap = await getDocs(collection(db, "tenants", tenantId, "bank_movements"));
    movementsSnap.forEach(d => {
      const desc = d.data().description || "";
      if (desc.includes("ORD-TEST-AUDIT") || desc.includes("move_")) {
        // Since we generated random movement IDs or customized them
        if (desc.includes("ORD-TEST-AUDIT")) {
          createdDocRefs.push(d.ref);
        }
      }
    });

    // -------------------------------------------------------------------------
    // 4. INVENTORY STOCK DEDUCTION & RECIPES
    // -------------------------------------------------------------------------
    console.log("\n--- [STEP 4] Setting up Test Inventory Products and Recipes ---");
    
    // A. Create test raw material
    const matRef = doc(db, "tenants", tenantId, "products", TEST_MATERIAL_ID);
    await setDoc(matRef, {
      id: TEST_MATERIAL_ID,
      sku: "MP-TEST-AUDIT",
      name: "Materia Prima Prueba",
      stock: 100,
      purchases: 0,
      sales: 0,
      type: "MP",
      category: "Materia Prima",
      unit: "gr",
      created_at: new Date().toISOString()
    });
    createdDocRefs.push(matRef);
    console.log("Created test raw material MP-TEST-AUDIT (stock=100)");

    // B. Create test finished good
    const prodRef = doc(db, "tenants", tenantId, "products", TEST_PRODUCT_ID);
    await setDoc(prodRef, {
      id: TEST_PRODUCT_ID,
      sku: "PT-TEST-AUDIT",
      name: "Producto Prueba",
      stock: 50,
      purchases: 0,
      sales: 0,
      type: "PT",
      category: "Producto Terminado",
      unit: "und",
      created_at: new Date().toISOString()
    });
    createdDocRefs.push(prodRef);
    console.log("Created test finished good PT-TEST-AUDIT (stock=50)");

    // C. Create recipe for finished good (consuming 2 units of material per 1 finished good)
    const recipeRef = doc(db, "tenants", tenantId, "recipes", TEST_RECIPE_ID);
    await setDoc(recipeRef, {
      id: TEST_RECIPE_ID,
      finished_good_id: TEST_PRODUCT_ID,
      finished_good_name: "Producto Prueba",
      raw_material_id: TEST_MATERIAL_ID,
      raw_material_name: "Materia Prima Prueba",
      raw_material_sku: "MP-TEST-AUDIT",
      qty: 2,
      input_qty: 2,
      unit: "gr",
      yield_quantity: 1
    });
    createdDocRefs.push(recipeRef);
    console.log("Created test recipe connecting PT-TEST-AUDIT and MP-TEST-AUDIT (ratio=2 gr per unit)");

    // D. Create test kit (comprising 2 finished goods)
    const kitRef = doc(db, "tenants", tenantId, "products", TEST_KIT_ID);
    await setDoc(kitRef, {
      id: TEST_KIT_ID,
      sku: "KIT-TEST-AUDIT",
      name: "Kit Prueba",
      stock: 10,
      purchases: 0,
      sales: 0,
      product_type: "Kit",
      components: [
        { id: TEST_PRODUCT_ID, qty: 2 }
      ],
      created_at: new Date().toISOString()
    });
    createdDocRefs.push(kitRef);
    console.log("Created test Kit KIT-TEST-AUDIT (containing 2 units of PT-TEST-AUDIT)");

    // E. Create test order with status 'Pendiente' containing 1 Kit
    const orderRef = doc(collection(db, "tenants", tenantId, "orders"));
    const orderPayload = {
      order_number: TEST_ORDER_NUMBER,
      client: "Cliente Pruebas Auditoria",
      clientId: TEST_CLIENT_ID,
      total_amount: totalPaid,
      amount: totalPaid,
      date: new Date().toISOString().split("T")[0],
      status: "Pendiente",
      payment_status: "Pagado",
      materials_consumed: false,
      items: [
        { id: TEST_KIT_ID, name: "Kit Prueba", quantity: 1, price: 105000 }
      ],
      created_at: new Date().toISOString()
    };
    await setDoc(orderRef, orderPayload);
    createdDocRefs.push(orderRef);
    console.log(`Created test order ${orderRef.id} with status 'Pendiente' and 1 Kit.`);

    // Check initial stock levels (calculated as stock + purchases - sales)
    const getStockLevel = (prod) => (prod.stock || 0) + (prod.purchases || 0) - (prod.sales || 0);

    const snapKitInit = await getDoc(kitRef);
    const snapProdInit = await getDoc(prodRef);
    const snapMatInit = await getDoc(matRef);

    const kitInitStock = getStockLevel(snapKitInit.data());
    const prodInitStock = getStockLevel(snapProdInit.data());
    const matInitStock = getStockLevel(snapMatInit.data());

    console.log(`Initial calculated stock levels:`);
    console.log(`- Kit: ${kitInitStock} (Expected: 10)`);
    console.log(`- Product: ${prodInitStock} (Expected: 50)`);
    console.log(`- Raw Material: ${matInitStock} (Expected: 100)`);

    // Transition Order Status to 'Finalizado' and process deductions
    console.log("\n--- Transitioning order status to 'Finalizado' and running stock deduction ---");
    
    // Simulate updateOrder status transitions:
    // When order transitions to 'finalizado', if not already consumed:
    // Deduct items from stock recursively.
    const allProducts = [
      { id: TEST_KIT_ID, ...snapKitInit.data() },
      { id: TEST_PRODUCT_ID, ...snapProdInit.data() },
      { id: TEST_MATERIAL_ID, ...snapMatInit.data() }
    ];
    const allRecipes = [
      { id: TEST_RECIPE_ID, ...recipeRef } // we know our recipe details
    ];
    // Mock recipe list manually
    const mockRecipesList = [
      {
        finished_good_id: TEST_PRODUCT_ID,
        finished_good_name: "Producto Prueba",
        raw_material_id: TEST_MATERIAL_ID,
        raw_material_name: "Materia Prima Prueba",
        qty: 2,
        yield_quantity: 1
      }
    ];

    await processItemStockDeduction(db, TEST_KIT_ID, 1, allProducts, mockRecipesList);

    // Verify stock levels after deduction
    const snapKitFinal = await getDoc(kitRef);
    const snapProdFinal = await getDoc(prodRef);
    const snapMatFinal = await getDoc(matRef);

    const kitFinalStock = getStockLevel(snapKitFinal.data());
    const prodFinalStock = getStockLevel(snapProdFinal.data());
    const matFinalStock = getStockLevel(snapMatFinal.data());

    console.log(`Final calculated stock levels:`);
    console.log(`- Kit: ${kitFinalStock} (Before: ${kitInitStock}) | Diff=${kitFinalStock - kitInitStock} (Expected -1)`);
    console.log(`- Product: ${prodFinalStock} (Before: ${prodInitStock}) | Diff=${prodFinalStock - prodInitStock} (Expected -2)`);
    console.log(`- Raw Material: ${matFinalStock} (Before: ${matInitStock}) | Diff=${matFinalStock - matInitStock} (Expected -4)`);

    // Verify deductions:
    // Order has 1 Kit.
    // 1. Kit stock sales increases by 1. Kit stock decreases by 1.
    // 2. Kit has components: 2 units of finished good (PT-TEST-AUDIT) per kit.
    //    So it recursively processes PT-TEST-AUDIT for 2 units.
    // 3. PT-TEST-AUDIT sales increases by 2. PT-TEST-AUDIT stock decreases by 2.
    // 4. PT-TEST-AUDIT has recipe: consumes 2 units of material (MP-TEST-AUDIT) per 1 unit of product.
    //    For 2 units of product, it consumes 2 * 2 = 4 units of material.
    //    Is this recursively processed?
    //    Wait! In our processItemStockDeduction implementation, we did recursive checks. Let's see if the production code actually does it.
    //    In the production SalesContext.jsx (line 87):
    //    "else { const recipeList = recipes[itemId] || recipes[product.name] || []; ... consumeMaterials(materialsToConsume) }"
    //    Since consumeMaterials only increments the sales of materials directly, it DOES NOT recurse on materials themselves. 
    //    However, because the kit recursively called processItemStockDeduction on the finished product PT-TEST-AUDIT, 
    //    and then PT-TEST-AUDIT (which is NOT a kit) processed its recipe, the materials (MP-TEST-AUDIT) WERE consumed correctly.
    //    Let's check if the deduction values match exactly:
    if (kitFinalStock - kitInitStock !== -1) throw new Error("Kit stock deduction discrepancy!");
    if (prodFinalStock - prodInitStock !== -2) throw new Error("Recursive component stock deduction discrepancy!");
    if (matFinalStock - matInitStock !== -4) throw new Error("BOM recipe raw material consumption discrepancy!");

    console.log("✅ Inventory stock deduction and recipe consumption verified successfully.");

  } catch (error) {
    console.error("❌ AUDIT FLOWS ERROR:", error);
  } finally {
    // -------------------------------------------------------------------------
    // 5. GUARANTEED CLEANUP OF DATABASE
    // -------------------------------------------------------------------------
    console.log("\n--- [STEP 5] Cleaning Up All Created Test Documents & Reverting Balances ---");
    
    // A. Revert bank balances
    console.log("Reverting bank balances...");
    for (const bankId of Object.keys(bankBalanceReversals)) {
      const amt = bankBalanceReversals[bankId];
      if (amt !== 0) {
        try {
          const bankRef = doc(db, "tenants", tenantId, "banks", bankId);
          const currentSnap = await getDoc(bankRef);
          const currentBal = Number(currentSnap.data().balance || 0);
          await updateDoc(bankRef, { balance: currentBal - amt });
          console.log(`Reverted bank ${bankId}: Subtracted ${amt}. New Balance: ${currentBal - amt}`);
        } catch (e) {
          console.error(`Failed to revert bank balance for ${bankId}:`, e.message);
        }
      }
    }

    // B. Delete created/modified documents in Firestore
    console.log("Deleting created documents...");
    for (const docRef of createdDocRefs) {
      try {
        await deleteDoc(docRef);
        console.log(`Deleted document: ${docRef.path}`);
      } catch (e) {
        console.error(`Failed to delete document ${docRef.path}:`, e.message);
      }
    }

    // C. Clean up any leftover test transactions/movements by description
    try {
      console.log("Checking for leftover movements or expenses by query...");
      const movementsCol = collection(db, "tenants", tenantId, "bank_movements");
      const movementsSnap = await getDocs(movementsCol);
      for (const d of movementsSnap.docs) {
        const desc = d.data().description || "";
        if (desc.includes("ORD-TEST-AUDIT") || desc.includes("move_")) {
          // If we found any leftover matching our test run, delete it
          if (desc.includes("ORD-TEST-AUDIT")) {
            await deleteDoc(d.ref);
            console.log(`Deleted leftover movement: ${d.id}`);
          }
        }
      }
    } catch (e) {
      console.error("Error during leftover search cleanup:", e.message);
    }

    console.log("\n==================================================");
    console.log("🧹 DATABASE CLEANUP COMPLETE.");
    console.log("==================================================");
  }
}

// Helper: Simulated Bank Update logic replicating FinanceContext.jsx
async function updateBankBalance(bankId, amount, type = "income", description = "Test movement", category = "Test") {
  const bankRef = doc(db, "tenants", tenantId, "banks", bankId);
  await runTransaction(db, async (transaction) => {
    const bankDoc = await transaction.get(bankRef);
    if (!bankDoc.exists()) throw new Error("Bank account not found");
    const currentBalance = Number(bankDoc.data().balance || 0);
    const numAmount = Number(amount) || 0;
    const newBalance = type === "income" ? currentBalance + numAmount : currentBalance - numAmount;
    
    transaction.update(bankRef, { balance: newBalance });

    const movementData = {
      bank_id: bankId,
      bank_name: bankDoc.data().name || "Banco",
      type,
      amount: numAmount,
      description,
      category,
      previous_balance: currentBalance,
      new_balance: newBalance,
      created_at: new Date().toISOString()
    };
    const movementId = `move_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newMoveRef = doc(db, "tenants", tenantId, "bank_movements", movementId);
    transaction.set(newMoveRef, movementData);
    
    // Track for cleanup
    createdDocRefs.push(newMoveRef);
  });
}

// Helper: Simulated receivePayment logic replicating FinanceContext.jsx
async function receivePayment(bankId, amount, description, category, commission = 0) {
  const netAmount = Number(amount) - Number(commission);
  
  // Update Net in bank
  await updateBankBalance(bankId, netAmount, "income", description, category);

  // Register commission as expense
  if (commission > 0) {
    const expRef = await addDoc(collection(db, "tenants", tenantId, "expenses"), {
      date: new Date().toLocaleDateString('en-CA'),
      category: "Comisiones Bancarias",
      description: `Comisión: ${description}`,
      amount: Number(commission),
      payment_method: "Descuento Automático",
      bank_id: bankId,
      status: "Pagado",
      created_at: new Date().toISOString()
    });
    createdDocRefs.push(expRef);
  }
}

// Helper: Simulated recursive stock deduction replicating SalesContext.jsx + InventoryContext.jsx
async function processItemStockDeduction(db, itemId, quantity, allProducts, allRecipes) {
  const product = allProducts.find(p => p.id === itemId);
  if (!product) {
    console.warn(`Item deduction skipped: Product ${itemId} not found.`);
    return;
  }

  // Update sales for the product
  const productRef = doc(db, "tenants", "zeticas", "products", itemId);
  await updateDoc(productRef, {
    sales: increment(Number(quantity) || 0)
  });
  console.log(`[processItemStockDeduction] Incremented sales of product '${product.name}' (${itemId}) by ${quantity}`);

  if (product.product_type === "Kit" && product.components && Array.isArray(product.components)) {
    console.log(`[processItemStockDeduction] Product is a Kit. Iterating components recursively...`);
    for (const comp of product.components) {
      const totalCompQty = (Number(comp.qty) || 0) * (Number(quantity) || 0);
      if (totalCompQty > 0) {
        await processItemStockDeduction(db, comp.id, totalCompQty, allProducts, allRecipes);
      }
    }
  } else {
    // Standard product recipe consumption
    const recipeList = allRecipes.filter(r => r.finished_good_id === itemId || r.finished_good_name === product.name);
    if (recipeList.length > 0) {
      console.log(`[processItemStockDeduction] Found recipe list with ${recipeList.length} items. Consuming materials...`);
      const yieldQty = Number(recipeList[0].yield_quantity) || 1;
      const materialsToConsume = recipeList.map(r => ({
        id: r.raw_material_id || r.rm_id,
        qtyToConsume: (Number(r.qty || r.input_qty || r.quantity_required) / yieldQty) * (Number(quantity) || 0)
      }));

      // Consume materials
      for (const mat of materialsToConsume) {
        if (mat.id) {
          const matRef = doc(db, "tenants", "zeticas", "products", mat.id);
          await updateDoc(matRef, {
            sales: increment(Math.abs(mat.qtyToConsume))
          });
          console.log(`[consumeMaterials] Incremented sales of material (${mat.id}) by ${mat.qtyToConsume}`);
        }
      }
    }
  }
}

auditFlows().catch(console.error);
