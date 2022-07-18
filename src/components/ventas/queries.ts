export const QUERY_GET_VENTAS_BY_CLIENTE_BASE = `
  SELECT
    IMPORTES_DOCTOS_CC.IMPTE_DOCTO_CC_ID,
    IMPORTES_DOCTOS_CC.DOCTO_CC_ID,
    DOCTOS_CC.FOLIO,
    DOCTOS_CC.CONCEPTO_CC_ID,
    DOCTOS_CC.CLIENTE_ID,
    UPPER(DOCTOS_CC.DESCRIPCION) AS DESCRIPCION,
    UPPER(CONCEPTOS_CC.NOMBRE) AS CONCEPTO,
    LIBRES_CARGOS_CC.FORMA_DE_PAGO AS FORMA_DE_PAGO_ID,
    UPPER(LIST_ATRIB_4.VALOR_DESPLEGADO) AS FORMA_DE_PAGO,
    LIBRES_CARGOS_CC.PARCIALIDAD,
    LIBRES_CARGOS_CC.CREDITO_EN_MESES AS CREDITO_EN_MESES_ID,
    LIBRES_CARGOS_CC.TIEMPO_A_CORTO_PLAZOMESES,
    LIBRES_CARGOS_CC.MONTO_A_CORTO_PLAZO,
    LIBRES_CARGOS_CC.VENDEDOR_1 AS VENDEDOR_1_ID,
    LIST_ATRIB_1.VALOR_DESPLEGADO AS VENDEDOR_1,
    LIBRES_CARGOS_CC.VENDEDOR_2 AS VENDEDOR_2_ID,
    LIST_ATRIB_2.VALOR_DESPLEGADO AS VENDEDOR_2,
    LIBRES_CARGOS_CC.VENDEDOR_3 AS VENDEDOR_3_ID,
    LIST_ATRIB_3.VALOR_DESPLEGADO AS VENDEDOR_3,
    IMPORTES_DOCTOS_CC.FECHA,
    EXTRACT(YEAR FROM DOCTOS_CC.FECHA) || 
    CASE EXTRACT(MONTH FROM DOCTOS_CC.FECHA)
    WHEN 1 THEN '01'
    WHEN 2 THEN '02'
    WHEN 3 THEN '03'
    WHEN 4 THEN '04'
    WHEN 5 THEN '05'
    WHEN 6 THEN '06'
    WHEN 7 THEN '07'
    WHEN 8 THEN '08'
    WHEN 9 THEN '09'
    WHEN 10 THEN '10'
    WHEN 11 THEN '11'
    WHEN 12 THEN '12'
    END AS ANO_MES,
    IMPORTES_DOCTOS_CC.CANCELADO,
    IMPORTES_DOCTOS_CC.APLICADO,
    IMPORTES_DOCTOS_CC.ESTATUS,
    IMPORTES_DOCTOS_CC.DOCTO_CC_ACR_ID,
    IMPORTES_DOCTOS_CC.IMPORTE,
    IMPORTES_DOCTOS_CC.IMPUESTO,
    (IMPORTES_DOCTOS_CC.IMPORTE + IMPORTES_DOCTOS_CC.IMPUESTO) AS CANTIDAD,
    LIBRES_CARGOS_CC.ENGANCHE
  FROM IMPORTES_DOCTOS_CC
  INNER JOIN DOCTOS_CC ON DOCTOS_CC.DOCTO_CC_ID = IMPORTES_DOCTOS_CC.DOCTO_CC_ID
  INNER JOIN CONCEPTOS_CC ON CONCEPTOS_CC.CONCEPTO_CC_ID = DOCTOS_CC.CONCEPTO_CC_ID
  INNER JOIN CLIENTES ON CLIENTES.CLIENTE_ID = DOCTOS_CC.CLIENTE_ID
  LEFT OUTER JOIN LIBRES_CARGOS_CC ON LIBRES_CARGOS_CC.DOCTO_CC_ID = DOCTOS_CC.DOCTO_CC_ID
  LEFT OUTER JOIN LISTAS_ATRIBUTOS AS LIST_ATRIB_1 ON LIST_ATRIB_1.LISTA_ATRIB_ID = LIBRES_CARGOS_CC.VENDEDOR_1
  LEFT OUTER JOIN LISTAS_ATRIBUTOS AS LIST_ATRIB_2 ON LIST_ATRIB_2.LISTA_ATRIB_ID = LIBRES_CARGOS_CC.VENDEDOR_2
  LEFT OUTER JOIN LISTAS_ATRIBUTOS AS LIST_ATRIB_3 ON LIST_ATRIB_3.LISTA_ATRIB_ID = LIBRES_CARGOS_CC.VENDEDOR_3
  LEFT OUTER JOIN LISTAS_ATRIBUTOS AS LIST_ATRIB_4 ON LIST_ATRIB_4.LISTA_ATRIB_ID = LIBRES_CARGOS_CC.FORMA_DE_PAGO
`;

