import {
  query,
  getDbConnectionAsync,
  getDbTransactionAsync,
  queryAsync,
  commitTransactionAsync,
  rollbackTransactionAsync,
  detachDbAsync,
  IQueryConverter,
} from "../../repositories/fbRepository";
import Firebird from "node-firebird";
import moment from "moment";
import {
  QUERY_GET_LAST_FOLIO_BY_PREFIX,
  QUERY_GET_LAST_PREFIX,
  QUERY_INSERT_DOCTO_IN,
  QUERY_INSERT_DOCTO_IN_DET,
  QUERY_INSERT_SUB_MOVTO,
  QUERY_APLICA_DOCTO,
  QUERY_GET_TRASPASOS,
  QUERY_GET_TRASPASO_DETALLE,
  QUERY_GET_COSTO_ARTICULO,
  QUERY_VALIDAR_EXISTENCIAS,
} from "./querys";
import {
  ITraspaso,
  IDetalleTraspasoInput,
  TRASPASO_CONFIG,
} from "./interfaces";

const converterTraspasos: IQueryConverter[] = [
  { type: "buffer", column: "FOLIO" },
  { type: "buffer", column: "DESCRIPCION" },
  { type: "buffer", column: "USUARIO_CREADOR" },
  { type: "buffer", column: "ALMACEN_ORIGEN" },
  { type: "buffer", column: "ALMACEN_DESTINO" },
];

const converterDetalle: IQueryConverter[] = [
  { type: "buffer", column: "CLAVE_ARTICULO" },
  { type: "buffer", column: "ARTICULO_NOMBRE" },
];

// Interfaces para resultados de RETURNING
interface IDoctoInResult {
  DOCTO_IN_ID: number;
}

interface IDoctoInDetResult {
  DOCTO_IN_DET_ID: number;
}

// Interfaces para sistema de folios
interface ILastFolioResult {
  FOLIO: string;
  NUMERO_ACTUAL: number;
}

interface ILastPrefixResult {
  PREFIJO: string;
}

// Configuración del sistema de folios
const FOLIO_CONFIG = {
  PREFIJO_INICIAL: "TRA",
  LONGITUD_TOTAL: 9,
  LONGITUD_PREFIJO: 3,
  LONGITUD_NUMERO: 6,
  LIMITE_NUMERICO: 999999,
  NUMERO_INICIAL: 1,
};

/**
 * Incrementa un prefijo alfabéticamente (TRA -> TRB -> TRC -> ... -> TRZ -> TSA)
 * @param prefijo - Prefijo actual de 3 letras
 * @returns Siguiente prefijo
 */
const incrementarPrefijo = (prefijo: string): string => {
  const chars = prefijo.split("");

  // Incrementar desde la última letra hacia la primera
  for (let i = chars.length - 1; i >= 0; i--) {
    if (chars[i] < "Z") {
      chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
      return chars.join("");
    } else {
      chars[i] = "A";
      // Si llegamos aquí, seguimos al siguiente dígito
    }
  }

  // Si todas las letras eran 'Z', empezamos con AAAA (esto es extremadamente improbable)
  return "AAA";
};

/**
 * Genera el siguiente folio disponible con formato profesional
 * @param almacenId - ID del almacén
 * @param conceptoId - ID del concepto
 * @returns Folio generado (ej: TRA000001)
 */
