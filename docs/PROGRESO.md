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
- [x] 9. Kiosko de asistencia — `portal/kiosko`
- [x] 10. Ausencias — `portal/ausencias`
- [x] 11. Planilla — `portal/planilla`
- [x] 12. Conteo físico — `portal/conteo`
- [x] 13. Bitácora — `portal/bitacora`
- [x] 14. Inicio — `portal/inicio`

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
- **9. Kiosko**: `/marcar` a pantalla completa (toca su foto → PIN en teclado grande → Entrada/Salida → confirmación 4 s). Solo funciona en tablets registradas por admin en `/portal/kiosko` (token aleatorio en cookie httpOnly con path `/marcar`; en la base solo el SHA-256). El servidor (`src/lib/kiosko.ts`, conexión del dueño) valida token + PIN y frena: 5 PIN malos por persona o 20 por tablet en 15 min (tabla `intentos_pin`, sirve aunque Vercel use varias instancias). Marcas manuales desde la hoja en papel con foto en `/portal/asistencia` (origen hoja_firmada, o manual sin foto); quedan con quién las digitó.
- **10. Ausencias**: registro de vacaciones, incapacidades CCSS/INS (boleta obligatoria + foto), licencias y permisos con días hábiles sugeridos (`diasHabiles` nuevo en `src/lib/calculos/planilla.ts`, con tests; editable por feriados o medio día). Saldo de vacaciones con `calcularVacaciones` y el parámetro de días anuales. Tardías y horas del mes en `/portal/asistencia/resumen` (`src/lib/portal/asistencia.ts`: usa el horario que regía cada día y pasa las marcas a hora de Costa Rica), con aviso de días con marcas sin pareja.
- **11. Planilla**: planilla mensual en borrador calculada con `calcularLineaPlanilla` (nueva en `src/lib/calculos/planilla.ts`, con tests): rebajo por ausencias sin goce, incapacidades y licencia (salario ÷ 30), pago del patrono por días 1–3 de incapacidad CCSS (sin cargas) y 50 % de licencia de maternidad (parámetro nuevo `licencia_maternidad_patrono_pct`), CCSS obrera/patronal, provisiones de aguinaldo y vacaciones; considera ingreso/salida a mitad de mes. Ajustes en borrador (horas extra, rebajo por tardías —se muestra cuántas hubo; el monto depende del reglamento interno—, renta, otras deducciones) y se recalcula. Aprobación por admin/contabilidad; la base congela montos al aprobar y solo deja avanzar borrador → aprobada → pagada (o anular). Aguinaldo con las planillas aprobadas dic–nov. Totales por fuente en pantalla y Excel por fuente (`/portal/reportes/planilla/descargar`). El impuesto de renta no se calcula solo (faltan los tramos en `parametros`): se digita.
- **12. Conteo físico**: empezar por aula con su responsable, lista en el celular con botones grandes Está/No está, escaneo de QR con la cámara (BarcodeDetector, Chrome en Android; en iPhone se escribe la placa) o búsqueda por placa, aviso si el activo está registrado en otra ubicación. Al cerrar, lo no marcado queda «no encontrado» y ya no se cambia (trigger); acta imprimible con firmas y subida del acta firmada (una sola vez).
- **13. Bitácora**: lista paginada (50 por página, del servidor) con filtros por qué, quién (incluye «Sistema / kiosko») y fechas; muestra solo lo que cambió (antes tachado → después) y enlace al historial de ese registro. Visible para admin, contabilidad y auditor (lo decide el RLS).
- **14. Inicio**: tarjetas con activos en uso, valor en libros (avisa cuántos no suman por datos faltantes), pendientes, productos bajo el mínimo, personas que marcaron hoy, ausentes hoy y planillas en borrador; accesos rápidos según el rol. AGENTS.md y ARQUITECTURA.md al día.

## Ajustes de la revisión (rama `portal/ajustes-revision`)

