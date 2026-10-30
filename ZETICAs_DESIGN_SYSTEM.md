# MANUAL OFICIAL DE DISEÑO — ZETICAS OS (PORTAL OPERATIVO & E-COMMERCE)
> **Versión:** 4.0 (Edición Ejecutiva "Botanical Luxury & Swiss Precision ERP")  
> **Clasificación:** Contrato Canónico de Interfaz de Usuario (`SPEC.md` + `/disenador-web` + `/galeria-sticky-industrial`)  
> **Ecosistema:** `zeticas-next` (`https://zeticas.com` / `/gestion/*`)

---

## 1. Filosofía Visual: "Botanical Executive Luxury & Swiss Industrial Precision"

Zeticas combina dos mundos que deben sentirse igualmente **costosos, serenos y autoritarios**:
1. **Herencia Botánica & Sabiduría Ancestral (Storefront & Cabeceras):** Verde Petróleo Profundo (`#025357`), Champagne Ocre (`#D6BD98`) y Terracota Orgánico (`#D4785A`) sobre lienzos Alabastro Cálido (`#FDF8F6`).
2. **Precisión Suiza de Grado Financiero (Tablas, Telemetría y ERP `/gestion/*`):** Superficies blanco puro (`#FFFFFF`), bordes piedra de `1px` con contraste táctil, tipografía de alta legibilidad sin micro-textos lavados, alineación numérica monoespaciada (`tabular-nums`) y el **Protocolo Sticky Docked de 3 Niveles (`/galeria-sticky-industrial`)**.

> **Regla de Oro ("Debe Lucir Costoso"):**  
> Un software luce costoso cuando **no hay ruido visual, las jerarquías son nítidas al 100% de zoom, los números cuadran al píxel verticalmente, las superficies tienen profundidad arquitectónica sutil y ninguna etiqueta exige entrecerrar los ojos**.

---

## 2. Paleta Cromática Oficial (Tokens Semánticos)

### 2.1 Colores Institucionales & Superficies

| Token | Nombre | Valor Hex | Uso Autorizado |
| :--- | :--- | :--- | :--- |
| `--brand-primary` | **Deep Teal (Verde Petróleo)** | `#025357` | Topbar ejecutiva, títulos H1/H2, botones primarios, estados activos, cifras maestras. |
| `--brand-primary-dark` | **Abyssal Teal** | `#01383B` | Hover de botones primarios, gradientes ejecutivos profundos, cierres de tabla. |
| `--brand-ocre` | **Champagne Ocre (Oro Botánico)** | `#D6BD98` | Filetes de lujo (`border-[#D6BD98]/35`), indicadores activos en barra superior, badges VIP. |
| `--brand-salmon` | **Terracota / Salmón Sabana** | `#D4785A` | Acentos de acción táctica, iconos de subtítulo, alertas operativas de atención. |
| `--bg-canvas` | **Warm Alabaster (Lienzo ERP)** | `#FDF8F6` | Fondo general del área de trabajo en `<main>` del ERP. |
| `--bg-surface` | **Pure Porcelain (Tarjeta / Tabla)** | `#FFFFFF` | Fondo de tarjetas KPI, paneles `.glass-panel`, filas de tabla y modales. |
| `--bg-surface-muted` | **Stone Mist (Cabecera Tabla)** | `#F8F6F2` | Fondo **100% sólido** para cabeceras `<thead>` congeladas (`sticky`) y barras secundarias. |

### 2.2 Escala de Contraste de Texto (Prohibición de Grises Lavados)

Queda **TERMINANTEMENTE PROHIBIDO** usar `text-slate-300` o `text-slate-400` para textos informativos, encabezados de columna o etiquetas de KPI sobre fondos claros (`#FDF8F6` o `#FFFFFF`).

| Nivel | Propósito | Color Hex / Clase Tailwind | Ratio Contraste |
| :--- | :--- | :--- | :--- |
| **Texto Primario (Ink)** | Nombres de clientes, productos, montos totales | `#0F172A` (`text-slate-900`) o `#025357` | > 11:1 (AAA) |
| **Texto Secundario** | Subtítulos, descripciones operativas, ciudades | `#334155` (`text-slate-700`) | > 7.5:1 (AAA) |
| **Eyebrows & Table Headers (`<th>`)** | Encabezados de tabla, etiquetas de KPI, metadatos | `#475569` (`text-slate-600`) | > 5.2:1 (AA+) |
| **Texto Muted / Placeholder** | Placeholders de inputs, textos deshabilitados | `#64748B` (`text-slate-500`) | > 4.5:1 (AA) |