const generateNextFolio = async (
  almacenId: number,
  conceptoId: number
): Promise<string> => {
  try {
    // Primero, obtener el último prefijo usado
    let prefijoActual = FOLIO_CONFIG.PREFIJO_INICIAL;

    const ultimoPrefijoResult = await query<ILastPrefixResult>({
      sql: QUERY_GET_LAST_PREFIX,
      params: [almacenId, conceptoId],
    });

    if (ultimoPrefijoResult.length > 0) {
      prefijoActual = ultimoPrefijoResult[0].PREFIJO;
    }

    // Obtener el último folio con este prefijo
    const ultimoFolioResult = await query<ILastFolioResult>({
      sql: QUERY_GET_LAST_FOLIO_BY_PREFIX,
      params: [prefijoActual, almacenId, conceptoId],
    });

    let siguienteNumero = FOLIO_CONFIG.NUMERO_INICIAL;

    if (ultimoFolioResult.length > 0) {
      const numeroActual = ultimoFolioResult[0].NUMERO_ACTUAL;

      // Verificar si hemos alcanzado el límite
      if (numeroActual >= FOLIO_CONFIG.LIMITE_NUMERICO) {
        // Incrementar el prefijo y reiniciar el número
        prefijoActual = incrementarPrefijo(prefijoActual);
        siguienteNumero = FOLIO_CONFIG.NUMERO_INICIAL;
      } else {
        siguienteNumero = numeroActual + 1;
      }
    }

    // Formatear el folio final
    const numeroFormateado = String(siguienteNumero).padStart(
      FOLIO_CONFIG.LONGITUD_NUMERO,
      "0"
    );

    return `${prefijoActual}${numeroFormateado}`;
  } catch (error) {
    console.error("Error generando folio:", error);
    // En caso de error, usar folio de respaldo
    const timestamp = Date.now().toString().slice(-6);
    return `${FOLIO_CONFIG.PREFIJO_INICIAL}${timestamp}`;
  }
};

interface ICostoResult {
  COSTO_UNITARIO: number;
}

// Obtener costo de un artículo (para consultas, no para traspasos)
const getCostoArticulo = async (
  almacenId: number,
  articuloId: number
): Promise<number> => {
  const result = await query<ICostoResult>({
    sql: QUERY_GET_COSTO_ARTICULO,
    params: [almacenId, articuloId],
  });
  return result[0]?.COSTO_UNITARIO || 0;
};

interface IExistenciaResult {
  ARTICULO_ID: number;
  CLAVE: string;
  NOMBRE: string;
  EXISTENCIA: number;
  EXISTENCIA_DISPONIBLE: number;
}

// Validar existencias de artículos - COMENTADO: La BD maneja las validaciones
// const validarExistencias = async (
//   almacenId: number,
//   articulos: IDetalleTraspasoInput[]
// ): Promise<{ valido: boolean; errores: string[] }> => {
//   const errores: string[] = [];

//   for (const articulo of articulos) {
//     const result = await query<IExistenciaResult>({
//       sql: QUERY_VALIDAR_EXISTENCIAS,
//       params: [almacenId, articulo.articuloId],
//     });

//     if (result.length === 0) {
//       errores.push(`Artículo ${articulo.articuloId} no encontrado`);
//     } else if (result[0].EXISTENCIA_DISPONIBLE < articulo.unidades) {
//       errores.push(
//         `Artículo ${result[0].CLAVE} - ${result[0].NOMBRE}: ` +
//           `existencia disponible (${result[0].EXISTENCIA_DISPONIBLE}) ` +
//           `menor a la solicitada (${articulo.unidades})`
//       );
//     }
//   }

//   return {
//     valido: errores.length === 0,
//     errores,
//   };
// };

