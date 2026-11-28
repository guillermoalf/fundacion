# PROJECT_CONTEXT — Fundación Creciendo Feliz (public site + internal portal)

> Paste this file as the first message of a new AI chat, or hand it to a new developer. It summarizes what the app is, why it exists, how it is built, what has been decided and why, and how to work on it without breaking things.
>
> Companion files in the repo:
> - `AGENTS.md` (also loaded through `CLAUDE.md`): the binding working rules.
> - `docs/ARQUITECTURA.md`: the original architecture.
> - `docs/PROGRESO.md`: the module-by-module build log, partly outdated; see §9.
>
> If anything here conflicts with `AGENTS.md`, **`AGENTS.md` wins**.
>
> Last updated: 2026-11-28 (from code on `staging`).

---

## 1. What the app is

**Fundación Creciendo Feliz** is a non-profit daycare and kindergarten in Pavas, San José, Costa Rica.
- It cares for children of low-income working families.
- It also takes a few private, tuition-paying children.
- It is funded mostly with **public money**: PANI (Patronato Nacional de la Infancia), IMAS (Instituto Mixto de Ayuda Social) and JPS (Junta de Protección Social). The rest is its own funds and donations.
- Funders audit the foundation once or twice a year, so **every colón must be traceable**: to its funding source, to the invoice that supports it, and to the person who recorded it.

The repository contains two products served from one Next.js app on the domain `fundacioncreciendofeliz.com`:

| Part | URL | Audience | Notes |
|---|---|---|---|
| **Public landing site** | `/`, `/nosotros`, `/servicios`, `/admisiones`, `/donaciones`, `/contactenos` | Families, donors | Originally a Create React App site (2024–2025); migrated to Next.js in Nov 2026. Still plain JS + SCSS. Contact and admission forms send email via EmailJS. |
| **Internal admin portal** | `/portal/...` | Dirección (the directora), coordination, accounting, auditors, teachers | Replaces the foundation's Excel files: assets, purchases, inventory, staff, attendance, payroll, children, reports. |
| **Attendance kiosk** | `/marcar` | Staff without a computer or phone | A tablet at the entrance. Staff tap their photo and enter a 4-digit PIN to clock in or out. |

**Main user:** the **directora**, who is non-technical. UI copy is plain Spanish and addresses the user as "usted".

**Owner and developer:** Guillermo, the superadmin, who builds the app with AI agents. He writes in casual Spanish.

## 2. The problem we solve

Before the portal, everything lived in Excel files and paper. The pain points, and how the app answers each:

| Pain point | How the app addresses it |
|---|---|
| Audits by PANI / IMAS / JPS need each expense tied to a funder and to an invoice. The Contraloría had flagged the risk of reporting the same expense to two institutions. | Every amount (purchase, asset, salary) carries a `fuente_id`, and every report filters by funder. Invoices (photo, PDF or Hacienda XML) are attached to purchases, and assets link back to their invoice. |
| Fixed-asset register ("Auxiliar de activos fijos") kept by hand, with depreciation calculated in Excel. | The asset module calculates depreciation automatically from cost, purchase date and its Anexo 2 category, and exports the **exact official Excel layout**. |
| Missing data in the old Excel (no plate, no date, no cost). | Missing data stays `null`, is never invented, and shows up in **Pendientes** to be completed later without blocking anything. |
| Records could be silently changed or deleted. | **Nothing can be deleted** (the database blocks `DELETE`). Every insert or update is written to `bitacora` (audit log) with who did it and the before/after values. Only the superadmin can correct closed records, and must give a reason. |
| Staff attendance on paper; payroll in Excel; salaries paid from several funds. | Attendance comes from the kiosk (tablet + PIN) or from paper sheets typed in later. Payroll is calculated (CCSS, rent tax brackets, aguinaldo, vacation provisions) and each salary is split by fund. |
| Food and cleaning inventory and the monthly "Formulario N.º 1" control. | Inventory has entries and exits, alerts and monthly Excel/Word controls in the foundation's formats. |
| Children: attendance per subsidy, PANI socioeconomic studies that expire every 5 years. | Children registry, mobile roll call, monthly attendance Excel, and study expiry warnings in Notificaciones. |
| Funders ask for many different reports. | **Configurable reports** of assets, purchases or inventory, created by Dirección, each with its own filters and an Excel export. |

## 3. Core features (today)

Navigation (`src/app/portal/_ui/navegacion.ts`) groups the portal into sections.

### Inicio (`/portal`)
- **"Hoy" block:**
  - Children marked today out of the total, with a progress bar and a "Pasar lista" button.
  - Staff: who clocked in, who is absent and why, who has not clocked in yet.
- **"Por hacer":** one list ordered by urgency, built from `notificaciones()` plus payroll drafts, assets without location and assets with missing data.
- **Quick actions by role:** hardcoded in the `ACCESOS` map in `src/app/portal/(protegido)/page.tsx`.
- **Role `personal`:** is redirected straight to `/portal/ninos/lista`.

### Notificaciones (`/portal/notificaciones`)
- Lists PANI studies that are expired or about to expire, vacation requests waiting for approval, and products below their minimum stock.
- The sidebar bell shows a count badge.
- Logic: `src/lib/portal/notificaciones.ts`.

### Niños (children)
- **Registry (`/portal/ninos`, `/ninos/[id]`, `/ninos/nuevo`):**
  - Personal data, address, classroom, health information.
  - **Subsidy:** PANI or IMAS (`fuente_id`), **or Privado** (`ninos.privado`; tuition is not tracked). Never both.
  - Responsible adults: legal guardian, backup, who may pick up the child, with call and WhatsApp buttons.
  - Dated notes that cannot be edited. Withdrawal and re-entry (nothing is deleted).