### 2.3 Semáforo Industrial de Estados (Píldoras de Alto Contraste)

- **Éxito / Pagado / Despachado / Stock OK:** Fondo `#ECFDF5` (`bg-emerald-50`), Texto `#047857` (`text-emerald-700`), Borde `#A7F3D0` (`border-emerald-200`).
- **En Proceso / Producción / Parcial / Advertencia:** Fondo `#FFFBEB` (`bg-amber-50`), Texto `#B45309` (`text-amber-700`), Borde `#FDE68A` (`border-amber-200`).
- **Crítico / Sin Stock / En Mora / Pendiente Urgente:** Fondo `#FFF1F2` (`bg-rose-50`), Texto `#BE123C` (`text-rose-700`), Borde `#FECDD3` (`border-rose-200`).
- **Informativo / B2B / En Ruta:** Fondo `#F0F9FF` (`bg-sky-50`), Texto `#0369A1` (`text-sky-700`), Borde `#BAE6FD` (`border-sky-200`).

---

## 3. Triplete Tipográfico & Escala de Tamaños

### 3.1 Familias Tipográficas

1. **Títulos Ejecutivos & Cifras de Impacto (`--font-serif` / `font-serif`):**  
   **`Fraunces`** (Variable Optical Serif). Aporta autoridad editorial, herencia botánica y distinción de marca de lujo en encabezados de módulo (`h1`, `h2`) y totales financieros de tarjetas maestras.
2. **Interfaz Operativa, Formularios y Tablas (`--font-sans` / `font-sans`):**  
   **`Plus Jakarta Sans`**. Geométrica, limpia y ultra-legible en densidades altas de datos.
3. **Telemetría, SKUs, Cantidades y Dinero (`--font-mono` / `font-mono tabular-nums`):**  
   **`JetBrains Mono` / `ui-monospace`** con `font-variant-numeric: tabular-nums`. **Obligatoria** en códigos SKU, NITs, órdenes (`ODP-`, `OC-`, `PED-`), cantidades de stock y columnas de moneda (`$`).

### 3.2 Escala Tipográfica Mínima en `/gestion/*` (Piso de Legibilidad)

> **VETO VISUAL:** Quedan prohibidos los tamaños `text-[7px]`, `text-[8px]` y `text-[9px]` en el portal operativo. En pantallas 1080p/1440p al 100% de zoom, cualquier texto menor a `11px` destruye la legibilidad ejecutiva.

| Elemento UI | Tamaño Mínimo | Peso | Tracking / Caso | Familia |
| :--- | :--- | :--- | :--- | :--- |
| **Título de Módulo (`H1`)** | `24px – 28px` (`text-2xl md:text-[28px]`) | `700` (`font-bold`) | `-0.02em` | `Fraunces` (`font-serif`) |
| **Valor KPI Principal** | `24px – 30px` (`text-2xl md:text-3xl`) | `800` (`font-extrabold`) | `-0.03em` | `Fraunces` o `Plus Jakarta` (`tabular-nums`) |
| **Título de Sección (`H2/H3`)** | `14px – 16px` (`text-sm md:text-base`) | `700` (`font-bold`) | `0.06em` / Uppercase | `Plus Jakarta Sans` |
| **Cuerpo de Tabla (`<td>`)** | `13px – 14px` (`text-[13px] md:text-sm`) | `500–600` | Normal | `Plus Jakarta Sans` |
| **Celdas Numéricas / Precios** | `13px – 14px` (`text-[13px] md:text-sm`) | `700` (`font-bold`) | `tabular-nums` | `font-mono` / `Plus Jakarta` |
| **Encabezado Tabla (`<th>`)** | **`11px`** (`text-[11px]`) | `700` (`font-bold`) | `0.10em` / Uppercase | `Plus Jakarta Sans` (`text-slate-600`) |
| **Eyebrow / Badge / Píldora** | **`11px`** (`text-[11px]`) | `700` (`font-bold`) | `0.08em` / Uppercase | `Plus Jakarta Sans` |

---

## 4. Distribución del Espacio y Densidad Arquitectónica

