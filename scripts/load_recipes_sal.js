import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://foodbazntwgnakdjbwfv.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvb2RiYXpudHdnbmFrZGpid2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MTk0MjksImV4cCI6MjA4OTE5NTQyOX0.1HfwAv132ddqVNFCz7nYneCH2S5N7kX08-KZaJaWKlc";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const jsonData = {
  "productos": [
    {
      "nombre": "Hummus de Garbanzo",
      "receta": [
        {"ingrediente": "Garbanzo", "cantidad": 1, "unit": "kg"},
        {"ingrediente": "Curcuma", "cantidad": 30, "unit": "gr"},
        {"ingrediente": "Dientes de ajo", "cantidad": 0.5, "unit": "cabeza"},
        {"ingrediente": "Limones", "cantidad": 2, "unit": "lb"},
        {"ingrediente": "Aceite vegetal", "cantidad": 500, "unit": "ml"},
        {"ingrediente": "Sal", "cantidad": 20, "unit": "gr"}
      ],
      "insumos": [
        {"ingrediente": "Garbanzo", "precio": 11000, "unit": "kg"},
        {"ingrediente": "Curcuma", "precio": 46, "unit": "gr"},
        {"ingrediente": "Dientes de ajo", "precio": 2000, "unit": "cabeza"},
        {"ingrediente": "Limones", "precio": 5800, "unit": "lb"},
        {"ingrediente": "Aceite vegetal", "precio": 28, "unit": "ml"},
        {"ingrediente": "Sal", "precio": 7, "unit": "gr"}
      ]
    },
    {
      "nombre": "Antipasto tuna",
      "receta": [
        {"ingrediente": "Pimentones", "cantidad": 2, "unit": "lb"},
        {"ingrediente": "Cebolla", "cantidad": 2, "unit": "lb"},
        {"ingrediente": "Zanahoria", "cantidad": 1, "unit": "lb"},
        {"ingrediente": "Champiñones", "cantidad": 1, "unit": "lb"},
        {"ingrediente": "Encurtidos", "cantidad": 250, "unit": "gr"},
        {"ingrediente": "Aceitunas", "cantidad": 250, "unit": "gr"},
        {"ingrediente": "Tuna", "cantidad": 900, "unit": "gr"},
        {"ingrediente": "Salsa de Tomate", "cantidad": 250, "unit": "gr"},
        {"ingrediente": "Sal", "cantidad": 30, "unit": "gr"},
        {"ingrediente": "Pimienta", "cantidad": 15, "unit": "gr"},
        {"ingrediente": "Aceite de Oliva", "cantidad": 500, "unit": "ml"}
      ],
      "insumos": [
        {"ingrediente": "Pimentones", "precio": 5800, "unit": "lb"},
        {"ingrediente": "Cebolla", "precio": 4900, "unit": "lb"},
        {"ingrediente": "Zanahoria", "precio": 3400, "unit": "lb"},
        {"ingrediente": "Champiñones", "precio": 18000, "unit": "lb"},
        {"ingrediente": "Encurtidos", "precio": 21, "unit": "gr"},
        {"ingrediente": "Aceitunas", "precio": 41, "unit": "gr"},
        {"ingrediente": "Tuna", "precio": 83, "unit": "gr"},
        {"ingrediente": "Salsa de Tomate", "precio": 24, "unit": "gr"},
        {"ingrediente": "Sal", "precio": 7, "unit": "gr"},
        {"ingrediente": "Pimienta", "precio": 125, "unit": "gr"},
        {"ingrediente": "Aceite de Oliva", "precio": 28, "unit": "ml"}
      ]
    },
    {
      "nombre": "Vinagreta",
      "receta": [
        {"ingrediente": "Vinagre de frutas", "cantidad": 250, "unit": "ml"},
        {"ingrediente": "Laureles", "cantidad": 0.3, "unit": "atado"},
        {"ingrediente": "Sal", "cantidad": 30, "unit": "gr"},
        {"ingrediente": "Pimenton", "cantidad": 0.5, "unit": "lb"},
        {"ingrediente": "Cebolla", "cantidad": 0.5, "unit": "lb"},
        {"ingrediente": "Perejil", "cantidad": 100, "unit": "gr"},
        {"ingrediente": "Aceite oliva", "cantidad": 250, "unit": "ml"},
        {"ingrediente": "Pimienta", "cantidad": 5, "unit": "gr"},
        {"ingrediente": "Ajo", "cantidad": 0.25, "unit": "cabeza"}
      ],
      "insumos": [
        {"ingrediente": "Vinagre de frutas", "precio": 20, "unit": "ml"},
        {"ingrediente": "Laureles", "precio": 2000, "unit": "atado"},
        {"ingrediente": "Sal", "precio": 7, "unit": "gr"},
        {"ingrediente": "Pimenton", "precio": 5800, "unit": "lb"},
        {"ingrediente": "Cebolla", "precio": 4900, "unit": "lb"},
        {"ingrediente": "Perejil", "precio": 27, "unit": "gr"},
        {"ingrediente": "Aceite oliva", "precio": 28, "unit": "ml"},
        {"ingrediente": "Pimienta", "precio": 125, "unit": "gr"},
        {"ingrediente": "Ajo", "precio": 2000, "unit": "cabeza"}
      ]
    },
    {
      "nombre": "Antipasto Veggie",
      "receta": [
        {"ingrediente": "Pimentones", "cantidad": 2, "unit": "lb"},
        {"ingrediente": "Cebolla", "cantidad": 2, "unit": "lb"},
        {"ingrediente": "Zanahoria", "cantidad": 1, "unit": "lb"},
        {"ingrediente": "Champiñones", "cantidad": 1, "unit": "lb"},
        {"ingrediente": "Encurtidos", "cantidad": 250, "unit": "gr"},
        {"ingrediente": "Aceitunas", "cantidad": 250, "unit": "gr"},
        {"ingrediente": "Salsa de Tomate", "cantidad": 250, "unit": "gr"},
        {"ingrediente": "Sal", "cantidad": 10, "unit": "gr"},
        {"ingrediente": "Pimienta", "cantidad": 15, "unit": "gr"},
        {"ingrediente": "Aceite de Oliva", "cantidad": 500, "unit": "ml"}
      ],
      "insumos": [
        {"ingrediente": "Pimentones", "precio": 5800, "unit": "lb"},
        {"ingrediente": "Cebolla", "precio": 4900, "unit": "lb"},
        {"ingrediente": "Zanahoria", "precio": 3400, "unit": "lb"},
        {"ingrediente": "Champiñones", "precio": 18000, "unit": "lb"},
        {"ingrediente": "Encurtidos", "precio": 21, "unit": "gr"},
        {"ingrediente": "Aceitunas", "precio": 41, "unit": "gr"},
        {"ingrediente": "Salsa de Tomate", "precio": 24, "unit": "gr"},
        {"ingrediente": "Sal", "precio": 7, "unit": "gr"},
        {"ingrediente": "Pimienta", "precio": 125, "unit": "gr"},
        {"ingrediente": "Aceite de Oliva", "precio": 28, "unit": "ml"}
      ]
    },
    {
      "nombre": "Berenjena Toscana",
      "receta": [
        {"ingrediente": "Berenjena", "cantidad": 5, "unit": "lb"},
        {"ingrediente": "Pimenton", "cantidad": 2, "unit": "lb"},
        {"ingrediente": "Cebolla", "cantidad": 2, "unit": "lb"},
        {"ingrediente": "Zanahoria", "cantidad": 1, "unit": "lb"},
        {"ingrediente": "Aceite oliva", "cantidad": 450, "unit": "ml"},
        {"ingrediente": "Sal", "cantidad": 30, "unit": "gr"},
        {"ingrediente": "Pimienta", "cantidad": 10, "unit": "gr"},
        {"ingrediente": "Paprika", "cantidad": 10, "unit": "gr"}
      ],
      "insumos": [
        {"ingrediente": "Berenjena", "precio": 5300, "unit": "lb"},
        {"ingrediente": "Pimenton", "precio": 5800, "unit": "lb"},
        {"ingrediente": "Cebolla", "precio": 4900, "unit": "lb"},
        {"ingrediente": "Zanahoria", "precio": 3400, "unit": "lb"},
        {"ingrediente": "Aceite oliva", "precio": 28, "unit": "ml"},
        {"ingrediente": "Sal", "precio": 7, "unit": "gr"},
        {"ingrediente": "Pimienta", "precio": 125, "unit": "gr"},
        {"ingrediente": "Paprika", "precio": 65, "unit": "gr"}
      ]
    }
  ]
};

