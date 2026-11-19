# AGENTS.md — Fundación Creciendo Feliz

Public landing page + internal admin portal (`/portal`) for a non-profit daycare in Costa Rica funded with public money (PANI, IMAS, JPS). Every colón must be traceable: funders audit 1–2 times a year. The portal replaces Excel files; the main user is the directora (non-technical). Architecture: `docs/ARQUITECTURA.md`.

## How we work

Guillermo writes in Spanish, casually, sometimes with loose ideas. Work out what he means and act on it; he shouldn't have to write a perfect prompt.

- **Reply in Spanish.** Guillermo doesn't read process: he only wants the result (format in "Responses").
- **Small, clear tasks** (a bug, a copy change, a style tweak, one more field): just do them.
- **Medium or large tasks** (a new screen, a migration, anything touching several modules): first send a plan of ≤10 lines (files to touch, approach, decisions) and wait for his OK.
- **Ask only when** the request is ambiguous AND guessing wrong is expensive or irreversible (schema, existing data, production, deleting files). Ask everything in one round, with options and your recommendation first. Anything with a reasonable default: decide, and state the decision in the final report.
- If what he asks breaks a rule in this file, say so in one line and propose an alternative. Don't silently comply, and don't refuse without a way forward.
- If you see a problem outside the task, mention it in one line under "Pendiente"; don't fix it without asking.

## Saving tokens

- Search with grep/glob first; read only the relevant section. Don't reread files already in context.
- Never explore `node_modules/`, `.next/`, `public/`, `src/assets/`.
- Don't paste code or diffs in replies unless he asks. He sees the changes in the editor.
- While iterating, run only the tests involved (`npx vitest run <path>`). Run the full suite once, at the end.
- Prefer editing existing files over creating new ones. Don't create docs he didn't ask for.

## Definition of done

A task is not done until these pass (whatever applies):

```bash
npm run lint
npm run build
npm test                         # vitest
# if there's a migration:
npm run db:reset                 # local only: migrations + seed from scratch (needs `npm run db:levantar`)
npm run db:test                  # pgTAP
npm run db:tipos                 # regenerates src/lib/db/tipos.ts
```

For UI changes, also check in the browser (`npm run dev`) at desktop and mobile width.

## Responses (STRICT)

**While you work: write NOTHING.** No "now I'll...", "I already have...", "I apply...", no explaining what you read or why. Only tool calls. Every intermediate sentence costs tokens and nobody reads it.

**When you finish: as little text as possible, no fixed template, no headings or labels like "¿Listo?: sí".**
- Done: one short line saying what changed. Nothing else.
- Not done: why not, and exactly what you need from him to finish.
- Flag only what a professional developer would raise: a real risk, a failure, or an important decision you made. Skip it if there's nothing.
- A plan or a question goes as short as possible (plan ≤10 lines).
- Questions that aren't tasks (e.g. "what do I put in this field?"): answer directly in a line or two.
- Don't list the checks you ran: if the definition of done passed, saying it's done covers it.
- Don't include commit hashes, file names, test counts or technical details unless asked.

## Git