1. **Shell Operativo (`AdminLayout.tsx`):**
   - **Sidebar Izquierdo (`w-64` / `256px`):** Superficie `#FFFFFF` con borde derecho `#E2E8F0` (`1px`), navegación agrupada por flujo de valor con etiquetas de sección en `11px` `#475569` y estado activo en `#025357` con filete dorado `#D6BD98` y sombra suave.
   - **Topbar Ejecutiva (`h-16` / `64px`):** Fondo `#025357` con borde inferior champagne `border-b border-[#D6BD98]/30`, indicador de sincronización en vivo y credencial ejecutiva de usuario.
   - **Lienzo Principal (`<main>`):** Contenedor fluido `max-w-[1680px] mx-auto px-4 md:px-6 lg:px-8 py-5`.
2. **Prohibición de Doble Padding:**
   - Como `AdminLayout` ya provee el acolchado perimetral (`px-4 md:px-6 lg:px-8 py-5`), las páginas hijas (`/gestion/*/page.tsx`) **no deben añadir `p-8` ni `p-12` adicionales**, evitando márgenes muertos y maximizando el ancho útil para tablas financieras y operativas.
3. **Tarjetas Ejecutivas (`.glass-panel` / `.erp-card`):**
   - Fondo `#FFFFFF`, borde `1px solid rgba(2, 83, 87, 0.12)`, radio `16px` (`rounded-2xl`), sombra multicapa `0 10px 30px -10px rgba(2, 53, 57, 0.06), 0 2px 6px -1px rgba(2, 53, 57, 0.04)`.
   - En grillas de KPIs o *Flujo de Valor*, cada tarjeta debe tener un filete superior de acento o borde contrastado que la separe nítidamente del lienzo `#FDF8F6`.

---

## 5. Protocolo Sticky Docked de 3 Niveles (`/galeria-sticky-industrial`)

Toda galería o tabla maestra de operaciones (Ventas, Inventario, Compras, Producción, Logística, Cartera, Catálogo, Clientes, Proveedores, Gastos, Costos) debe implementar esta arquitectura de congelamiento al hacer scroll:

### Nivel 1 y 2: Barra de Control y Filtros Acoplada (`sticky top-0 z-30`)
- Se ubica inmediatamente encima de la tabla o galería.
- Utiliza la clase `.erp-sticky-dock` (`sticky top-0 z-30 bg-[#FDF8F6]/95 backdrop-blur-md py-3 border-b border-[#025357]/10 transition-all`).
- **Componentes obligatorios en línea:**
  1. **Buscador Omnibox Reactivo:** Input con icono `Search` a la izquierda, botón `X` a la derecha para limpiar en 1 clic (`searchTerm !== ''`), y borde activo `#025357`.
  2. **Píldoras de Filtro con Telemetría Viva:** Botones de estado/categoría que muestran el conteo real entre paréntesis o badge (ej. `Todos (48)`, `Pendientes (12)`).
  3. **Acciones Compactas (`shrink-0 whitespace-nowrap`):** Botones de exportación Excel y creación (`+ Nuevo...`) protegidos contra desbordamiento horizontal.

### Nivel 3: Cabecera de Tabla Congelada (`<thead>` `sticky z-20`)
- La tabla **no debe encerrarse en un `div` con altura fija pequeña (`max-h-[400px]`)**; debe fluir con el scroll natural del contenedor principal o usar un contenedor amplio con `border-separate border-spacing-0`.
- Cada `<th>` dentro de `<thead>` lleva fondo **100% sólido** (`bg-[#F8F6F2]` o `bg-slate-50`) para evitar que las filas de `<tbody>` se transparenten por detrás al desplazarse, acompañado de `border-b-2 border-[#025357]/15`.
- **Alineación Estricta de Columnas:**
  - Texto / Nombres / Clientes / Estados: `text-left`
  - Moneda (`$`), Cantidades, Costos, Márgenes (`%`): `text-right font-mono tabular-nums`
  - Acciones / Iconos operativos: `text-center` o `text-right`

---

## 6. Reglas de Higiene Visual (Zero-Emoji & Joyería UI)