// Crear traspaso completo
const crearTraspaso = async (datosTraspaso: ITraspaso): Promise<any> => {
  const db = await getDbConnectionAsync();
  const transaction = await getDbTransactionAsync(db);

  try {
    // Validar existencias antes de proceder - COMENTADO: La BD maneja las validaciones
    // const validacion = await validarExistencias(
    //   datosTraspaso.almacenOrigenId,
    //   datosTraspaso.detalles
    // );

    // if (!validacion.valido) {
    //   throw new Error(
    //     `Validación de existencias falló: ${validacion.errores.join(", ")}`
    //   );
    // }

    const folio = await generateNextFolio(
      datosTraspaso.almacenOrigenId,
      TRASPASO_CONFIG.CONCEPTO_SALIDA_ID
    );

    const fechaActual = moment();
    const fecha = datosTraspaso.fecha
      ? moment(datosTraspaso.fecha)
      : fechaActual;
    const usuario = datosTraspaso.usuario || TRASPASO_CONFIG.USUARIO_DEFAULT;

    // Formatear fechas para Firebird usando Moment
    const fechaFormateada = fecha.format("YYYY-MM-DD HH:mm:ss.SSS");
    const fechaActualFormateada = fechaActual.format("YYYY-MM-DD HH:mm:ss.SSS");

    // Insertar encabezado del documento con ID = -1 y obtener el ID generado
    const doctoInResult = await queryAsync<IDoctoInResult>(
      transaction,
      QUERY_INSERT_DOCTO_IN,
      [
        -1, // DOCTO_IN_ID se generará automáticamente
        datosTraspaso.almacenOrigenId,
        TRASPASO_CONFIG.CONCEPTO_SALIDA_ID,
        TRASPASO_CONFIG.SUCURSAL_ID,
        folio,
        TRASPASO_CONFIG.NATURALEZA_CONCEPTO,
        fechaFormateada,
        datosTraspaso.almacenDestinoId,
        null, // CENTRO_COSTO_ID
        TRASPASO_CONFIG.CANCELADO,
        TRASPASO_CONFIG.APLICADO,
        datosTraspaso.descripcion ||
          `Traspaso de almacén ${datosTraspaso.almacenOrigenId} a ${datosTraspaso.almacenDestinoId}`,
        null, // CUENTA_CONCEPTO
        TRASPASO_CONFIG.FORMA_EMITIDA,
        TRASPASO_CONFIG.CONTABILIZADO,
        TRASPASO_CONFIG.SISTEMA_ORIGEN,
        usuario,
        fechaActualFormateada,
        null, // USUARIO_AUT_CREACION
        usuario,
        fechaActualFormateada,
        null, // USUARIO_AUT_MODIF
        null, // USUARIO_CANCELACION
        null, // FECHA_HORA_CANCELACION
        null, // USUARIO_AUT_CANCELACION
      ],
      true // RETURNING habilitado
    );

    // Con el queryAsync mejorado, el resultado viene tipado correctamente
    const doctoInId = (doctoInResult as IDoctoInResult).DOCTO_IN_ID;

    if (!doctoInId) {
      throw new Error("No se pudo obtener el ID del documento insertado");
    }

    // Insertar detalles (salidas y entradas)
    for (const detalle of datosTraspaso.detalles) {
      // Los costos se calculan automáticamente, se envían en 0
      const costoUnitario = 0;
      const costoTotal = 0;

      // Insertar salida del almacén origen con ID = -1 y obtener el ID generado
      const salidaResult = await queryAsync<IDoctoInDetResult>(
        transaction,
        QUERY_INSERT_DOCTO_IN_DET,
        [
          -1, // DOCTO_IN_DET_ID se generará automáticamente
          doctoInId,
          datosTraspaso.almacenOrigenId,
          TRASPASO_CONFIG.CONCEPTO_SALIDA_ID,
          detalle.claveArticulo,
          detalle.articuloId,
          "S", // TIPO_MOVTO
          detalle.unidades,
          costoUnitario,
          costoTotal,
          TRASPASO_CONFIG.METODO_COSTEO,
          TRASPASO_CONFIG.CANCELADO,
          TRASPASO_CONFIG.APLICADO,
          TRASPASO_CONFIG.COSTEO_PEND,
          TRASPASO_CONFIG.PEDIMENTO_PEND,
          "S", // ROL
          fechaFormateada,
          null, // CENTRO_COSTO_ID
        ],
        true // RETURNING habilitado
      );

      const doctoInDetIdSalida = (salidaResult as IDoctoInDetResult)
        .DOCTO_IN_DET_ID;

      // Insertar entrada al almacén destino con ID = -1 y obtener el ID generado
      const entradaResult = await queryAsync<IDoctoInDetResult>(
        transaction,
        QUERY_INSERT_DOCTO_IN_DET,
        [
          -1, // DOCTO_IN_DET_ID se generará automáticamente
          doctoInId,
          datosTraspaso.almacenDestinoId,
          TRASPASO_CONFIG.CONCEPTO_ENTRADA_ID,
          detalle.claveArticulo,
          detalle.articuloId,
          "E", // TIPO_MOVTO
          detalle.unidades,
          costoUnitario,
          costoTotal,
          TRASPASO_CONFIG.METODO_COSTEO,
          TRASPASO_CONFIG.CANCELADO,
          TRASPASO_CONFIG.APLICADO,
          TRASPASO_CONFIG.COSTEO_PEND,
          TRASPASO_CONFIG.PEDIMENTO_PEND,
          "E", // ROL
          fechaFormateada,
          null, // CENTRO_COSTO_ID
        ],
        true // RETURNING habilitado
      );

      const doctoInDetIdEntrada = (entradaResult as IDoctoInDetResult)
        .DOCTO_IN_DET_ID;

      // Insertar sub movimientos que vinculan salida y entrada
      // Salida apunta a entrada
      await queryAsync(transaction, QUERY_INSERT_SUB_MOVTO, [
        doctoInDetIdSalida,
        doctoInDetIdEntrada,
      ]);

      // Entrada apunta a salida
      await queryAsync(transaction, QUERY_INSERT_SUB_MOVTO, [
        doctoInDetIdEntrada,
        doctoInDetIdSalida,
      ]);
    }

    // Aplicar documento (actualizar inventarios) - sin RETURNING
    await queryAsync(transaction, QUERY_APLICA_DOCTO, [doctoInId]);

    await commitTransactionAsync(transaction);
    await detachDbAsync(db);

    return {
      success: true,
      doctoInId,
      folio,
      mensaje: `Traspaso creado exitosamente con folio ${folio}`,
    };
  } catch (error) {
    await rollbackTransactionAsync(transaction);
    await detachDbAsync(db);
    throw error;
  }
};

