import fs from 'fs';
import path from 'path';

const productsPath = "C:/Users/German Higuera/OneDrive/Documentos/Projects/zeticas/src/pages/Products.jsx";
const salesContextPath = "C:/Users/German Higuera/OneDrive/Documentos/Projects/zeticas/src/context/SalesContext.jsx";
const nextCostosPath = "C:/Users/German Higuera/OneDrive/Documentos/Projects/zeticas-next/src/app/gestion/costos/page.tsx";
const nextInventoryAgentPath = "C:/Users/German Higuera/OneDrive/Documentos/Projects/zeticas-next/src/lib/agents/InventoryAgent.ts";

function patchFile(filepath, replacements) {
  if (!fs.existsSync(filepath)) {
    console.error(`File not found: ${filepath}`);
    return false;
  }
  let content = fs.readFileSync(filepath, 'utf8');
  let original = content;

  for (const r of replacements) {
    if (r.regex) {
      if (r.regex.test(content)) {
        content = content.replace(r.regex, r.replace);
        console.log(`Patched with regex in: ${path.basename(filepath)}`);
      } else {
        console.warn(`Regex did not match in: ${path.basename(filepath)}`);
      }
    } else if (r.search) {
      if (content.includes(r.search)) {
        content = content.replace(r.search, r.replace);
        console.log(`Patched substring in: ${path.basename(filepath)}`);
      } else {
        console.warn(`Substring not found in: ${path.basename(filepath)}`);
      }
    }
  }

  if (content !== original) {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`Successfully updated: ${filepath}\n`);
    return true;
  } else {
    console.log(`No changes made to: ${filepath}\n`);
    return false;
  }
}

// 1. Patches for Products.jsx
const productsPatches = [
  // Fix the broken image cell syntax and restore the td tag
  {
    regex: /<td style=\{\{\s*fontWeight:\s*'700',\s*fontSize:\s*'0.85rem',\s*color:\s*'var\(--color-primary\)'\s*\}\}>\{p\.sku\}<\/td>\s*<div[\s\S]*?onClick\(\(\)\s*=>\s*p\.category\?\.toLowerCase\(\)\s*!==\s*'materia prima'\s*&&\s*handleTableImageClick\(p\)[\s\S]*?\{p\.category\?\.toLowerCase\(\)\s*!==\s*'materia prima'\s*&&\s*\('Materia Prima'\s*&&\s*\(/,
    replace: `<td style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--color-primary)' }}>{p.sku}</td>
                                            <td>
                                                <div 
                                                    onClick={() => p.category?.toLowerCase() !== 'materia prima' && handleTableImageClick(p)}
                                                    className={p.category?.toLowerCase() !== 'materia prima' ? "table-image-cell" : ""}
                                                    style={{ 
                                                        display: 'flex', 
                                                        gap: '0.75rem', 
                                                        alignItems: 'center', 
                                                        cursor: p.category?.toLowerCase() !== 'materia prima' ? 'pointer' : 'default',
                                                        position: 'relative'
                                                     }}
                                                     title={p.category?.toLowerCase() !== 'materia prima' ? "Haga clic para subir fotografía" : ""}
                                                >
                                                    {p.category?.toLowerCase() !== 'materia prima' && (`
  },
  // Substring replacement for category match logic
  {
    search: `const matchesCategory = p.category === selectedCategoryFilter;`,
    replace: `const matchesCategory = p.category?.toLowerCase() === selectedCategoryFilter?.toLowerCase();`
  },
  // InlinePriceInput category checks for Producto Terminado (lines 692 & 705)
  {
    search: `p.category === 'Producto Terminado' ? (`,
    replace: `p.category?.toLowerCase() === 'producto terminado' ? (`
  }
];

// Let's also verify Products.jsx line endings or duplicate entries. We run the patch first.
console.log("Applying patches for Products.jsx...");
patchFile(productsPath, productsPatches);

// 2. Patches for SalesContext.jsx
const salesContextPatches = [
  {
    search: `const isPT = item?.type === 'product' || item?.category === 'Producto Terminado';`,
    replace: `const isPT = item?.type === 'product' || item?.category?.toLowerCase() === 'producto terminado';`
  }
];
console.log("Applying patches for SalesContext.jsx...");
patchFile(salesContextPath, salesContextPatches);

// 3. Patches for Next.js Costos page.tsx
const nextCostosPatches = [
  {
    search: `.filter(i => i.category === 'Producto Terminado')`,
    replace: `.filter(i => i.category?.toLowerCase() === 'producto terminado')`
  },
  {
    search: `items.filter(i => i.category !== 'Producto Terminado' && i.stock > 0)`,
    replace: `items.filter(i => i.category?.toLowerCase() !== 'producto terminado' && i.stock > 0)`
  }
];
console.log("Applying patches for costos/page.tsx...");
patchFile(nextCostosPath, nextCostosPatches);

// 4. Patches for Next.js InventoryAgent.ts
const nextInventoryAgentPatches = [
  {
    search: `const isPT = item.type === 'PT' || item.type === 'product' || (item.category || '').includes('Producto Terminado');`,
    replace: `const isPT = item.type === 'PT' || item.type === 'product' || (item.category || '').toLowerCase().includes('producto terminado');`
  },
  {
    search: `const isMP = item.type === 'MP' || item.type === 'material' || (item.category || '').includes('Materia Prima') || (item.category || '').includes('Insumos');`,
    replace: `const isMP = item.type === 'MP' || item.type === 'material' || (item.category || '').toLowerCase().includes('materia prima') || (item.category || '').toLowerCase().includes('insumos');`
  }
];
console.log("Applying patches for InventoryAgent.ts...");
patchFile(nextInventoryAgentPath, nextInventoryAgentPatches);
