# Progreso del portal

Construcción del portal completo según `docs/ARQUITECTURA.md` y `AGENTS.md`.
Si la sesión se reinicia: leer este archivo y seguir desde el primer módulo sin marcar.
Cada módulo vive en su rama `portal/<modulo>`, que sale de la rama del módulo anterior.

## Módulos

- [x] 0. Base de la interfaz (menú lateral, migas, tabla reutilizable, vacío, "Falta", avisos, formato es-CR) — `portal/ui-base`
- [ ] 1. Usuarios — `portal/usuarios`
- [ ] 2. Activos — `portal/activos`
- [ ] 3. Pendientes — `portal/pendientes`
- [ ] 4. Tabla de depreciación — `portal/depreciacion`
- [ ] 5. Reporte PANI — `portal/reporte-pani`
- [ ] 6. Proveedores y compras — `portal/compras`
- [ ] 7. Inventario — `portal/inventario`
- [ ] 8. Personal — `portal/personal`
- [ ] 9. Kiosko de asistencia — `portal/kiosko`
- [ ] 10. Ausencias — `portal/ausencias`
- [ ] 11. Planilla — `portal/planilla`
- [ ] 12. Conteo físico — `portal/conteo`
- [ ] 13. Bitácora — `portal/bitacora`
- [ ] 14. Inicio — `portal/inicio`

## Decisiones

- **Archivos (fotos y PDF) en Postgres**, tabla `archivos` (bytea), no en un servicio aparte: el RLS por rol aplica igual que al resto, se prueban con pgTAP, no hay otra credencial que cuidar y funciona igual en local. Las fotos se comprimen en el navegador (máx. 1600 px, JPEG) y cada archivo tiene tope de 4 MB (límite de Vercel por petición). Se sirven por `/portal/archivos/<id>` (sin extensión: el middleware lo protege). Las columnas `*_url` existentes guardan esa ruta. Si algún día pesan demasiado (plan gratis de Neon: 1 GB), se mueven a Vercel Blob sin cambiar las pantallas.
- **Plantillas de reportes** (`data/plantillas/`): no están en el repositorio (`data/` está ignorado) ni en esta máquina. Los reportes de alimentos y limpieza siguen un formato estándar de control de inventario; hay que compararlos con las plantillas reales y ajustar columnas.

## Bitácora de avance

- **0. Base**: menú lateral (☰ en celular), migas, tabla con búsqueda/filtros/páginas (tarjetas en celular), vacío, insignia "Falta", avisos, formato es-CR y hora de Costa Rica (`src/lib/portal/formato.ts`), `ejecutar()` para Server Actions con mensajes claros (`src/lib/portal/acciones.ts`), archivos adjuntos en la base (`archivos` + `/portal/archivos/<id>`).