export const QUERY_GET_VENTAS_BY_CLIENTE = `
${QUERY_GET_VENTAS_BY_CLIENTE_BASE}
  WHERE CLIENTES.CLIENTE_ID = ? AND IMPORTES_DOCTOS_CC.CANCELADO = 'N' AND DOCTOS_CC.ESTATUS = 'N'
  ORDER BY IMPORTES_DOCTOS_CC.FECHA
`;
export const QUERY_GET_VENTAS_BY_RUTA = `
  ${QUERY_GET_VENTAS_BY_CLIENTE_BASE}
  WHERE DOCTOS_CC.CONCEPTO_CC_ID = 5 AND IMPORTES_DOCTOS_CC.CANCELADO = 'N'
  ORDER BY FECHA DESC
`;

export const QUERY_GET_PAGOS_BY_VENTAS_ID = `
  SELECT
    IMPORTES_DOCTOS_CC.IMPTE_DOCTO_CC_ID,
    IMPORTES_DOCTOS_CC.DOCTO_CC_ID,
    DOCTOS_CC.FOLIO,
    DOCTOS_CC.CONCEPTO_CC_ID,
    DOCTOS_CC.CLIENTE_ID,
    UPPER(CONCEPTOS_CC.NOMBRE) AS CONCEPTO,
    IMPORTES_DOCTOS_CC.FECHA,
    IMPORTES_DOCTOS_CC.CANCELADO,
    IMPORTES_DOCTOS_CC.APLICADO,
    IMPORTES_DOCTOS_CC.ESTATUS,
    IMPORTES_DOCTOS_CC.DOCTO_CC_ACR_ID,
    IMPORTES_DOCTOS_CC.IMPORTE,
    IMPORTES_DOCTOS_CC.IMPUESTO,
    (IMPORTES_DOCTOS_CC.IMPORTE + IMPORTES_DOCTOS_CC.IMPUESTO) AS CANTIDAD
  FROM IMPORTES_DOCTOS_CC
  INNER JOIN DOCTOS_CC ON DOCTOS_CC.DOCTO_CC_ID = IMPORTES_DOCTOS_CC.DOCTO_CC_ID
  INNER JOIN CONCEPTOS_CC ON CONCEPTOS_CC.CONCEPTO_CC_ID = DOCTOS_CC.CONCEPTO_CC_ID
  INNER JOIN CLIENTES ON CLIENTES.CLIENTE_ID = DOCTOS_CC.CLIENTE_ID
  WHERE IMPORTES_DOCTOS_CC.DOCTO_CC_ACR_ID IN
`;

