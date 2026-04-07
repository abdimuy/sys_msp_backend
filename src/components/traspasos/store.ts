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
  QUERY_INSERT_DOCTO_IN,
  QUERY_INSERT_DOCTO_IN_DET,
  QUERY_INSERT_SUB_MOVTO,
  QUERY_APLICA_DOCTO,
  QUERY_GET_TRASPASOS,
  QUERY_GET_TRASPASO_DETALLE,
  QUERY_GET_COSTO_ARTICULO,
  QUERY_VALIDAR_EXISTENCIAS,
  QUERY_GET_CLAVE_ARTICULO,
} from "./querys";
import {
  ITraspaso,
  IDetalleTraspasoInput,
  TRASPASO_CONFIG,
  TipoErrorTraspaso,
  ErrorTraspaso,
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


// Configuración del sistema de folios
const FOLIO_CONFIG = {
  PREFIJO_INICIAL: "MST",
  DIGITOS: 6,
  POR_PREFIJO: 999999,
};

/**
 * Convierte un número secuencial del generador a un folio con prefijo auto-incremental.
 * Número 1-999999       → MST000001-MST999999
 * Número 1000000-1999998 → MSU000001-MSU999999
 * Número 1999999-2999997 → MSV000001-MSV999999
 * Y así sucesivamente: MST → MSU → MSV → ... → MSZ → MTA → MTB → ... → ZZZ
 */
const numeroAFolio = (numero: number): string => {
  const prefijoBloques = Math.floor((numero - 1) / FOLIO_CONFIG.POR_PREFIJO);
  const resto = ((numero - 1) % FOLIO_CONFIG.POR_PREFIJO) + 1;

  // Convertir el índice de bloque a las 3 letras del prefijo partiendo de "MST"
  const base = [
    "M".charCodeAt(0) - 65, // 12
    "S".charCodeAt(0) - 65, // 18
    "T".charCodeAt(0) - 65, // 19
  ];

  let carry = prefijoBloques;
  for (let i = 2; i >= 0; i--) {
    const total = base[i] + carry;
    base[i] = total % 26;
    carry = Math.floor(total / 26);
  }

  const prefijo = String.fromCharCode(base[0] + 65, base[1] + 65, base[2] + 65);
  const numero_str = resto.toString().padStart(FOLIO_CONFIG.DIGITOS, "0");

  return `${prefijo}${numero_str}`;
};

/**
 * Genera el siguiente folio usando el generador atómico de Firebird.
 * Garantiza unicidad sin race conditions ni reintentos.
 */
const generateNextFolio = async (): Promise<string> => {
  const result = await query<{ NEXT_VAL: number }>({
    sql: `SELECT GEN_ID(GEN_MST_FOLIO, 1) AS NEXT_VAL FROM RDB$DATABASE`,
  });

  const numero = result[0].NEXT_VAL;
  return numeroAFolio(numero);
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

interface IClaveArticuloResult {
  CLAVE: string;
  NOMBRE: string;
  ARTICULO_ID: number;
}

// Obtener clave de un artículo usando ROL_CLAVE_ART_ID = 17
const obtenerClaveArticulo = async (articuloId: number): Promise<string> => {
  try {
    const result = await query<IClaveArticuloResult>({
      sql: QUERY_GET_CLAVE_ARTICULO,
      params: [articuloId]
    });
    
    if (result.length === 0) {
      throw new ErrorTraspaso(
        TipoErrorTraspaso.ERROR_PARAMETROS,
        `No se encontró clave para el artículo ID ${articuloId}`,
        [`Artículo ID ${articuloId} no tiene clave configurada con ROL_CLAVE_ART_ID = 17`],
        'ARTICULO_SIN_CLAVE'
      );
    }
    
    return result[0].CLAVE;
  } catch (error) {
    if (error instanceof ErrorTraspaso) {
      throw error;
    }
    throw new ErrorTraspaso(
      TipoErrorTraspaso.ERROR_TECNICO,
      'Error al obtener clave del artículo',
      [error instanceof Error ? error.message : String(error)],
      'ERROR_BD_CLAVE'
    );
  }
};

// Validar existencias de artículos usando SALDOS_IN (misma lógica que almacenes)
const validarExistencias = async (
  almacenId: number,
  articulos: IDetalleTraspasoInput[]
): Promise<void> => {
  const erroresStock: string[] = [];

  try {
    for (const articulo of articulos) {
      const result = await query<IExistenciaResult>({
        sql: QUERY_VALIDAR_EXISTENCIAS,
        params: [almacenId, articulo.articuloId],
      });

      if (result.length === 0) {
        erroresStock.push(`Artículo ID ${articulo.articuloId} no encontrado`);
      } else if (result[0].EXISTENCIA_DISPONIBLE < articulo.unidades) {
        erroresStock.push(
          `Artículo ${result[0].CLAVE} - ${result[0].NOMBRE}: ` +
            `existencia disponible (${result[0].EXISTENCIA_DISPONIBLE}) ` +
            `menor a la solicitada (${articulo.unidades})`
        );
      }
    }

    // Si hay errores de stock, lanzar error específico
    if (erroresStock.length > 0) {
      throw new ErrorTraspaso(
        TipoErrorTraspaso.VALIDACION_STOCK,
        'Stock insuficiente para realizar el traspaso',
        erroresStock,
        'STOCK_INSUFICIENTE'
      );
    }
  } catch (error) {
    if (error instanceof ErrorTraspaso) {
      throw error;
    }
    throw new ErrorTraspaso(
      TipoErrorTraspaso.ERROR_TECNICO,
      'Error al validar existencias',
      [error instanceof Error ? error.message : String(error)],
      'ERROR_BD_EXISTENCIAS'
    );
  }
};

// Crear traspaso completo
const crearTraspaso = async (
  datosTraspaso: ITraspaso,
  transactionExterna?: Firebird.Transaction,
  dbExterna?: Firebird.Database
): Promise<any> => {
  // Si se proporciona una transacción externa, usarla (no crear nueva ni hacer commit)
  const usarTransaccionExterna = !!transactionExterna;
  const db = dbExterna || await getDbConnectionAsync();
  const transaction = transactionExterna || await getDbTransactionAsync(db);

  let folio: string = '';

  try {
    // Validar existencias antes de proceder usando SALDOS_IN
    await validarExistencias(
      datosTraspaso.almacenOrigenId,
      datosTraspaso.detalles
    );

    folio = await generateNextFolio();

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
      
      // Obtener automáticamente la clave del artículo si no se proporciona
      const claveArticulo = detalle.claveArticulo || await obtenerClaveArticulo(detalle.articuloId);

      // Insertar salida del almacén origen con ID = -1 y obtener el ID generado
      const salidaResult = await queryAsync<IDoctoInDetResult>(
        transaction,
        QUERY_INSERT_DOCTO_IN_DET,
        [
          -1, // DOCTO_IN_DET_ID se generará automáticamente
          doctoInId,
          datosTraspaso.almacenOrigenId,
          TRASPASO_CONFIG.CONCEPTO_SALIDA_ID,
          claveArticulo,
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
          claveArticulo,
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

    // Solo hacer commit y detach si NO estamos usando transacción externa
    if (!usarTransaccionExterna) {
      await commitTransactionAsync(transaction);
      await detachDbAsync(db);
    }

    return {
      success: true,
      doctoInId,
      folio,
      mensaje: `Traspaso creado exitosamente con folio ${folio}`,
    };
  } catch (error) {
    // Solo hacer rollback y detach si NO estamos usando transacción externa
    if (!usarTransaccionExterna) {
      await rollbackTransactionAsync(transaction);
      await detachDbAsync(db);
    }
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

  const traspasos = await query({
    sql,
    params,
    converters: converterTraspasos,
  });

  // Traer productos de cada traspaso
  const traspasosConProductos = await Promise.all(
    traspasos.map(async (t: any) => {
      const detalles = await query({
        sql: QUERY_GET_TRASPASO_DETALLE,
        params: [t.DOCTO_IN_ID],
        converters: converterDetalle,
      });
      return { ...t, productos: detalles };
    })
  );

  return traspasosConProductos;
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
  validarExistencias,
  getCostoArticulo,
  obtenerClaveArticulo,
};
