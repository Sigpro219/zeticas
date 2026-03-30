/**
 * migrate_batch_sizes_and_glass.js
 * ───────────────────────────────────────────────────────────────────
 * PROPÓSITO:
 *   1. Fija el campo `batch_size` en cada documento de producto (PT)
 *   2. Actualiza `yield_quantity` en todas las filas de receta del producto
 *   3. Añade "Frasco Vidrio 250g" (EMP-001) como ingrediente a cada receta
 *      con cantidad = batch_size (si no está ya incluido)
 *
 * USO:  node scripts/migrate_batch_sizes_and_glass.js
 * FLAGS:
 *   --dry-run   Solo muestra lo que haría, no escribe nada
 * ───────────────────────────────────────────────────────────────────
 */

import { initializeApp } from "firebase/app";
import {
    getFirestore,
    collection,
    getDocs,
    doc,
    updateDoc,
    addDoc
} from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAeHMdtEt04RtYarEx_h19gcCUzsIUUpSc",
    authDomain: "delta-core-cloud-45ea0.firebaseapp.com",
    projectId: "delta-core-cloud-45ea0",
    storageBucket: "delta-core-cloud-45ea0.firebasestorage.app",
    messagingSenderId: "378250949856",
    appId: "1:378250949856:web:7a0ce44de64bc9a5becc85",
    measurementId: "G-Q1BXE4WVZP"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DRY_RUN = process.argv.includes("--dry-run");

// ─── TABLA DE TAMAÑOS DE LOTE ─────────────────────────────────────
// IMPORTANTE: orden de más específico a menos específico
const BATCH_SIZES = [
    // UNTABLES
    { match: "hummus",              batch_size: 12 },
    { match: "habas para untar",    batch_size: 6  },
    // ENCURTIDOS (específicos primero)
    { match: "berenjena toscana",   batch_size: 12 },
    { match: "antipasto veggie",    batch_size: 14 },
    { match: "antipasto tuna",      batch_size: 12 },   // nombre en inglés
    { match: "antipasto atun",      batch_size: 12 },   // "Antipasto Atún Ahumado"
    { match: "ahumado",             batch_size: 12 },   // fallback atún ahumado
    { match: "zetas griegas",       batch_size: 6  },
    { match: "pesto kale",          batch_size: 6  },
    { match: "vinagreta",           batch_size: 4  },
    // UNTABLES genérico — DESPUÉS de "berenjena toscana"
    { match: "berenjena",           batch_size: 8  },   // berenjena de untar / berenjenas para untar
    // DULCE
    { match: "dulce silvia",        batch_size: 10 },
    { match: "papayuela",           batch_size: 8  },   // dulce papayuela & limonaria
    { match: "ruibarbo",            batch_size: 5  },   // mermelada ruibarbo & fresa
    { match: "agraz",               batch_size: 4  },   // mermelada agraz
    { match: "guayaba",             batch_size: 4  },   // dulce guayaba & albahaca
    { match: "pera",                batch_size: 4  },   // dulce pera & jengibre
    // NOTA: "Jalea de Pimentón y ají amazónico" sin batch_size → se omite
];

// SKU del frasco (EMP-001 → "Frasco Vidrio 250g")
const FRASCO_SKU = "EMP-001";


// ────────────────────────────────────────────────────────────────────

function normalizeStr(str) {
    return str?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";
}

function findBatchSize(productName) {
    const norm = normalizeStr(productName);
    for (const entry of BATCH_SIZES) {
        if (norm.includes(normalizeStr(entry.match))) {
            return entry.batch_size;
        }
    }
    return null;
}

