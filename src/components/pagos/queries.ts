export const QUERY_EXIST_UNIQUE_ID_PAGO = `
    SELECT
        ID
        DOCTO_CC_ID
    FROM
        MSP_PAGOS_RECIBIDOS
    WHERE
        ID = ?;
`