- **Pasar lista (`/ninos/lista`):** mobile, one tap = saved (Llegó / No vino / Justificada).
- **Monthly attendance (`/ninos/asistencia`):** by subsidy and classroom, plus an Excel export (`src/lib/export/asistenciaNinos.ts`).
- **PANI socioeconomic studies (`/ninos/estudios`):**
  - History of studies (never edited), with the date each was done and its expiry date.
  - Warnings at 6 months (aviso) and 3 months (urgente). The thresholds come from `parametros`.

### Activos (fixed assets)
- **List (`/portal/activos`):**
  - All durable items (rule 6 in §10). Each location shows as a colored tag.
  - **Disposed assets are excluded** from this list.
- **Detail (`/activos/[id]`):** shows the depreciation schedule, the invoice and its files, the other units from the same purchase, and the movement history. Actions on the page:
  - **Traslado:** move to another location.
  - **Boleta de egreso:** the asset leaves for review or repair. It becomes `en_reparacion`, a movement of type `reparacion` is saved with the document, and a banner with a link to the document appears. **"Ya regresó"** records a `retorno` and sets it back to `en_uso`.
  - **Dar de baja:** dispose of it, with a reason and the file "Acta y/o revisión de técnico".
  - **Revertir baja:** superadmin only.
- **Desecho de activos (`/activos/desecho`):** disposed assets, each with its acta.
- **Ubicaciones (`/activos/ubicaciones`):** pick a color for each location (`ubicaciones.color`), add locations.
- **Importar Excel (`/activos/importar`):** upload the foundation's asset Excel.
  - The preview shows every column the Excel brings (tipo de bien, marca, modelo, serie, placa, date, cost, accumulated depreciation, book value) plus the suggested category and what is missing.
  - Everything is saved in one transaction.
- **Etiquetas (`/activos/etiquetas`):** A4 label sheets (3×8) with the plate number and a QR code that opens the asset.
- **Pendientes (`/portal/pendientes`):** one row per asset with "N pendientes"; an ⓘ tooltip lists what is missing. The source is the view `v_activos_alertas`.
- **Tabla de depreciación (`/portal/depreciacion`):** the Anexo 2 rows (rate and useful life) used by the system. Only Dirección edits them.
- **Conteo físico (`/portal/conteos`):** count a room from a phone (scan the QR or type the plate). When the count is closed, it produces a printable acta to sign and upload.

### Compras (purchases) and inventory
- **Compras:**
  - Register an invoice, with several files (PDF, photo, **Hacienda e-invoice XML**, which auto-fills supplier, number, date, VAT and lines).
  - Each line is *activo*, *consumible* or *servicio*. A line can later be moved from inventory to assets ("Pasar a activos").
  - Supports "same category for all lines" for large invoices.
  - Drafts are saved in the browser (§5).
- **Proveedores:** suppliers with their usual products, and a "Hacer pedido" screen that suggests what is missing to reach the minimum and can be copied to WhatsApp.
- **Inventario:**
  - Balances with minimum and expiry alerts, prices with VAT and the change versus the previous price.
  - Exits, shrinkage and donations. History of entries and exits (formerly "Kárdex"). Monthly consumption.
  - **Monthly controls** at the bottom of the page: Formulario N.º 1 for food and for cleaning supplies (Excel) and the cleaning control (Word).
- **Productos / Categorías de inventario:** categories are an editable table, `categorias_producto`.

### Personal (staff)
- **Staff records:** each with a weekly schedule (with a "same Monday–Friday" shortcut) and a 4-digit PIN for the kiosk.
- **Salaries:** in `salarios`, with history. Each salary can be **split between funds** (`salario_aportes`: fixed amounts per fund plus at most one "el resto").
- **Asistencia:** kiosk clock-ins plus manual clock-ins typed from paper sheets, a monthly summary of late arrivals and hours, and absences (vacations, CCSS/INS sick leave, licenses, permits).
- **Vacaciones:** staff request their own vacations from their user account; Dirección approves them.
- **Planilla (payroll):** monthly, calculated automatically.
  - Calculates CCSS employee and employer charges, rent tax by bracket, aguinaldo and vacation provisions, and deductions for absences.
  - Flow: draft → approved → paid (or annulled).
  - Excel export split by fund.
- **Parámetros legales:** rates and legal values with effective dates.

### Reportes (`/portal/reportes`)
A single report builder. The **lists stay unfiltered and every rule lives in a report**. Each report has a `tipo`:
- **Activos:**
  - Format **Auxiliar de activos fijos**: the official PANI layout, with funds, a minimum amount (e.g. 25 % of the base salary, updated automatically), classrooms, categories, dates and statuses.
  - Format **Conteo**: how many items exist, in which classrooms and in which status. For internal control, e.g. "how many baby chairs do we have".
- **Compras:** what was bought in a period, by fund, supplier or category. Amounts include VAT. Example: "meat purchases of the month for the JPS".
- **Inventario:** per product: opening balance, entries, exits, adjustments and closing balance for the period.

Every report has a screen preview and an Excel export. The cut-off date (assets) or the period (purchases and inventory) is chosen when viewing or exporting. The ⋮ menu next to "Categorías" creates, renames and "deletes" (deactivates) categories.

