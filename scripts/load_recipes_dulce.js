import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://foodbazntwgnakdjbwfv.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvb2RiYXpudHdnbmFrZGpid2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MTk0MjksImV4cCI6MjA4OTE5NTQyOX0.1HfwAv132ddqVNFCz7nYneCH2S5N7kX08-KZaJaWKlc";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const jsonData = {
  "productos": [
    {
      "nombre": "Mermelada Ruibarbo Fresa",
      "receta": [
        {"ingrediente": "Fresas", "cantidad": 400, "unidad": "gr"},
        {"ingrediente": "Ruibarbo", "cantidad": 600, "unidad": "gr"},
        {"ingrediente": "Azucar", "cantidad": 800, "unidad": "gr"},
        {"ingrediente": "Limon", "cantidad": 0.2, "unidad": "lb"},
        {"ingrediente": "Vainilla", "cantidad": 0.3, "unidad": "gr"}
      ],
      "insumos": [
        {"ingrediente": "Fresas", "precio": 7200, "cantidad_compra": 500, "unidad": "gr"},
        {"ingrediente": "Ruibarbo", "precio": 4700, "cantidad_compra": 500, "unidad": "gr"},
        {"ingrediente": "Azucar", "precio": 5, "cantidad_compra": 1, "unidad": "gr"},
        {"ingrediente": "Limon", "precio": 5800, "cantidad_compra": 1, "unidad": "lb"},
        {"ingrediente": "Vainilla", "precio": 130, "cantidad_compra": 1, "unidad": "gr"}
      ]
    },
    {
      "nombre": "Dulce Silvia",
      "receta": [
        {"ingrediente": "Mora", "cantidad": 2, "unidad": "lb"},
        {"ingrediente": "Guanabana", "cantidad": 1, "unidad": "kg"},
        {"ingrediente": "Azucar", "cantidad": 1000, "unidad": "gr"},
        {"ingrediente": "Lulo", "cantidad": 2, "unidad": "lb"}
      ],
      "insumos": [
        {"ingrediente": "Mora", "precio": 4900, "cantidad_compra": 1, "unidad": "lb"},
        {"ingrediente": "Guanabana", "precio": 9000, "cantidad_compra": 1, "unidad": "kg"},
        {"ingrediente": "Azucar", "precio": 5, "cantidad_compra": 1, "unidad": "gr"},
        {"ingrediente": "Lulo", "precio": 5200, "cantidad_compra": 1, "unidad": "lb"}
      ]
    },
    {
      "nombre": "Papayuela + limonaria",
      "receta": [
        {"ingrediente": "Guayaba", "unidad": "lb"},
        {"ingrediente": "Pera", "unidad": "lb"},
        {"ingrediente": "Papayuela", "cantidad": 1, "unidad": "lb"},
        {"ingrediente": "Ruibarbo", "unidad": "lb"},
        {"ingrediente": "Azucar", "cantidad": 250, "unidad": "gr"},
        {"ingrediente": "Limon", "cantidad": 0.2, "unidad": "lb"},
        {"ingrediente": "Limonaria", "cantidad": 50, "unidad": "gr"},
        {"ingrediente": "Albahaca", "unidad": "gr"},
        {"ingrediente": "Gengibre", "unidad": "lb"},
        {"ingrediente": "Naranja", "unidad": "lb"}
      ],
      "insumos": [
        {"ingrediente": "Guayaba", "precio": 3000, "cantidad_compra": 1, "unidad": "lb"},
        {"ingrediente": "Pera", "precio": 3000, "cantidad_compra": 1, "unidad": "lb"},
        {"ingrediente": "Papayuela", "precio": 3200, "cantidad_compra": 1, "unidad": "lb"},
        {"ingrediente": "Ruibarbo", "precio": 4700, "cantidad_compra": 1, "unidad": "lb"},
        {"ingrediente": "Azucar", "precio": 5, "cantidad_compra": 1, "unidad": "gr"},
        {"ingrediente": "Limon", "precio": 5800, "cantidad_compra": 1, "unidad": "lb"},
        {"ingrediente": "Limonaria", "precio": 1700, "cantidad_compra": 50, "unidad": "gr"},
        {"ingrediente": "Albahaca", "precio": 1900, "cantidad_compra": 50, "unidad": "gr"},
        {"ingrediente": "Gengibre", "precio": 19900, "cantidad_compra": 1, "unidad": "lb"},
        {"ingrediente": "Naranja", "precio": 2000, "cantidad_compra": 0.2, "unidad": "lb"}
      ]
    },
    {
      "nombre": "Guava + Albahaca",
      "receta": [
        {"ingrediente": "Guayaba", "cantidad": 1, "unidad": "lb"},
        {"ingrediente": "Pera", "unidad": "lb"},
        {"ingrediente": "Papayuela", "unidad": "lb"},
        {"ingrediente": "Ruibarbo", "unidad": "lb"},
        {"ingrediente": "Azucar", "cantidad": 250, "unidad": "gr"},
        {"ingrediente": "Limon", "cantidad": 1, "unidad": "unidad"},
        {"ingrediente": "Menta", "unidad": "gr"},
        {"ingrediente": "Albahaca", "cantidad": 50, "unidad": "gr"},
        {"ingrediente": "Gengibre", "unidad": "lb"},
        {"ingrediente": "Naranja", "unidad": "lb"}
      ],
      "insumos": [
        {"ingrediente": "Guayaba", "precio": 3000, "cantidad_compra": 1, "unidad": "lb"},
        {"ingrediente": "Pera", "precio": 3000, "cantidad_compra": 1, "unidad": "lb"},
        {"ingrediente": "Papayuela", "precio": 3200, "cantidad_compra": 1, "unidad": "lb"},
        {"ingrediente": "Ruibarbo", "precio": 4700, "cantidad_compra": 1, "unidad": "lb"},
        {"ingrediente": "Azucar", "precio": 5, "cantidad_compra": 1, "unidad": "gr"},
        {"ingrediente": "Limon", "precio": 5800, "cantidad_compra": 1, "unidad": "unidad"},
        {"ingrediente": "Menta", "precio": 1700, "cantidad_compra": 50, "unidad": "gr"},
        {"ingrediente": "Albahaca", "precio": 1900, "cantidad_compra": 50, "unidad": "gr"},
        {"ingrediente": "Gengibre", "precio": 19900, "cantidad_compra": 1, "unidad": "lb"},
        {"ingrediente": "Naranja", "precio": 2000, "cantidad_compra": 0.2, "unidad": "lb"}
      ]
    },
    {
      "nombre": "Mermelada Agraz Flor Jamaica Canela",
      "receta": [
        {"ingrediente": "Agraz", "cantidad": 1000, "unidad": "gr"},
        {"ingrediente": "Flor de Jamaica", "cantidad": 0, "unidad": "gr"},
        {"ingrediente": "Azucar", "cantidad": 300, "unidad": "gr"},
        {"ingrediente": "Naranja", "cantidad": 0.4, "unidad": "lb"},
        {"ingrediente": "Canela", "cantidad": 1, "unidad": "gr"}
      ],
      "insumos": [
        {"ingrediente": "Agraz", "precio": 18000, "cantidad_compra": 1000, "unidad": "gr"},
        {"ingrediente": "Flor de Jamaica", "precio": 10000, "cantidad_compra": 1000, "unidad": "gr"},
        {"ingrediente": "Azucar", "precio": 5, "cantidad_compra": 1, "unidad": "gr"},
        {"ingrediente": "Naranja", "precio": 2800, "cantidad_compra": 1, "unidad": "lb"},
        {"ingrediente": "Canela", "precio": 95, "cantidad_compra": 0.5, "unidad": "gr"}
      ]
    }
  ]
};