async function run() {
    console.log(`\n🚀 Iniciando migración de tamaños de lote${DRY_RUN ? " [DRY RUN - solo lectura]" : ""}...`);
    console.log("═".repeat(60));

    // 1. Cargar todos los productos de Firestore
    const productsSnap = await getDocs(collection(db, "products"));
    const allProducts = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const pts = allProducts.filter(p => p.category === "Producto Terminado" || p.type === "PT");
    console.log(`\n📦 Productos Terminados encontrados: ${pts.length}`);

    // 2. Encontrar el Frasco Vidrio 250g (EMP-001)
    const frascoProduct = allProducts.find(p => p.sku === FRASCO_SKU);
    if (!frascoProduct) {
        console.error(`\n❌ ERROR: No se encontró el producto con SKU "${FRASCO_SKU}" (Frasco Vidrio 250g).`);
        console.error("   Verifica que exista en la colección 'products' antes de continuar.");
        process.exit(1);
    }
    console.log(`\n🧴 Frasco Vidrio 250g encontrado: ${frascoProduct.id} → "${frascoProduct.name}"`);

    // 3. Cargar todas las recetas de Firestore
    const recipesSnap = await getDocs(collection(db, "recipes"));
    const allRecipes = recipesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    let updated = 0, skipped = 0, noMatch = 0;

    // 4. Iterar sobre cada PT
    for (const pt of pts) {
        const batchSize = findBatchSize(pt.name);

        if (batchSize === null) {
            console.log(`\n⚠️  SIN MATCH: "${pt.name}" — no tiene batch_size asignado (se omite)`);
            noMatch++;
            continue;
        }

        console.log(`\n🔄 "${pt.name}"`);
        console.log(`   → batch_size = ${batchSize} frascos/lote`);

        // 4a. Actualizar batch_size en el documento del producto
        if (!DRY_RUN) {
            await updateDoc(doc(db, "products", pt.id), { batch_size: batchSize });
            console.log(`   ✅ products/${pt.id} → batch_size: ${batchSize}`);
        } else {
            console.log(`   [DRY] products/${pt.id} → batch_size: ${batchSize}`);
        }

        // 4b. Encontrar todas las filas de receta de este PT
        const ptRecipes = allRecipes.filter(r => r.finished_good_id === pt.id);
        console.log(`   📋 Filas de receta: ${ptRecipes.length}`);

        if (ptRecipes.length === 0) {
            console.log(`   ⚠️  Sin receta configurada — se omite actualización de receta`);
            skipped++;
            continue;
        }

        // 4c. Actualizar yield_quantity en cada fila de receta
        for (const recipeRow of ptRecipes) {
            if (!DRY_RUN) {
                await updateDoc(doc(db, "recipes", recipeRow.id), { yield_quantity: batchSize });
            }
            console.log(`   ${DRY_RUN ? "[DRY]" : "✅"} recipes/${recipeRow.id} (${recipeRow.raw_material_name || recipeRow.raw_material_id}) → yield_quantity: ${batchSize}`);
        }

        // 4d. Verificar si ya tiene el Frasco Vidrio en la receta
        const yaTieneFrasco = ptRecipes.some(
            r => r.raw_material_id === frascoProduct.id || normalizeStr(r.raw_material_name).includes("frasco")
        );

        if (yaTieneFrasco) {
            console.log(`   ℹ️  Frasco Vidrio ya existe en esta receta — se omite adición`);
        } else {
            const frascoRow = {
                finished_good_id: pt.id,
                finished_good_name: pt.name,
                raw_material_id: frascoProduct.id,
                raw_material_name: frascoProduct.name,
                raw_material_sku: frascoProduct.sku || FRASCO_SKU,
                quantity_required: batchSize,   // 1 frasco por unidad × lote = batch_size frascos
                unit: "und",
                yield_quantity: batchSize,
                created_at: new Date().toISOString()
            };

            if (!DRY_RUN) {
                const newDoc = await addDoc(collection(db, "recipes"), frascoRow);
                console.log(`   ✅ Frasco Vidrio añadido: recipes/${newDoc.id} → ${batchSize} und`);
            } else {
                console.log(`   [DRY] Añadir Frasco Vidrio 250g × ${batchSize} und a esta receta`);
            }
        }

        updated++;
    }

    // 5. Resumen final
    console.log("\n" + "═".repeat(60));
    console.log(`\n🏁 Migración ${DRY_RUN ? "(DRY RUN) " : ""}completada:`);
    console.log(`   ✅ Productos actualizados:  ${updated}`);
    console.log(`   ⚠️  Sin receta (omitidos):   ${skipped}`);
    console.log(`   ❓ Sin batch_size (no match): ${noMatch}`);
    if (DRY_RUN) {
        console.log("\n   💡 Para ejecutar los cambios reales, corre el script SIN --dry-run");
    }
    console.log();
    process.exit(0);
}

run().catch(err => {
    console.error("❌ Error fatal:", err);
    process.exit(1);
});