### Administración
- **Usuarios:** create a user with a temporary password (shown once; there is no SMTP), change role, deactivate, reset the password. The superadmin also sees the database storage used here.
- **Kiosko:** register tablets.
- **Bitácora:** the audit log, with a "Corregir este registro" link (superadmin).
- **Corregir (`/portal/corregir`):** generic editor for audited corrections, with a mandatory reason.
- **Mi cuenta:** change the password and the **profile photo**, which replaces the initial in the menu.

### Roles
- **superadmin:** Guillermo. Everything, including corrections of closed records.
- **admin:** Dirección.
- **coordinacion:** sees staff, but not salaries.
- **contabilidad:** no access to children's data.
- **auditor:** read-only, with an expiry date (`acceso_hasta`).
- **personal:** teachers and caregivers. Only pass roll call (today only) and see children and their contacts. No notes, nothing administrative.

## 4. Tech stack

| Layer | Choice | Why (where evident) |
|---|---|---|
| Framework | **Next.js 15.5 (App Router)**, React 19 | Migrated from CRA in Nov 2026 to have server components and actions for the portal in the same app as the landing site. |
| Language | **TypeScript (strict)** in the portal and `src/lib`; **JavaScript** in the landing (`src/views`, `src/components`) | The landing was kept as-is from CRA. Do not migrate it to TypeScript unless asked. |
| Styling | **Tailwind CSS 3** in the portal; **SCSS** (`sass`) in the landing | The landing CSS order matters (`src/app/(sitio)/layout.tsx`). |
| Database | **PostgreSQL 17 on Neon** (serverless Postgres, free plan) | Started on Supabase. Moved to Neon + Better Auth on 2026-11-16, so that permissions live in Postgres RLS and the app does not depend on Supabase (rationale inferred from the commit; see §7). |
| Query builder | **Kysely** + `kysely-codegen` (types generated into `src/lib/db/tipos.ts`) | Type-safe SQL, works with RLS through a plain `pg` connection. |
| Migrations | **dbmate** (`db/migrations/*.sql`), run by `scripts/db.mts` | Plain SQL migrations. Vercel runs them on every production deploy. |
| DB tests | **pgTAP** (`db/tests/*.test.sql`), in a local Docker Postgres (`docker-compose.yml`, `db/Dockerfile`) | Tests RLS, triggers and business rules in the database itself. |
| Auth | **Better Auth** (email + password, sign-up disabled), sessions in table `sesiones` | Lives in the same database; no public `/api/auth` routes (Server Actions call `auth.api.*`). |
| Unit tests | **Vitest** | Calculations, parsers and report logic. |
| Excel / Word | **exceljs**, **docx** | Official report layouts (PANI Auxiliar, Formulario N.º 1, cleaning control, payroll per fund, generic tables). |
| XML | **fast-xml-parser** | Costa Rica e-invoices from Hacienda (v4.3/4.4). |
| Icons / UI | **lucide-react** (portal); `react-icons`, `swiper`, `framer-motion`, `sweetalert2`, `react-scroll` (landing) | |
| QR | **qrcode** | Asset labels. |
| Email (landing) | **EmailJS** (`@emailjs/browser`) | Contact and admission forms without a backend. |
| Hosting | **Vercel**. Production branch = **`staging`** → `fundacioncreciendofeliz.com` | `vercel-build` = `npm run db:migrar && next build`. |
| Package manager | **npm** (`package-lock.json`) | |

## 5. Architecture overview

### Request and data flow

```
Browser ──► src/middleware.ts                       (/portal/*: is there a Better Auth session cookie? if not → /portal/login)
        ──► Server Component page.tsx               (obtenerSesion() → { usuario, perfil, consultar, flags… })
              └─► consultar(tx => …)                 (= conUsuario(): transaction → SET role app_portal, app.usuario_id)
                    └─► Postgres RLS + triggers      (permissions, no-DELETE, locks, audit log → bitacora)
        ──► Client components                        (never touch the DB; call Server Actions in acciones.ts)
              └─► Server Action → ejecutar(fn)       (returns { ok: true, … } | { ok: false, error }; friendly Spanish errors)
```

- **`src/lib/db/index.ts`: `conUsuario(usuarioId, fn)`.** The only door to the database.
  - It opens a transaction as the owner connection, then does `set_config('role','app_portal')` and `set_config('app.usuario_id', …)`.
  - `app_portal` owns nothing, has no `DELETE`, and is always subject to RLS.
  - The RLS helper functions read `app.usuario_id`: `rol_actual()`, `puede_leer()`, `puede_escribir()`, `es_admin()`, `es_superadmin()`, `ve_salarios()`, `edita_salarios()`, `ve_ninos()`, `ve_notas_ninos()`, `edita_ninos()`, `pasa_lista()`, `mi_empleado()`, `correccion_autorizada()`.
- **`src/lib/db/conexion.ts`: owner connection (bypasses RLS).** ESLint blocks importing it, or `pg`, anywhere in `src/` except:
  - Better Auth (`src/lib/auth.ts`).
  - The kiosk server code (`src/lib/kiosko.ts`, routes under `src/app/marcar/`).
  - `src/lib/db/index.ts`.
  - Scripts under `scripts/`.