export const QUERY_GET_ARTICULOS_BY_FOLIO = (folios: string) => `
  SELECT
    DOCTOS_PV.DOCTO_PV_ID,
    DOCTOS_PV.FOLIO,
    DOCTOS_PV_DET.DOCTO_PV_DET_ID,
    DOCTOS_PV_DET.DOCTO_PV_ID,
    DOCTOS_PV_DET.ARTICULO_ID,
    ARTICULOS.NOMBRE AS ARTICULO,
    DOCTOS_PV_DET.UNIDADES AS CANTIDAD,
    DOCTOS_PV_DET.PRECIO_UNITARIO_IMPTO,
    DOCTOS_PV_DET.PRECIO_TOTAL_NETO,
    DOCTOS_PV_DET.POSICION
  FROM DOCTOS_PV
  INNER JOIN DOCTOS_PV_DET ON DOCTOS_PV_DET.DOCTO_PV_ID = DOCTOS_PV.DOCTO_PV_ID
  INNER JOIN ARTICULOS ON ARTICULOS.ARTICULO_ID = DOCTOS_PV_DET.ARTICULO_ID
  WHERE DOCTOS_PV.FOLIO IN ('${folios}') AND DOCTOS_PV_DET.POSICION > 0
  ORDER BY DOCTOS_PV_DET.POSICION
`;

export const QUERY_GET_ARTICULOS_ITEMS_BY_VENTA_ID_PART_1 = `
  SELECT
    DOCTOS_PV_DET.DOCTO_PV_DET_ID,
    DOCTOS_PV_DET.DOCTO_PV_ID,
    DOCTOS_PV_DET.ARTICULO_ID,
    ARTICULOS.NOMBRE AS ARTICULO,
    DOCTOS_PV_DET.UNIDADES AS CANTIDAD,
    DOCTOS_PV_DET.PRECIO_UNITARIO_IMPTO,
    DOCTOS_PV_DET.PRECIO_TOTAL_NETO,
    DOCTOS_PV_DET.POSICION
  FROM DOCTOS_PV_DET
  INNER JOIN ARTICULOS ON ARTICULOS.ARTICULO_ID = DOCTOS_PV_DET.ARTICULO_ID
  WHERE DOCTOS_PV_DET.DOCTO_PV_ID =
`;

export const QUERY_GET_ARTICULOS_ITEMS_BY_VENTA_ID_PART_2 = `
  AND DOCTOS_PV_DET.POSICION > 0
  ORDER BY DOCTOS_PV_DET.POSICION
`;

