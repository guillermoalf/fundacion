
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activo_movimientos": {
                  Row: {
                    "activo_id": string,"creado_en": string,"documento_url": string | null,"fecha": string,"id": string,"motivo": string,"registrado_por": string | null,"tipo": Database["public"]['Enums']["tipo_mov_activo"],"ubicacion_destino_id": number | null,"ubicacion_origen_id": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activo_id": string,"creado_en"?: string,"documento_url"?: string | null,"fecha"?: string,"id"?: string,"motivo": string,"registrado_por"?: string | null,"tipo": Database["public"]['Enums']["tipo_mov_activo"],"ubicacion_destino_id"?: number | null,"ubicacion_origen_id"?: number | null
                  }
                  Update: {
                    "activo_id"?: string,"creado_en"?: string,"documento_url"?: string | null,"fecha"?: string,"id"?: string,"motivo"?: string,"registrado_por"?: string | null,"tipo"?: Database["public"]['Enums']["tipo_mov_activo"],"ubicacion_destino_id"?: number | null,"ubicacion_origen_id"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "activo_movimientos_activo_id_fkey"
      columns: ["activo_id"]
isOneToOne: false
      referencedRelation: "activos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activo_movimientos_activo_id_fkey"
      columns: ["activo_id"]
isOneToOne: false
      referencedRelation: "v_activos_alertas"
      referencedColumns: ["activo_id"]
    },{
      foreignKeyName: "activo_movimientos_registrado_por_fkey"
      columns: ["registrado_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activo_movimientos_ubicacion_destino_id_fkey"
      columns: ["ubicacion_destino_id"]
isOneToOne: false
      referencedRelation: "ubicaciones"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activo_movimientos_ubicacion_origen_id_fkey"
      columns: ["ubicacion_origen_id"]
isOneToOne: false
      referencedRelation: "ubicaciones"
      referencedColumns: ["id"]
    }
                  ]
                },"activos": {
                  Row: {
                    "categoria_id": number | null,"compra_linea_id": string | null,"costo": number | null,"creado_en": string,"estado": Database["public"]['Enums']["estado_activo"],"fecha_adquisicion": string | null,"fecha_baja": string | null,"fila_origen": string | null,"foto_url": string | null,"fuente_id": number,"id": string,"marca": string | null,"metodo": Database["public"]['Enums']["metodo_depreciacion"],"modelo": string | null,"motivo_baja": string | null,"notas": string | null,"origen": string,"placa": string | null,"serie": string | null,"tasa_anual_override": number | null,"tipo_bien": string,"ubicacion_id": number,"unidades_compra": number | null,"valor_residual": number
                  }
                  ComputedFields: never
                  Insert: {
                    "categoria_id"?: number | null,"compra_linea_id"?: string | null,"costo"?: number | null,"creado_en"?: string,"estado"?: Database["public"]['Enums']["estado_activo"],"fecha_adquisicion"?: string | null,"fecha_baja"?: string | null,"fila_origen"?: string | null,"foto_url"?: string | null,"fuente_id": number,"id"?: string,"marca"?: string | null,"metodo"?: Database["public"]['Enums']["metodo_depreciacion"],"modelo"?: string | null,"motivo_baja"?: string | null,"notas"?: string | null,"origen"?: string,"placa"?: string | null,"serie"?: string | null,"tasa_anual_override"?: number | null,"tipo_bien": string,"ubicacion_id": number,"unidades_compra"?: number | null,"valor_residual"?: number
                  }
                  Update: {
                    "categoria_id"?: number | null,"compra_linea_id"?: string | null,"costo"?: number | null,"creado_en"?: string,"estado"?: Database["public"]['Enums']["estado_activo"],"fecha_adquisicion"?: string | null,"fecha_baja"?: string | null,"fila_origen"?: string | null,"foto_url"?: string | null,"fuente_id"?: number,"id"?: string,"marca"?: string | null,"metodo"?: Database["public"]['Enums']["metodo_depreciacion"],"modelo"?: string | null,"motivo_baja"?: string | null,"notas"?: string | null,"origen"?: string,"placa"?: string | null,"serie"?: string | null,"tasa_anual_override"?: number | null,"tipo_bien"?: string,"ubicacion_id"?: number,"unidades_compra"?: number | null,"valor_residual"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "activos_categoria_id_fkey"
      columns: ["categoria_id"]
isOneToOne: false
      referencedRelation: "categorias_activo"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activos_compra_linea_id_fkey"
      columns: ["compra_linea_id"]
isOneToOne: false
      referencedRelation: "compra_lineas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activos_fuente_id_fkey"
      columns: ["fuente_id"]
isOneToOne: false
      referencedRelation: "fuentes_financiamiento"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activos_ubicacion_id_fkey"
      columns: ["ubicacion_id"]
isOneToOne: false
      referencedRelation: "ubicaciones"
      referencedColumns: ["id"]
    }
                  ]
                },"ausencias": {
                  Row: {
                    "aprobado_por": string | null,"creado_en": string,"desde": string,"dias_habiles": number,"documento_url": string | null,"empleado_id": string,"hasta": string,"id": string,"numero_boleta": string | null,"observaciones": string | null,"tipo": Database["public"]['Enums']["tipo_ausencia"]
                  }
                  ComputedFields: never
                  Insert: {
                    "aprobado_por"?: string | null,"creado_en"?: string,"desde": string,"dias_habiles": number,"documento_url"?: string | null,"empleado_id": string,"hasta": string,"id"?: string,"numero_boleta"?: string | null,"observaciones"?: string | null,"tipo": Database["public"]['Enums']["tipo_ausencia"]
                  }
                  Update: {
                    "aprobado_por"?: string | null,"creado_en"?: string,"desde"?: string,"dias_habiles"?: number,"documento_url"?: string | null,"empleado_id"?: string,"hasta"?: string,"id"?: string,"numero_boleta"?: string | null,"observaciones"?: string | null,"tipo"?: Database["public"]['Enums']["tipo_ausencia"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "ausencias_aprobado_por_fkey"
      columns: ["aprobado_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ausencias_empleado_id_fkey"
      columns: ["empleado_id"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id"]
    }
                  ]
                },"bitacora": {
                  Row: {
                    "accion": string,"antes": Json | null,"despues": Json | null,"en": string,"id": number,"registro_id": string,"tabla": string,"usuario": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accion": string,"antes"?: Json | null,"despues"?: Json | null,"en"?: string,"id"?: number,"registro_id": string,"tabla": string,"usuario"?: string | null
                  }
                  Update: {
                    "accion"?: string,"antes"?: Json | null,"despues"?: Json | null,"en"?: string,"id"?: number,"registro_id"?: string,"tabla"?: string,"usuario"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"categorias_activo": {
                  Row: {
                    "activa": boolean,"anios_vida": number,"id": number,"nombre": string,"palabras_clave": (string)[],"referencia": string,"tasa_anual": number
                  }
                  ComputedFields: never
                  Insert: {
                    "activa"?: boolean,"anios_vida": number,"id"?: number,"nombre": string,"palabras_clave"?: (string)[],"referencia"?: string,"tasa_anual": number
                  }
                  Update: {
                    "activa"?: boolean,"anios_vida"?: number,"id"?: number,"nombre"?: string,"palabras_clave"?: (string)[],"referencia"?: string,"tasa_anual"?: number
                  }
                  Relationships: [
                    
                  ]
                },"compra_lineas": {
                  Row: {
                    "cantidad": number,"compra_id": string,"descripcion": string,"id": string,"precio_unitario": number,"producto_id": number | null,"tipo": Database["public"]['Enums']["tipo_linea_compra"],"total_linea": number | null,"unidad": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cantidad": number,"compra_id": string,"descripcion": string,"id"?: string,"precio_unitario": number,"producto_id"?: number | null,"tipo": Database["public"]['Enums']["tipo_linea_compra"],"total_linea"?: never,"unidad"?: string
                  }
                  Update: {
                    "cantidad"?: number,"compra_id"?: string,"descripcion"?: string,"id"?: string,"precio_unitario"?: number,"producto_id"?: number | null,"tipo"?: Database["public"]['Enums']["tipo_linea_compra"],"total_linea"?: never,"unidad"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "compra_lineas_compra_id_fkey"
      columns: ["compra_id"]
isOneToOne: false
      referencedRelation: "compras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "compra_lineas_producto_fk"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "compra_lineas_producto_fk"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "v_saldo_inventario"
      referencedColumns: ["producto_id"]
    }
                  ]
                },"compras": {
                  Row: {
                    "creado_en": string,"factura_url": string | null,"fecha": string,"fuente_id": number,"id": string,"iva": number,"numero_factura": string,"observaciones": string | null,"proveedor_id": number,"registrado_por": string | null,"subtotal": number,"total": number
                  }
                  ComputedFields: never
                  Insert: {
                    "creado_en"?: string,"factura_url"?: string | null,"fecha": string,"fuente_id": number,"id"?: string,"iva"?: number,"numero_factura": string,"observaciones"?: string | null,"proveedor_id": number,"registrado_por"?: string | null,"subtotal"?: number,"total": number
                  }
                  Update: {
                    "creado_en"?: string,"factura_url"?: string | null,"fecha"?: string,"fuente_id"?: number,"id"?: string,"iva"?: number,"numero_factura"?: string,"observaciones"?: string | null,"proveedor_id"?: number,"registrado_por"?: string | null,"subtotal"?: number,"total"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "compras_fuente_id_fkey"
      columns: ["fuente_id"]
isOneToOne: false
      referencedRelation: "fuentes_financiamiento"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "compras_proveedor_id_fkey"
      columns: ["proveedor_id"]
isOneToOne: false
      referencedRelation: "proveedores"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "compras_registrado_por_fkey"
      columns: ["registrado_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"conteo_detalle": {
                  Row: {
                    "activo_id": string,"conteo_id": string,"encontrado": boolean,"estado_observado": string | null,"nota": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activo_id": string,"conteo_id": string,"encontrado": boolean,"estado_observado"?: string | null,"nota"?: string | null
                  }
                  Update: {
                    "activo_id"?: string,"conteo_id"?: string,"encontrado"?: boolean,"estado_observado"?: string | null,"nota"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "conteo_detalle_activo_id_fkey"
      columns: ["activo_id"]
isOneToOne: false
      referencedRelation: "activos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conteo_detalle_activo_id_fkey"
      columns: ["activo_id"]
isOneToOne: false
      referencedRelation: "v_activos_alertas"
      referencedColumns: ["activo_id"]
    },{
      foreignKeyName: "conteo_detalle_conteo_id_fkey"
      columns: ["conteo_id"]
isOneToOne: false
      referencedRelation: "conteos_fisicos"
      referencedColumns: ["id"]
    }
                  ]
                },"conteos_fisicos": {
                  Row: {
                    "acta_firmada_url": string | null,"cerrado": boolean,"fecha": string,"id": string,"observaciones": string | null,"realizado_por": string | null,"responsable_id": string,"ubicacion_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "acta_firmada_url"?: string | null,"cerrado"?: boolean,"fecha"?: string,"id"?: string,"observaciones"?: string | null,"realizado_por"?: string | null,"responsable_id": string,"ubicacion_id": number
                  }
                  Update: {
                    "acta_firmada_url"?: string | null,"cerrado"?: boolean,"fecha"?: string,"id"?: string,"observaciones"?: string | null,"realizado_por"?: string | null,"responsable_id"?: string,"ubicacion_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "conteos_fisicos_realizado_por_fkey"
      columns: ["realizado_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conteos_fisicos_responsable_id_fkey"
      columns: ["responsable_id"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conteos_fisicos_ubicacion_id_fkey"
      columns: ["ubicacion_id"]
isOneToOne: false
      referencedRelation: "ubicaciones"
      referencedColumns: ["id"]
    }
                  ]
                },"empleados": {
                  Row: {
                    "activo": boolean,"cedula": string,"creado_en": string,"fecha_ingreso": string,"fecha_salida": string | null,"fuente_id": number | null,"horas_jornada_diaria": number,"id": string,"nombre": string,"perfil_id": string | null,"pin_hash": string | null,"puesto": string,"salario_mensual": number,"ubicacion_id": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"cedula": string,"creado_en"?: string,"fecha_ingreso": string,"fecha_salida"?: string | null,"fuente_id"?: number | null,"horas_jornada_diaria"?: number,"id"?: string,"nombre": string,"perfil_id"?: string | null,"pin_hash"?: string | null,"puesto": string,"salario_mensual": number,"ubicacion_id"?: number | null
                  }
                  Update: {
                    "activo"?: boolean,"cedula"?: string,"creado_en"?: string,"fecha_ingreso"?: string,"fecha_salida"?: string | null,"fuente_id"?: number | null,"horas_jornada_diaria"?: number,"id"?: string,"nombre"?: string,"perfil_id"?: string | null,"pin_hash"?: string | null,"puesto"?: string,"salario_mensual"?: number,"ubicacion_id"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "empleados_fuente_id_fkey"
      columns: ["fuente_id"]
isOneToOne: false
      referencedRelation: "fuentes_financiamiento"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "empleados_perfil_id_fkey"
      columns: ["perfil_id"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "empleados_ubicacion_id_fkey"
      columns: ["ubicacion_id"]
isOneToOne: false
      referencedRelation: "ubicaciones"
      referencedColumns: ["id"]
    }
                  ]
                },"fuentes_financiamiento": {
                  Row: {
                    "activo": boolean,"codigo": string,"id": number,"nombre": string,"programa": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"codigo": string,"id"?: number,"nombre": string,"programa"?: string | null
                  }
                  Update: {
                    "activo"?: boolean,"codigo"?: string,"id"?: number,"nombre"?: string,"programa"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"horarios": {
                  Row: {
                    "dia_semana": number,"empleado_id": string,"hora_entrada": string,"hora_salida": string,"id": number,"vigente_desde": string,"vigente_hasta": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "dia_semana": number,"empleado_id": string,"hora_entrada": string,"hora_salida": string,"id"?: number,"vigente_desde"?: string,"vigente_hasta"?: string | null
                  }
                  Update: {
                    "dia_semana"?: number,"empleado_id"?: string,"hora_entrada"?: string,"hora_salida"?: string,"id"?: number,"vigente_desde"?: string,"vigente_hasta"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "horarios_empleado_id_fkey"
      columns: ["empleado_id"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id"]
    }
                  ]
                },"inventario_movimientos": {
                  Row: {
                    "cantidad": number,"compra_linea_id": string | null,"creado_en": string,"entregado_a": string | null,"fecha": string,"fecha_vencimiento": string | null,"id": string,"motivo": string | null,"producto_id": number,"registrado_por": string | null,"tipo": Database["public"]['Enums']["tipo_mov_inventario"]
                  }
                  ComputedFields: never
                  Insert: {
                    "cantidad": number,"compra_linea_id"?: string | null,"creado_en"?: string,"entregado_a"?: string | null,"fecha"?: string,"fecha_vencimiento"?: string | null,"id"?: string,"motivo"?: string | null,"producto_id": number,"registrado_por"?: string | null,"tipo": Database["public"]['Enums']["tipo_mov_inventario"]
                  }
                  Update: {
                    "cantidad"?: number,"compra_linea_id"?: string | null,"creado_en"?: string,"entregado_a"?: string | null,"fecha"?: string,"fecha_vencimiento"?: string | null,"id"?: string,"motivo"?: string | null,"producto_id"?: number,"registrado_por"?: string | null,"tipo"?: Database["public"]['Enums']["tipo_mov_inventario"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "inventario_movimientos_compra_linea_id_fkey"
      columns: ["compra_linea_id"]
isOneToOne: false
      referencedRelation: "compra_lineas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventario_movimientos_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "productos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventario_movimientos_producto_id_fkey"
      columns: ["producto_id"]
isOneToOne: false
      referencedRelation: "v_saldo_inventario"
      referencedColumns: ["producto_id"]
    },{
      foreignKeyName: "inventario_movimientos_registrado_por_fkey"
      columns: ["registrado_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"marcas": {
                  Row: {
                    "empleado_id": string,"id": string,"marcado_en": string,"motivo_manual": string | null,"origen": Database["public"]['Enums']["origen_marca"],"registrado_por": string | null,"tipo": Database["public"]['Enums']["tipo_marca"]
                  }
                  ComputedFields: never
                  Insert: {
                    "empleado_id": string,"id"?: string,"marcado_en"?: string,"motivo_manual"?: string | null,"origen": Database["public"]['Enums']["origen_marca"],"registrado_por"?: string | null,"tipo": Database["public"]['Enums']["tipo_marca"]
                  }
                  Update: {
                    "empleado_id"?: string,"id"?: string,"marcado_en"?: string,"motivo_manual"?: string | null,"origen"?: Database["public"]['Enums']["origen_marca"],"registrado_por"?: string | null,"tipo"?: Database["public"]['Enums']["tipo_marca"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "marcas_empleado_id_fkey"
      columns: ["empleado_id"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "marcas_registrado_por_fkey"
      columns: ["registrado_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"parametros": {
                  Row: {
                    "clave": string,"fuente_legal": string | null,"valor": number,"vigente_desde": string
                  }
                  ComputedFields: never
                  Insert: {
                    "clave": string,"fuente_legal"?: string | null,"valor": number,"vigente_desde": string
                  }
                  Update: {
                    "clave"?: string,"fuente_legal"?: string | null,"valor"?: number,"vigente_desde"?: string
                  }
                  Relationships: [
                    
                  ]
                },"perfiles": {
                  Row: {
                    "acceso_hasta": string | null,"activo": boolean,"creado_en": string,"id": string,"nombre": string,"rol": Database["public"]['Enums']["rol_portal"]
                  }
                  ComputedFields: never
                  Insert: {
                    "acceso_hasta"?: string | null,"activo"?: boolean,"creado_en"?: string,"id": string,"nombre": string,"rol"?: Database["public"]['Enums']["rol_portal"]
                  }
                  Update: {
                    "acceso_hasta"?: string | null,"activo"?: boolean,"creado_en"?: string,"id"?: string,"nombre"?: string,"rol"?: Database["public"]['Enums']["rol_portal"]
                  }
                  Relationships: [
                    
                  ]
                },"planilla_lineas": {
                  Row: {
                    "cargas_patronales": number,"ccss_obrero": number,"detalle": NonNullable<Json>,"dias_laborados": number,"empleado_id": string,"fuente_id": number | null,"horas_extra": number,"impuesto_renta": number,"monto_horas_extra": number,"otras_deducciones": number,"pago_incapacidad_patrono": number,"planilla_id": string,"provision_aguinaldo": number,"provision_vacaciones": number,"rebajo_ausencias": number,"rebajo_tardias": number,"salario_base": number,"salario_bruto": number,"salario_neto": number
                  }
                  ComputedFields: never
                  Insert: {
                    "cargas_patronales": number,"ccss_obrero": number,"detalle"?: NonNullable<Json>,"dias_laborados": number,"empleado_id": string,"fuente_id"?: number | null,"horas_extra"?: number,"impuesto_renta"?: number,"monto_horas_extra"?: number,"otras_deducciones"?: number,"pago_incapacidad_patrono"?: number,"planilla_id": string,"provision_aguinaldo": number,"provision_vacaciones": number,"rebajo_ausencias"?: number,"rebajo_tardias"?: number,"salario_base": number,"salario_bruto": number,"salario_neto": number
                  }
                  Update: {
                    "cargas_patronales"?: number,"ccss_obrero"?: number,"detalle"?: NonNullable<Json>,"dias_laborados"?: number,"empleado_id"?: string,"fuente_id"?: number | null,"horas_extra"?: number,"impuesto_renta"?: number,"monto_horas_extra"?: number,"otras_deducciones"?: number,"pago_incapacidad_patrono"?: number,"planilla_id"?: string,"provision_aguinaldo"?: number,"provision_vacaciones"?: number,"rebajo_ausencias"?: number,"rebajo_tardias"?: number,"salario_base"?: number,"salario_bruto"?: number,"salario_neto"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "planilla_lineas_empleado_id_fkey"
      columns: ["empleado_id"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "planilla_lineas_fuente_id_fkey"
      columns: ["fuente_id"]
isOneToOne: false
      referencedRelation: "fuentes_financiamiento"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "planilla_lineas_planilla_id_fkey"
      columns: ["planilla_id"]
isOneToOne: false
      referencedRelation: "planillas"
      referencedColumns: ["id"]
    }
                  ]
                },"planillas": {
                  Row: {
                    "aprobada_en": string | null,"aprobada_por": string | null,"creado_en": string,"estado": Database["public"]['Enums']["estado_planilla"],"id": string,"periodo_fin": string,"periodo_inicio": string,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aprobada_en"?: string | null,"aprobada_por"?: string | null,"creado_en"?: string,"estado"?: Database["public"]['Enums']["estado_planilla"],"id"?: string,"periodo_fin": string,"periodo_inicio": string,"tipo"?: string
                  }
                  Update: {
                    "aprobada_en"?: string | null,"aprobada_por"?: string | null,"creado_en"?: string,"estado"?: Database["public"]['Enums']["estado_planilla"],"id"?: string,"periodo_fin"?: string,"periodo_inicio"?: string,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "planillas_aprobada_por_fkey"
      columns: ["aprobada_por"]
isOneToOne: false
      referencedRelation: "perfiles"
      referencedColumns: ["id"]
    }
                  ]
                },"productos": {
                  Row: {
                    "activo": boolean,"categoria": Database["public"]['Enums']["categoria_producto"],"codigo_proveedor": string | null,"id": number,"nombre": string,"proveedor_habitual_id": number | null,"stock_minimo": number,"unidad": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"categoria": Database["public"]['Enums']["categoria_producto"],"codigo_proveedor"?: string | null,"id"?: number,"nombre": string,"proveedor_habitual_id"?: number | null,"stock_minimo"?: number,"unidad": string
                  }
                  Update: {
                    "activo"?: boolean,"categoria"?: Database["public"]['Enums']["categoria_producto"],"codigo_proveedor"?: string | null,"id"?: number,"nombre"?: string,"proveedor_habitual_id"?: number | null,"stock_minimo"?: number,"unidad"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "productos_proveedor_habitual_id_fkey"
      columns: ["proveedor_habitual_id"]
isOneToOne: false
      referencedRelation: "proveedores"
      referencedColumns: ["id"]
    }
                  ]
                },"proveedores": {
                  Row: {
                    "activo": boolean,"cedula_juridica": string | null,"correo": string | null,"es_habitual": boolean,"id": number,"nombre": string,"notas": string | null,"telefono": string | null,"tipo": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"cedula_juridica"?: string | null,"correo"?: string | null,"es_habitual"?: boolean,"id"?: number,"nombre": string,"notas"?: string | null,"telefono"?: string | null,"tipo"?: string | null
                  }
                  Update: {
                    "activo"?: boolean,"cedula_juridica"?: string | null,"correo"?: string | null,"es_habitual"?: boolean,"id"?: number,"nombre"?: string,"notas"?: string | null,"telefono"?: string | null,"tipo"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"ubicaciones": {
                  Row: {
                    "activo": boolean,"id": number,"nombre": string,"responsable_id": string | null,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"id"?: number,"nombre": string,"responsable_id"?: string | null,"tipo"?: string
                  }
                  Update: {
                    "activo"?: boolean,"id"?: number,"nombre"?: string,"responsable_id"?: string | null,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ubicaciones_responsable_fk"
      columns: ["responsable_id"]
isOneToOne: false
      referencedRelation: "empleados"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "v_activos_alertas": {
                  Row: {
                    "activo_id": string,"alerta": string | null,"placa": string | null,"tipo_bien": string,"ubicacion": string
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"v_saldo_inventario": {
                  Row: {
                    "categoria": Database["public"]['Enums']["categoria_producto"],"nombre": string,"producto_id": number,"saldo": number | null,"stock_minimo": number,"unidad": string
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "activos_al_corte":
{ Args: { "p_corte": string,"p_fuente"?: string }; Returns: {
              "activo_id": string,"categoria": string,"costo": number,"depreciacion_acumulada": number,"fecha_adquisicion": string,"fuente": string,"marca": string,"modelo": string,"placa": string,"serie": string,"tasa_anual": number,"tipo_bien": string,"ubicacion": string,"valor_libros": number
            }[]
                           },
"depreciacion_acumulada":
{ Args: { "p_adq": string,"p_anios": number,"p_corte": string,"p_costo": number,"p_metodo": Database["public"]['Enums']["metodo_depreciacion"],"p_residual": number,"p_tasa": number }; Returns: number
                           },
"es_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"meses_depreciados":
{ Args: { "p_adq": string,"p_corte": string }; Returns: number
                           },
"parametro":
{ Args: { "p_clave": string,"p_fecha"?: string }; Returns: number
                           },
"puede_escribir":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"puede_leer":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"rol_actual":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["rol_portal"]
                           }
          }
          Enums: {
            "categoria_producto": "perecedero"|"no_perecedero"|"limpieza"|"didactico"|"oficina"|"otro","estado_activo": "en_uso"|"en_reparacion"|"en_bodega"|"extraviado"|"dado_de_baja","estado_planilla": "borrador"|"aprobada"|"pagada"|"anulada","metodo_depreciacion": "linea_recta"|"suma_digitos","origen_marca": "kiosko"|"hoja_firmada"|"manual","rol_portal": "admin"|"contabilidad"|"coordinacion"|"auditor","tipo_ausencia": "vacaciones"|"incapacidad_ccss"|"incapacidad_ins"|"licencia_maternidad"|"permiso_con_goce"|"permiso_sin_goce"|"ausencia_injustificada"|"feriado","tipo_linea_compra": "activo"|"consumible"|"servicio","tipo_marca": "entrada"|"salida","tipo_mov_activo": "alta"|"traslado"|"reparacion"|"retorno"|"baja"|"ajuste","tipo_mov_inventario": "entrada"|"salida"|"merma"|"ajuste"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "categoria_producto": ["perecedero", "no_perecedero", "limpieza", "didactico", "oficina", "otro"],"estado_activo": ["en_uso", "en_reparacion", "en_bodega", "extraviado", "dado_de_baja"],"estado_planilla": ["borrador", "aprobada", "pagada", "anulada"],"metodo_depreciacion": ["linea_recta", "suma_digitos"],"origen_marca": ["kiosko", "hoja_firmada", "manual"],"rol_portal": ["admin", "contabilidad", "coordinacion", "auditor"],"tipo_ausencia": ["vacaciones", "incapacidad_ccss", "incapacidad_ins", "licencia_maternidad", "permiso_con_goce", "permiso_sin_goce", "ausencia_injustificada", "feriado"],"tipo_linea_compra": ["activo", "consumible", "servicio"],"tipo_marca": ["entrada", "salida"],"tipo_mov_activo": ["alta", "traslado", "reparacion", "retorno", "baja", "ajuste"],"tipo_mov_inventario": ["entrada", "salida", "merma", "ajuste"]
          }
        }
} as const