async function loadData() {
  console.log("🚀 Starting data load (Category: Sal)...");

  for (const product of jsonData.productos) {
    console.log(`\n📦 Processing: ${product.nombre}`);

    // 1. Create PT if not exists
    const ptSku = `PT-${product.nombre.toUpperCase().replace(/\s+/g, '-')}`;
    const { data: pt, error: ptError } = await supabase
      .from('products')
      .upsert({
        sku: ptSku,
        name: product.nombre,
        type: 'PT',
        category: 'Sal',
        unit_measure: 'unidad',
        price: 30000 // Estimated base price
      }, { onConflict: 'sku' })
      .select()
      .single();

    if (ptError) {
      console.error(`Error with PT ${product.nombre}:`, ptError.message);
      continue;
    }

    const ptId = pt.id;
    console.log(`   - PT ready: ${ptSku} (${ptId})`);

    // 2. Map Ingredients
    const mpIdMap = {}; // { name: id }
    
    for (const insumo of product.insumos) {
      const mpSku = `MP-${insumo.ingrediente.toUpperCase().replace(/\s+/g, '-')}`;
      const { data: mp, error: mpError } = await supabase
        .from('products')
        .upsert({
          sku: mpSku,
          name: insumo.ingrediente,
          type: 'MP',
          category: 'Materia Prima',
          unit_measure: insumo.unit || insumo.unidad,
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

    // 3. Create Recipes
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
          quantity_required: recipeItem.cantidad
        });

      if (recError) {
        console.error(`     ! Error inserting recipe for ${recipeItem.ingrediente}:`, recError.message);
      } else {
        console.log(`     + Added ${recipeItem.cantidad} ${recipeItem.unit || 'und'} of ${recipeItem.ingrediente}`);
      }
    }
  }

  console.log("\n✅ Load completed successfully.");
}

loadData();
