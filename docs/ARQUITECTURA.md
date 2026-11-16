# Portal Fundación Creciendo Feliz — Arquitectura

`fundacioncreciendofeliz.com` → landing pública (ya existe)
`fundacioncreciendofeliz.com/portal` → portal interno (solo administración)
`fundacioncreciendofeliz.com/marcar` → kiosko de asistencia (tablet en la entrada)

Stack: Next.js (App Router) + TypeScript + Tailwind + Postgres en Neon (Kysely, migraciones con dbmate) + Better Auth (login con correo y contraseña). Los archivos (fotos y PDF) se guardan en la tabla `archivos` de la base, con el mismo RLS por rol (ver docs/PROGRESO.md).

## Principios
1. **Nada se borra.** La base de datos rechaza los `DELETE`. Un activo se da de baja, una planilla se anula y una marca se corrige registrando otra con su motivo.
2. **Todo deja rastro.** Cada insert o update queda en `bitacora` con quién lo hizo, cuándo, y el antes y después.
3. **Cada colón tiene fuente.** Cada compra, activo y salario lleva su `fuente_id` (PANI, IMAS, JPS, propios o donación). Así cada reporte se filtra por ente y no se reporta el mismo gasto a dos instituciones. La Contraloría ya señaló ese riesgo al PANI.
4. **Las tasas no se queman en el código.** CCSS, días de vacaciones, tolerancia de tardías y salario base están en la tabla `parametros`, cada uno con su fecha de vigencia. En enero se agrega una fila y los cálculos de años anteriores no cambian.
5. **El documento respalda el dato.** Cada factura, boleta de incapacidad o acta de conteo lleva su foto o PDF en la tabla `archivos` (solo lo ven los roles con lectura).

## Roles
| Rol | Quién | Puede |
|---|---|---|
| `admin` | Directora | Todo, incluido crear usuarios |
| `contabilidad` | Encargada de finanzas, si la hay | Todo menos crear usuarios; puede aprobar la planilla junto con la directora |
| `coordinacion` | Asistente administrativa | Registrar compras, inventario, asistencia y ausencias |
| `auditor` | Revisor del PANI, IMAS o JPS | Solo lectura, con fecha de vencimiento (`acceso_hasta`) |

El rol `auditor` permite darle acceso al revisor por una semana durante la visita, en vez de imprimir todo.

## Personal sin computadora ni teléfono
- **Kiosko:** una tablet fija en la entrada (o un teléfono viejo en un soporte) abre `/marcar`. La persona toca su foto, digita su PIN de 4 dígitos y elige *Entrada* o *Salida*. Una ruta de servidor con la conexión del dueño de la base (sin RLS) valida el PIN y que la petición venga de la tablet registrada (token del dispositivo), y luego inserta en `marcas` con `origen = 'kiosko'`. No necesita usuario en el portal.
- **Plan B:** si se va la luz o el internet, se usa la hoja de asistencia en papel. Administración la digita después (`origen = 'hoja_firmada'`) y adjunta la foto de la hoja firmada.
- **Ausencias:** la colaboradora entrega la boleta de la CCSS o del INS, o la solicitud de vacaciones firmada. Administración la registra y adjunta la foto.
- **Responsables de aula:** no usan el portal. Firman el acta del conteo físico de su aula, que administración imprime desde el portal y luego sube firmada.

## Módulos
| # | Módulo | Tablas | Pantallas clave |
|---|---|---|---|
| 1 | Activos | `activos`, `activo_movimientos`, `categorias_activo`, `ubicaciones` | Lista por aula, ficha con calendario de depreciación, traslado, baja, impresión de etiqueta con placa y QR |
| 2 | Conteo físico | `conteos_fisicos`, `conteo_detalle` | Conteo por aula desde el celular: escanear QR o marcar la placa, ver faltantes y generar el acta para firma |
| 3 | Compras | `compras`, `compra_lineas`, `proveedores` | Registro de factura con foto; cada línea se marca como *activo*, *consumible* o *servicio*. Un activo crea su ficha y pide la placa; un consumible entra al inventario |
| 4 | Inventario | `productos`, `inventario_movimientos`, `v_saldo_inventario` | Kardex por producto, entradas y salidas, alertas de stock mínimo y de vencimiento, consumo mensual |
| 5 | Personal | `empleados`, `horarios` | Expediente, horario y aula a cargo |
| 6 | Asistencia | `marcas`, `ausencias` | Kiosko, tardías del mes, horas trabajadas, saldo de vacaciones e incapacidades |
| 7 | Planilla | `planillas`, `planilla_lineas`, `parametros` | Planilla mensual con cálculo automático (rebajos, CCSS, provisión de aguinaldo y vacaciones), aprobación y aguinaldo de diciembre |
| 8 | Reportes | RPC `activos_al_corte` | Auxiliar de activos PANI (formato oficial), control de inventario de alimentos (Formulario 1), control de limpieza, planilla por fuente de financiamiento |
| 9 | Migración de Excel | `src/lib/importacion/` | La directora sube su Excel de activos y ve una vista previa con la ubicación, la categoría sugerida, la depreciación recalculada y los pendientes de cada fila. Luego confirma y se guarda todo en `activos` (`origen = 'importacion'`) |
| 10 | Tabla de depreciación | `categorias_activo` | Las filas del Anexo 2 que usa el sistema (tasa, años y palabras clave). La directora puede agregar o editar filas y cada cambio queda en la bitácora |
| 11 | Pendientes | vista `v_activos_alertas` | Lo que le falta a cada activo: placa, fecha, costo, categoría, factura, placa o serie repetida. Se va completando sin bloquear nada |

