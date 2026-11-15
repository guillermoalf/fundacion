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
- Never explore `node_modules/`, `.next/`, `public/`, `src/assets/` or `supabase/.temp/`.
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
npx supabase db reset            # migrations + seed from scratch
npx supabase test db             # pgTAP
npm run db:tipos                 # regenerates src/lib/supabase/tipos.ts
```

For UI changes, also check in the browser (`npm run dev`) at desktop and mobile width.

## Responses (STRICT)

**While you work: write NOTHING.** No "now I'll...", "I already have...", "I apply...", no explaining what you read or why. Only tool calls. Every intermediate sentence costs tokens and nobody reads it.

**When you finish: only this, nothing else:**
```
¿Listo?: sí / no / parcial: one line on what changed
Necesito de usted: <what you need from me, or "nada">
Ojo: <only if there's a problem, risk or important decision; otherwise leave this line out>
```
- If there's a plan or a question, it goes after that, as short as possible (plan ≤10 lines).
- Don't list the checks you ran: if the definition of done passed, "sí" covers it. If something failed, it goes in "Ojo".
- Don't include commit hashes, file names, test counts or technical details unless asked.

## Git

- **The repo is PUBLIC** (github.com/guillermoalf/fundacion). Never commit `.env*`, keys, `src/lib/importacion/__fixtures__/`, `data/`, or any real data (names, cédulas, salaries, the foundation's Excels). Check `git status` before every commit.
- **Never `git add -A` or `git add .`**: add files by name.
- **Branch flow (always, without being reminded):**
  - `staging` is the reference branch and always the newest code. **Every new task starts from an up-to-date `staging`** (`git checkout staging && git pull` → `git checkout -b <prefix>/<name>`). Never branch from `main` or from another feature branch.
  - One branch per task: `portal/<feature>`, `sitio/<change>` or `docs/<change>`. Short commits in Spanish, imperative ("agrega importador de activos").
  - When the task is finished and the definition of done passes: push the branch, then merge it into `staging` (`--no-ff`) and push `staging`. You may do this without asking.
  - **Never delete branches** (neither local nor remote), even after merging them.
  - **`main` deploys to production** (Vercel, fundacioncreciendofeliz.com). Every now and then `staging` is merged into `main`, only when Guillermo explicitly says "merge a main" / "suban a producción". Never merge or push to `main` otherwise, and never merge a feature branch directly into `main`.
- Never use `--force`, never rewrite pushed history, never `--no-verify`.

## Map

```
src/app/(sitio)/                 landing: each page.tsx only imports its view from src/views
src/app/portal/login/            login
src/app/portal/(protegido)/      protected portal: <route>/page.tsx + acciones.ts (Server Actions) + PascalCase client components
src/views, src/components        landing in JS (from CRA), each component with its own .scss. Don't migrate to TS unless asked
src/lib/calculos/                depreciation, payroll (+ tests). SOURCE OF TRUTH for calculations
src/lib/catalogos/anexo2.ts      Anexo 2 rows + sugerirCategoria
src/lib/importacion/             Excel importer + guardar.ts (__fixtures__ is ignored by git)
src/lib/export/auxiliarPani.ts   PANI report (official columns)
src/lib/supabase/                client.ts · server.ts · middleware.ts · tipos.ts (GENERATED, don't edit by hand)
src/lib/portal/sesion.ts         obtenerSesion(), NOMBRE_ROL
src/middleware.ts                landing redirects + /portal protection
supabase/migrations · seed.sql · tests/ (pgTAP)
scripts/                         crear-admin.mts, generar-seed.ts, migrar-excel.ts, generar-paridad-depreciacion.ts
```

## Code conventions

- Portal and `lib`: strict TypeScript. Landing: JS. Alias `@/*` → `src/*`.
- Supabase: `crearClienteServidor()` (async) in Server Components and Actions; `crearClienteNavegador()` only in client components. Never create clients any other way.
- Portal: Tailwind only. Landing: its SCSS, respecting the CSS order in `(sitio)/layout.tsx`.
- Names in the portal and `lib`: Spanish. Landing components: in English (that's how they are).
- UI copy: Spanish, addressing the user as "usted", plain language. The directora isn't technical: errors say what happened and what to do ("Falta la fecha de compra. Puede guardarlo así y completarla después."), never technical messages.
- Server Actions return `{ ok: true, ... } | { ok: false, error: string }`; don't throw exceptions to the UI.
- Forms must work on a phone (physical counts are done walking around the classrooms).

## Business rules (non-negotiable)

1. **Never DELETE.** The database blocks it. Use statuses (`dado_de_baja`, `anulada`, `activo = false`). Corrections are new records with a reason.
2. **Every write goes through the authenticated client.** That's how the audit log (`bitacora`) records who did it. `service_role` only in `scripts/` and in the attendance kiosk.
3. **Permissions live only in RLS.** The UI hides buttons for usability, not for security.
4. **Calculations live only in `src/lib/calculos`** (and their SQL mirror in the migration, kept in parity with `scripts/generar-paridad-depreciacion.ts`). Never compute depreciation, aguinaldo or payroll charges inside components.
5. **Missing data = `null`, never 0, never invented.** If an asset has no cost or date, depreciation and book value stay empty and show up as a pending item. The system calculates everything from the item's cost; no accountant is involved.
6. **Every amount has a funding source** (`fuente_id`: PANI, IMAS, JPS, PROPIOS, DONACION). Reports filter by funder.
7. **Rates and legal values live in `parametros` / `categorias_activo`** with an effective date, never in code.
8. **Reports for funders use their official columns exactly** (e.g. the PANI Auxiliar de activos). Don't rename or reorder columns.
9. Money: `numeric(14,2)` in the DB, colones formatted with `es-CR`. Dates: Costa Rica time zone.

## Migrations

- Never edit an already-applied migration: create a new one (`npx supabase migration new <nombre>`).
- Every new table: RLS + audit trigger + delete block (follow the pattern in the base migration), plus a pgTAP test in `supabase/tests/`.
- Afterwards: `db reset` → `test db` → `npm run db:tipos`.

## Known issues (don't rediscover them; fix when the task touches them or he asks)

- The middleware matcher excludes routes with a dot: a future `/portal/...xlsx` would be unprotected. → Serve downloads without an extension in the path, or adjust the matcher.
- No user-management screen (only `crear-admin`) and no password recovery (no SMTP).
- `npm audit`: 23 vulnerabilities to review (3 critical).
- CRA leftovers: `public/index.html`, `src/components/Button.js`, `src/assets/not-used/`.
- Duplicate docs: `CONFIGURACION_EMAILJS.md`, `EMAILJS_SETUP.md`, `QUICK_SETUP.md` (merge into the README); `DEBUG_DONACIONES.md` is obsolete.
- The README doesn't explain how to run the project.

## Launch (Next.js in production since 2026-11-15)

Done: Vercel Framework Preset = Next.js · EmailJS variables in Production and Preview. Pending for the portal to work in production: create the Supabase cloud project and run `db push` · Supabase public variables in Vercel (Production and Preview) · create the first admin · check the 301s for capitalized URLs and the EmailJS forms.

## Roadmap

Phase 1 (current): import Excel → assets → pending items → depreciation table → PANI report → user management.
Phase 2: staff, attendance kiosk (tablet + PIN, `/marcar`), absences, late arrivals, vacations.
Phase 3: payroll, aguinaldo, reports per funder (IMAS/JPS), physical counts with QR.

## Keep this file current

If a decision changes a convention, rule or known issue here, propose the edit to AGENTS.md (a line or two) as part of the same task.
