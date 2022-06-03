export const QUERY_GET_ALMACENES: string = `
  SELECT
  EXIS.ALMACEN_ID,
  ALMACENES.NOMBRE AS ALMACEN,
  EXISTENCIAS
  FROM
  (
  SELECT
    SALDOS_IN.ALMACEN_ID,
    SUM(ENTRADAS_UNIDADES) - SUM(SALIDAS_UNIDADES) AS EXISTENCIAS
  FROM SALDOS_IN
  GROUP BY ALMACEN_ID
  ) EXIS
  INNER JOIN ALMACENES ON ALMACENES.ALMACEN_ID = EXIS.ALMACEN_ID
  WHERE ALMACENES.OCULTO = 'N'
  ORDER BY EXISTENCIAS DESC
`;

export const QUERY_GET_ALMACEN_BY_ID = `
  SELECT
  EXIS.ALMACEN_ID,
  ALMACENES.NOMBRE AS ALMACEN,
  EXISTENCIAS
  FROM
  (
  SELECT
    SALDOS_IN.ALMACEN_ID,
    SUM(ENTRADAS_UNIDADES) - SUM(SALIDAS_UNIDADES) AS EXISTENCIAS
  FROM SALDOS_IN
  GROUP BY ALMACEN_ID
  ) EXIS
  INNER JOIN ALMACENES ON ALMACENES.ALMACEN_ID = EXIS.ALMACEN_ID
  WHERE ALMACENES.OCULTO = 'N' AND ALMACENES.ALMACEN_ID = ?
`;

export const QUERY_GET_ALMACEN_EXISTENCIAS_BY_ID: string = `
  SELECT
  EXIS.ALMACEN_ID,
  ALMACENES.NOMBRE AS ALMACEN,
  EXISTENCIAS
  FROM
  (
  SELECT
    SALDOS_IN.ALMACEN_ID,
    SUM(ENTRADAS_UNIDADES) - SUM(SALIDAS_UNIDADES) AS EXISTENCIAS
  FROM SALDOS_IN
  GROUP BY ALMACEN_ID
  ) EXIS
  INNER JOIN ALMACENES ON ALMACENES.ALMACEN_ID = EXIS.ALMACEN_ID
  WHERE ALMACENES.OCULTO = 'N' AND ALMACENES.ALMACEN_ID = ?
  ORDER BY EXISTENCIAS DESC
`;

export const QUERY_GET_ALMACENES_BY_ID: string = `
  SELECT
  FIRST 25
  EXIS.ARTICULO_ID,
  ARTICULOS.NOMBRE AS ARTICULO,
  EXISTENCIAS
  FROM
  (
    SELECT
      ARTICULO_ID,
      SUM(ENTRADAS_UNIDADES) - SUM(SALIDAS_UNIDADES) AS EXISTENCIAS
    FROM SALDOS_IN
    WHERE ALMACEN_ID = ?
    GROUP BY ARTICULO_ID
    ORDER BY EXISTENCIAS DESC
  ) EXIS
  INNER JOIN ARTICULOS ON ARTICULOS.ARTICULO_ID = EXIS.ARTICULO_ID
  WHERE EXISTENCIAS > 0 AND ARTICULOS.NOMBRE CONTAINING ?
  ORDER BY ARTICULO
  ;
`;