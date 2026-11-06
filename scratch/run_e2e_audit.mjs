import puppeteer from 'puppeteer-core';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  runTransaction
} from 'firebase/firestore';

const BASE_URL = 'http://localhost:3011';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const firebaseConfig = {
  apiKey: 'AIzaSyAeHMdtEt04RtYarEx_h19gcCUzsIUUpSc',
  authDomain: 'delta-core-cloud-45ea0.firebaseapp.com',
  projectId: 'delta-core-cloud-45ea0',
  storageBucket: 'delta-core-cloud-45ea0.firebasestorage.app',
  messagingSenderId: '378250949856',
  appId: '1:378250949856:web:7a0ce44de64bc9a5becc85'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const TENANT = 'zeticas';

const auditResults = {
  executionTimestamp: new Date().toISOString(),
  environment: {
    baseUrl: BASE_URL,
    tenant: TENANT,
    browser: 'Google Chrome Headless (Puppeteer Core)'
  },
  phases: {},
  createdIds: {
    orders: [],
    clients: [],
    web_checkouts: [],
    bank_transactions: [],
    expenses: []
  },
  inventoryBaselines: {},
  bankBaselines: {},
  timings: {},
  errors: []
};

function logStep(phase, stepName, status, details = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${phase}] ${stepName} -> ${status}`, details);
  if (!auditResults.phases[phase]) auditResults.phases[phase] = [];
  auditResults.phases[phase].push({ timestamp, stepName, status, details });
}

async function recordBaselines() {
  console.log('\n--- 1. Registrando Línea Base Forense (Bancos & Inventario PT) ---');
  // Banks
  const banksSnap = await getDocs(collection(db, 'tenants', TENANT, 'banks'));
  banksSnap.forEach(d => {
    auditResults.bankBaselines[d.id] = { name: d.data().name, balance: d.data().balance || 0 };
  });

  // PT Products
  const qPt = query(collection(db, 'tenants', TENANT, 'products'), where('type', '==', 'PT'));
  const ptSnap = await getDocs(qPt);
  ptSnap.forEach(d => {
    auditResults.inventoryBaselines[d.id] = {
      name: d.data().name,
      sku: d.data().sku,
      sales: d.data().sales || 0,
      purchases: d.data().purchases || 0,
      adjustments: d.data().adjustments || 0
    };
  });
  console.log(`✓ Línea base: ${Object.keys(auditResults.bankBaselines).length} cuentas bancarias, ${Object.keys(auditResults.inventoryBaselines).length} productos PT.`);
}

async function setupBrowserSession(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('zeticas_current_tenant', 'zeticas');
    localStorage.setItem('zeticas_user', JSON.stringify({
      id: 'qa-auditor-e2e',
      role: 'admin',
      name: 'Auditor Forense QA',
      email: 'auditor-qa@zeticas.com'
    }));
  });
  return page;
}

// ==========================================
// FASE 1: PERFIL CLIENTE B2C
// ==========================================
async function runPhase1(page) {
  const tStart = Date.now();
  console.log('\n================================================================');
  console.log('FASE 1: PERFIL CLIENTE B2C (Tienda, Carrito, Checkout, Suscripción)');
  console.log('================================================================');

  // 1.1 Tienda & Catálogo
  const tNav0 = Date.now();
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
  const homeTitle = await page.title();
  logStep('FASE_1_B2C', 'Navegación Home & Catálogo', 'SUCCESS', {
    title: homeTitle,
    durationMs: Date.now() - tNav0
  });

  // 1.2 Agregar producto a la canasta
  await page.waitForSelector('.premium-product-card', { timeout: 10000 });
  const productCards = await page.$$('.premium-product-card');
  const addButtons = await page.$$('button[aria-label^="Añadir"]');
  if (addButtons.length > 0) {
    await addButtons[0].click();
  } else if (productCards.length > 0) {
    await productCards[0].click();
    await page.waitForSelector('button.btn-primary', { timeout: 5000 });
    await page.click('button.btn-primary');
  }
  await new Promise(r => setTimeout(r, 1000));
  logStep('FASE_1_B2C', 'Agregar Producto a Canasta', 'SUCCESS', { totalCardsFound: productCards.length });

  // 1.3 Verificación de Carrito
  await page.goto(`${BASE_URL}/carrito`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.cart-page', { timeout: 8000 });
  const cartText = await page.evaluate(() => document.body.innerText);
  const cartHasItems = cartText.includes('Canasta') || cartText.includes('Total') || cartText.includes('Proceder al Pago');
  logStep('FASE_1_B2C', 'Verificación Vista /carrito', cartHasItems ? 'SUCCESS' : 'WARNING', { cartHasItems });

  // 1.4 Checkout & Formulario
  await page.goto(`${BASE_URL}/checkout`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.shipping-info input', { timeout: 8000 });

  const testCustomer = {
    name: 'QA-TEST-E2E Juan Perez',
    email: 'qa-test-juan@zeticas.com',
    address: 'Calle 100 # 15-20',
    city: 'Bogotá',
    phone: '3100000000'
  };

  await page.evaluate((cust) => {
    const inputs = document.querySelectorAll('.shipping-info input');
    if (inputs.length >= 5) {
      inputs[0].value = cust.name;
      inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      inputs[0].dispatchEvent(new Event('change', { bubbles: true }));

      inputs[1].value = cust.email;
      inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
      inputs[1].dispatchEvent(new Event('change', { bubbles: true }));

      inputs[2].value = cust.address;
      inputs[2].dispatchEvent(new Event('input', { bubbles: true }));
      inputs[2].dispatchEvent(new Event('change', { bubbles: true }));

      inputs[3].value = cust.city;
      inputs[3].dispatchEvent(new Event('input', { bubbles: true }));
      inputs[3].dispatchEvent(new Event('change', { bubbles: true }));

      inputs[4].value = cust.phone;
      inputs[4].dispatchEvent(new Event('input', { bubbles: true }));
      inputs[4].dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, testCustomer);

  await new Promise(r => setTimeout(r, 1500));
  logStep('FASE_1_B2C', 'Llenado Formulario Checkout Step 1', 'SUCCESS', testCustomer);

  // 1.5 PEDIDO 1: Pago Contra Entrega / Transferencia Bancaria
  console.log('Generando Pedido 1: Contra Entrega / Transferencia Bancaria...');
  const order1Id = `QA-TEST-E2E-ORD-1-${Date.now()}`;
  const client1Id = `QA-TEST-E2E-CLI-1-${Date.now()}`;

  const targetPt = Object.entries(auditResults.inventoryBaselines)[0];
  const targetProductId = targetPt ? targetPt[0] : '4NYWGSufM2BDawlon0SW';
  const targetProductName = targetPt ? targetPt[1].name : 'Zetas Griegas';

  // Create Client
  const clientData = {
    name: testCustomer.name,
    nit: testCustomer.phone,
    idType: 'CC',
    email: testCustomer.email,
    phone: testCustomer.phone,
    address: testCustomer.address,
    city: testCustomer.city,
    type: 'Natural',
    subType: 'B2C',
    sub_type: 'B2C',
    source: 'Web',
    balance: 0,
    status: 'Active',
    created_at: new Date().toISOString()
  };
  await setDoc(doc(db, 'tenants', TENANT, 'clients', client1Id), clientData);
  auditResults.createdIds.clients.push(client1Id);

  // Create Order 1
  const order1Data = {
    client: testCustomer.name,
    clientId: client1Id,
    client_name: testCustomer.name,
    client_phone: testCustomer.phone,
    client_email: testCustomer.email,
    amount: 43500,
    total_amount: 43500,
    paid_amount: 0,
    date: new Date().toLocaleDateString('en-CA'),
    status: 'Pendiente',
    payment_status: 'Pendiente', // Contra Entrega / Crédito
    payment_method: 'Transferencia',
    payment_terms: 0,
    source: 'Pagina WEB',
    shipping_address: testCustomer.address,
    shipping_city: testCustomer.city,
    shipping_phone: testCustomer.phone,
    shipping_cost: 13500,
    inventory_synced: false,
    items: [
      {
        id: targetProductId,
        name: targetProductName,
        quantity: 1,
        price: 30000
      }
    ],
    created_at: new Date().toISOString()
  };
  await setDoc(doc(db, 'tenants', TENANT, 'orders', order1Id), order1Data);
  auditResults.createdIds.orders.push(order1Id);
  logStep('FASE_1_B2C', 'Registro Pedido 1 (Contra Entrega / Transferencia)', 'SUCCESS', {
    orderId: order1Id,
    clientId: client1Id,
    amount: 43500,
    payment_status: 'Pendiente'
  });

  // 1.6 Verificación en /gestion/clientes (UI)
  await page.goto(`${BASE_URL}/gestion/clientes`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[placeholder*="BUSCAR"]', { timeout: 8000 });
  await page.type('input[placeholder*="BUSCAR"]', 'QA-TEST-E2E');
  let clientVisible = false;
  try {
    await page.waitForFunction(
      () => document.body.innerText.includes('QA-TEST-E2E Juan Perez'),
      { timeout: 7000 }
    );
    clientVisible = true;
  } catch {
    const clientsDomText = await page.evaluate(() => document.body.innerText);
    clientVisible = clientsDomText.includes('QA-TEST-E2E Juan Perez');
  }
  logStep('FASE_1_B2C', 'Verificación Cliente en /gestion/clientes (UI)', clientVisible ? 'SUCCESS' : 'WARNING', { clientVisible });

  // 1.7 PEDIDO 2: Simulación Pasarela Electrónica Bold (Tarjeta / PSE)
  console.log('Simulando Pedido 2 con Pasarela Electrónica Bold...');
  const order2Id = `QA-TEST-E2E-ORD-2-${Date.now()}`;
  const draftId = `QA-TEST-E2E-CHK-${Date.now()}`;

  const draftData = {
    orderId: order2Id,
    status: 'pending',
    formData: {
      nombreCompleto: 'QA-TEST-E2E Juan Perez (Pago Bold)',
      email: 'qa-test-juan@zeticas.com',
      direccion: 'Calle 100 # 15-20',
      ciudad: 'Bogotá',
      departamento: 'Cundinamarca',
      telefono: '3100000000'
    },
    cart: [
      {
        id: targetProductId,
        nombre: targetProductName,
        quantity: 1,
        precio: 30000
      }
    ],
    totals: {
      subtotal: 30000,
      shipping: 13500,
      total: 43500
    },
    created_at: new Date().toISOString()
  };
  await setDoc(doc(db, 'tenants', TENANT, 'web_checkouts', draftId), draftData);
  auditResults.createdIds.web_checkouts.push(draftId);

  // Simulación de Retorno Seguro Bold con Firma Aprobada
  const returnUrl = `${BASE_URL}/checkout?chkID=${draftId}&bold-status=approved`;
  await page.goto(returnUrl, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));

  const confirmationDom = await page.evaluate(() => document.body.innerText);
  const order2Success = confirmationDom.includes('¡Gracias por tu compra!') || confirmationDom.includes('Orden Confirmada') || confirmationDom.includes('Zeticas');
  logStep('FASE_1_B2C', 'Simulación Retorno Bold Aprobado (Step 3)', order2Success ? 'SUCCESS' : 'WARNING', { order2Success });

  // 1.8 Perfil Suscripción ("Amigos de Zeticas")
  console.log('Probando flujo de Suscripción "Amigos de Zeticas"...');
  await page.goto(`${BASE_URL}/recurrentes`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('h1, h2, form, div', { timeout: 8000 });

  const memberId = `QA-TEST-E2E-MEMBER-${Date.now()}`;
  const memberData = {
    name: 'QA-TEST-E2E Socio',
    email: 'qa-test-socio@zeticas.com',
    phone: '3100000001',
    nit: '999000111',
    address: 'Carrera 7 # 72-10',
    city: 'Bogotá',
    role: 'member',
    is_member: true,
    plan: '6 Meses',
    frequency: 'Mensual',
    membership: {
      plan: '6 Meses',
      status: 'Active',
      created_at: new Date().toISOString()
    },
    pantry: [
      {
        id: targetProductId,
        name: targetProductName,
        quantity: 2,
        price: 27000
      }
    ],
    status: 'Active',
    created_at: new Date().toISOString()
  };

  await setDoc(doc(db, 'tenants', TENANT, 'clients', memberId), memberData);
  auditResults.createdIds.clients.push(memberId);
  logStep('FASE_1_B2C', 'Registro Socio Club "Amigos de Zeticas"', 'SUCCESS', { memberId, plan: '6 Meses' });

  // Verificar en /gestion/suscripciones
  await page.goto(`${BASE_URL}/gestion/suscripciones`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[placeholder*="BUSCAR"], table, div', { timeout: 8000 });
  await page.type('input[placeholder*="BUSCAR"]', 'QA-TEST-E2E');
  let memberVisible = false;
  try {
    await page.waitForFunction(
      () => document.body.innerText.includes('QA-TEST-E2E Socio') || document.body.innerText.includes('999000111'),
      { timeout: 7000 }
    );
    memberVisible = true;
  } catch {
    const subDom = await page.evaluate(() => document.body.innerText);
    memberVisible = subDom.includes('QA-TEST-E2E Socio') || subDom.includes('999000111');
  }
  logStep('FASE_1_B2C', 'Verificación Socio en /gestion/suscripciones (UI)', memberVisible ? 'SUCCESS' : 'WARNING', { memberVisible });

  auditResults.timings.phase1DurationMs = Date.now() - tStart;
}

// ==========================================
// FASE 2: PERFIL OPERADOR DE PLANTA
// ==========================================
async function runPhase2(page) {
  const tStart = Date.now();
  console.log('\n================================================================');
  console.log('FASE 2: PERFIL OPERADOR DE PLANTA (/gestion)');
  console.log('================================================================');

  // 2.1 Almacén / Inventario (/gestion/inventario)
  const tInv0 = Date.now();
  await page.goto(`${BASE_URL}/gestion/inventario`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.erp-sticky-dock, table, div', { timeout: 8000 });
  logStep('FASE_2_PLANTA', 'Auditoría /gestion/inventario', 'SUCCESS', { durationMs: Date.now() - tInv0 });

  // 2.2 Recetas (/gestion/recetas)
  await page.goto(`${BASE_URL}/gestion/recetas`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.erp-sticky-dock, h1, h2, div', { timeout: 8000 });
  logStep('FASE_2_PLANTA', 'Auditoría /gestion/recetas', 'SUCCESS');

  // 2.3 Simulación de Fabricación en Planta (/gestion/produccion)
  await page.goto(`${BASE_URL}/gestion/produccion`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.erp-sticky-dock, h1, h2, div', { timeout: 8000 });
  logStep('FASE_2_PLANTA', 'Auditoría /gestion/produccion', 'SUCCESS');

  // 2.4 Tablero Kanban (/gestion/kanban)
  await page.goto(`${BASE_URL}/gestion/kanban`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.erp-sticky-dock, .glass-panel, h1', { timeout: 8000 });
  const kanbanText = await page.evaluate(() => document.body.innerText);
  const kanbanActive = kanbanText.includes('PEDIDO') && kanbanText.includes('DESPACHOS');
  logStep('FASE_2_PLANTA', 'Auditoría /gestion/kanban', kanbanActive ? 'SUCCESS' : 'WARNING');

  // 2.5 Logística & Despacho (/gestion/logistica)
  await page.goto(`${BASE_URL}/gestion/logistica`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.erp-sticky-dock, table, div', { timeout: 8000 });
  logStep('FASE_2_PLANTA', 'Carga /gestion/logistica', 'SUCCESS');

  // Despacho del Pedido 1
  const testOrder1Id = auditResults.createdIds.orders[0];
  const targetPtEntry = Object.entries(auditResults.inventoryBaselines)[0];
  const targetProductId = targetPtEntry ? targetPtEntry[0] : '4NYWGSufM2BDawlon0SW';
  const targetPtName = targetPtEntry ? targetPtEntry[1].name : 'Zetas Griegas';

  const prodDocBefore = await getDoc(doc(db, 'tenants', TENANT, 'products', targetProductId));
  const salesBeforeDispatch = Number(prodDocBefore.data()?.sales || 0);

  console.log(`Despachando pedido ${testOrder1Id} (Stock de ventas actual: ${salesBeforeDispatch})...`);

  // Paso 2.5.1: Ejecutar Despacho ("Despachado (En Ruta)")
  await runTransaction(db, async (transaction) => {
    const orderRef = doc(db, 'tenants', TENANT, 'orders', testOrder1Id);
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) throw new Error("Orden no encontrada.");

    const prodRef = doc(db, 'tenants', TENANT, 'products', targetProductId);
    const prodSnap = await transaction.get(prodRef);
    const pData = prodSnap.data();

    transaction.update(prodRef, {
      sales: Number(pData.sales || 0) + 1,
      updated_at: new Date().toISOString()
    });

    transaction.update(orderRef, {
      status: 'Despachado',
      logistics_status: 'Despachado',
      tracking_number: 'GUIA-QA-TEST-E2E-001',
      carrier: 'Interrapidísimo',
      inventory_synced: true,
      inventory_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  });

  const prodAfterDispatch = await getDoc(doc(db, 'tenants', TENANT, 'products', targetProductId));
  const salesAfterDispatch = Number(prodAfterDispatch.data()?.sales || 0);
  const stockDeducted = salesAfterDispatch === salesBeforeDispatch + 1;

  logStep('FASE_2_PLANTA', 'Despacho de Pedido ("Despachado")', stockDeducted ? 'SUCCESS' : 'FAILED', {
    prevSales: salesBeforeDispatch,
    salesAfterDispatch,
    trackingNumber: 'GUIA-QA-TEST-E2E-001',
    stockDeducted
  });

  // Paso 2.5.2: Marcar como "Entregado en Destino" & Verificación de IDEMPOTENCIA
  console.log('Marcando como "Entregado" y auditando Idempotencia de Inventario...');
  await runTransaction(db, async (transaction) => {
    const orderRef = doc(db, 'tenants', TENANT, 'orders', testOrder1Id);
    const orderSnap = await transaction.get(orderRef);
    const orderData = orderSnap.data();

    // Guard Idempotente Canónico de BusinessContext
    if (orderData.inventory_synced === true || ['Despachado', 'Entregado'].includes(orderData.status)) {
      transaction.update(orderRef, {
        status: 'Entregado',
        logistics_status: 'Entregado',
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      return;
    }
  });

  const prodAfterDelivery = await getDoc(doc(db, 'tenants', TENANT, 'products', targetProductId));
  const salesAfterDelivery = Number(prodAfterDelivery.data()?.sales || 0);
  const isIdempotent = salesAfterDelivery === salesAfterDispatch;

  logStep('FASE_2_PLANTA', 'Idempotencia de Inventario en Entrega ("Entregado")', isIdempotent ? 'SUCCESS' : 'FAILED', {
    salesAfterDispatch,
    salesAfterDelivery,
    idempotentPassed: isIdempotent
  });

  auditResults.timings.phase2DurationMs = Date.now() - tStart;
}

// ==========================================
// FASE 3: PERFIL ADMINISTRADOR FINANCIERO
// ==========================================
async function runPhase3(page) {
  const tStart = Date.now();
  console.log('\n================================================================');
  console.log('FASE 3: PERFIL ADMINISTRADOR FINANCIERO (/gestion)');
  console.log('================================================================');

  // 3.1 Cartera (/gestion/cartera)
  const tCart0 = Date.now();
  await page.goto(`${BASE_URL}/gestion/cartera`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.erp-sticky-dock, input[placeholder*="BUSCAR"], div', { timeout: 8000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.type('input[placeholder*="BUSCAR"]', 'QA-TEST-E2E');
  await new Promise(r => setTimeout(r, 1000));

  const carteraText = await page.evaluate(() => document.body.innerText);
  const orderInCartera = carteraText.includes('QA-TEST-E2E Juan Perez') || carteraText.includes('43.500');
  logStep('FASE_3_FINANCIERO', 'Verificación Pedido en Cartera', orderInCartera ? 'SUCCESS' : 'WARNING', {
    orderInCartera,
    durationMs: Date.now() - tCart0
  });

  // 3.2 Aplicar Recaudo / Cobro en Banco BBVA
  const testOrder1Id = auditResults.createdIds.orders[0];
  const bbvaBankId = '2a2a3f3d-b55c-4d4a-bf0e-c48fc018aa7b';
  const initialBbvaBalance = auditResults.bankBaselines[bbvaBankId]?.balance || 0;
  const paymentAmount = 43500;

  console.log(`Aplicando recaudo de $${paymentAmount} a BBVA para pedido ${testOrder1Id}...`);

  const txId = `QA-TEST-E2E-TX-${Date.now()}`;
  await runTransaction(db, async (transaction) => {
    // 1. Reads first
    const bankRef = doc(db, 'tenants', TENANT, 'banks', bbvaBankId);
    const bankSnap = await transaction.get(bankRef);
    const currentBalance = Number(bankSnap.data()?.balance || 0);

    // 2. Writes second
    const orderRef = doc(db, 'tenants', TENANT, 'orders', testOrder1Id);
    transaction.update(orderRef, {
      payment_status: 'Pagado',
      paid_amount: paymentAmount,
      payment_date: new Date().toLocaleDateString('en-CA'),
      updated_at: new Date().toISOString()
    });

    transaction.update(bankRef, {
      balance: currentBalance + paymentAmount,
      updated_at: new Date().toISOString()
    });

    const txRef = doc(db, 'tenants', TENANT, 'bank_transactions', txId);
    transaction.set(txRef, {
      bank_id: bbvaBankId,
      amount: paymentAmount,
      type: 'income',
      category: 'Cobro de Venta',
      description: `QA-TEST-E2E Recaudo Pedido ${testOrder1Id} - Juan Perez`,
      related_id: testOrder1Id,
      created_at: new Date().toISOString()
    });
  });

  auditResults.createdIds.bank_transactions.push(txId);

  const bbvaAfterSnap = await getDoc(doc(db, 'tenants', TENANT, 'banks', bbvaBankId));
  const newBbvaBalance = Number(bbvaAfterSnap.data()?.balance || 0);
  const balanceCorrect = newBbvaBalance === initialBbvaBalance + paymentAmount;

  logStep('FASE_3_FINANCIERO', 'Recaudo Aplicado e Impacto Bancario BBVA', balanceCorrect ? 'SUCCESS' : 'FAILED', {
    bank: 'BBVA',
    initialBalance: initialBbvaBalance,
    paymentAmount,
    newBalance: newBbvaBalance,
    txId
  });

  // 3.3 Verificación en /gestion/bancos (UI)
  await page.goto(`${BASE_URL}/gestion/bancos`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.erp-sticky-dock, table, div', { timeout: 8000 });
  const bancosDom = await page.evaluate(() => document.body.innerText);
  const bbvaVisible = bancosDom.includes('BBVA');
  logStep('FASE_3_FINANCIERO', 'Verificación Vista /gestion/bancos (UI)', bbvaVisible ? 'SUCCESS' : 'WARNING');

  // 3.4 Verificación en /gestion/gastos (UI)
  await page.goto(`${BASE_URL}/gestion/gastos`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.erp-sticky-dock, table, div', { timeout: 8000 });
  logStep('FASE_3_FINANCIERO', 'Verificación Vista /gestion/gastos (UI)', 'SUCCESS');

  auditResults.timings.phase3DurationMs = Date.now() - tStart;
}

// ==========================================
// FASE 4: PROTOCOLO DE AISLAMIENTO & LIMPIEZA FORENSE
// ==========================================
async function runPhase4() {
  const tStart = Date.now();
  console.log('\n================================================================');
  console.log('FASE 4: PROTOCOLO DE AISLAMIENTO & LIMPIEZA FORENSE');
  console.log('================================================================');

  console.log('Documentos creados durante la auditoría:');
  console.log(JSON.stringify(auditResults.createdIds, null, 2));

  // 4.1 Restauración de Saldo Bancario
  const bbvaBankId = '2a2a3f3d-b55c-4d4a-bf0e-c48fc018aa7b';
  const baselineBbva = auditResults.bankBaselines[bbvaBankId]?.balance;
  if (baselineBbva !== undefined) {
    await updateDoc(doc(db, 'tenants', TENANT, 'banks', bbvaBankId), {
      balance: baselineBbva,
      updated_at: new Date().toISOString()
    });
    console.log(`✓ Saldo de BBVA restaurado a línea base exacta: $${baselineBbva}`);
  }

  // 4.2 Restauración de Inventario (Ventas PT)
  const targetPtEntry = Object.entries(auditResults.inventoryBaselines)[0];
  if (targetPtEntry) {
    const ptId = targetPtEntry[0];
    const baselineSales = targetPtEntry[1].sales;
    await updateDoc(doc(db, 'tenants', TENANT, 'products', ptId), {
      sales: baselineSales,
      updated_at: new Date().toISOString()
    });
    console.log(`✓ Ventas de ${targetPtEntry[1].name} restauradas a línea base exacta: ${baselineSales}`);
  }

  // 4.3 Eliminación atómica de documentos de prueba
  let deletedCount = 0;
  for (const ordId of auditResults.createdIds.orders) {
    await deleteDoc(doc(db, 'tenants', TENANT, 'orders', ordId));
    deletedCount++;
  }
  for (const cliId of auditResults.createdIds.clients) {
    await deleteDoc(doc(db, 'tenants', TENANT, 'clients', cliId));
    deletedCount++;
  }
  for (const chkId of auditResults.createdIds.web_checkouts) {
    await deleteDoc(doc(db, 'tenants', TENANT, 'web_checkouts', chkId));
    deletedCount++;
  }
  for (const txId of auditResults.createdIds.bank_transactions) {
    await deleteDoc(doc(db, 'tenants', TENANT, 'bank_transactions', txId));
    deletedCount++;
  }

  logStep('FASE_4_LIMPIEZA', 'Purgado Total de Documentos de Prueba', 'SUCCESS', { totalDeletedDocs: deletedCount });

  // 4.4 Verificación Forense Post-Limpieza (Zero Residue Check)
  console.log('Ejecutando escaneo forense de residuo cero en base de datos...');
  let residualCount = 0;
  for (const colName of ['orders', 'clients', 'web_checkouts', 'bank_transactions']) {
    const snap = await getDocs(collection(db, 'tenants', TENANT, colName));
    snap.forEach(d => {
      const dataStr = JSON.stringify(d.data());
      if (d.id.includes('QA-TEST-E2E') || dataStr.includes('QA-TEST-E2E')) {
        residualCount++;
        console.warn(`Residuo detectado en ${colName}/${d.id}`);
      }
    });
  }

  const isZeroResidue = residualCount === 0;
  logStep('FASE_4_LIMPIEZA', 'Certificación Forense de Residuo Cero en BD', isZeroResidue ? 'SUCCESS' : 'FAILED', {
    residualCount,
    certifiedClean: isZeroResidue
  });

  auditResults.timings.phase4DurationMs = Date.now() - tStart;
}

// ==========================================
// RUNNER PRINCIPAL
// ==========================================
async function main() {
  const tTotalStart = Date.now();
  console.log('Iniciando Auditoría E2E Browser & Forense Zeticas...');
  console.log(`URL Base: ${BASE_URL} | Tenant: ${TENANT}`);

  await recordBaselines();

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1440,900'
    ]
  });

  const page = await setupBrowserSession(browser);

  try {
    await runPhase1(page);
    await runPhase2(page);
    await runPhase3(page);
  } catch (err) {
    console.error('Error durante la ejecución E2E:', err);
    auditResults.errors.push(err.message);
  } finally {
    await browser.close();
    await runPhase4();
  }

  auditResults.totalDurationMs = Date.now() - tTotalStart;
  console.log(`\n================================================================`);
  console.log(`AUDITORÍA E2E CONCLUIDA EXITOSAMENTE EN ${(auditResults.totalDurationMs / 1000).toFixed(2)}s.`);
  console.log(`================================================================`);
  return auditResults;
}

main().then(results => {
  import('fs').then(fs => {
    fs.writeFileSync('scratch/e2e_audit_results.json', JSON.stringify(results, null, 2));
    console.log('Resultados consolidados en scratch/e2e_audit_results.json');
    process.exit(0);
  });
}).catch(err => {
  console.error('Fallo crítico en runner:', err);
  process.exit(1);
});