## Flujo de una compra (lo que verá un revisor)
```
Factura (foto) ─► compras ─► compra_lineas ─┬─► activo ─► activos (placa, aula, fuente) ─► activo_movimientos (alta)
                                              ├─► consumible ─► inventario_movimientos (entrada)
                                              └─► servicio (solo gasto)
```
Desde cualquier activo se llega a su factura, y desde cualquier factura a sus activos o entradas de inventario.

## Depreciación (la calcula el sistema, sin intervención externa)
- Fórmula: `Depreciación acumulada = Costo × tasa anual × meses de uso / 12`, con tope en el costo. `Valor en libros = Costo − Depreciación acumulada`. Todo sale del costo del artículo.
- Si falta el costo, la fecha o la categoría, la depreciación y el valor en libros **quedan vacíos**: no se inventan ni se ponen en cero. Apenas la directora completa el dato, el valor aparece en todos los reportes.
- Método: **línea recta** por defecto. Se permite suma de dígitos por activo. Ambos métodos los permite el Anexo 2.
- La depreciación empieza el **mes siguiente a la compra** y se prorratea por mes. Es la convención que ya usaba el Excel de la fundación, y el cálculo la reproduce al colón.
- La tasa sale de la fila del Anexo 2 asignada al activo. El sistema la sugiere por el nombre del bien (Regla 2.ª del Anexo: si el bien tiene fila propia se usa esa; si no, la de su grupo). Ejemplos: tobogán, casita o columpio → *Carruseles (toboganes y similares)* 10 %; cámara de seguridad → *Cámaras de televisión* 10 %; consolas y grabador → *Equipo electrónico especializado* 20 %; lavadora → *Equipo de lavandería* 5 %.
- Se puede cambiar la fila o fijar otra tasa para un activo puntual, y el cambio queda en la bitácora.
- La misma lógica existe en SQL (`depreciacion_acumulada`) para los reportes y en TypeScript (`src/lib/calculos/depreciacion.ts`) para la interfaz, con tests que verifican que ambas dan el mismo resultado.

## Fases
- **Fase 1 (ahora):** auth y roles, migración de Excel, activos y pendientes, export PANI, tabla de depreciación, compras, inventario de alimentos y limpieza.
- **Fase 2:** personal, kiosko de asistencia, ausencias, tardías y vacaciones.
- **Fase 3:** planilla, aguinaldo, reportes por fuente para la liquidación a IMAS y JPS, y conteos físicos con QR.
- **Fase 4 (por confirmar):** asistencia de niños, si el IMAS paga el subsidio según la asistencia de cada niño.

## Datos que solo la fundación puede aportar
No frenan nada: el sistema funciona y estos datos se completan cuando estén.
1. **Facturas de los gabinetes metálicos.** Son 16 filas con ₡1.234.975 o ₡2.000.960 cada una. La importación marca el pendiente; si cada monto era el total de la compra, se corrige la cantidad de unidades y el costo baja solo.
2. **Filas del Anexo 2 de la G a la Z.** La captura recibida cubre de la A a la F, y ahí caben todos los activos actuales. Los instrumentos musicales están en *Equipo de sonido* hasta que se cargue su fila propia desde la tabla de depreciación.
3. **Alcance del reporte PANI.** Si el PANI quiere solo lo comprado con recursos PANI o todos los activos, se resuelve con el filtro por fuente que ya tiene el reporte.
4. **Jornada laboral.** De lunes a viernes son 10 días hábiles de vacaciones; si incluye sábado, 12. Es un parámetro editable.
5. **Reglamento interno de tardías.** La tolerancia es un parámetro editable.
6. **Formatos de liquidación del IMAS y la JPS.**