export const QUERY_GET_VENTAS_BY_CLIENTES_SIMPLIFICADO = (
  clientesIds: string
) => `
  SELECT
    M.DOCTO_CC_ACR_ID,
    DOCTOS_CC.DOCTO_CC_ID,
    DOCTOS_CC.FOLIO,
    DOCTOS_CC.CLIENTE_ID,
    CLIENTES.NOMBRE AS CLIENTE,
    ZONAS_CLIENTES.NOMBRE AS RUTA,
    DIRS_CLIENTES.CALLE AS DOMICILIO,
    LIBRES_CLIENTES.LOCALIDAD AS LOCALIDAD_ID,
    LOCALIDADES.VALOR_DESPLEGADO AS LOCALIDAD,
    M.IMPORTE_PAGO_PROMEDIO,
    M.TOTAL_IMPORTE,
    M.NUM_IMPORTES,
    DOCTOS_CC.FECHA,
    LIBRES_CARGOS_CC.PARCIALIDAD,
    LIBRES_CARGOS_CC.ENGANCHE,
    UPPER(LIST_VEN_1.VALOR_DESPLEGADO) AS VENDEDOR_1,
    UPPER(LIST_VEN_2.VALOR_DESPLEGADO) AS VENDEDOR_2,
    UPPER(LIST_VEN_3.VALOR_DESPLEGADO) AS VENDEDOR_3,
    LISTAS_ATRIBUTOS.LISTA_ATRIB_ID AS FREC_PAGO_ID,
    UPPER(LISTAS_ATRIBUTOS.VALOR_DESPLEGADO) AS FREC_PAGO,
    IMPORTES_DOCTOS_CC.IMPORTE + IMPORTES_DOCTOS_CC.IMPUESTO AS PRECIO_TOTAL,
    M.IMPTE_REST,
    IMPORTES_DOCTOS_CC.IMPORTE + IMPORTES_DOCTOS_CC.IMPUESTO - M.TOTAL_IMPORTE - M.IMPTE_REST AS SALDO_REST,
    (M.TOTAL_IMPORTE + M.IMPTE_REST) / (IMPORTES_DOCTOS_CC.IMPORTE + IMPORTES_DOCTOS_CC.IMPUESTO) * 100 AS PORCETAJE_PAGADO,
    M.FECHA_ULT_PAGO
  FROM
  (
    SELECT
      IMPORTES_DOCTOS_CC.DOCTO_CC_ACR_ID,
      SUM(CASE WHEN DOCTOS_CC.CONCEPTO_CC_ID IN (87327, 155) THEN (IMPORTES_DOCTOS_CC.IMPORTE + IMPORTES_DOCTOS_CC.IMPUESTO) ELSE 0 END) AS TOTAL_IMPORTE,
      AVG(CASE WHEN DOCTOS_CC.CONCEPTO_CC_ID IN (87327, 155) THEN (IMPORTES_DOCTOS_CC.IMPORTE + IMPORTES_DOCTOS_CC.IMPUESTO) ELSE NULL END) AS IMPORTE_PAGO_PROMEDIO,
      COUNT(CASE WHEN DOCTOS_CC.CONCEPTO_CC_ID IN (87327, 155) THEN (IMPORTES_DOCTOS_CC.IMPORTE + IMPORTES_DOCTOS_CC.IMPUESTO) ELSE NULL END) AS NUM_IMPORTES,
      SUM(CASE WHEN DOCTOS_CC.CONCEPTO_CC_ID NOT IN (5, 87327, 155) THEN (IMPORTES_DOCTOS_CC.IMPORTE + IMPORTES_DOCTOS_CC.IMPUESTO) ELSE 0 END) AS IMPTE_REST,
      MAX(CASE WHEN DOCTOS_CC.CONCEPTO_CC_ID IN (87327, 155) THEN DOCTOS_CC.FECHA ELSE NULL END) AS FECHA_ULT_PAGO
    FROM
      DOCTOS_CC
    INNER JOIN IMPORTES_DOCTOS_CC ON IMPORTES_DOCTOS_CC.DOCTO_CC_ID = DOCTOS_CC.DOCTO_CC_ID
    WHERE DOCTOS_CC.CLIENTE_ID IN (${clientesIds}) AND DOCTOS_CC.CANCELADO = 'N'
    GROUP BY IMPORTES_DOCTOS_CC.DOCTO_CC_ACR_ID
  ) M
  INNER JOIN DOCTOS_CC ON DOCTOS_CC.DOCTO_CC_ID = M.DOCTO_CC_ACR_ID
  INNER JOIN CLIENTES ON CLIENTES.CLIENTE_ID = DOCTOS_CC.CLIENTE_ID
  INNER JOIN LIBRES_CARGOS_CC ON LIBRES_CARGOS_CC.DOCTO_CC_ID = DOCTOS_CC.DOCTO_CC_ID
  INNER JOIN IMPORTES_DOCTOS_CC ON IMPORTES_DOCTOS_CC.DOCTO_CC_ID = DOCTOS_CC.DOCTO_CC_ID
  INNER JOIN LISTAS_ATRIBUTOS ON LISTAS_ATRIBUTOS.LISTA_ATRIB_ID = LIBRES_CARGOS_CC.FORMA_DE_PAGO
  LEFT JOIN ZONAS_CLIENTES ON ZONAS_CLIENTES.ZONA_CLIENTE_ID = CLIENTES.ZONA_CLIENTE_ID
  LEFT JOIN LIBRES_CLIENTES ON LIBRES_CLIENTES.CLIENTE_ID = CLIENTES.CLIENTE_ID
  LEFT OUTER JOIN LISTAS_ATRIBUTOS AS LIST_VEN_1 ON LIST_VEN_1.LISTA_ATRIB_ID = LIBRES_CARGOS_CC.VENDEDOR_1
  LEFT OUTER JOIN LISTAS_ATRIBUTOS AS LIST_VEN_2 ON LIST_VEN_2.LISTA_ATRIB_ID = LIBRES_CARGOS_CC.VENDEDOR_2
  LEFT OUTER JOIN LISTAS_ATRIBUTOS AS LIST_VEN_3 ON LIST_VEN_3.LISTA_ATRIB_ID = LIBRES_CARGOS_CC.VENDEDOR_3
  LEFT OUTER JOIN LISTAS_ATRIBUTOS AS LOCALIDADES ON LOCALIDADES.LISTA_ATRIB_ID = LIBRES_CLIENTES.LOCALIDAD
  INNER JOIN DIRS_CLIENTES ON DIRS_CLIENTES.CLIENTE_ID = CLIENTES.CLIENTE_ID
  WHERE IMPORTES_DOCTOS_CC.IMPORTE + IMPORTES_DOCTOS_CC.IMPUESTO - M.TOTAL_IMPORTE - M.IMPTE_REST > 0 AND DIRS_CLIENTES.ES_DIR_PPAL = 'S' AND DOCTOS_CC.CANCELADO = 'N'
`;