- **Salarios y planilla restringidos en la base**: el salario salió de `empleados` a `salarios` (con historial por fecha de vigencia y motivo); `salarios`, `planillas` y `planilla_lineas` solo los leen admin, contabilidad y auditoría (`ve_salarios()`), y solo admin/contabilidad los crean. Coordinación ve al personal sin salario y no ve la planilla (pgTAP `salarios.test.sql`). La planilla no se genera si alguien no tiene salario registrado (lo avisa con nombres).
- **Subidas**: fotos comprimidas en el navegador (1600 px, JPEG 80 %), PDF tal cual hasta 5 MB. Como Vercel no acepta más de 4,5 MB por petición, el archivo se sube apenas se elige, en partes de 3 MB (`/portal/archivos/subir` → `archivos_partes` → `completar_archivo()`); el formulario solo envía el id. Espacio usado (base y archivos) en el inicio de la dirección (`espacio_usado()`, solo admin).
- **Impuesto de renta**: tabla `tramos_renta` con vigencia, editable por admin en `/portal/parametros` (junto con los demás parámetros legales). Cargados los tramos 2026 del Decreto Ejecutivo 45333-H (confirmados con KPMG, El Financiero y García Bodán; conviene cotejar con el PDF de La Gaceta). La planilla calcula la renta sola (`calcularImpuestoRenta`, con tests) y en el borrador se puede digitar otro monto. Si no hay tramos vigentes, aviso «Falta cargar tramos». Los créditos fiscales por hijo y cónyuge no se aplican: el sistema no guarda esos datos del personal.
- **Vista previa protegida**: Vercel tiene Vercel Authentication en todas las vistas previas (y en las URL de deploy de producción).
- **Plantillas de la fundación** (recibidas por chat; no se suben al repo): los controles de alimentos y aseo siguen el «FORMULARIO NO.1 — Control de inventarios mensual» (B5:J…, mismas columnas, un renglón por movimiento con saldo corrido, 22 renglones mínimo, Responsable/Revisado por al pie); la diferencia entre ambos son las dos últimas columnas (nombre/fecha vs. firmas). El control de limpieza sale en Word con el formato de la plantilla (periodo, pedido, proveedor, factura, encargada; tabla Producto | Saldo anterior | Cantidad recibida | Saldo final | Cantidad consumida; productos de la plantilla primero). No se incluyó el logo de la JPS que trae la plantilla. El «Auxiliar de activos formato oficial PANI» coincide con el reporte que ya existía. El Excel «Activos 2026 PANI» se probó con el importador (126 activos, 90 con pendientes); falta importarlo en producción.

## Superadministrador (rama `portal/superadmin`)

- Rol `superadmin` por encima de la dirección: todos los permisos de los demás roles y, con motivo obligatorio, corrige lo cerrado (planillas aprobadas/pagadas, conteos cerrados, marcas, parámetros, tasas en uso, archivos, usuarios). Borrar sigue bloqueado para todos. El motivo queda en `bitacora.motivo`.
- Editor genérico `/portal/corregir` (enlace «Corregir este registro» en cada entrada de la bitácora): lee la tabla y sus columnas del catálogo de la base (`tablas_corregibles()`), solo manda los campos cambiados.
- Solo un superadministrador da o cambia ese rol (trigger). En producción lo asigna `db:migrar` al usuario de `SUPERADMIN_CORREO` (variable de Vercel, no en el repo).

## Compras y activos (rama `portal/compras-activos`, 18/11)

- Espacio usado: solo el superadministrador (`espacio_usado()`).
- Baja cuantía (PANI): parámetros `salario_base` (₡462 200, 2026) y `baja_cuantia_pct_salario_base` (25 %, Resolución DGT-R-009-2015) → `umbral_activo()` = ₡115 550. Se compara **por unidad**; una línea «activo» por debajo pide pasarla a Inventario o confirmar la excepción. Pendiente de confirmar con el PANI qué pasa con varias unidades de una misma compra.
- Activos sin ubicación: se pueden registrar así; quedan en Pendientes («Sin ubicación»), aviso en Inicio y botón «Asignar ubicación» en la ficha (queda en el historial).
- Compras: varios archivos por factura (`compra_archivos`; PDF, foto y XML). Al subir el XML de la factura electrónica (Hacienda 4.3/4.4, `src/lib/importacion/facturaElectronica.ts`) se llenan proveedor (o se crea), número, fecha, IVA y líneas, y se sugiere activo/inventario según el umbral. Productos nuevos se crean desde la línea (con categoría obligatoria). Cada activo muestra los archivos de su factura.
- «Nuevo activo» suelto (sin factura): cantidad, placas y precio por unidad; una ficha por unidad.
- Proveedores: ficha con sus productos (agregar con mínimo) y «Hacer pedido»: sugiere lo que falta para el mínimo, se corrige y se copia para WhatsApp o se imprime. Cocina no usa el sistema.
