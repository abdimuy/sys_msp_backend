-- Índice para optimizar la query GET_PAGOS_AND_VISITAS_BY_FECHA
-- Problema: DOCTOS_CC (2.28M filas) hace full table scan al filtrar por
-- CONCEPTO_CC_ID + CANCELADO y luego JOIN con CLIENTES por ZONA_CLIENTE_ID
-- Sin índice: ~10s | Con índice esperado: <100ms

CREATE INDEX IDX_MSP_DOCTOS_CC_CONCEPTO_CLI
ON DOCTOS_CC (CONCEPTO_CC_ID, CANCELADO, CLIENTE_ID);
