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
	B.FECHA_M,
	ZONAS_CLIENTES.ZONA_CLIENTE_ID,
	SUM(B.PORC_PAGO) AS TOTAL_COBRO_PARCIAL,
	COUNT(B.PORC_PAGO) AS TOTAL_CUENTAS_COBRADAS,
	SUM(B.PORC_PAGO) / COUNT(B.PORC_PAGO) AS PAGO_PARCIAL_PROMEDIO
FROM
	(
	SELECT
	    A.FECHA_M,
	    A.ZONA_CLIENTE_ID,
	    A.TOTAL_COBRADO,
	    A.DOCTO_CC_ACR_ID,
	    LIBRES_CARGOS_CC.PARCIALIDAD,
		CASE
			WHEN A.TOTAL_COBRADO / LIBRES_CARGOS_CC.PARCIALIDAD > 1
			THEN (
				CASE WHEN L.NUM_PLAZOS_ATRASADOS_BY_SALDO >=  A.TOTAL_COBRADO / LIBRES_CARGOS_CC.PARCIALIDAD
				THEN  A.TOTAL_COBRADO / LIBRES_CARGOS_CC.PARCIALIDAD
				ELSE 1
				END
			)
			ELSE A.TOTAL_COBRADO / LIBRES_CARGOS_CC.PARCIALIDAD
		END PORC_PAGO,
	    A.NUM_CTAS_COB
	    FROM
	    (
			SELECT
			CAST(
				CASE 
					-- Si es la semana 53, que pase al año siguiente
					WHEN EXTRACT(WEEK FROM DOCTOS_CC.FECHA) = 53 THEN EXTRACT(YEAR FROM DOCTOS_CC.FECHA) + 1
					-- En caso contrario, se queda el año “normal”
					ELSE EXTRACT(YEAR FROM DOCTOS_CC.FECHA)
				END
				AS VARCHAR(4)
			)
			||
			CAST(
				CASE 
					-- Si es la semana 53, forzamos a semana 1
					WHEN EXTRACT(WEEK FROM DOCTOS_CC.FECHA) = 53 THEN 1
					-- Si el WEEKDAY = 0 (domingo en Firebird), sumamos 1 a la semana
					WHEN EXTRACT(WEEKDAY FROM DOCTOS_CC.FECHA) = 0 THEN EXTRACT(WEEK FROM DOCTOS_CC.FECHA) + 1
					-- Si no, tomamos la semana tal cual
					ELSE EXTRACT(WEEK FROM DOCTOS_CC.FECHA)
				END
				AS VARCHAR(2)
			) AS FECHA_M,
			CLIENTES.ZONA_CLIENTE_ID,
	  	  IMPORTES_DOCTOS_CC.DOCTO_CC_ACR_ID,
	        SUM(IMPORTES_DOCTOS_CC.IMPORTE + IMPORTES_DOCTOS_CC.IMPUESTO) AS TOTAL_COBRADO,
	        COUNT(IMPORTES_DOCTOS_CC.IMPORTE + IMPORTES_DOCTOS_CC.IMPUESTO) AS NUM_CTAS_COB
	      FROM DOCTOS_CC
	      INNER JOIN CLIENTES ON CLIENTES.CLIENTE_ID = DOCTOS_CC.CLIENTE_ID
	      INNER JOIN IMPORTES_DOCTOS_CC ON IMPORTES_DOCTOS_CC.DOCTO_CC_ID = DOCTOS_CC.DOCTO_CC_ID
		  INNER JOIN ZONAS_CLIENTES ON ZONAS_CLIENTES.ZONA_CLIENTE_ID = CLIENTES.ZONA_CLIENTE_ID
	      WHERE 
	        DOCTOS_CC.CONCEPTO_CC_ID = 87327 AND
          DOCTOS_CC.ESTATUS = 'N' AND
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
	          IN (?)
	        )
	      GROUP BY CLIENTES.ZONA_CLIENTE_ID, FECHA_M, IMPORTES_DOCTOS_CC.DOCTO_CC_ACR_ID
	      ORDER BY CLIENTES.ZONA_CLIENTE_ID, FECHA_M DESC
	    ) AS A
		INNER JOIN ZONAS_CLIENTES ON ZONAS_CLIENTES.ZONA_CLIENTE_ID = A.ZONA_CLIENTE_ID
	    INNER JOIN LIBRES_CARGOS_CC ON LIBRES_CARGOS_CC.DOCTO_CC_ID = A.DOCTO_CC_ACR_ID
		INNER JOIN 
		(
		SELECT
			N.DOCTO_CC_ACR_ID,
			N.DOCTO_CC_ID,
		    N.FOLIO,
		    N.CLIENTE_ID,
		    N.CLIENTE,
		    N.RUTA,
		    N.DOMICILIO,
		    N.LOCALIDAD_ID,
		    N.LOCALIDAD,
		    N.IMPORTE_PAGO_PROMEDIO,
		    N.TOTAL_IMPORTE,
		    N.NUM_IMPORTES,
		    N.FECHA,
		    N.PARCIALIDAD,
		    N.ENGANCHE,
		    N.VENDEDOR_1,
		    N.VENDEDOR_2,
		    N.VENDEDOR_3,
		    N.FREC_PAGO_ID,
		    N.FREC_PAGO,
		    N.PRECIO_TOTAL,
		    N.IMPTE_REST,
		    N.SALDO_REST,
		    N.PORCETAJE_PAGADO,
		    N.FECHA_ULT_PAGO,
			N.TIEMPO_TRANSCURRIDO AS PLAZOS_TRANS,
			N.TIEMPO_TRANSCURRIDO * N.PARCIALIDAD AS IMPTE_ACTUAL_ESTIMADO,
			N.TIEMPO_TRANSCURRIDO * N.PARCIALIDAD - N.TOTAL_IMPORTE AS IMPTE_ATRASADO,
			CASE
				WHEN ((N.TIEMPO_TRANSCURRIDO * N.PARCIALIDAD - N.TOTAL_IMPORTE - N.IMPTE_REST) / N.PARCIALIDAD) > (N.SALDO_REST / N.PARCIALIDAD)
				THEN N.SALDO_REST / N.PARCIALIDAD
				ELSE (N.TIEMPO_TRANSCURRIDO * N.PARCIALIDAD - N.TOTAL_IMPORTE - N.IMPTE_REST) / N.PARCIALIDAD 
				END AS NUM_PLAZOS_ATRASADOS_BY_SALDO
		FROM
		(
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
			    M.FECHA_ULT_PAGO,
				(CASE UPPER(LISTAS_ATRIBUTOS.VALOR_DESPLEGADO)
					WHEN 'SEMANAL' THEN
					DATEDIFF(WEEK FROM DOCTOS_CC.FECHA
						TO (CASE (IMPORTES_DOCTOS_CC.IMPORTE + IMPORTES_DOCTOS_CC.IMPUESTO - M.TOTAL_IMPORTE - M.IMPTE_REST)
							WHEN 0 THEN M.FECHA_ULT_PAGO
							ELSE CURRENT_DATE END
						)
					)
					WHEN 'QUINCENAL' THEN
					DATEDIFF(WEEK FROM DOCTOS_CC.FECHA
						TO (CASE (IMPORTES_DOCTOS_CC.IMPORTE + IMPORTES_DOCTOS_CC.IMPUESTO - M.TOTAL_IMPORTE - M.IMPTE_REST)
							WHEN 0 THEN M.FECHA_ULT_PAGO
							ELSE CURRENT_DATE END
						)
					) / 2
					WHEN 'MENSUAL' THEN
					DATEDIFF(MONTH FROM DOCTOS_CC.FECHA
						TO (CASE (IMPORTES_DOCTOS_CC.IMPORTE + IMPORTES_DOCTOS_CC.IMPUESTO - M.TOTAL_IMPORTE - M.IMPTE_REST)
							WHEN 0 THEN M.FECHA_ULT_PAGO
							ELSE CURRENT_DATE END
						)
					)
					END
				) AS TIEMPO_TRANSCURRIDO
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
			    WHERE DOCTOS_CC.CLIENTE_ID IN (
				SELECT
				    CLIENTES.CLIENTE_ID
				  FROM CLIENTES
				  WHERE CLIENTES.ESTATUS = 'A'
				) AND DOCTOS_CC.CANCELADO = 'N'
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
		) AS N
	) AS L ON L.DOCTO_CC_ID = A.DOCTO_CC_ACR_ID
) AS B
INNER JOIN ZONAS_CLIENTES ON ZONAS_CLIENTES.ZONA_CLIENTE_ID = B.ZONA_CLIENTE_ID
GROUP BY B.FECHA_M, ZONAS_CLIENTES.ZONA_CLIENTE_ID
`;
