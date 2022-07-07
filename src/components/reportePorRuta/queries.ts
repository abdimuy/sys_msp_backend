export const QUERY_GET_REPORTS_BY_RUTA = (semanas: string) => `
  SELECT
  M.FECHA_M,
  M.ZONA_CLIENTE_ID,
  ZONAS_CLIENTES.NOMBRE AS ZONA,
  M.TOTAL_COBRADO,
  M.COBRO_X_APLICAR,
  M.NUM_CTAS_COB
  FROM
  (
    SELECT
      CAST(
        CAST(
          CASE
            WHEN EXTRACT (MONTH FROM DOCTOS_CC.FECHA) = 1 AND EXTRACT (WEEK FROM DOCTOS_CC.FECHA) = 53 THEN EXTRACT (YEAR FROM DOCTOS_CC.FECHA) -1
            ELSE EXTRACT (YEAR FROM DOCTOS_CC.FECHA)
          END
          AS VARCHAR(50)
        )
        ||
        CAST(CASE EXTRACT(WEEKDAY FROM DOCTOS_CC.FECHA) WHEN 0 THEN EXTRACT(WEEK FROM DOCTOS_CC.FECHA) + 1 ELSE EXTRACT(WEEK FROM DOCTOS_CC.FECHA) END AS VARCHAR(50)
      )AS INTEGER) AS FECHA_M,
      CLIENTES.ZONA_CLIENTE_ID,
      SUM(CASE
        WHEN DOCTOS_CC.ESTATUS = 'N' THEN IMPORTES_DOCTOS_CC.IMPORTE + IMPORTES_DOCTOS_CC.IMPUESTO
        ELSE 0
      END) AS TOTAL_COBRADO,
      SUM(CASE
        WHEN DOCTOS_CC.ESTATUS = 'P' THEN IMPORTES_DOCTOS_CC.IMPORTE + IMPORTES_DOCTOS_CC.IMPUESTO
        ELSE 0
      END) AS COBRO_X_APLICAR,
      SUM(CASE
        WHEN DOCTOS_CC.ESTATUS = 'N' THEN 1
        ELSE 0
      END) AS NUM_CTAS_COB
    FROM DOCTOS_CC
    INNER JOIN CLIENTES ON CLIENTES.CLIENTE_ID = DOCTOS_CC.CLIENTE_ID
    INNER JOIN IMPORTES_DOCTOS_CC ON IMPORTES_DOCTOS_CC.DOCTO_CC_ID = DOCTOS_CC.DOCTO_CC_ID
    WHERE 
      DOCTOS_CC.CONCEPTO_CC_ID = 87327 AND
      (
        CAST(
        CASE
          WHEN EXTRACT (MONTH FROM DOCTOS_CC.FECHA) = 1 AND EXTRACT (WEEK FROM DOCTOS_CC.FECHA) = 53 THEN EXTRACT (YEAR FROM DOCTOS_CC.FECHA) -1
          ELSE EXTRACT (YEAR FROM DOCTOS_CC.FECHA)
        END
        AS VARCHAR(50)
        )
        ||
        CAST(CASE EXTRACT(WEEKDAY FROM DOCTOS_CC.FECHA) WHEN 0 THEN EXTRACT(WEEK FROM DOCTOS_CC.FECHA) + 1 ELSE EXTRACT(WEEK FROM DOCTOS_CC.FECHA) END AS VARCHAR(50))
        IN (${semanas})
      )
    GROUP BY CLIENTES.ZONA_CLIENTE_ID, FECHA_M
    ORDER BY CLIENTES.ZONA_CLIENTE_ID, FECHA_M DESC
  ) AS M
  INNER JOIN ZONAS_CLIENTES ON ZONAS_CLIENTES.ZONA_CLIENTE_ID = M.ZONA_CLIENTE_ID
  ;
`;

export const QUERY_GET_PORCENTAJE_PARCIALIDAD_POR_RUTA = `
  SELECT
    M.FECHA_M,
    M.COBRADOR_ID,
    M.TOTAL_COBRADO,
    COBRADORES.NOMBRE AS COBRADOR,
    M.DOCTO_CC_ACR_ID,
    LIBRES_CARGOS_CC.PARCIALIDAD,
    M.TOTAL_COBRADO / LIBRES_CARGOS_CC.PARCIALIDAD AS PORC_PAGO,
    M.NUM_CTAS_COB
    FROM
    (
      SELECT
        CAST(
          CAST(
            CASE
              WHEN EXTRACT (MONTH FROM DOCTOS_CC.FECHA) = 1 AND EXTRACT (WEEK FROM DOCTOS_CC.FECHA) = 53 THEN EXTRACT (YEAR FROM DOCTOS_CC.FECHA) -1
              ELSE EXTRACT (YEAR FROM DOCTOS_CC.FECHA)
            END
            AS VARCHAR(50)
          )
          ||
          CAST(CASE EXTRACT(WEEKDAY FROM DOCTOS_CC.FECHA) WHEN 0 THEN EXTRACT(WEEK FROM DOCTOS_CC.FECHA) + 1 ELSE EXTRACT(WEEK FROM DOCTOS_CC.FECHA) END AS VARCHAR(50)
        ) AS INTEGER) AS FECHA_M ,
        DOCTOS_CC.COBRADOR_ID,
  IMPORTES_DOCTOS_CC.DOCTO_CC_ACR_ID,
        SUM(IMPORTES_DOCTOS_CC.IMPORTE + IMPORTES_DOCTOS_CC.IMPUESTO) AS TOTAL_COBRADO,
        COUNT(IMPORTES_DOCTOS_CC.IMPORTE + IMPORTES_DOCTOS_CC.IMPUESTO) AS NUM_CTAS_COB
      FROM DOCTOS_CC
      INNER JOIN CLIENTES ON CLIENTES.CLIENTE_ID = DOCTOS_CC.CLIENTE_ID
      INNER JOIN IMPORTES_DOCTOS_CC ON IMPORTES_DOCTOS_CC.DOCTO_CC_ID = DOCTOS_CC.DOCTO_CC_ID
      INNER JOIN COBRADORES ON COBRADORES.COBRADOR_ID = DOCTOS_CC.COBRADOR_ID
      WHERE 
        DOCTOS_CC.CONCEPTO_CC_ID = 87327 AND
        (
          CAST(
          CASE
            WHEN EXTRACT (MONTH FROM DOCTOS_CC.FECHA) = 1 AND EXTRACT (WEEK FROM DOCTOS_CC.FECHA) = 53 THEN EXTRACT (YEAR FROM DOCTOS_CC.FECHA) -1
            ELSE EXTRACT (YEAR FROM DOCTOS_CC.FECHA)
          END
          AS VARCHAR(50)
          )
          ||
          CAST(CASE EXTRACT(WEEKDAY FROM DOCTOS_CC.FECHA) WHEN 0 THEN EXTRACT(WEEK FROM DOCTOS_CC.FECHA) + 1 ELSE EXTRACT(WEEK FROM DOCTOS_CC.FECHA) END AS VARCHAR(50))
          IN (202225)
        )
      GROUP BY DOCTOS_CC.COBRADOR_ID, FECHA_M, IMPORTES_DOCTOS_CC.DOCTO_CC_ACR_ID
      ORDER BY DOCTOS_CC.COBRADOR_ID, FECHA_M DESC
    ) AS M
    INNER JOIN COBRADORES ON COBRADORES.COBRADOR_ID = M.COBRADOR_ID
    INNER JOIN LIBRES_CARGOS_CC ON LIBRES_CARGOS_CC.DOCTO_CC_ID = M.DOCTO_CC_ACR_ID
`;