export const SUBCONSUTA_GET_CLIENTES_ACTIVOS = `
  SELECT
    CLIENTES.CLIENTE_ID
  FROM CLIENTES
  WHERE CLIENTES.ESTATUS = 'A'
`;

export const QUERY_GET_VENTAS_BY_ID_SIMPLIFICADO = (ventasId: string) => `
  SELECT
    M.DOCTO_CC_ACR_ID,
    DOCTOS_CC.DOCTO_CC_ID,
    DOCTOS_CC.FOLIO,
    DOCTOS_CC.CLIENTE_ID,
    CLIENTES.NOMBRE AS CLIENTE,
    DIRS_CLIENTES.CALLE AS DOMICILIO,
    M.IMPORTE_PAGO_PROMEDIO,
    M.TOTAL_IMPORTE,
    M.NUM_IMPORTES,
    DOCTOS_CC.FECHA,
    LIBRES_CARGOS_CC.PARCIALIDAD,
    LIBRES_CARGOS_CC.ENGANCHE,
    UPPER(LIST_VEN_1.VALOR_DESPLEGADO) AS VENDEDOR_1,
    UPPER(LIST_VEN_2.VALOR_DESPLEGADO) AS VENDEDOR_2,
    UPPER(LIST_VEN_3.VALOR_DESPLEGADO) AS VENDEDOR_3,
    LISTAS_ATRIBUTOS.LISTA_ATRIB_ID AS FREC_PAGO_ID,
    UPPER(LISTAS_ATRIBUTOS.VALOR_DESPLEGADO) AS FREC_PAGO,
    IMPORTES_DOCTOS_CC.IMPORTE + IMPORTES_DOCTOS_CC.IMPUESTO AS PRECIO_TOTAL,
    M.IMPTE_REST,
    IMPORTES_DOCTOS_CC.IMPORTE + IMPORTES_DOCTOS_CC.IMPUESTO - M.TOTAL_IMPORTE - M.IMPTE_REST AS SALDO_REST,
    (M.TOTAL_IMPORTE + M.IMPTE_REST) / (IMPORTES_DOCTOS_CC.IMPORTE + IMPORTES_DOCTOS_CC.IMPUESTO) * 100 AS PORCETAJE_PAGADO,
    M.FECHA_ULT_PAGO
  FROM
  (
    SELECT
      IMPORTES_DOCTOS_CC.DOCTO_CC_ACR_ID,
      SUM(CASE WHEN DOCTOS_CC.CONCEPTO_CC_ID IN (87327, 155) THEN (IMPORTES_DOCTOS_CC.IMPORTE + IMPORTES_DOCTOS_CC.IMPUESTO) ELSE 0 END) AS TOTAL_IMPORTE,
      AVG(CASE WHEN DOCTOS_CC.CONCEPTO_CC_ID IN (87327, 155) THEN (IMPORTES_DOCTOS_CC.IMPORTE + IMPORTES_DOCTOS_CC.IMPUESTO) ELSE NULL END) AS IMPORTE_PAGO_PROMEDIO,
      COUNT(CASE WHEN DOCTOS_CC.CONCEPTO_CC_ID IN (87327, 155) THEN (IMPORTES_DOCTOS_CC.IMPORTE + IMPORTES_DOCTOS_CC.IMPUESTO) ELSE NULL END) AS NUM_IMPORTES,
      SUM(CASE WHEN DOCTOS_CC.CONCEPTO_CC_ID NOT IN (5, 87327, 155) THEN (IMPORTES_DOCTOS_CC.IMPORTE + IMPORTES_DOCTOS_CC.IMPUESTO) ELSE 0 END) AS IMPTE_REST,
      MAX(CASE WHEN DOCTOS_CC.CONCEPTO_CC_ID IN (87327, 155) THEN DOCTOS_CC.FECHA ELSE NULL END) AS FECHA_ULT_PAGO
    FROM
      DOCTOS_CC
    INNER JOIN IMPORTES_DOCTOS_CC ON IMPORTES_DOCTOS_CC.DOCTO_CC_ID = DOCTOS_CC.DOCTO_CC_ID
    WHERE IMPORTES_DOCTOS_CC.DOCTO_CC_ACR_ID IN (
      
    ) AND DOCTOS_CC.CANCELADO = 'N'
    GROUP BY IMPORTES_DOCTOS_CC.DOCTO_CC_ACR_ID
  ) M
  INNER JOIN DOCTOS_CC ON DOCTOS_CC.DOCTO_CC_ID = M.DOCTO_CC_ACR_ID
  INNER JOIN CLIENTES ON CLIENTES.CLIENTE_ID = DOCTOS_CC.CLIENTE_ID
  INNER JOIN LIBRES_CARGOS_CC ON LIBRES_CARGOS_CC.DOCTO_CC_ID = DOCTOS_CC.DOCTO_CC_ID
  INNER JOIN IMPORTES_DOCTOS_CC ON IMPORTES_DOCTOS_CC.DOCTO_CC_ID = DOCTOS_CC.DOCTO_CC_ID
  INNER JOIN LISTAS_ATRIBUTOS ON LISTAS_ATRIBUTOS.LISTA_ATRIB_ID = LIBRES_CARGOS_CC.FORMA_DE_PAGO
  LEFT OUTER JOIN LISTAS_ATRIBUTOS AS LIST_VEN_1 ON LIST_VEN_1.LISTA_ATRIB_ID = LIBRES_CARGOS_CC.VENDEDOR_1
  LEFT OUTER JOIN LISTAS_ATRIBUTOS AS LIST_VEN_2 ON LIST_VEN_2.LISTA_ATRIB_ID = LIBRES_CARGOS_CC.VENDEDOR_2
  LEFT OUTER JOIN LISTAS_ATRIBUTOS AS LIST_VEN_3 ON LIST_VEN_3.LISTA_ATRIB_ID = LIBRES_CARGOS_CC.VENDEDOR_3
  INNER JOIN DIRS_CLIENTES ON DIRS_CLIENTES.CLIENTE_ID = CLIENTES.CLIENTE_ID
  WHERE IMPORTES_DOCTOS_CC.IMPORTE + IMPORTES_DOCTOS_CC.IMPUESTO - M.TOTAL_IMPORTE - M.IMPTE_REST > 0 AND DIRS_CLIENTES.ES_DIR_PPAL = 'S' AND DOCTOS_CC.CANCELADO = 'N'
`;