- **The repo is PUBLIC** (github.com/guillermoalf/fundacion). Never commit `.env*`, keys, `src/lib/importacion/__fixtures__/`, `data/`, or any real data (names, cédulas, salaries, the foundation's Excels). Check `git status` before every commit.
- **Never `git add -A` or `git add .`**: add files by name.
- **Branch flow (always, without being reminded):**
  - `staging` is the reference branch and always the newest code. **Every new task starts from an up-to-date `staging`** (`git checkout staging && git pull` → `git checkout -b <prefix>/<name>`). Never branch from `main` or from another feature branch.
  - One branch per task: `portal/<feature>`, `sitio/<change>` or `docs/<change>`. Short commits in Spanish, imperative ("agrega importador de activos").
  - When the task is finished and the definition of done passes: push the branch and tell him it's ready for review. **Merge into `staging` (`--no-ff`) and push it only after his OK**: `staging` is production.
  - **Never delete branches** (neither local nor remote), even after merging them.
  - **`staging` deploys to production** (Vercel production branch → fundacioncreciendofeliz.com; every merge applies pending migrations to the production database). Feature branches get their own Preview URL for review. `main` is no longer used: never push or merge to it.
- Never use `--force`, never rewrite pushed history, never `--no-verify`.

## Map

```
src/app/(sitio)/                 landing: each page.tsx only imports its view from src/views
src/app/portal/login/            login
src/app/portal/(protegido)/      protected portal: <route>/page.tsx + acciones.ts (Server Actions) + PascalCase client components; downloads as route.ts under …/descargar (no dot)
src/app/portal/_ui/              shared portal UI: menu (navegacion.ts), Encabezado, Tabla, Formulario (FormularioAccion, BotonEnviar, CampoArchivo), Avisos, Insignias (Falta)
src/app/portal/(protegido)/ninos/ children: registry, responsables, notas, pasar lista (mobile, one tap = saved), monthly attendance + Excel (src/lib/export/asistenciaNinos.ts)
src/app/marcar/                  attendance kiosk (tablet + PIN); server side in src/lib/kiosko.ts (owner connection)
src/views, src/components        landing in JS (from CRA), each component with its own .scss. Don't migrate to TS unless asked
src/lib/calculos/                depreciation, payroll (+ tests). SOURCE OF TRUTH for calculations
src/lib/catalogos/anexo2.ts      Anexo 2 rows + sugerirCategoria
src/lib/importacion/             Excel importer + guardar.ts · facturaElectronica.ts (Hacienda XML) (__fixtures__ is ignored by git)
src/lib/export/                  auxiliarPani.ts (PANI, official columns) · controlInventario.ts (Formulario N.º 1, alimentos/aseo) · controlLimpieza.ts (Word) · planillaPorFuente.ts
src/lib/db/                      index.ts (conUsuario) · conexion.ts (owner connection, don't import) · tipos.ts (GENERATED, don't edit by hand)
src/lib/auth.ts                  Better Auth (email + password, no public sign-up)
src/lib/portal/                  sesion.ts (obtenerSesion → { usuario, perfil, consultar }) · acciones.ts (ejecutar, friendly errors) · formato.ts (es-CR, Costa Rica time) · archivos.ts · activos/asistencia/planilla helpers
src/middleware.ts                landing redirects + /portal protection
db/migrations (dbmate) · seed.sql · tests/ (pgTAP) · Dockerfile (local Postgres 17 + pgTAP, see docker-compose.yml)
scripts/                         db.mts (migrar/reset/test), crear-admin.mts, generar-seed.ts, migrar-excel.ts, generar-paridad-depreciacion.ts
```

## Code conventions

- Portal and `lib`: strict TypeScript. Landing: JS. Alias `@/*` → `src/*`.
- Database: Postgres on Neon, queried with Kysely. Server Components and Actions use `obtenerSesion().consultar(tx => ...)` (or `conUsuario()` from `@/lib/db`). Never import `@/lib/db/conexion` or `pg` in `src/` (ESLint blocks it). Client components never touch the database: they call Server Actions.
- Portal: Tailwind only. Landing: its SCSS, respecting the CSS order in `(sitio)/layout.tsx`.
- Names in the portal and `lib`: Spanish. Landing components: in English (that's how they are).
- UI copy: Spanish, addressing the user as "usted", plain language. The directora isn't technical: errors say what happened and what to do ("Falta la fecha de compra. Puede guardarlo así y completarla después."), never technical messages.
- Server Actions return `{ ok: true, ... } | { ok: false, error: string }` via `ejecutar()`; don't throw exceptions to the UI. Client forms use `<FormularioAccion>` (not `<form action>`: React 19 empties the form even when saving fails).
- Files (photos, PDFs) go in the `archivos` table: `<CampoArchivo>` compresses photos (1600 px, JPEG 80 %) and uploads in 3 MB parts to `/portal/archivos/subir` (5 MB max, Vercel caps requests at 4.5 MB); the action receives the id and calls `guardarArchivo()`. `*_url` columns store `/portal/archivos/<id>`.
- Roles: superadmin (Guillermo; can also be given to the owner) · admin = Dirección · coordinacion · contabilidad (no children data) · auditor (read-only, expires) · personal (teachers/caregivers: only pass attendance and see children + contacts, no notes, nothing administrative; `puede_leer()` excludes it). Children permissions: `ve_ninos()`, `ve_notas_ninos()`, `edita_ninos()`, `pasa_lista()` (personal only for today).
- Salaries live in `salarios` (history by `vigente_desde`) and payroll tables are readable only by admin, contabilidad and auditor (`ve_salarios()` in RLS); coordinación sees staff without salaries.
- Product categories live in `categorias_producto` (editable by Dirección in Inventario → Categorías; `reporte` = alimentos/aseo/ninguno decides which monthly Formulario N.º 1 includes them; deactivate, never delete). Don't hardcode category lists.
- Constants shared by server and client components live in files without "use client".
- Forms must work on a phone (physical counts are done walking around the classrooms).

## Business rules (non-negotiable)

1. **Never DELETE.** The database blocks it, for every role. Use statuses (`dado_de_baja`, `anulada`, `activo = false`). Corrections are new records with a reason, or a superadmin correction.
10. **Superadmin (Guillermo) can correct anything**, including closed/approved records (payroll, counts, marks, rates in use, users), via `/portal/corregir` (link on each Bitácora entry). Every lock trigger lets `correccion_autorizada()` through only with a reason (`app.motivo`), which is stored in `bitacora.motivo`. Only a superadmin grants or changes that role; the production user comes from Vercel's `SUPERADMIN_CORREO` (applied by `db:migrar` on deploy). New lock triggers must allow `correccion_autorizada()`.
2. **Every query goes through `conUsuario()`.** It switches to the `app_portal` role and sets `app.usuario_id`: that's how RLS applies and the audit log (`bitacora`) records who did it. The owner connection (bypasses RLS) only in `scripts/`, Better Auth and the attendance kiosk.
3. **Permissions live only in RLS.** The UI hides buttons for usability, not for security.
4. **Calculations live only in `src/lib/calculos`** (and their SQL mirror in the migration, kept in parity with `scripts/generar-paridad-depreciacion.ts`). Never compute depreciation, aguinaldo or payroll charges inside components.
5. **Missing data = `null`, never 0, never invented.** If an asset has no cost or date, depreciation and book value stay empty and show up as a pending item. The system calculates everything from the item's cost; no accountant is involved.
6. **Assets vs. low-value items (PANI):** an item is an asset only if its cost per unit exceeds `umbral_activo()` (25 % of `salario_base`, parameters). Everything else is still quantified as inventory with a category.
7b. **Every amount has a funding source** (`fuente_id`: PANI, IMAS, JPS, PROPIOS, DONACION). Reports filter by funder.
7. **Rates and legal values live in `parametros` / `tramos_renta` / `categorias_activo`** with an effective date, never in code (screen: `/portal/parametros`).
8. **Reports for funders use their official columns exactly** (e.g. the PANI Auxiliar de activos). Don't rename or reorder columns.
9. Money: `numeric(14,2)` in the DB, colones formatted with `es-CR`. Dates: Costa Rica time zone.

## Migrations

- Never edit an already-applied migration: create a new one (`db/migrations/<YYYYMMDDHHMMSS>_<nombre>.sql`, starting with `-- migrate:up`).
- Every new table: RLS + audit trigger + delete block (follow the pattern in the base migration), plus a pgTAP test in `db/tests/` (users: insert into `usuarios`, then `set local role app_portal; set local app.usuario_id = '<uuid>'`). `app_portal` gets SELECT/INSERT/UPDATE automatically (default privileges); never grant DELETE.
- Afterwards: `npm run db:reset` → `npm run db:test` → `npm run db:tipos`. Vercel applies pending migrations on every deploy (`vercel-build` → `db:migrar`), so a broken migration fails the deploy.

## Known issues (don't rediscover them; fix when the task touches them or he asks)

- The middleware matcher excludes routes with a dot: downloads are served without an extension (`…/descargar`) and their route handlers also check the session. Keep it that way.
- No password recovery by email (no SMTP): the admin generates a temporary password in Usuarios.
- `npm audit`: 23 vulnerabilities to review (3 critical).
- CRA leftovers: `public/index.html`, `src/components/Button.js`, `src/assets/not-used/`.
- Duplicate docs: `CONFIGURACION_EMAILJS.md`, `EMAILJS_SETUP.md`, `QUICK_SETUP.md` (merge into the README); `DEBUG_DONACIONES.md` is obsolete.
- The README doesn't explain how to run the project.

## Launch (Next.js in production since 2026-11-15)

Done: Vercel Framework Preset = Next.js · EmailJS variables · Neon database connected (each Preview gets its own Neon branch) · `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` · Vercel production branch = `staging`. First admin created. Pending: check the 301s for capitalized URLs and the EmailJS forms.

## Roadmap

Phase 1 (current): import Excel → assets → pending items → depreciation table → PANI report → user management.
Phase 2: staff, attendance kiosk (tablet + PIN, `/marcar`), absences, late arrivals, vacations.
Phase 3: payroll, aguinaldo, reports per funder (IMAS/JPS), physical counts with QR.

## Keep this file current

If a decision changes a convention, rule or known issue here, propose the edit to AGENTS.md (a line or two) as part of the same task.