- **`src/lib/portal/sesion.ts`: `obtenerSesion()`.** Cached per request. Returns the user, profile, role flags (for **UI only**) and `consultar`. **Permissions are decided only by RLS**; the UI hides buttons for convenience.
- **Middleware** only checks that the session cookie exists (it doesn't load Better Auth, which is not Edge-compatible). Pages validate the session for real.
  - The matcher excludes paths with a dot, so file downloads are served from route handlers **without an extension** (`…/descargar`). Each of those handlers checks the session itself.
- **Files (photos, PDFs, XML)** are stored **in Postgres** (table `archivos`, `bytea`), under the same RLS.
  - Upload: `<CampoArchivo>` compresses photos in the browser (1600 px, JPEG 80 %) and uploads in 3 MB parts to `/portal/archivos/subir` (`archivos_partes` → `completar_archivo()`). Vercel caps requests at 4.5 MB.
  - Serve: `/portal/archivos/<id>`. Columns named `*_url` store that path.
  - Profile photos use their own table (`fotos_perfil`, 256 px JPEG) and route (`/portal/fotos/<id>?v=…`).

### Folder structure (main parts)

```
src/app/(sitio)/                 landing pages; each page.tsx only imports its view from src/views
src/views, src/components        landing (JS, each component with its own .scss)
src/app/portal/login/            login
src/app/portal/(protegido)/      protected portal: <route>/page.tsx + acciones.ts (Server Actions) + PascalCase client components
src/app/portal/_ui/              shared UI: Menu (+ navegacion.ts), Encabezado, Tabla, Formulario (FormularioAccion, BotonEnviar,
                                 CampoArchivo), Borrador, Avisos, Insignias (Falta), Vacio, estilos, preferencias
src/app/portal/archivos/, fotos/ file upload/serve routes
src/app/marcar/                  attendance kiosk (tablet + PIN), server side in src/lib/kiosko.ts
src/lib/calculos/                SOURCE OF TRUTH for calculations: depreciation, payroll, VAT prorating, children ages/attendance, study expiry
src/lib/catalogos/anexo2.ts      Anexo 2 rows + sugerirCategoria (category suggestion by item name)
src/lib/importacion/             asset Excel importer (activosExcel.ts, guardar.ts), Hacienda XML parser (facturaElectronica.ts)
src/lib/export/                  Excel/Word generators: reporteActivos (Auxiliar layout), reporteTabla (generic), auxiliarPani,
                                 controlInventario (Formulario N.º 1), controlLimpieza (Word), planillaPorFuente, asistenciaNinos
src/lib/reportes/                report logic without DB: activos.ts (config, filters, grouping, conteo), inventario.ts (compras, inventario)
src/lib/portal/                  portal helpers: sesion, acciones (ejecutar + errors), formato (es-CR, Costa Rica time), archivos,
                                 activos, asistencia, planilla, precios, reportes (data loaders), notificaciones, estudios,
                                 vacaciones, ninos, ubicaciones, fotos, catalogos, correcciones
src/lib/db/                      index.ts (conUsuario), conexion.ts (owner; don't import), orden.ts (alfa: accent/case-insensitive
                                 ordering), tipos.ts (GENERATED)
src/lib/auth.ts                  Better Auth config
src/middleware.ts                landing redirects + /portal cookie check
db/migrations/                   dbmate SQL migrations · db/seed.sql (generated by scripts/generar-seed.ts) · db/tests (pgTAP)
scripts/                         db.mts (migrar/reset/test + superadmin assignment), crear-admin.mts, generar-seed.ts,
                                 migrar-excel.ts, generar-paridad-depreciacion.ts
docs/                            ARQUITECTURA.md, PROGRESO.md
```

### Important patterns
- **Server Actions** return `Resultado` (`{ ok: true, … } | { ok: false, error }`) through `ejecutar()` (`src/lib/portal/acciones.ts`). `ejecutar()` maps Postgres errors to plain Spanish:
  - `42501` → no permission.
  - `P0001` → the exact message from a trigger.
  - `23505` → duplicate.
  - …and so on for the other codes.

  `ErrorUsuario` carries a message meant for the user.
- **Forms use `<FormularioAccion>`, never `<form action>`.** React 19 resets a `<form action>` even when the save fails, which would wipe what the user typed. `FormularioAccion` also supports `borrador`: a draft saved in `localStorage` per user, under the key `fcf:borrador:<user>:<name>`, with a "Volver al borrador" prompt.
- **Lists always use `_ui/Tabla`.**
  - Built in: search, multi-filters, range filters (when `orden` values are numbers or `YYYY-MM-DD`), sorting, pagination, cards on mobile.
  - Per-user column chooser and order, saved in `preferencias_tabla`; extra columns are declared with `oculta: true`.
  - Cell types: badges, links, detail lines, the `ayuda` tooltip (ⓘ), and `color` tags (`Etiqueta`).
- **Alphabetical order:** use `alfa(col)` (`src/lib/db/orden.ts`), which sorts ignoring case and accents.
- **Constants shared by server and client** live in files without `"use client"`. Otherwise the server receives them as client references.
- **Formatting:** colones and dates with `es-CR`, always in Costa Rica time (`src/lib/portal/formato.ts`: `colones`, `fecha`, `hoyCR`, `rangoMes`, …). The database itself runs in Costa Rica time (migration `20261104000003`).
- **Menu:** collapsible icon sidebar with a sliding "bubble", in the kindergarten palette (`FONDO #14284b`, `CREMA #fff6d6`). The `insignias` prop shows badges, and the bottom shows the profile photo or the initial (`_ui/Menu.tsx`).

## 6. Data model

Main tables (all created by migrations in `db/migrations/`; generated types in `src/lib/db/tipos.ts`).

| Domain | Tables / views | Notes |
|---|---|---|
| Auth (Better Auth) | `usuarios`, `sesiones`, `cuentas`, `verificaciones` | Not readable by `app_portal`; excluded from codegen. |
| Profiles and roles | `perfiles` (id = usuario id, `rol`, `activo`, `acceso_hasta`), `fotos_perfil` | Enum `rol_portal`: superadmin, admin, coordinacion, contabilidad, auditor, personal. Nobody can change their own role or deactivate themselves (trigger). Only a superadmin grants superadmin. |
| Funding | `fuentes_financiamiento` (PANI, IMAS, JPS, PROPIOS, DONACION) | Referenced by purchases, assets, salary splits and children's subsidy. |
| Locations | `ubicaciones` (`nombre`, `tipo`, `color`, `activo`) | Color null = automatic palette (`colorUbicacion`). |
| Assets | `activos`, `activo_movimientos` (`alta`, `traslado`, `reparacion`, `retorno`, `baja`, `ajuste`), `categorias_activo` (Anexo 2: `tasa_anual`, `anios_vida`, `palabras_clave`, `activa`), view `v_activos_alertas` | Asset status: `en_uso`, `en_reparacion` ("en revisión o reparación"), `en_bodega`, `extraviado`, `dado_de_baja` (requires `fecha_baja`). A plate number is unique among assets that are not disposed. A category's rate cannot change once assets use it (trigger); a category is retired with `activa = false`. `revertir_baja()` is superadmin-only. |
| Physical counts | `conteos_fisicos`, `conteo_detalle` | Locked once closed (trigger); the acta can be uploaded only once. |
| Purchases | `proveedores`, `compras` (`fuente_id`, `iva`, `total`), `compra_lineas` (`tipo` activo/consumible/servicio, `iva_linea` from the XML), `compra_archivos`, view `v_precios_producto` | Line VAT: from the XML, or prorated (`ivaPorLinea` in `src/lib/calculos/precios.ts`). |
| Inventory | `productos` (`categoria` → `categorias_producto.codigo`, `stock_minimo`), `inventario_movimientos` (`entrada`, `salida`, `merma`, `ajuste`), `categorias_producto` (`reporte` = alimentos/aseo/ninguno decides Formulario N.º 1), view `v_saldo_inventario` | An inactive category cannot be assigned (trigger). |
| Staff | `empleados` (`perfil_id` links to a portal user), `empleados_pin` (scrypt hash, not readable by `app_portal`), `horarios` (with validity dates), `salarios` (history by `vigente_desde`), `salario_aportes` (split by fund) | Salary tables are readable only through `ve_salarios()`: admin, contabilidad, auditor. |
| Attendance | `marcas` (`origen`: kiosko / hoja_firmada / manual), `ausencias`, `solicitudes_vacaciones`, `dispositivos_kiosko` (SHA-256 of the device token), `intentos_pin` (rate limiting) | `resolver_vacaciones()` approves a request and creates the absence. |
| Payroll | `planillas` (borrador → aprobada → pagada / anulada), `planilla_lineas` (`reparto_fuentes` freezes the split by fund), `parametros` (legal values with `vigente_desde`), `tramos_renta` | Amounts are frozen on approval (trigger). |
| Children | `ninos` (`fuente_id` XOR `privado`), `responsables_nino`, `notas_nino`, `asistencia_ninos`, `estudios_socioeconomicos` | Notes and studies are never edited. Visibility via `ve_ninos()` / `ve_notas_ninos()`. |
| Reports | `reportes` (`tipo` activos/compras/inventario, `config` jsonb, `activo`) | Renamed from `reportes_activos` on 2026-11-27. Only admin writes. |
| Cross-cutting | `bitacora` (audit log: table, record, action, before/after, user, `motivo`), `archivos`, `archivos_partes`, `preferencias_tabla` | |

**Important SQL functions:**
- `depreciacion_acumulada(...)`: mirror of the TypeScript calculation.
- `activos_al_corte()`.
- `umbral_activo(fecha)` = `salario_base` × `baja_cuantia_pct_salario_base` %.
- `espacio_usado()`: superadmin only.
- `crear_usuario_portal`, `restablecer_contrasena_portal`, `usuarios_portal`: security definer, admin only.
- `asignar_pin_empleado`, `resolver_vacaciones`, `anular_solicitud_vacaciones`.
- `completar_archivo`.
- `tablas_corregibles()`: used by `/portal/corregir`.
- `correccion_autorizada()`.
- `revertir_baja()`.

**Business rules enforced in the database:**
- No `DELETE` on any audited table (trigger `bloquear_delete`).
- Audit trigger on every table (`registrar_bitacora`; for `archivos` and `fotos_perfil`, `registrar_bitacora_archivo` leaves out the binary content).
- Lock triggers on closed or approved records. They let a change through only when `correccion_autorizada()` is true, which means superadmin plus a reason in `app.motivo`.

## 7. Problems we've solved (and why)

| # | Problem | Solution | Why this approach | Where |
|---|---|---|---|---|
| 1 | Permissions must be trustworthy for audits, not just hidden buttons. | All permissions in **Postgres RLS**. Every query runs as `app_portal` with `app.usuario_id` set. | The UI can be wrong; the database can't be bypassed. The same mechanism feeds the audit log. | `src/lib/db/index.ts`; RLS in `db/migrations/20261103000001_esquema_base.sql` and later migrations; tests in `db/tests/rls.test.sql`. |
| 2 | Moving off Supabase. | Migrated to **Neon + Kysely + Better Auth** (2026-11-16). | Postgres-native RLS through a plain connection, and auth in the same database. Exact motivation (cost? control?): **Unclear / needs confirmation**. | `src/lib/auth.ts`, `src/lib/db/*`. |
| 3 | Deleting or silently changing records ruins traceability. | No-DELETE trigger, audit log on every write, statuses instead of deletes, superadmin corrections with a mandatory reason. | Auditors must be able to see the full history. | `bloquear_delete`, `registrar_bitacora`; migrations `20261117000004/5`; `/portal/corregir`. |
| 4 | Depreciation must match the foundation's Excel to the colón and be the same in the UI and in SQL reports. | One formula in TypeScript (`src/lib/calculos/depreciacion.ts`) and SQL (`depreciacion_acumulada`), with a **parity test** against generated cases. Straight line, starts the month after purchase, capped at cost. | Reports run in SQL and screens in TypeScript; a mismatch would be visible to auditors. | `paridad.test.ts`, `paridad-sql.json`, `scripts/generar-paridad-depreciacion.ts`. |
| 5 | Missing data in the legacy Excel. | Missing values stay `null`; **Pendientes** (`v_activos_alertas`) lists them; nothing blocks saving. | Inventing zeros would falsify reports. | `/portal/pendientes`, `src/lib/importacion/activosExcel.ts`. |
| 6 | Files over Vercel's 4.5 MB request limit, and a separate storage service with its own credentials and permissions. | Files in Postgres (`archivos`), compressed in the browser, uploaded in 3 MB parts. | Same RLS, testable with pgTAP, works locally. Could move to Vercel Blob later if Neon's 1 GB fills up. | `_ui/Formulario.tsx` (`CampoArchivo`), `/portal/archivos/subir`, migration `20261117000002`. |
| 7 | React 19 resets `<form action>` after submit, even on failure. | `<FormularioAccion>` wraps forms and keeps the values when there is an error. | The directora was losing what she typed. | `src/app/portal/_ui/Formulario.tsx`. |
| 8 | Downloads blocked by the middleware or served without a session check. | Routes without a dot (`…/descargar`), and each handler checks the session. | The middleware matcher skips paths with a dot. | `src/middleware.ts`; every `descargar/route.ts`. |
| 9 | Kiosk security: a 4-digit PIN can be guessed in seconds if its hash is readable. | PIN hash in `empleados_pin`, which `app_portal` cannot read. The device token is an httpOnly cookie (SHA-256 stored). Rate limits: 5 wrong PINs per person or 20 per tablet in 15 minutes (`intentos_pin`, works across Vercel instances). | Staff have no accounts; the tablet is the trust anchor. | `src/lib/kiosko.ts`, migrations `20261116000003/4`. |
| 10 | Salaries visible to everyone with read access. | Moved to `salarios`, readable only via `ve_salarios()`. | Privacy: coordination should not see salaries. | Migration `20261117000001`, test `salarios.test.sql`. |
| 11 | Salaries paid by two funds (e.g. part PANI, the rest IMAS). | `salario_aportes` (fixed amounts per fund + one "el resto"). Each payroll line freezes its split in `reparto_fuentes`. | Past payrolls must not change when the split changes. | `repartoSalario` (calculos/planilla.ts), `lineaPorFondo` (portal/planilla.ts). |
| 12 | Previews filled Neon's 10-branch limit and failed (each preview created a Neon branch). | `vercel.json` disables deployments for `portal/*`, `sitio/*` and `docs/*`. Only `staging` deploys. | Free plan limits; review is done locally. | `vercel.json`. |
| 13 | The PANI 25 %-of-base-salary rule was hardcoded into asset registration and blocked small purchases. | **Decision 2026-11-24/27:** assets have no minimum. Thresholds live only in configurable **reports**, which now cover assets, purchases and inventory. | The foundation wants to track everything room by room; each funder asks for different cuts. | `src/lib/reportes/*`, `src/lib/portal/reportes.ts`, `/portal/reportes`, migrations `20261124000003`, `20261127000002`. |
| 14 | Disposed assets cluttered the asset list. | Excluded from Activos; separate **Desecho de activos** page with the acta; superadmin-only `revertir_baja()`, which needs a reason. | Requested by the foundation; testing disposals needed an undo. | `/activos/desecho`, migration `20261127000001`. |
| 15 | Sorting broke with capital letters and accents. | `alfa(col)` = `lower(translate(...))`. | Spanish names (Á, É, Ñ…). | `src/lib/db/orden.ts`. |
| 16 | Purchase prices shown without VAT were misleading. | Always show prices with VAT, plus a small breakdown. VAT comes from the XML per line, or is prorated. | Matches what was actually paid. | `src/lib/calculos/precios.ts`, `src/lib/portal/precios.ts`. |
| 17 | Hours and dates shifted by the UTC offset. | The database runs in Costa Rica time; the formatting helpers use the Costa Rica time zone. | Clock-ins and late arrivals must use local time. | Migration `20261104000003`, `src/lib/portal/formato.ts`. |
| 18 | Mobile views overflowing (tables, badges, selects). | Card layout in `Tabla` with wrapping badges; `w-full` filters on mobile; a script that checks overflow at 390 px. | Physical counts and roll call are done on phones. | `_ui/Tabla.tsx`, various pages. |
| 19 | Children's real data must never reach the public repo. | Real data loaded straight into Neon through a SQL script that never touched the repo. `.gitignore` excludes `data/` and importer fixtures. | The repo is public. | `.gitignore`; rule in `AGENTS.md`. |
| 20 | Rent tax and legal rates change every year. | `parametros` and `tramos_renta` with effective dates, edited in `/portal/parametros`. | Changing a rate must not alter past calculations. | Migration `20261117000003`; `calcularImpuestoRenta`. |

## 8. Work history / timeline

- **2024-08 → 2025-11 — Landing site (Create React App):** home, Nosotros, Servicios, Admisiones, Donaciones and Contáctenos (EmailJS, SweetAlert), plus responsive fixes. A first "admin dashboard" (2025-11-12) was later dropped: `/admin` now redirects to `/`.
- **2026-11-03/04 — Migration and core:**
  - Migrated the site to Next.js 15 (App Router).
  - Integrated the portal core (originally on Supabase): calculations, Excel importer, PANI export.
  - Database rules: views with `security_invoker`, depreciation parity, Costa Rica time zone, depreciation table rules, transactional import.
- **2026-11-15 — Process:** `AGENTS.md`/`CLAUDE.md` working rules; `staging` branch flow; "Ingresar" link to the portal.
- **2026-11-16 — Big build day:**
  - Migration **Supabase → Neon + Kysely + Better Auth**.
  - Then, module by module: UI base and attachments, users, assets, Pendientes, editable depreciation table, PANI report, suppliers and purchases, inventory, staff (schedule, PIN), kiosk, absences and vacations, payroll and aguinaldo, physical counts, audit log viewer, home.
- **2026-11-17 — Hardening:**
  - Salaries restricted.
  - Chunked uploads.
  - Rent-tax brackets.
  - Inventory and cleaning controls matched to the foundation's templates.
  - Superadmin role with audited corrections.
- **2026-11-18 — Purchases:** e-invoice XML, small-value threshold, assets without location, supplier orders.
- **2026-11-19:**
  - Children module and the `personal` role.
  - Liquid icon sidebar.
  - Browser drafts.
  - Editable product categories.
  - "Same category for all lines".
  - Prices with VAT and history.
  - Per-user list columns.
  - Salary split by fund, vacation requests.
- **2026-11-20:**
  - Previews disabled.
  - Numbered staff list.
  - Automatic merge to `staging`.
  - Notorious Fruits products.
  - Accent-insensitive sorting.
- **2026-11-24:**
  - PANI socioeconomic studies (expiry, history, warnings).
  - Inventory items added to the menu.
  - **Configurable asset reports**; minimum amount removed from assets; "Pasar a activos".
- **2026-11-25:**
  - Pendientes simplified (ⓘ tooltip).
  - Notificaciones page with a bell badge.
  - Importer preview shows every column.
  - Mobile fixes.
  - Profile photo.
  - **New home page**.
  - Children subsidy "Privado" (PANI / IMAS / Privado only).
- **2026-11-27:**
  - Desecho de activos, revert disposal, location colors.
  - Reports page reduced to title + list; monthly controls moved to Inventario.
  - **Reports generalized** (activos/compras/inventario, conteo format, category ⋮ manager).
  - **Boleta de egreso**.

## 9. Current state

**Finished and in production:** everything listed in §3. Production = the `staging` branch on Vercel; migrations are applied on every deploy.

**Pending / waiting on the foundation:**
- **Time clock import:** a physical clock ("reloj marcador") may be used. Its export file format has not been provided.
- **Official IMAS / JPS liquidation formats:** not provided yet. Reports use generic layouts for now.
- **Configurable payroll and Formulario N.º 1 reports:** Guillermo asked whether they could also become configurable; not requested yet.
- **Formats not yet official:** monthly children's attendance uses its own format until the official IMAS/PANI format arrives.
- **Asset Excel in production:** "Activos 2026 PANI" was tested locally (126 assets). Whether it has been imported in production: **Unclear / needs confirmation**.
- **Anexo 2 rows G–Z:** only A–F were provided (see `docs/ARQUITECTURA.md`).

**Known issues and tech debt (from `AGENTS.md` + code):**
- No password recovery by email (no SMTP). The admin generates a temporary password instead.
- `npm audit` reports 23 vulnerabilities to review (3 critical).
- CRA leftovers: `public/index.html`, `src/components/Button.js`, `src/assets/not-used/`.
- Duplicate or obsolete docs: `CONFIGURACION_EMAILJS.md`, `EMAILJS_SETUP.md`, `QUICK_SETUP.md` (should be merged into the README); `DEBUG_DONACIONES.md` is obsolete.
- The README doesn't explain how to run the project; see §11.
- `docs/PROGRESO.md` is partly outdated. It still says, for example, that "a disposal cannot be undone" and describes the old fixed PANI report and the old home page.
- `/portal/reportes/pani/descargar` (the old fixed PANI report) is **no longer linked** from the UI; probably dead code since configurable reports exist. **Needs confirmation before removing.**
- Local seed vs. production: `db/seed.sql` loads *after* migrations on `db:reset`. Migrations that modify seeded rows are therefore no-ops locally, though they work in production (where the seed already exists). Example: retiring Anexo 2 categories in `20261127000002_reportes_generales.sql`. The seed was not regenerated.
- Pending launch checks: the 301 redirects for capitalized URLs, and the EmailJS forms.
- Rent-tax credits for children and spouse are not applied (the system doesn't store those data).
- Late-arrival deductions: the amount depends on an internal regulation that hasn't been provided; only the count is shown.

## 10. Gotchas & conventions (read before changing anything)

**Business rules (non-negotiable; full list in `AGENTS.md`):**
1. **Never DELETE.** Use statuses (`dado_de_baja`, `anulada`, `activo = false`). New tables need: RLS, the audit trigger, the no-delete trigger and a pgTAP test. New lock triggers must allow `correccion_autorizada()`.
2. **Every query goes through `conUsuario()` / `obtenerSesion().consultar`.** Never import `@/lib/db/conexion` or `pg` in `src/`; ESLint blocks it. Allowed exceptions: Better Auth, the kiosk and `scripts/`.
3. **Permissions only in RLS.** UI flags (`esAdmin`, …) are cosmetic.
4. **Calculations only in `src/lib/calculos`**, with their SQL mirror kept in parity. Never compute depreciation, aguinaldo or payroll charges inside components.
5. **Missing data = `null`**, never 0.
6. **Activos = everything durable** (pencils to computers, any price, any fund). **Inventario = consumables.** No conditions on the lists; rules live in reports.
7. **Every amount has a `fuente_id`.** Rates and legal values live in `parametros` / `tramos_renta` / `categorias_activo` with effective dates, never in code.
8. **Funder reports keep the official columns exactly.** Example: the Auxiliar layout in `reporteActivos.ts`.
9. **Money** is `numeric(14,2)`, formatted with `es-CR`. **Dates** are in Costa Rica time.

**Workflow:**
- **The repository is PUBLIC.**
  - Never commit `.env*`, keys, `data/`, `src/lib/importacion/__fixtures__/` or any real data (names, cédulas, salaries, the foundation's Excel files).
  - Add files by name; never `git add -A` or `git add .`. Check `git status` before every commit.
- **Branches:**
  - Every task starts from an up-to-date `staging`, on a branch named `portal/<x>`, `sitio/<x>` or `docs/<x>`.
  - When the definition of done passes: push, merge `--no-ff` into `staging` and push. This is done without asking (Guillermo's decision).
  - Then check that the Vercel production deploy is READY.
  - **`staging` is production.** Never use `main`, never delete branches, never force-push or use `--no-verify`.
- **Definition of done:** `npm run lint`, `npm run build`, `npm test`. With a migration, also `npm run db:reset`, `npm run db:test` and `npm run db:tipos`. UI changes are checked in the browser at desktop and mobile width.
- **Migrations:**
  - Never edit an applied migration; create a new one.
  - Vercel runs `db:migrar` on deploy, so a broken migration fails the deploy.
  - Use names, not ids, when touching seeded rows (ids may differ).
- **`src/lib/db/tipos.ts` is generated.** Don't edit it by hand.

**Communication with Guillermo:**
- Reply in Spanish, minimal.
- Medium or large tasks: send a plan of ≤10 lines first and wait for his OK.
- Ask only when ambiguity is expensive.
- See `AGENTS.md` → "Responses".

**Code conventions:**
- Spanish names in the portal and `lib`; English in the landing components.
- UI copy addresses the user as "usted" and errors say what to do. The directora is not technical.
- Forms must work on a phone.

**Things that look wrong but are intentional:**
- Downloads have no file extension in the URL (middleware matcher).
- The middleware only checks that the session cookie exists.
- Files are stored in Postgres, not in a blob service.
- `perfiles` updates are limited to admin, and a user cannot change their own role or deactivate themselves.
- "Borrar" a category only deactivates it.
- Disposed assets keep their category even if that category was retired.
- The local seed may not reflect production catalog changes (see §9).
- `vercel.json` disables preview deploys on purpose.

**Environment variables (`.env.example`):**
- `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY`, `NEXT_PUBLIC_EMAILJS_SERVICE_ID`, `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID`: landing forms.
- `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct, used by migrations). In production they come from Vercel's Neon integration.
- `BETTER_AUTH_SECRET` (≥32 random characters) and `BETTER_AUTH_URL`.
- `SUPERADMIN_CORREO` (Vercel, production only): `db:migrar` grants superadmin to that user. It is not in the repo, and that email must never be committed.

## 11. How to run it

Requirements:
- Node 22 (the version used in development; the exact required version is **Unclear / needs confirmation**: there is no `engines` field).
- npm.
- Docker, for the local database.

```bash
npm install
cp .env.example .env.local          # fill in values; locally DATABASE_URL(_UNPOOLED) point to docker-compose (port 5433)
npm run db:levantar                 # starts Postgres 17 + pgTAP (docker-compose.yml)
npm run db:reset                    # drops, migrates and loads db/seed.sql
npm run crear-admin -- <correo> "<Nombre>"   # prints a temporary password for the first admin
npm run dev                         # http://localhost:3000  (portal at /portal)
```

Checks:

```bash
npm run lint
npm test                            # vitest (calculations, importers, exports, reports)
npm run build
npm run db:test                     # pgTAP tests in db/tests
npm run db:tipos                    # regenerate src/lib/db/tipos.ts after a migration
```

Useful scripts:
- `npx vite-node scripts/migrar-excel.ts -- <file.xlsx> <YYYY-MM-DD> <out.xlsx>`: run the asset importer and Auxiliar export from the command line, without the UI.
- `npx tsx scripts/generar-seed.ts`: regenerates `db/seed.sql`.
- `npx vite-node scripts/generar-paridad-depreciacion.ts`: regenerates the SQL↔TypeScript depreciation parity cases. It needs the local database to be running.

**Deploy:**
- Push to `staging`. Vercel builds with `vercel-build` (`npm run db:migrar && next build`), which applies pending migrations to the production Neon database and assigns superadmin from `SUPERADMIN_CORREO`.
- Check that the deployment is READY in Vercel.
- Feature branches don't deploy.
