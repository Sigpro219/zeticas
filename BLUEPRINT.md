# 🟦 Zeticas Operational Hub: Blueprint de Arquitectura y Flujos

Este documento técnico sirve como el plano maestro y guía de operación del sistema Zeticas SAS. Ha sido diseñado para que los dueños del proyecto y el equipo técnico comprendan la lógica de construcción, los flujos de datos y la integración de módulos bajo el estándar **"Industrial Premium"**.

---

## 1. Arquitectura General del Sistema
El sistema está construido sobre una infraestructura moderna, reactiva y escalable:

- **Frontend**: React.js con Vite (Alta performance).
- **Backend/Base de Datos**: Firebase Firestore (NoSQL Tiempo Real).
- **Estilo Visual**: Vanilla CSS con principios de diseño "Industrial Premium" (Glassmorphism, micro-animaciones, tipografía de alta jerarquía).
- **Gestión de Estado**: Context API (`BusinessContext`), centralizando la lógica de inventario, pedidos y sincronización de base de datos.

---

## 2. Flujos Operativos Críticos

### 🔄 A. Ciclo de Vida del Pedido (Comercial -> Logística)
1. **Captura (Módulo Sales)**:
   - Ingreso de pedidos vía canal manual o sincronización WEB.
   - Vinculación automática con el CRM para identificar perfiles de cliente y recurrencia.
   - Auditoría de estado de pago (Pagado/Pendiente).
2. **Monitorización (Ventas Dashboard)**:
   - Tablero segregado por estados: **Pendiente** (operativo inmediato) e **Histórico** (post-despacho).
3. **Logística (Módulo Shipping)**:
   - **Verificación**: Revisión de cantidades antes del despacho.
   - **Empaque**: Generación dinámica de etiquetas PDF configurables por "Frascos por Caja/Bulto".
   - **Despacho**: Registro de número de guía (Interapidísimo) y timestamp exacto de salida.

### 🏭 B. Flujo de Producción y Abastecimiento
1. **Planificación (Module Production)**:
   - Generación de Orden de Producción (ODP) basada en la demanda de ventas.
   - Idempotencia: El sistema evita duplicidad en la generación de órdenes.
2. **BOM (Bill of Materials) & Recipes**:
   - Cada producto terminado está vinculado a una receta (Insumos + Empaque).
   - Al finalizar una ODP, el inventario de insumos se deduce automáticamente y el de producto terminado (PT) se incrementa.

### 📦 C. Gestión de Inventarios y Costos
- **Costo Promedio**: Algoritmo de cálculo de costo basado en las últimas N compras para asegurar márgenes comerciales saludables.
- **Stock Crítico**: Alertas visuales cuando un SKU baja del umbral de seguridad.

---

## 3. Estructura de Datos (Esquema Firestore)

| Colección | Propósito | Campos Clave |
| :--- | :--- | :--- |
| `orders` | Registro central de transacciones | `id`, `client`, `amount`, `status`, `items[]`, `tracking_number` |
| `products` | Catálogo maestro de SKUs | `id`, `name`, `price`, `stock`, `cost`, `type (PT/Insumo)` |
| `recipes` | Fórmulas de producción | `productId`, `ingredients[]` (qty/unit) |
| `clients` | Base de datos CRM | `id`, `name`, `nit`, `address`, `parent_id` (Jerarquía) |
| `p_orders` | Órdenes de Compra (Proveedores) | `id`, `supplier_id`, `items[]`, `isReceived` |

---

## 4. Estándares de Diseño "Industrial Premium"
El sistema implementa guardas de software para asegurar que la experiencia sea fluida:
- **Confirmación en 2 Pasos**: Para acciones irreversibles como eliminar pedidos (Requiere escribir "ELIMINAR").
- **Responsividad Crítica**: Barras de utilidad y paneles laterales adaptables a dispositivos móviles para operación en bodega.
- **Identidad Visual**: Uso consistente de colores teal profundos (`#025357`) y ocres institucionales para reflejar la solidez de la marca.

---

## 5. Guía de Mantenimiento y Despliegue
- **Publicación**: A través del script `scripts/publish.mjs`. Este script automatiza el control de versiones, el build de producción y el deploy a Firebase Hosting.
- **Seguridad**: Reglas de Firestore y Authentication protegen el acceso según el rol del usuario (Admin/Operativo).

---
*Documento generado por Antigravity AI - Zeticas SAS Project Archive 2026.*