// Obtener lista de traspasos
const obtenerTraspasos = async (filtros?: {
  fechaInicio?: Date;
  fechaFin?: Date;
  almacenOrigenId?: number;
  almacenDestinoId?: number;
}): Promise<any[]> => {
  let sql = QUERY_GET_TRASPASOS;
  const params: any[] = [];

  if (filtros) {
    const conditions: string[] = [];

    if (filtros.fechaInicio) {
      conditions.push("D.FECHA >= ?");
      params.push(filtros.fechaInicio);
    }

    if (filtros.fechaFin) {
      conditions.push("D.FECHA <= ?");
      params.push(filtros.fechaFin);
    }

    if (filtros.almacenOrigenId) {
      conditions.push("D.ALMACEN_ID = ?");
      params.push(filtros.almacenOrigenId);
    }

    if (filtros.almacenDestinoId) {
      conditions.push("D.ALMACEN_DESTINO_ID = ?");
      params.push(filtros.almacenDestinoId);
    }

    if (conditions.length > 0) {
      sql = sql.replace("ORDER BY", `AND ${conditions.join(" AND ")} ORDER BY`);
    }
  }

  return await query({
    sql,
    params,
    converters: converterTraspasos,
  });
};

// Obtener detalle de un traspaso
const obtenerDetalleTraspaso = async (doctoInId: number): Promise<any[]> => {
  return await query({
    sql: QUERY_GET_TRASPASO_DETALLE,
    params: [doctoInId],
    converters: converterDetalle,
  });
};

export default {
  crear: crearTraspaso,
  listar: obtenerTraspasos,
  obtenerDetalle: obtenerDetalleTraspaso,
  // validarExistencias, // COMENTADO
  getCostoArticulo,
};