async function loadData() {
  console.log("🚀 Starting data load (Category: Dulce)...");

  for (const product of jsonData.productos) {
    console.log(`\n📦 Processing: ${product.nombre}`);

    // PT Sku
    const ptSku = `PT-${product.nombre.toUpperCase().replace(/\s+/g, '-')}`;
    const { data: pt, error: ptError } = await supabase
      .from('products')
      .upsert({
        sku: ptSku,
        name: product.nombre,
        type: 'PT',
        category: 'Dulce',
        unit_measure: 'unidad',
        price: 23500 
      }, { onConflict: 'sku' })
      .select()
      .single();

    if (ptError) {
      console.error(`Error with PT ${product.nombre}:`, ptError.message);
      continue;
    }

    const ptId = pt.id;
    console.log(`   - PT ready: ${ptSku} (${ptId})`);

    const mpIdMap = {};
    for (const insumo of product.insumos) {
      const mpSku = `MP-${insumo.ingrediente.toUpperCase().replace(/\s+/g, '-')}`;
      const { data: mp, error: mpError } = await supabase
        .from('products')
        .upsert({
          sku: mpSku,
          name: insumo.ingrediente,
          type: 'MP',
          category: 'Materia Prima',
          unit_measure: insumo.unidad,
          cost: insumo.precio
        }, { onConflict: 'sku' })
        .select()
        .single();
      
      if (mpError) {
        console.error(`Error with MP ${insumo.ingrediente}:`, mpError.message);
        continue;
      }
      mpIdMap[insumo.ingrediente] = mp.id;
      console.log(`     - MP ready: ${mpSku} ($${insumo.precio})`);
    }

    console.log(`   - Building Recipe...`);
    for (const recipeItem of product.receta) {
      const rawId = mpIdMap[recipeItem.ingrediente];
      if (!rawId) {
        console.warn(`     ! Cannot find ID for ${recipeItem.ingrediente}, skipping recipe line.`);
        continue;
      }

      const { error: recError } = await supabase
        .from('recipes')
        .insert({
          finished_good_id: ptId,
          raw_material_id: rawId,
          quantity_required: recipeItem.cantidad || 0
        });

      if (recError) {
        console.error(`     ! Error inserting recipe for ${recipeItem.ingrediente}:`, recError.message);
      } else {
        console.log(`     + Added ${recipeItem.cantidad || 0} ${recipeItem.unidad} of ${recipeItem.ingrediente}`);
      }
    }
  }

  console.log("\n✅ Load completed successfully.");
}

loadData();