1. **Cero Emojis en UI Operativa:** Ningún botón, encabezado, alerta o estado en `/gestion/*` puede usar emojis Unicode (`📦`, `💰`, `⚠️`). Se utilizan exclusivamente iconos vectoriales `lucide-react` con `strokeWidth={2}`.
2. **Inputs sin Spinners Nativos:** Todo `<input type="number">` oculta las flechas nativas del navegador para mantener la estética limpia de banca privada.
3. **Estados Hover de Precisión:** Las filas de tabla (`<tr>`) reaccionan con `hover:bg-[#025357]/[0.03] transition-colors` y las tarjetas interactivas con `hover:-translate-y-0.5 hover:shadow-lg hover:border-[#025357]/25`.

---

## 7. Arquitectura Canónica de Encabezados ERP & Ley Anti-Vibecoding (`v4.1`)

### 7.1 Prohibición Estricta de Cajas Apiladas (Zero Header Stacking)
Queda **terminantemente prohibido** apilar 2 o 3 cajas separadas en la parte superior de un módulo operativo (p. ej., una barra de pestañas suelta + una tarjeta de título `.glass-panel` + una barra de búsqueda `.erp-sticky-dock`). Todo módulo en `/gestion/*` debe usar **un único bloque canónico `.erp-sticky-dock` (`rounded-2xl p-4 mb-5 border border-[#025357]/12`)** con máximo 2 niveles internos:
- **Nivel Interno 1 (Identidad, Telemetría & Acción Primaria):**
  - **Izquierda:** Insignia cuadrada estandarizada (`w-10 h-10 rounded-xl bg-[#025357] text-[#D6BD98] flex items-center justify-center shadow-sm shrink-0` con icono `lucide-react` de `18px`) + `H1` en `Fraunces` (`text-xl md:text-2xl font-serif font-bold tracking-tight text-[#025357] leading-tight`) + subtítulo de **1 sola línea con conteo operativo real** (`text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5 tabular-nums`).
  - **Derecha:** Píldoras `MiniKPI` estandarizadas + selectores de vista principales + botón de acción primaria (`premium-btn primary text-[11px] py-2.5 px-4 shadow-sm whitespace-nowrap`).
- **Nivel Interno 2 (Omnibox & Filtros Segmentados, solo en módulos con tabla/listado):**
  - Separado por `mt-3.5 pt-3.5 border-t border-slate-200/70` dentro de la misma tarjeta `.erp-sticky-dock`.
  - Contiene el buscador Omnibox a la izquierda y los filtros segmentados / botón `Exportar` a la derecha.

### 7.2 Geometría Inmutable de `MiniKPI` (Prohibido el Salto de Línea)
Toda píldora `MiniKPI` en encabezados ERP debe usar `shrink-0 whitespace-nowrap` tanto en el contenedor como en el valor y la etiqueta para impedir cortes de palabra (como `"CUMPLIMIENT\nO"`):
```tsx
function MiniKPI({ label, value, color, icon }: any) {
    return (
        <div className="flex items-center gap-2.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-sm shrink-0 whitespace-nowrap">
            <div style={{ color }} className="w-7 h-7 rounded-lg bg-[#F8F6F2] border border-slate-200/60 flex items-center justify-center shrink-0">{icon}</div>
            <div className="leading-none">
                <p className="text-sm font-black tracking-tight tabular-nums whitespace-nowrap" style={{ color }}>{value}</p>
                <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mt-1 whitespace-nowrap">{label}</p>
            </div>
        </div>
    );
}
```

### 7.3 Ley Anti-Vibecoding (Soberanía Editorial y Cero Textos Pretensiosos)
- **Prohibidos los anglicismos y eslóganes grandilocuentes de plantilla:** Quedan erradicados términos como *"Central Warehouse Intelligence"*, *"Supply Chain Management"*, *"Production Command Center"*, *"Commercial Command Center"*, *"Customer Relationship Management"*, *"Master SKU Cloud"*, *"IA Strategic Monitor"*, *"IA Insight"*, *"Zeticas OS · Telemetría Ejecutiva en Tiempo Real"*, *"Sala de Mando Operativa & Financiera v2.0"* o *"Datos Reales de Delta"*.
- **Prohibidas las frases obvias de relleno:** No se permiten subtítulos genéricos que repitan el título (p. ej., *"Monitor de existencias, flujo logístico y auditoría"* o *"Control de órdenes de compra, pagos a proveedores y recepción de insumos"*). Todo subtítulo de módulo debe reportar una métrica viva o el alcance exacto de la vista en español sobrio y directo.

