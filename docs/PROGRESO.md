# Progreso del portal

Construcción del portal completo según `docs/ARQUITECTURA.md` y `AGENTS.md`.
Si la sesión se reinicia: leer este archivo y seguir desde el primer módulo sin marcar.
Cada módulo vive en su rama `portal/<modulo>`, que sale de la rama del módulo anterior.

## Módulos

- [x] 0. Base de la interfaz (menú lateral, migas, tabla reutilizable, vacío, "Falta", avisos, formato es-CR) — `portal/ui-base`
- [x] 1. Usuarios — `portal/usuarios`
- [x] 2. Activos — `portal/activos`
- [x] 3. Pendientes — `portal/pendientes`
- [x] 4. Tabla de depreciación — `portal/depreciacion`
- [x] 5. Reporte PANI — `portal/reporte-pani`
- [x] 6. Proveedores y compras — `portal/compras`
- [x] 7. Inventario — `portal/inventario`
- [x] 8. Personal — `portal/personal`
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
- **1. Usuarios**: lista, crear con contraseña temporal que se muestra una sola vez (no hay SMTP), cambiar rol/nombre, auditor con fecha de vencimiento, desactivar/activar (cierra sus sesiones), restablecer contraseña. Funciones `usuarios_portal`, `crear_usuario_portal`, `restablecer_contrasena_portal` (security definer, solo admin). Nadie puede cambiarse su propio rol ni desactivarse. Ojo React 19: los formularios se vacían después de guardar → los de edición usan `defaultValue` + `key` con los datos guardados.
- **2. Activos**: lista con filtros (ubicación, fuente, estado, categoría) y valor en libros al día, ficha con depreciación y calendario (`src/lib/portal/activos.ts` usa `src/lib/calculos`), historial de movimientos, crear/editar (foto opcional), traslado y baja con motivo (no se borra; la baja no se deshace), importar Excel con vista previa y aviso de archivo repetido, etiquetas A4 3×8 con QR que abre la ficha. La ubicación solo se cambia con un traslado (queda en el historial).
- **3. Pendientes**: tarjetas por tipo (desde `v_activos_alertas`) con qué hacer en cada caso, tabla filtrable con enlace para completar (editar activo) o ir a Compras cuando falta la factura.
- **4. Tabla de depreciación**: lista con cuántos activos usan cada fila, agregar fila, editar (tasa y años bloqueados si la fila está en uso, como manda el trigger), retirar/volver a usar. Solo admin edita (RLS).
- **5. Reporte PANI**: `/portal/reportes` con corte + fuente, resumen en pantalla y descarga `.xlsx` por `/portal/reportes/pani/descargar` (sin punto en la ruta: la protege el middleware; además la ruta revisa la sesión). Opción con hoja interna de pendientes. El middleware ahora lee la cookie de sesión directo (quitó el aviso del Edge Runtime por `jose`).
- **6. Compras y proveedores**: proveedores (lista con total comprado, crear/editar/inactivar). Registrar factura con foto/PDF, fuente y líneas consumible/activo/servicio, todo en una transacción: un activo por unidad (placas separadas por coma; las que falten quedan en Pendientes) con movimiento de alta, y entrada al inventario con vencimiento. Detalle de la factura enlaza sus activos y entradas; permite adjuntar la factura después y ligar activos importados que no tenían factura. Constantes compartidas van en archivos sin "use client" (si no, el servidor las recibe como referencia de cliente).
- **7. Inventario**: saldos por producto con alertas de mínimo y de vencimiento (15 días), salidas (a quién se entregó), mermas y donaciones (no deja sacar más de lo que hay), productos (crear/editar/inactivar) con kárdex y saldo corrido, consumo de los últimos 6 meses, reportes Excel de alimentos (Formulario 1) y limpieza con hoja de entregas para firmar (`src/lib/export/controlInventario.ts`, con tests). **Cambio transversal**: `FormularioAccion` reemplaza `<form action>` en todo el portal: si hay un error ya no se borra lo escrito.
- **8. Personal**: lista (aula, fuente que paga el salario, si tiene PIN), crear/editar con foto, salida con fecha (no se borra), horario semanal con vigencia (el anterior se cierra un día antes: las tardías pasadas no cambian), PIN de 4 dígitos con scrypt. **El PIN salió de `empleados`** a `empleados_pin`, que app_portal no puede leer (un hash de 4 dígitos se adivina en segundos); se asigna con `asignar_pin_empleado()`. Pendiente de decidir: el salario es visible para todos los roles con lectura (también coordinación).
